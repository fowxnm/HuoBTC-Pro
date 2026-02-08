import { createSignal, onMount, For, Show } from "solid-js";
import { adminFetch } from "../store";

interface Order {
  id: string;
  uid: string;
  symbol: string;
  productType: string;
  direction: string;
  leverage: number;
  margin: string;
  entryPrice: string | null;
  exitPrice: string | null;
  pnl: string | null;
  status: string;
  createdAt: string;
  closedAt: string | null;
}

export default function AdminOrders() {
  const [orders, setOrders] = createSignal<Order[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [filter, setFilter] = createSignal<string>("all");

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch("/orders");
      if (res.ok) setOrders(await res.json() as Order[]);
    } catch { /* */ }
    setLoading(false);
  }

  onMount(load);

  const filtered = () => {
    const f = filter();
    if (f === "all") return orders();
    return orders().filter((o) => o.status === f);
  };

  const statusLabel: Record<string, string> = { open: "持仓中", closed: "已平仓", liquidated: "已爆仓" };
  const statusColor: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    closed: "bg-green-100 text-green-700",
    liquidated: "bg-red-100 text-red-700",
  };
  const productLabel: Record<string, string> = { spot: "现货", leverage: "杠杆", perpetual: "永续", binary: "秒合约" };
  const dirLabel: Record<string, string> = { long: "做多", short: "做空" };

  return (
    <div>
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-800">订单管理</h1>
        <button type="button" onClick={load} class="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">刷新</button>
      </div>

      {/* Stats */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat label="总订单" value={orders().length} />
        <MiniStat label="持仓中" value={orders().filter((o) => o.status === "open").length} color="blue" />
        <MiniStat label="已平仓" value={orders().filter((o) => o.status === "closed").length} color="green" />
        <MiniStat label="已爆仓" value={orders().filter((o) => o.status === "liquidated").length} color="red" />
      </div>

      {/* Filter */}
      <div class="flex gap-2 mb-4">
        {[
          { key: "all", label: "全部" },
          { key: "open", label: "持仓中" },
          { key: "closed", label: "已平仓" },
          { key: "liquidated", label: "已爆仓" },
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
                <th class="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">UID</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">币种</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">类型</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">方向</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">杠杆</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">保证金</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">开仓价</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">平仓价</th>
                <th class="text-right px-4 py-3 font-medium text-gray-600">盈亏</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">状态</th>
                <th class="text-center px-4 py-3 font-medium text-gray-600">时间</th>
              </tr>
            </thead>
            <tbody>
              <Show when={!loading()} fallback={<tr><td colspan="12" class="px-4 py-12 text-center text-gray-400">加载中…</td></tr>}>
                <Show when={filtered().length > 0} fallback={<tr><td colspan="12" class="px-4 py-12 text-center text-gray-400">暂无订单</td></tr>}>
                  <For each={filtered()}>
                    {(o) => {
                      const pnl = Number(o.pnl || 0);
                      return (
                        <tr class="border-b border-gray-100 hover:bg-gray-50">
                          <td class="px-4 py-3 text-gray-500 text-xs">{o.id}</td>
                          <td class="px-4 py-3 font-mono font-medium text-gray-800">{o.uid}</td>
                          <td class="px-4 py-3 font-mono font-semibold text-gray-800">{o.symbol}</td>
                          <td class="px-4 py-3 text-center text-xs">{productLabel[o.productType] || o.productType}</td>
                          <td class="px-4 py-3 text-center">
                            <span class={`text-xs font-medium ${o.direction === "long" ? "text-green-600" : "text-red-600"}`}>
                              {dirLabel[o.direction] || o.direction}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-center text-xs">{o.leverage}x</td>
                          <td class="px-4 py-3 text-right font-mono text-xs">{Number(o.margin).toFixed(2)}</td>
                          <td class="px-4 py-3 text-right font-mono text-xs">{o.entryPrice ? Number(o.entryPrice).toFixed(2) : "—"}</td>
                          <td class="px-4 py-3 text-right font-mono text-xs">{o.exitPrice ? Number(o.exitPrice).toFixed(2) : "—"}</td>
                          <td class="px-4 py-3 text-right font-mono text-xs font-medium" classList={{ "text-green-600": pnl > 0, "text-red-600": pnl < 0, "text-gray-500": pnl === 0 }}>
                            {o.pnl ? (pnl > 0 ? "+" : "") + pnl.toFixed(2) : "—"}
                          </td>
                          <td class="px-4 py-3 text-center">
                            <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[o.status] || "bg-gray-100 text-gray-600"}`}>
                              {statusLabel[o.status] || o.status}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-center text-xs text-gray-500">{new Date(o.createdAt).toLocaleString("zh-CN")}</td>
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
  const colorMap: Record<string, string> = { blue: "text-blue-700", green: "text-green-700", red: "text-red-700" };
  return (
    <div class="bg-white rounded-lg border border-gray-200 px-4 py-3">
      <p class="text-xs text-gray-500">{props.label}</p>
      <p class={`text-xl font-bold ${colorMap[props.color || ""] || "text-gray-800"}`}>{props.value}</p>
    </div>
  );
}
