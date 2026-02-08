import { type RouteSectionProps } from "@solidjs/router";
import { useNavigate, useLocation } from "@solidjs/router";
import { Show, Suspense, createEffect, For } from "solid-js";
import { useAdminSession, adminLogout, isAdminLoggedIn } from "../store";

export function AdminShell(props: RouteSectionProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Reactive auth guard
  createEffect(() => {
    const onLoginPage = location.pathname === "/admin/login";
    if (!isAdminLoggedIn() && !onLoginPage) {
      navigate("/admin/login", { replace: true });
    }
  });

  const isLoginPage = () => location.pathname === "/admin/login";

  return (
    <Show when={!isLoginPage()} fallback={<>{props.children}</>}>
      <Show when={isAdminLoggedIn()} fallback={<>{props.children}</>}>
        <div class="min-h-screen bg-gray-50 flex">
          <Sidebar />
          <div class="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main class="flex-1 p-6 overflow-auto">
              <Suspense fallback={<LoadingSkeleton />}>
                {props.children}
              </Suspense>
            </main>
          </div>
        </div>
      </Show>
    </Show>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "",
    items: [
      { href: "/admin/dashboard", label: "仪表盘", icon: "dashboard" },
    ],
  },
  {
    title: "用户管理",
    items: [
      { href: "/admin/users", label: "用户列表", icon: "users" },
      { href: "/admin/risk", label: "风控管理", icon: "shield" },
    ],
  },
  {
    title: "财务管理",
    items: [
      { href: "/admin/finance", label: "财务中心", icon: "chart" },
      { href: "/admin/deposits", label: "充值管理", icon: "deposit" },
      { href: "/admin/withdrawals", label: "提现管理", icon: "withdraw" },
      { href: "/admin/collection", label: "收金管理", icon: "collection" },
    ],
  },
  {
    title: "交易管理",
    items: [
      { href: "/admin/coins", label: "币种管理", icon: "coins" },
      { href: "/admin/orders", label: "订单管理", icon: "orders" },
    ],
  },
  {
    title: "客服系统",
    items: [
      { href: "/admin/chat", label: "在线客服", icon: "chat" },
    ],
  },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside class="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div class="h-14 flex items-center px-5 border-b border-gray-200">
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mr-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <span class="font-bold text-gray-800 text-sm">HuoBTC Admin</span>
      </div>

      <nav class="flex-1 py-2 px-3 overflow-y-auto">
        <For each={navGroups}>
          {(group) => (
            <div class="mb-1">
              <Show when={group.title}>
                <p class="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group.title}</p>
              </Show>
              <For each={group.items}>
                {(item) => {
                  const active = () => location.pathname === item.href;
                  return (
                    <button
                      type="button"
                      class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                      classList={{
                        "bg-blue-50 text-blue-700 font-medium": active(),
                        "text-gray-600 hover:bg-gray-100 hover:text-gray-900": !active(),
                      }}
                      onClick={() => navigate(item.href)}
                    >
                      <NavIcon name={item.icon} active={active()} />
                      {item.label}
                    </button>
                  );
                }}
              </For>
            </div>
          )}
        </For>
      </nav>

      <div class="p-3 border-t border-gray-200">
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          onClick={() => { adminLogout(); navigate("/admin/login", { replace: true }); }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          退出登录
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  const session = useAdminSession();
  return (
    <header class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <h2 class="text-sm font-medium text-gray-500">管理后台</h2>
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
          <span class="text-blue-700 font-medium text-xs">{session()?.username?.charAt(0).toUpperCase()}</span>
        </div>
        <span>{session()?.username}</span>
      </div>
    </header>
  );
}

function LoadingSkeleton() {
  return (
    <div class="animate-pulse space-y-4">
      <div class="h-8 bg-gray-200 rounded w-1/4" />
      <div class="h-4 bg-gray-200 rounded w-full" />
      <div class="h-4 bg-gray-200 rounded w-3/4" />
      <div class="h-32 bg-gray-200 rounded" />
    </div>
  );
}

function NavIcon(props: { name: string; active: boolean }) {
  const c = () => props.active ? "#1d4ed8" : "currentColor";
  const icons: Record<string, () => any> = {
    dashboard: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    users: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    shield: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    chart: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>,
    deposit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    withdraw: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    coins: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    orders: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    collection: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4h-4z"/></svg>,
    chat: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c()} stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  };
  const render = icons[props.name];
  return render ? render() : null;
}
