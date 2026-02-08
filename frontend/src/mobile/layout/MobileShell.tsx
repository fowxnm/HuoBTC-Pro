import "./MobileShell.css";
import { useNavigate, useLocation, type RouteSectionProps } from "@solidjs/router";
import { Show, Suspense } from "solid-js";
import { useWallet, disconnectWallet, connectWallet } from "@shared/wallet-store";
import { t } from "@shared/i18n";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { Footer } from "./Footer";
import { marketStore } from "@/stores/market";

export function MobileShell(props: RouteSectionProps) {
  const location = useLocation();
  const hideFooter = () => location.pathname.startsWith("/trade");

  return (
    <div class="m-shell">
      <MobileHeader />
      <div class="m-main">
        <Suspense>{props.children}</Suspense>
        <Show when={!hideFooter()}>
          <Footer />
        </Show>
      </div>
      <BottomTabBar />
    </div>
  );
}

// ── 顶部 ─────────────────────────────────────────────────
function MobileHeader() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const addr = () => { const w = wallet(); return w.status === "connected" ? w.address : ""; };

  return (
    <header class="m-header">
      <button type="button" class="m-brand" onClick={() => navigate("/")}>
        <span class="m-ws-dot" classList={{ "m-ws-on": marketStore.isConnected, "m-ws-off": !marketStore.isConnected }} />
        HuoBTC
      </button>
      <div class="m-wallet-area">
        <LanguageSwitcher compact />
        <Show
          when={wallet().status === "connected"}
          fallback={
            <button type="button" class="m-connect-btn z-50 relative cursor-pointer" disabled={wallet().status === "connecting"} onClick={async (e) => {
              e.preventDefault();
              console.log("[Mobile] Opening Web3 Modal...");
              await connectWallet();
            }}>
              {wallet().status === "connecting" ? t("wallet.connecting") : wallet().status === "error" ? t("wallet.retry") : t("wallet.connect")}
            </button>
          }
        >
          <span class="m-addr">{addr().slice(0, 6)}...{addr().slice(-4)}</span>
          <button type="button" class="m-disconnect-btn" onClick={() => disconnectWallet()}>{t("wallet.disconnect")}</button>
        </Show>
      </div>
    </header>
  );
}

// ── 底部 TabBar ──────────────────────────────────────────
function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = [
    { path: "/", label: () => t("nav.home"), icon: IcoHome },
    { path: "/market", label: () => t("nav.market"), icon: IcoMarket },
    { path: "/trade", label: () => t("nav.trade"), icon: IcoTrade },
    { path: "/assets", label: () => t("nav.assets"), icon: IcoAssets },
  ];

  return (
    <nav class="m-tabbar">
      {tabs.map(tab => {
        const active = () => tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
        return (
          <button type="button" class="m-tabbar-item" classList={{ "m-tabbar-active": active() }} onClick={() => navigate(tab.path)}>
            <tab.icon />
            <span class="m-tabbar-label">{tab.label()}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── SVG 图标 ─────────────────────────────────────────────
const S = { w: "22", h: "22", vb: "0 0 24 24", f: "none", s: "currentColor", sw: "1.8", lc: "round" as const, lj: "round" as const };

function IcoHome() {
  return <svg width={S.w} height={S.h} viewBox={S.vb} fill={S.f} stroke={S.s} stroke-width={S.sw} stroke-linecap={S.lc} stroke-linejoin={S.lj}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IcoMarket() {
  return <svg width={S.w} height={S.h} viewBox={S.vb} fill={S.f} stroke={S.s} stroke-width={S.sw} stroke-linecap={S.lc} stroke-linejoin={S.lj}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
}
function IcoTrade() {
  return <svg width={S.w} height={S.h} viewBox={S.vb} fill={S.f} stroke={S.s} stroke-width={S.sw} stroke-linecap={S.lc} stroke-linejoin={S.lj}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
}
function IcoAssets() {
  return <svg width={S.w} height={S.h} viewBox={S.vb} fill={S.f} stroke={S.s} stroke-width={S.sw} stroke-linecap={S.lc} stroke-linejoin={S.lj}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
}
