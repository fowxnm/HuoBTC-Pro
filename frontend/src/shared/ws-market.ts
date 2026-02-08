import type {
  WsMarketRequest,
  WsServerMessage,
  WsSnapshotMessage,
  WsTickMessage,
} from "./api-types";
import { WS_BASE, WS_MARKET_PATH } from "./config";

export type PriceMap = Record<string, { price: string; ts: string }>;

function getWsUrl(): string {
  const base = WS_BASE.replace(/^http/, "ws");
  return `${base}${WS_MARKET_PATH}`;
}

export function createMarketWs(
  onSnapshot: (msg: WsSnapshotMessage) => void,
  onTick: (msg: WsTickMessage) => void,
  onConnected?: () => void,
  onClosed?: () => void
) {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const url = getWsUrl();
  const activeSymbols = new Set<string>();

  function connect() {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;
    ws = new WebSocket(url);
    ws.onopen = () => {
      onConnected?.();
      // Send any queued / previously active subscriptions
      if (activeSymbols.size > 0) {
        send({ action: "subscribe", symbols: Array.from(activeSymbols) });
      }
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsServerMessage;
        if (msg.type === "connected") onConnected?.();
        else if (msg.type === "snapshot") onSnapshot(msg);
        else if (msg.type === "tick") onTick(msg);
      } catch (_) {}
    };
    ws.onclose = () => {
      ws = null;
      onClosed?.();
      reconnectTimer = setTimeout(connect, 3000);
    };
    ws.onerror = () => {};
  }

  function send(req: WsMarketRequest) {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(req));
  }

  function subscribe(symbols: string[]) {
    symbols.forEach((s) => activeSymbols.add(s.toUpperCase()));
    send({ action: "subscribe", symbols });
  }

  function unsubscribe(symbols: string[]) {
    symbols.forEach((s) => activeSymbols.delete(s.toUpperCase()));
    send({ action: "unsubscribe", symbols });
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    activeSymbols.clear();
    ws?.close();
    ws = null;
  }

  return { connect, disconnect, subscribe, unsubscribe };
}
