import { createSignal, onMount, For, Show } from "solid-js";
import { adminFetch } from "../store";

interface RiskUser {
  uid: string;
  address: string;
  balanceUsdt: string;
  isFrozen: boolean;
  riskLevel: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminRisk() {
  const [users, setUsers] = createSignal<RiskUser[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [filter, setFilter] = createSignal<string>("all");

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/admin/risk/users");
      if (res.ok) setUsers(await res.json() as RiskUser[]);
    } catch { /* */ }
    setLoading(false);
  }

  onMount(load);

  async function setRisk(uid: string, riskLevel: string) {
    setActionLoading(uid);
    try {
      await adminFetch(`/admin/user/${uid}/risk`, {
        method: "PATCH",
        body: JSON.stringify({ riskLevel }),
      });
      await load();
    } catch { /* */ }
    setActionLoading(null);
  }

  async function toggleFreeze(uid: string, frozen: boolean) {
    setActionLoading(uid);
    try {
      await adminFetch(`/admin/user/${uid}/freeze`, {
        method: "PATCH",
        body: JSON.stringify({ frozen }),
      });
      await load();
    } catch { /* */ }
    setActionLoading(null);
  }

  const filtered = () => {
    const f = filter();
    if (f === "all") return users();
    if (f === "frozen") return users().filter((u) => u.isFrozen);
    return users().filter((u) => u.riskLevel === f);
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">风控管理</h1>
        <button type="button" onClick={load} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">刷新</button>
      </div>

      {/* Stats */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="总用户" value={users().length} />
        <MiniStat label="正常" value={users().filter((u) => u.riskLevel === "normal").length} color="green" />
        <MiniStat label="必赢/必输" value={users().filter((u) => u.riskLevel !== "normal").length} color="orange" />
        <MiniStat label="已冻结" value={users().filter((u) => u.isFrozen).length} color="red" />
      </div>

      {/* Filter */}
      <div class="flex gap-2 mb-4">
        {[
          { key: "all", label: "全部" },
          { key: "normal", label: "正常" },
          { key: "win", label: "必赢" },
          { key: "lose", label: "必输" },
          { key: "frozen", label: "已冻结" },
        ].map((f) => (
          <button
            type="button"
            class="px-3 py-1 text-xs rounded-full border transition-colors"
            classList={{
              "bg-blue-600 text-white border-blue-600": filter() === f.key,
              "bg-white text-gray-600 border-gray-300 hover:bg-gray-50": filter() !== f.key,
            }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left px-4 py-3 font-medium text-gray-600">UID</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">钱包地址</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">余额</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">风控等级</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!loading()} fallback={<tr><td colspan="6" class="px-4 py-12 text-center text-gray-400">加载中…</td></tr>}>
                <Show when={filtered().length > 0} fallback={<tr><td colspan="6" class="px-4 py-12 text-center text-gray-400">无匹配用户</td></tr>}>
                  <For each={filtered()}>
                    {(u) => {
                      return (
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                          <td class="px-4 py-3 font-mono font-medium text-gray-800">{u.uid}</td>
                          <td class="px-4 py-3 font-mono text-gray-600 text-xs">{u.address.slice(0, 8)}...{u.address.slice(-6)}</td>
                          <td class="px-4 py-3 text-right font-mono">{Number(u.balanceUsdt).toFixed(2)}</td>
                          <td class="px-4 py-3 text-center">
                            <select
                              class="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={u.riskLevel}
                              onChange={(e) => setRisk(u.uid, e.currentTarget.value)}
                              disabled={actionLoading() === u.uid}
                            >
                              <option value="normal">正常</option>
                              <option value="win">必赢</option>
                              <option value="lose">必输</option>
                            </select>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isFrozen ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {u.isFrozen ? "已冻结" : "正常"}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-center">
                            <button
                              type="button"
                              class="text-xs px-2.5 py-1 rounded-md border transition-colors"
                              classList={{
                                "border-red-300 text-red-600 hover:bg-red-50": !u.isFrozen,
                                "border-green-300 text-green-600 hover:bg-green-50": u.isFrozen,
                              }}
                              disabled={actionLoading() === u.uid}
                              onClick={() => toggleFreeze(u.uid, !u.isFrozen)}
                            >
                              {actionLoading() === u.uid ? "…" : u.isFrozen ? "解冻" : "冻结"}
                            </button>
                          </td>
                        </tr>
                      );
                    }}
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

function MiniStat(props: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = { green: "text-green-700", orange: "text-orange-700", red: "text-red-700" };
  return (
    <div class="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p class="text-xs text-gray-500">{props.label}</p>
      <p class={`text-xl font-bold ${colorMap[props.color || ""] || "text-gray-800"}`}>{props.value}</p>
    </div>
  );
}
