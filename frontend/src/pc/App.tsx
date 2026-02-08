import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { Toaster } from "./components/Toaster";
import { PCShell } from "./layout/PCShell";
import ChatWidget from "@/components/ChatWidget";

const PCHome = lazy(() => import("./pages/PCHome"));
const PCTrade = lazy(() => import("./pages/PCTrade"));
const PCMarket = lazy(() => import("./pages/PCMarket"));

export default function App() {
  return (
    <>
      <Router root={PCShell}>
        <Route path="/" component={PCHome} />
        <Route path="/market" component={PCMarket} />
        <Route path="/trade" component={PCTrade} />
      </Router>
      <Toaster />
      <ChatWidget />
    </>
  );
}
