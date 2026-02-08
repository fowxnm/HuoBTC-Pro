import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { MobileShell } from "./layout/MobileShell";
import ChatWidget from "@/components/ChatWidget";

const MobileHome = lazy(() => import("./pages/MobileHome"));
const MobileMarket = lazy(() => import("./pages/MobileMarket"));
const MobileTrade = lazy(() => import("./pages/MobileTrade"));
const MobileAssets = lazy(() => import("./pages/MobileAssets"));
const MobileAbout = lazy(() => import("./pages/MobileAbout"));
const MobileMsb = lazy(() => import("./pages/MobileMsb"));
const MobilePrivacy = lazy(() => import("./pages/MobilePrivacy"));
const MobileNFT = lazy(() => import("./pages/MobileNFT"));
const MobileAIQuant = lazy(() => import("./pages/MobileAIQuant"));

export default function MobileRoot() {
  return (
    <>
      <Router root={MobileShell}>
        <Route path="/" component={MobileHome} />
        <Route path="/market" component={MobileMarket} />
        <Route path="/trade" component={MobileTrade} />
        <Route path="/assets" component={MobileAssets} />
        <Route path="/about" component={MobileAbout} />
        <Route path="/msb" component={MobileMsb} />
        <Route path="/privacy" component={MobilePrivacy} />
        <Route path="/nft" component={MobileNFT} />
        <Route path="/ai" component={MobileAIQuant} />
      </Router>
      <ChatWidget />
    </>
  );
}
