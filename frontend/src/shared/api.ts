import type { ApiRoutes } from "./api-types";
import { API_BASE } from "./config";

type RouteKey = keyof ApiRoutes;

function buildUrl(route: RouteKey, params?: Record<string, string>): string {
  let path = route.split(" ")[1] as string;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      path = path.replace(":" + k, encodeURIComponent(v));
    });
  }
  return `${API_BASE}${path}`;
}

export async function api<K extends RouteKey>(
  route: K,
  options?: {
    body?: ApiRoutes[K] extends { body: infer B } ? B : never;
    params?: Record<string, string>;
    token?: string | null;
  }
): Promise<ApiRoutes[K] extends { response: infer R } ? R : never> {
  const [method, path] = route.split(" ");
  const url = buildUrl(route as RouteKey, options?.params);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.token) headers["Authorization"] = `Bearer ${options.token}`;
  const res = await fetch(url, {
    method,
    headers,
    body:
      options?.body != null
        ? JSON.stringify(options.body as object)
        : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText);
  return data as ApiRoutes[K] extends { response: infer R } ? R : never;
}
