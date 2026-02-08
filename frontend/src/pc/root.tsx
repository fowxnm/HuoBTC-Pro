import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { Toaster } from "./components/Toaster";
import { PCShell } from "./layout/PCShell";
import ChatWidget from "@/components/ChatWidget";

const PCHome = lazy(() => import("./pages/PCHome"));
const PCTrade = lazy(() => import("./pages/PCTrade"));
const PCMarket = lazy(() => import("./pages/PCMarket"));
const PCAbout = lazy(() => import("./pages/PCAbout"));
const PCMsb = lazy(() => import("./pages/PCMsb"));
const PCPrivacy = lazy(() => import("./pages/PCPrivacy"));
const PCNFT = lazy(() => import("./pages/PCNFT"));
const PCAIQuant = lazy(() => import("./pages/PCAIQuant"));

export default function PCRoot() {
  return (
    <>
      <Router root={PCShell}>
        <Route path="/" component={PCHome} />
        <Route path="/market" component={PCMarket} />
        <Route path="/trade" component={PCTrade} />
        <Route path="/about" component={PCAbout} />
        <Route path="/msb" component={PCMsb} />
        <Route path="/privacy" component={PCPrivacy} />
        <Route path="/nft" component={PCNFT} />
        <Route path="/ai" component={PCAIQuant} />
      </Router>
      <Toaster />
      <ChatWidget />
    </>
  );
}
