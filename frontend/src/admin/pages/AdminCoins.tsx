import { createSignal, onMount, For, Show } from "solid-js";
import { adminFetch } from "../store";
import { API_BASE } from "../../shared/config";

interface Coin {
  id: number;
  symbol: string;
  type: string;
  activeStatus: boolean;
  iconUrl: string | null;
  createdAt: string;
}

export default function AdminCoins() {
  const [coins, setCoins] = createSignal<Coin[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [showAdd, setShowAdd] = createSignal(false);
  const [newSymbol, setNewSymbol] = createSignal("");
  const [newType, setNewType] = createSignal("spot");
  const [addError, setAddError] = createSignal("");
  const [uploadingSymbol, setUploadingSymbol] = createSignal<string | null>(null);

  async function loadCoins() {
    setLoading(true);
    try {
      const res = await adminFetch("/currencies");
      if (res.ok) setCoins((await res.json()) as Coin[]);
    } catch { /* */ }
    setLoading(false);
  }

  onMount(loadCoins);

  async function toggleCoin(symbol: string) {
    setActionLoading(symbol);
    try {
      await adminFetch(`/admin/coin/${symbol}/toggle`, { method: "PATCH" });
      await loadCoins();
    } catch { /* */ }
    setActionLoading(null);
  }

  async function addCoin(e: Event) {
    e.preventDefault();
    setAddError("");
    if (!newSymbol().trim()) return;

    setActionLoading("add");
    try {
      const res = await adminFetch("/admin/coin/add", {
        method: "POST",
        body: JSON.stringify({ symbol: newSymbol().toUpperCase(), type: newType() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "添加失败" }));
        setAddError((err as any).message || "添加失败");
      } else {
        setNewSymbol("");
        setShowAdd(false);
        await loadCoins();
      }
    } catch {
      setAddError("网络错误");
    }
    setActionLoading(null);
  }

  async function uploadIcon(symbol: string, file: File) {
    setUploadingSymbol(symbol);
    try {
      const fd = new FormData();
      fd.append("icon", file);
      const token = (await import("../store")).getAdminToken();
      const res = await fetch(`${API_BASE}/admin/coin/${symbol}/icon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) await loadCoins();
    } catch { /* */ }
    setUploadingSymbol(null);
  }

  function iconSrc(coin: Coin): string | null {
    if (!coin.iconUrl) return null;
    return coin.iconUrl.startsWith("http") ? coin.iconUrl : `${API_BASE}${coin.iconUrl}`;
  }

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">币种管理</h1>
        <div class="flex gap-2">
          <button type="button" onClick={loadCoins} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
            刷新
          </button>
          <button type="button" onClick={() => setShowAdd(!showAdd())} class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + 添加币种
          </button>
        </div>
      </div>

      {/* Add Coin Form */}
      <Show when={showAdd()}>
        <div class="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">添加新币种</h3>
          <form onSubmit={addCoin} class="flex items-end gap-3">
            <div class="flex-1">
              <label class="block text-xs text-gray-500 mb-1">币种代码</label>
              <input
                type="text"
                value={newSymbol()}
                onInput={(e) => setNewSymbol(e.currentTarget.value)}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                placeholder="例如: DOGE"
              />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">类型</label>
              <select
                value={newType()}
                onChange={(e) => setNewType(e.currentTarget.value)}
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="spot">现货</option>
                <option value="contract">合约</option>
              </select>
            </div>
            <button type="submit" disabled={actionLoading() === "add"} class="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {actionLoading() === "add" ? "添加中…" : "添加"}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }} class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              取消
            </button>
          </form>
          <Show when={addError()}>
            <p class="text-sm text-red-600 mt-2">{addError()}</p>
          </Show>
        </div>
      </Show>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">图标</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">币种</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">类型</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">添加时间</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!loading()} fallback={
                <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">加载中…</td></tr>
              }>
                <Show when={coins().length > 0} fallback={
                  <tr><td colspan="7" class="px-4 py-12 text-center text-gray-400">暂无币种数据</td></tr>
                }>
                  <For each={coins()}>
                    {(coin) => (
                      <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-3 text-gray-500">{coin.id}</td>
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2">
                            <Show when={iconSrc(coin)} fallback={
                              <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{coin.symbol.charAt(0)}</div>
                            }>
                              {(src) => <img src={src()} alt={coin.symbol} class="w-8 h-8 rounded-full object-cover border border-gray-200" />}
                            </Show>
                            <label class="cursor-pointer text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap">
                              {uploadingSymbol() === coin.symbol ? "上传中…" : "上传"}
                              <input type="file" accept="image/*" class="hidden" onChange={(e) => {
                                const f = e.currentTarget.files?.[0];
                                if (f) uploadIcon(coin.symbol, f);
                                e.currentTarget.value = "";
                              }} />
                            </label>
                          </div>
                        </td>
                        <td class="px-4 py-3 font-mono font-semibold text-gray-800">{coin.symbol}</td>
                        <td class="px-4 py-3 text-center">
                          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            classList={{
                              "bg-blue-100 text-blue-700": coin.type === "spot",
                              "bg-purple-100 text-purple-700": coin.type === "contract",
                            }}
                          >
                            {coin.type === "spot" ? "现货" : "合约"}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            classList={{
                              "bg-green-100 text-green-700": coin.activeStatus,
                              "bg-gray-100 text-gray-500": !coin.activeStatus,
                            }}
                          >
                            {coin.activeStatus ? "启用" : "禁用"}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-center text-xs text-gray-500">
                          {new Date(coin.createdAt).toLocaleDateString("zh-CN")}
                        </td>
                        <td class="px-4 py-3 text-center">
                          <button
                            type="button"
                            class="text-xs px-2.5 py-1 rounded-md border transition-colors"
                            classList={{
                              "border-gray-300 text-gray-600 hover:bg-gray-100": coin.activeStatus,
                              "border-green-300 text-green-600 hover:bg-green-50": !coin.activeStatus,
                            }}
                            disabled={actionLoading() === coin.symbol}
                            onClick={() => toggleCoin(coin.symbol)}
                          >
                            {actionLoading() === coin.symbol ? "…" : coin.activeStatus ? "禁用" : "启用"}
                          </button>
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
    </div>
  );
}
