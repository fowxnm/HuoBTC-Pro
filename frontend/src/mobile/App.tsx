import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { MobileShell } from "./layout/MobileShell";
import ChatWidget from "@/components/ChatWidget";

const MobileHome = lazy(() => import("./pages/MobileHome"));
const MobileMarket = lazy(() => import("./pages/MobileMarket"));
const MobileTrade = lazy(() => import("./pages/MobileTrade"));

export default function App() {
  return (
    <>
      <Router root={MobileShell}>
        <Route path="/" component={MobileHome} />
        <Route path="/market" component={MobileMarket} />
        <Route path="/trade" component={MobileTrade} />
      </Router>
      <ChatWidget />
    </>
  );
}
