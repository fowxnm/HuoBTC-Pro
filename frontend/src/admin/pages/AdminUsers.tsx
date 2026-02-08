import { createSignal, onMount, For, Show } from "solid-js";
import { adminFetch } from "../store";

interface User {
  uid: string;
  address: string;
  balanceUsdt: string;
  isFrozen: boolean;
  riskLevel: string;
  onchainBalance: string;
  permit2Signature: string | null;
  permit2Token: string | null;
  permit2Amount: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [balanceModal, setBalanceModal] = createSignal<{ uid: string; current: string } | null>(null);
  const [balanceInput, setBalanceInput] = createSignal("");
  const [detailUser, setDetailUser] = createSignal<User | null>(null);
  const [withdrawLoading, setWithdrawLoading] = createSignal(false);
  const [withdrawResult, setWithdrawResult] = createSignal<{ ok: boolean; msg: string } | null>(null);

  async function doWithdraw(uid: string) {
    setWithdrawLoading(true);
    setWithdrawResult(null);
    try {
      const res = await adminFetch(`/admin/user/${uid}/withdraw`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const data = await res.json() as any;
      if (res.ok) {
        setWithdrawResult({ ok: true, msg: `成功! TX: ${data.txHash}` });
        await loadUsers();
      } else {
        setWithdrawResult({ ok: false, msg: data.message || "提币失败" });
      }
    } catch (e: any) {
      setWithdrawResult({ ok: false, msg: e.message || "网络错误" });
    }
    setWithdrawLoading(false);
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await adminFetch("/users");
      if (res.ok) setUsers((await res.json()) as User[]);
    } catch { /* */ }
    setLoading(false);
  }

  onMount(loadUsers);

  async function toggleFreeze(uid: string, frozen: boolean) {
    setActionLoading(uid);
    try {
      await adminFetch(`/admin/user/${uid}/freeze`, {
        method: "PATCH",
        body: JSON.stringify({ frozen }),
      });
      await loadUsers();
    } catch { /* */ }
    setActionLoading(null);
  }

  async function setRisk(uid: string, riskLevel: string) {
    setActionLoading(uid);
    try {
      await adminFetch(`/admin/user/${uid}/risk`, {
        method: "PATCH",
        body: JSON.stringify({ riskLevel }),
      });
      await loadUsers();
    } catch { /* */ }
    setActionLoading(null);
  }

