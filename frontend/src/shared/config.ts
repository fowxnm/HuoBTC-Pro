export const API_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
    ? (import.meta.env.VITE_API_BASE as string)
    : "http://localhost:3000";

export const WS_BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_BASE
    ? (import.meta.env.VITE_WS_BASE as string)
    : "ws://localhost:3000";

export const WS_MARKET_PATH = "/ws/market";

/** Resolve a coin iconUrl from backend to full URL */
export function resolveIconUrl(iconUrl: string | null | undefined): string | undefined {
  if (!iconUrl) return undefined;
  if (iconUrl.startsWith("http")) return iconUrl;
  return `${API_BASE}${iconUrl}`;
}
