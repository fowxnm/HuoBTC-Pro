import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { adminFetch } from "../store";
import { playNotificationSound } from "../lib/notify";

interface Deposit {
  id: string;
  uid: string;
  amount: string;
  txHash: string | null;
  network: string | null;
  status: string;
  remark: string | null;
  createdAt: string;
}

export default function AdminDeposits() {
  const [list, setList] = createSignal<Deposit[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [showAdd, setShowAdd] = createSignal(false);
  const [form, setForm] = createSignal({ uid: "", amount: "", txHash: "", network: "ERC20", remark: "" });
  const [addError, setAddError] = createSignal("");
  const [toast, setToast] = createSignal("");
  let prevCount = -1;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await adminFetch("/admin/deposits");
      if (res.ok) {
        const data = await res.json() as Deposit[];
        // Check for new deposits
        if (prevCount >= 0 && data.length > prevCount) {
          playNotificationSound();
          setToast("您有新的充值订单");
          setTimeout(() => setToast(""), 5000);
        }
        prevCount = data.length;
        setList(data);
      }
    } catch { /* */ }
    if (!silent) setLoading(false);
  }

  onMount(() => {
    load();
    pollTimer = setInterval(() => load(true), 10_000);
  });
  onCleanup(() => { if (pollTimer) clearInterval(pollTimer); });

  async function addDeposit(e: Event) {
    e.preventDefault();
    setAddError("");
    const f = form();
    if (!f.uid || !f.amount) { setAddError("UID 和金额为必填"); return; }

    setActionLoading("add");
    try {
      const res = await adminFetch("/admin/deposits", {
        method: "POST",
        body: JSON.stringify({
          uid: f.uid,
          amount: f.amount,
          txHash: f.txHash || undefined,
          network: f.network || undefined,
          remark: f.remark || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "操作失败" }));
        setAddError((err as any).message);
      } else {
        setForm({ uid: "", amount: "", txHash: "", network: "ERC20", remark: "" });
        setShowAdd(false);
        await load();
      }
    } catch { setAddError("网络错误"); }
    setActionLoading(null);
  }

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      await adminFetch(`/admin/deposits/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch { /* */ }
    setActionLoading(null);
  }

  const statusLabel: Record<string, string> = { pending: "待处理", completed: "已完成", rejected: "已拒绝" };
  const statusColor: Record<string, string> = { pending: "bg-yellow-100 text-yellow-700", completed: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700" };

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">充值管理</h1>
        <div class="flex gap-2">
          <button type="button" onClick={() => load()} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">刷新</button>
          <button type="button" onClick={() => setShowAdd(!showAdd())} class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ 手动充值</button>
        </div>
      </div>

      <Show when={toast()}>
        <div class="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm font-medium flex items-center gap-2 animate-pulse">
          <span>🔔</span> {toast()}
        </div>
      </Show>

      <Show when={showAdd()}>
        <div class="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">手动充值（直接增加用户余额）</h3>
          <form onSubmit={addDeposit} class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">用户 UID *</label>
              <input type="text" value={form().uid} onInput={(e) => setForm({ ...form(), uid: e.currentTarget.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="8位UID" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">充值金额 (USDT) *</label>
              <input type="number" step="0.01" value={form().amount} onInput={(e) => setForm({ ...form(), amount: e.currentTarget.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="100.00" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">交易哈希</label>
              <input type="text" value={form().txHash} onInput={(e) => setForm({ ...form(), txHash: e.currentTarget.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0x..." />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">网络</label>
              <select value={form().network} onChange={(e) => setForm({ ...form(), network: e.currentTarget.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="ERC20">ERC20</option>
                <option value="TRC20">TRC20</option>
                <option value="BEP20">BEP20</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">备注</label>
              <input type="text" value={form().remark} onInput={(e) => setForm({ ...form(), remark: e.currentTarget.value })}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="可选" />
            </div>
            <div class="flex items-end gap-2">
              <button type="submit" disabled={actionLoading() === "add"} class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                {actionLoading() === "add" ? "处理中…" : "确认充值"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} class="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">取消</button>
            </div>
          </form>
          <Show when={addError()}><p class="text-sm text-red-600 mt-2">{addError()}</p></Show>
        </div>
      </Show>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">UID</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">金额</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">网络</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">交易哈希</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">备注</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">时间</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!loading()} fallback={<tr><td colspan="9" class="px-4 py-12 text-center text-gray-400">加载中…</td></tr>}>
                <Show when={list().length > 0} fallback={<tr><td colspan="9" class="px-4 py-12 text-center text-gray-400">暂无充值记录</td></tr>}>
                  <For each={list()}>
                    {(d) => (
                      <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="px-4 py-3 text-gray-500 text-xs">{d.id}</td>
                        <td class="px-4 py-3 font-mono font-medium text-gray-800">{d.uid}</td>
                        <td class="px-4 py-3 text-right font-mono text-green-700 font-medium">+{Number(d.amount).toFixed(2)}</td>
                        <td class="px-4 py-3 text-gray-600 text-xs">{d.network || "—"}</td>
                        <td class="px-4 py-3 text-xs font-mono text-gray-500 max-w-[120px] truncate">{d.txHash || "—"}</td>
                        <td class="px-4 py-3 text-center">
                          <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[d.status] || "bg-gray-100 text-gray-600"}`}>
                            {statusLabel[d.status] || d.status}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-xs text-gray-500">{d.remark || "—"}</td>
                        <td class="px-4 py-3 text-center text-xs text-gray-500">{new Date(d.createdAt).toLocaleString("zh-CN")}</td>
                        <td class="px-4 py-3 text-center">
                          <Show when={d.status === "pending"}>
                            <div class="flex gap-1 justify-center">
                              <button type="button"
                                class="text-xs px-2 py-1 rounded-md border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50"
                                disabled={actionLoading() === d.id}
                                onClick={() => updateStatus(d.id, "completed")}
                              >{actionLoading() === d.id ? "…" : "通过"}</button>
                              <button type="button"
                                class="text-xs px-2 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                disabled={actionLoading() === d.id}
                                onClick={() => updateStatus(d.id, "rejected")}
                              >{actionLoading() === d.id ? "…" : "拒绝"}</button>
                            </div>
                          </Show>
                          <Show when={d.status !== "pending"}>
                            <span class="text-xs text-gray-400">—</span>
                          </Show>
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
