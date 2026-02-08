/**
 * Admin auth store — manages admin login state and token
 */
import { createSignal } from "solid-js";
import { API_BASE } from "../shared/config";

export interface AdminSession {
  token: string;
  username: string;
}

const STORAGE_KEY = "admin_session";

function loadSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const [session, setSession] = createSignal<AdminSession | null>(loadSession());

export function useAdminSession() {
  return session;
}

export function isAdminLoggedIn() {
  return session() !== null;
}

export function getAdminToken() {
  return session()?.token ?? "";
}

export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "登录失败" }));
    throw new Error(err.message || "登录失败");
  }

  const data = (await res.json()) as { token: string; username: string };
  const s: AdminSession = { token: data.token, username: data.username };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  setSession(s);
  return s;
}

export function adminLogout() {
  localStorage.removeItem(STORAGE_KEY);
  setSession(null);
}

/** Helper: fetch with admin auth header */
export async function adminFetch(path: string, opts: RequestInit = {}) {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401) {
    adminLogout();
    throw new Error("会话过期，请重新登录");
  }
  return res;
}
