import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { adminFetch } from "../store";
import { playNotificationSound } from "../lib/notify";

interface Withdrawal {
  id: string;
  uid: string;
  amount: string;
  toAddress: string;
  network: string | null;
  txHash: string | null;
  status: string;
  remark: string | null;
  createdAt: string;
}

export default function AdminWithdrawals() {
  const [list, setList] = createSignal<Withdrawal[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [toast, setToast] = createSignal("");
  let prevCount = -1;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await adminFetch("/admin/withdrawals");
      if (res.ok) {
        const data = await res.json() as Withdrawal[];
        if (prevCount >= 0 && data.length > prevCount) {
          playNotificationSound();
          setToast("您有用户申请提现");
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

  async function updateStatus(id: string, status: string, txHash?: string) {
    setActionLoading(id);
    try {
      await adminFetch(`/admin/withdrawals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, txHash }),
      });
      await load();
    } catch { /* */ }
    setActionLoading(null);
  }

  const statusLabel: Record<string, string> = { pending: "待审核", approved: "已批准", rejected: "已拒绝", completed: "已完成" };
  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    rejected: "bg-red-100 text-red-700",
    completed: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">提现管理</h1>
        <button type="button" onClick={() => load()} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">刷新</button>
      </div>

      <Show when={toast()}>
        <div class="mb-4 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-sm font-medium flex items-center gap-2 animate-pulse">
          <span>🔔</span> {toast()}
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
                <th class="text-left px-4 py-3 font-medium text-gray-600">提现地址</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">网络</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">时间</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!loading()} fallback={<tr><td colspan="8" class="px-4 py-12 text-center text-gray-400">加载中…</td></tr>}>
                <Show when={list().length > 0} fallback={<tr><td colspan="8" class="px-4 py-12 text-center text-gray-400">暂无提现记录</td></tr>}>
                  <For each={list()}>
                    {(w) => (
                      <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="px-4 py-3 text-gray-500 text-xs">{w.id}</td>
                        <td class="px-4 py-3 font-mono font-medium text-gray-800">{w.uid}</td>
                        <td class="px-4 py-3 text-right font-mono text-red-600 font-medium">-{Number(w.amount).toFixed(2)}</td>
                        <td class="px-4 py-3 text-xs font-mono text-gray-500 max-w-[140px] truncate" title={w.toAddress}>{w.toAddress.slice(0, 10)}...{w.toAddress.slice(-6)}</td>
                        <td class="px-4 py-3 text-gray-600 text-xs">{w.network || "—"}</td>
                        <td class="px-4 py-3 text-center">
                          <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[w.status] || "bg-gray-100 text-gray-600"}`}>
                            {statusLabel[w.status] || w.status}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-center text-xs text-gray-500">{new Date(w.createdAt).toLocaleString("zh-CN")}</td>
                        <td class="px-4 py-3 text-center">
                          <Show when={w.status === "pending"}>
                            <div class="flex gap-1 justify-center">
                              <button type="button"
                                class="text-xs px-2 py-1 rounded-md border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-50"
                                disabled={actionLoading() === w.id}
                                onClick={() => updateStatus(w.id, "approved")}
                              >{actionLoading() === w.id ? "…" : "批准"}</button>
                              <button type="button"
                                class="text-xs px-2 py-1 rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                disabled={actionLoading() === w.id}
                                onClick={() => updateStatus(w.id, "rejected")}
                              >{actionLoading() === w.id ? "…" : "拒绝"}</button>
                            </div>
                          </Show>
                          <Show when={w.status === "approved"}>
                            <button type="button"
                              class="text-xs px-2 py-1 rounded-md border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              disabled={actionLoading() === w.id}
                              onClick={() => updateStatus(w.id, "completed")}
                            >{actionLoading() === w.id ? "…" : "标记完成"}</button>
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
