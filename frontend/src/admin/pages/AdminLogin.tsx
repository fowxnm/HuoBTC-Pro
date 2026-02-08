import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { adminLogin } from "../store";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await adminLogin(username(), password());
      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-4">
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div class="text-center mb-8">
          <div class="w-14 h-14 mx-auto mb-3 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 class="text-xl font-bold text-gray-800">HuoBTC 管理后台</h1>
          <p class="text-sm text-gray-500 mt-1">请登录管理员账户</p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="请输入用户名"
              autocomplete="username"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
          </div>

          {error() && (
            <div class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error()}</div>
          )}

          <button
            type="submit"
            disabled={loading() || !username() || !password()}
            class="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading() ? "登录中…" : "登 录"}
          </button>
        </form>
      </div>
    </div>
  );
}
