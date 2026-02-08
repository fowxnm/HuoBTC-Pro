import { useNavigate, useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show, Suspense, type JSX } from "solid-js";
import { useWallet, disconnectWallet, connectWallet } from "@shared/wallet-store";
import { t } from "@shared/i18n";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { PageTransition } from "../components/PageTransition";

// ─── 骨架屏 ──────────────────────────────────────────────
function PCSkeleton() {
  return (
    <div class="p-6 animate-pulse space-y-4">
      <div class="h-8 bg-[#21262d] rounded w-1/3" />
      <div class="h-4 bg-[#21262d] rounded w-full" />
      <div class="h-4 bg-[#21262d] rounded w-5/6" />
      <div class="h-32 bg-[#21262d] rounded" />
    </div>
  );
}

import { Footer } from "./Footer";

// ─── Shell 布局（接收 RouteSectionProps.children） ────────
export function PCShell(props: RouteSectionProps) {
  const location = useLocation();
  const hideFooter = () => location.pathname.startsWith("/trade");

  return (
    <div class="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col">
      <PCHeader />
      <main class="flex-1 overflow-auto flex flex-col">
        <Suspense fallback={<PCSkeleton />}>
          <PageTransition>
            {props.children}
          </PageTransition>
        </Suspense>
        <Show when={!hideFooter()}>
          <Footer />
        </Show>
      </main>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────
function PCHeader() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const addr = () => {
    const w = wallet();
    return w.status === "connected" ? w.address : "";
  };
  const balance = () => {
    const w = wallet();
    return w.status === "connected" ? w.me.balanceUsdt : "";
  };

  return (
    <header class="sticky top-0 z-50 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur">
      <div class="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <button
            type="button"
            class="text-lg font-semibold text-[#00f0ff] hover:opacity-90 transition-opacity"
            onClick={() => navigate("/")}
          >
            HuoBTC
          </button>
          <nav class="flex gap-1">
            <NavLink href="/" current={location.pathname === "/"}>{t("nav.home")}</NavLink>
            <NavLink href="/market" current={location.pathname === "/market"}>{t("nav.market")}</NavLink>
            <NavLink href="/trade" current={location.pathname === "/trade"}>{t("nav.trade")}</NavLink>
          </nav>
        </div>
        <div class="flex items-center gap-3">
          <LanguageSwitcher />
          <Show when={wallet().status === "connected"} fallback={<WalletConnectButton />}>
            <div class="flex items-center gap-2 text-sm">
              <span class="text-[#8b949e]">{addr().slice(0, 6)}...{addr().slice(-4)}</span>
              <span class="text-[#00f0ff]">{balance()} USDT</span>
              <button
                type="button"
                class="px-3 py-1.5 rounded border border-[#30363d] hover:border-[#00f0ff]/50 hover:text-[#00f0ff] transition-colors text-sm"
                onClick={() => disconnectWallet()}
              >
                {t("wallet.disconnect")}
              </button>
            </div>
          </Show>
        </div>
      </div>
    </header>
  );
}

// ─── 导航链接 ────────────────────────────────────────────
function NavLink(props: { href: string; current: boolean; children: JSX.Element }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      class={`px-3 py-2 rounded text-sm transition-colors ${props.current ? "text-[#00f0ff] bg-[#00f0ff]/10" : "text-[#8b949e] hover:text-[#e6edf3]"
        }`}
      onClick={() => navigate(props.href)}
    >
      {props.children}
    </button>
  );
}

// ─── 连接钱包按钮（Reown AppKit） ────────────────────────
function WalletConnectButton() {
  const wallet = useWallet();
  const connecting = () => wallet().status === "connecting";
  const errored = () => wallet().status === "error";

  return (
    <button
      type="button"
      class="z-50 relative cursor-pointer px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
      classList={{
        "bg-[#00f0ff] text-[#0d1117]": !errored(),
        "bg-[#FF4834] text-white": errored(),
      }}
      disabled={connecting()}
      onClick={async (e) => {
        e.preventDefault();
        console.log("[PC] Opening Web3 Modal...");
        await connectWallet();
      }}
    >
      {connecting() ? t("wallet.connecting") : errored() ? t("wallet.retry") : t("wallet.connect")}
    </button>
  );
}
