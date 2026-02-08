import { Router, Route } from "@solidjs/router";
import { lazy } from "solid-js";
import { AdminShell } from "./layout/AdminShell";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminCoins = lazy(() => import("./pages/AdminCoins"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const AdminDeposits = lazy(() => import("./pages/AdminDeposits"));
const AdminWithdrawals = lazy(() => import("./pages/AdminWithdrawals"));
const AdminRisk = lazy(() => import("./pages/AdminRisk"));
const AdminOrders = lazy(() => import("./pages/AdminOrders"));
const AdminCollection = lazy(() => import("./pages/AdminCollection"));
const AdminChat = lazy(() => import("./pages/AdminChat"));

export default function AdminRoot() {
  return (
    <Router root={AdminShell}>
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/coins" component={AdminCoins} />
      <Route path="/admin/finance" component={AdminFinance} />
      <Route path="/admin/deposits" component={AdminDeposits} />
      <Route path="/admin/withdrawals" component={AdminWithdrawals} />
      <Route path="/admin/risk" component={AdminRisk} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/collection" component={AdminCollection} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/admin" component={AdminDashboard} />
    </Router>
  );
}
