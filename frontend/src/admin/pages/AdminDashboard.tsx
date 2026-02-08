import { createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { adminFetch } from "../store";

interface Stats {
  totalUsers: number;
  totalBalance: string;
  totalDeposits: number;
  totalDepositAmount: string;
  totalWithdrawals: number;
  totalWithdrawalAmount: string;
  pendingWithdrawals: number;
  totalOrders: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = createSignal<Stats | null>(null);
  const [coins, setCoins] = createSignal(0);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const [statsRes, coinsRes] = await Promise.all([
        adminFetch("/admin/finance/stats"),
        adminFetch("/currencies"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json() as Stats);
      if (coinsRes.ok) setCoins(((await coinsRes.json()) as any[]).length);
    } catch { /* */ }
    setLoading(false);
  });

  const fmt = (v: string | undefined) => Number(v || 0).toFixed(2);
  const s = () => stats();

  const quickLinks = [
    { href: "/admin/users", label: "用户管理", desc: "查看、冻结、调整余额", color: "blue" },
    { href: "/admin/deposits", label: "充值管理", desc: "手动充值、查看记录", color: "green" },
    { href: "/admin/withdrawals", label: "提现管理", desc: "审核提现请求", color: "orange" },
    { href: "/admin/risk", label: "风控管理", desc: "风险等级、冻结用户", color: "red" },
    { href: "/admin/coins", label: "币种管理", desc: "添加币种、启用/禁用", color: "purple" },
    { href: "/admin/orders", label: "订单管理", desc: "查看所有交易订单", color: "indigo" },
  ];

  return (
    <div>
      <h1 class="text-2xl font-bold text-gray-800 mb-6">仪表盘</h1>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="注册用户" value={loading() ? "—" : String(s()?.totalUsers ?? 0)} color="blue" />
        <StatCard label="平台总余额" value={loading() ? "—" : `$${fmt(s()?.totalBalance)}`} color="green" />
        <StatCard label="待审提现" value={loading() ? "—" : String(s()?.pendingWithdrawals ?? 0)} color="red" />
        <StatCard label="总订单" value={loading() ? "—" : String(s()?.totalOrders ?? 0)} color="indigo" />
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="充值总额" value={loading() ? "—" : `$${fmt(s()?.totalDepositAmount)}`} sub={`${s()?.totalDeposits ?? 0} 笔`} color="teal" />
        <StatCard label="提现总额" value={loading() ? "—" : `$${fmt(s()?.totalWithdrawalAmount)}`} sub={`${s()?.totalWithdrawals ?? 0} 笔`} color="orange" />
        <StatCard label="币种数量" value={loading() ? "—" : String(coins())} color="purple" />
        <StatCard label="净流入" value={loading() ? "—" : `$${(Number(s()?.totalDepositAmount || 0) - Number(s()?.totalWithdrawalAmount || 0)).toFixed(2)}`} color="cyan" />
      </div>

      <div class="bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">快速操作</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            <button type="button" onClick={() => navigate(link.href)}
              class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group text-left">
              <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-800">{link.label}</p>
                <p class="text-xs text-gray-500">{link.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard(props: { label: string; value: string; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500", green: "border-l-green-500", red: "border-l-red-500",
    indigo: "border-l-indigo-500", teal: "border-l-teal-500", orange: "border-l-orange-500",
    purple: "border-l-purple-500", cyan: "border-l-cyan-500",
  };
  const textMap: Record<string, string> = {
    blue: "text-blue-700", green: "text-green-700", red: "text-red-700",
    indigo: "text-indigo-700", teal: "text-teal-700", orange: "text-orange-700",
    purple: "text-purple-700", cyan: "text-cyan-700",
  };

  return (
    <div class={`rounded-xl border border-gray-200 bg-white border-l-4 ${colorMap[props.color] || ""} p-4`}>
      <p class="text-xs text-gray-500 mb-1">{props.label}</p>
      <p class={`text-xl font-bold ${textMap[props.color] || "text-gray-800"}`}>{props.value}</p>
      {props.sub && <p class="text-[10px] text-gray-400 mt-0.5">{props.sub}</p>}
    </div>
  );
}
