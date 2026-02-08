import { createSignal, onMount } from "solid-js";
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

export default function AdminFinance() {
  const [stats, setStats] = createSignal<Stats | null>(null);
  const [loading, setLoading] = createSignal(true);

  onMount(async () => {
    try {
      const res = await adminFetch("/admin/finance/stats");
      if (res.ok) setStats(await res.json() as Stats);
    } catch { /* */ }
    setLoading(false);
  });

  const fmt = (v: string | undefined) => Number(v || 0).toFixed(2);

  return (
    <div>
      <h1 class="text-2xl font-bold text-gray-800 mb-6">财务中心</h1>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="平台总余额" value={loading() ? "—" : `$${fmt(stats()?.totalBalance)}`} sub="所有用户余额之和" color="blue" />
        <Card label="充值总额" value={loading() ? "—" : `$${fmt(stats()?.totalDepositAmount)}`} sub={`共 ${stats()?.totalDeposits ?? 0} 笔`} color="green" />
        <Card label="提现总额" value={loading() ? "—" : `$${fmt(stats()?.totalWithdrawalAmount)}`} sub={`共 ${stats()?.totalWithdrawals ?? 0} 笔`} color="orange" />
        <Card label="待审提现" value={loading() ? "—" : String(stats()?.pendingWithdrawals ?? 0)} sub="需要处理" color="red" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="注册用户" value={loading() ? "—" : String(stats()?.totalUsers ?? 0)} sub="总注册数" color="indigo" />
        <Card label="总订单数" value={loading() ? "—" : String(stats()?.totalOrders ?? 0)} sub="所有交易订单" color="purple" />
        <Card label="净流入" value={loading() ? "—" : `$${(Number(stats()?.totalDepositAmount || 0) - Number(stats()?.totalWithdrawalAmount || 0)).toFixed(2)}`} sub="充值 - 提现" color="teal" />
      </div>
    </div>
  );
}

function Card(props: { label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500", green: "border-l-green-500", orange: "border-l-orange-500",
    red: "border-l-red-500", indigo: "border-l-indigo-500", purple: "border-l-purple-500", teal: "border-l-teal-500",
  };
  const textMap: Record<string, string> = {
    blue: "text-blue-700", green: "text-green-700", orange: "text-orange-700",
    red: "text-red-700", indigo: "text-indigo-700", purple: "text-purple-700", teal: "text-teal-700",
  };

  return (
    <div class={`bg-white rounded-xl border border-gray-200 border-l-4 ${colorMap[props.color] || ""} p-5`}>
      <p class="text-sm text-gray-500 mb-1">{props.label}</p>
      <p class={`text-2xl font-bold ${textMap[props.color] || "text-gray-800"}`}>{props.value}</p>
      <p class="text-xs text-gray-400 mt-1">{props.sub}</p>
    </div>
  );
}
