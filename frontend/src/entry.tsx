/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "./index.css";
import { render } from "solid-js/web";

const isAdmin = window.location.pathname.startsWith("/admin");

if (isAdmin) {
  // ── Admin 后台管理（白色主题，无 Web3） ──
  document.body.setAttribute("data-platform", "admin");
  import("./admin/root").then(({ default: AdminRoot }) => {
    render(() => <AdminRoot />, document.getElementById("root")!);
  });
} else {
  // ── 前台交易所 ──
  import("./shared/web3modal"); // Initialize AppKit early

  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth < 768;

  console.log("Current Device Mode:", isMobile ? "Mobile" : "PC");
  document.body.setAttribute("data-platform", isMobile ? "mobile" : "pc");

  if (isMobile) {
    import("./mobile/root").then(({ default: MobileRoot }) => {
      render(() => <MobileRoot />, document.getElementById("root")!);
    });
  } else {
    import("./pc/root").then(({ default: PCRoot }) => {
      render(() => <PCRoot />, document.getElementById("root")!);
    });
  }
}