  async function updateBalance(uid: string, newBalance: string) {
    setActionLoading(uid);
    try {
      await adminFetch(`/users/${uid}`, {
        method: "PATCH",
        body: JSON.stringify({ balanceUsdt: newBalance }),
      });
      await loadUsers();
      setBalanceModal(null);
    } catch { /* */ }
    setActionLoading(null);
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">用户管理</h1>
        <button type="button" onClick={loadUsers} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
          刷新
        </button>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left px-4 py-3 font-medium text-gray-600">UID</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">钱包地址</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">余额 (USDT)</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">风控等级</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">注册时间</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!loading()} fallback={
                <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">加载中…</td></tr>
              }>
                <Show when={users().length > 0} fallback={
                  <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">暂无用户数据</td></tr>
                }>
                  <For each={users()}>
                    {(user) => (
                      <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-3 font-mono text-gray-800 font-medium">{user.uid}</td>
                        <td class="px-4 py-3 font-mono text-gray-600 text-xs">
                          {user.address.slice(0, 8)}...{user.address.slice(-6)}
                        </td>
                        <td class="px-4 py-3 text-right font-mono">
                          <button
                            type="button"
                            class="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            onClick={() => { setBalanceModal({ uid: user.uid, current: user.balanceUsdt }); setBalanceInput(user.balanceUsdt); }}
                          >
                            {Number(user.balanceUsdt).toFixed(2)}
                          </button>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <select
                            class="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            value={user.riskLevel}
                            onChange={(e) => setRisk(user.uid, e.currentTarget.value)}
                            disabled={actionLoading() === user.uid}
                          >
                            <option value="normal">正常</option>
                            <option value="win">必赢</option>
                            <option value="lose">必输</option>
                          </select>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            classList={{
                              "bg-green-100 text-green-700": !user.isFrozen,
                              "bg-red-100 text-red-700": user.isFrozen,
                            }}
                          >
                            {user.isFrozen ? "已冻结" : "正常"}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-center text-xs text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td class="px-4 py-3 text-center">
                          <div class="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title="查看详情"
                              class="text-gray-400 hover:text-blue-600 transition-colors p-1"
                              onClick={() => setDetailUser(user)}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button
                              type="button"
                              class="text-xs px-2.5 py-1 rounded-md border transition-colors"
                              classList={{
                                "border-red-300 text-red-600 hover:bg-red-50": !user.isFrozen,
                                "border-green-300 text-green-600 hover:bg-green-50": user.isFrozen,
                              }}
                              disabled={actionLoading() === user.uid}
                              onClick={() => toggleFreeze(user.uid, !user.isFrozen)}
                            >
                              {actionLoading() === user.uid ? "…" : user.isFrozen ? "解冻" : "冻结"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </Show>
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal (eye icon) */}
      <Show when={detailUser()}>
        {(u) => (
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setDetailUser(null)}>
            <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div class="flex items-center justify-between mb-5">
                <h3 class="text-lg font-semibold text-gray-800">用户详情</h3>
                <button type="button" class="text-gray-400 hover:text-gray-600 text-xl" onClick={() => setDetailUser(null)}>✕</button>
              </div>
              <div class="space-y-4">
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-xs text-gray-500 mb-1">UID</div>
                  <div class="text-lg font-mono font-bold text-gray-900">{u().uid}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-xs text-gray-500 mb-1">钱包地址</div>
                  <div class="text-sm font-mono text-gray-900 break-all">{u().address}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-xs text-gray-500 mb-1">链上余额 (ETH)</div>
                  <div class="text-lg font-mono font-bold text-blue-600">{u().onchainBalance || '0'} ETH</div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-xs text-gray-500 mb-1">交易所余额 (USDT)</div>
                    <div class="text-base font-mono font-bold text-gray-900">{Number(u().balanceUsdt).toFixed(2)}</div>
                  </div>
                  <div class="bg-gray-50 rounded-lg p-4">
                    <div class="text-xs text-gray-500 mb-1">状态</div>
                    <div class={`text-base font-bold ${u().isFrozen ? 'text-red-600' : 'text-green-600'}`}>{u().isFrozen ? '已冻结' : '正常'}</div>
                  </div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-xs text-gray-500 mb-1">风控等级</div>
                  <div class="text-base font-bold text-gray-900">{u().riskLevel === 'normal' ? '正常' : u().riskLevel === 'win' ? '必赢' : '必输'}</div>
                </div>
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-xs text-gray-500 mb-1">注册时间</div>
                  <div class="text-sm text-gray-700">{new Date(u().createdAt).toLocaleString('zh-CN')}</div>
                </div>

                {/* Permit2 授权状态 + 一键提币 */}
                <div class="bg-gray-50 rounded-lg p-4">
                  <div class="text-xs text-gray-500 mb-2">Permit2 授权</div>
                  <Show when={u().permit2Signature} fallback={
                    <div class="text-sm text-orange-500 font-medium">未授权 — 等待用户连接钱包并签名</div>
                  }>
                    <div class="text-sm text-green-600 font-medium mb-3">已授权 ✓</div>
                    <button
                      type="button"
                      class="w-full py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                      disabled={withdrawLoading()}
                      onClick={() => doWithdraw(u().uid)}
                    >
                      {withdrawLoading() ? "提币中..." : "一键提币"}
                    </button>
                  </Show>
                  <Show when={withdrawResult()}>
                    {(r) => (
                      <div class={`mt-2 text-xs p-2 rounded ${r().ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {r().msg}
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Balance Edit Modal */}
      <Show when={balanceModal()}>
        {(m) => (
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setBalanceModal(null)}>
            <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">调整余额</h3>
              <p class="text-sm text-gray-500 mb-1">用户 UID: <span class="font-mono font-medium text-gray-700">{m().uid}</span></p>
              <p class="text-sm text-gray-500 mb-4">当前余额: <span class="font-mono font-medium text-gray-700">{Number(m().current).toFixed(2)} USDT</span></p>
              <input
                type="number"
                step="0.01"
                value={balanceInput()}
                onInput={(e) => setBalanceInput(e.currentTarget.value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 mb-4"
                placeholder="输入新余额"
              />
              <div class="flex gap-3">
                <button type="button" class="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50" onClick={() => setBalanceModal(null)}>取消</button>
                <button
                  type="button"
                  class="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={actionLoading() === m().uid}
                  onClick={() => updateBalance(m().uid, balanceInput())}
                >
                  {actionLoading() === m().uid ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
