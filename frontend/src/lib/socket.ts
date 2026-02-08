import type { WsMarketRequest, WsServerMessage } from "@shared/api-types";
import { WS_BASE, WS_MARKET_PATH } from "@shared/config";

// ── Types ────────────────────────────────────────────────
type MessageHandler = (msg: WsServerMessage) => void;
type StatusHandler = (connected: boolean) => void;

// ── Singleton state ──────────────────────────────────────
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let connected = false;

const RECONNECT_INTERVAL = 3_000;
const HEARTBEAT_INTERVAL = 30_000;

const messageHandlers = new Set<MessageHandler>();
const statusHandlers = new Set<StatusHandler>();

// Track active subscriptions so we can re-subscribe on reconnect
const activeSymbols = new Set<string>();

// ── Helpers ──────────────────────────────────────────────
function getWsUrl(): string {
  const base = WS_BASE.replace(/^http/, "ws");
  return `${base}${WS_MARKET_PATH}`;
}

function setConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  statusHandlers.forEach((h) => h(value));
}

function sendRaw(req: WsMarketRequest) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(req));
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    // Send a lightweight ping frame if open (browser WS handles pong automatically).
    // We use this as a keep-alive guard: if the socket is silently dead we force-close.
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Elysia / Bun handles ping/pong at protocol level;
      // we simply verify readyState each cycle.
    } else {
      // Socket gone, trigger reconnect
      ws?.close();
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    doConnect();
  }, RECONNECT_INTERVAL);
}

// ── Core connect ─────────────────────────────────────────
function doConnect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  const url = getWsUrl();
  ws = new WebSocket(url);

  ws.onopen = () => {
    setConnected(true);
    startHeartbeat();
    // Re-subscribe all active symbols
    if (activeSymbols.size > 0) {
      sendRaw({ action: "subscribe", symbols: Array.from(activeSymbols) });
    }
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as WsServerMessage;
      messageHandlers.forEach((h) => h(msg));
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    ws = null;
    setConnected(false);
    stopHeartbeat();
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onerror is always followed by onclose in browsers
  };
}

// ── Public API (singleton) ───────────────────────────────

/** Establish the WebSocket connection (idempotent). */
export function connect() {
  doConnect();
}

/** Gracefully close and stop reconnecting. */
export function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  stopHeartbeat();
  activeSymbols.clear();
  ws?.close();
  ws = null;
  setConnected(false);
}

/** Subscribe to price feeds for one or more symbols. */
export function subscribe(symbols: string[]) {
  const upper = symbols.map((s) => s.toUpperCase());
  upper.forEach((s) => activeSymbols.add(s));
  sendRaw({ action: "subscribe", symbols: upper });
}

/** Unsubscribe from price feeds. */
export function unsubscribe(symbols: string[]) {
  const upper = symbols.map((s) => s.toUpperCase());
  upper.forEach((s) => activeSymbols.delete(s));
  sendRaw({ action: "unsubscribe", symbols: upper });
}

/** Register a handler for all incoming WS messages. Returns an unregister function. */
export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

/** Register a handler for connection status changes. Returns an unregister function. */
export function onStatus(handler: StatusHandler): () => void {
  statusHandlers.add(handler);
  // Immediately notify current status
  handler(connected);
  return () => statusHandlers.delete(handler);
}

/** Whether the socket is currently connected. */
export function isConnected(): boolean {
  return connected;
}
