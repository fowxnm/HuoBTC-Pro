import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { useWallet } from "@shared/wallet-store";
import { API_BASE } from "@shared/config";

interface ChatMsg {
  id: string;
  sender: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

export default function ChatWidget() {
  const wallet = useWallet();
  const [open, setOpen] = createSignal(false);
  const [msgs, setMsgs] = createSignal<ChatMsg[]>([]);
  const [input, setInput] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  const [unread, setUnread] = createSignal(0);
  let messagesEnd: HTMLDivElement | undefined;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let prevAdminCount = -1;

  const isConnected = () => wallet().status === "connected";
  const token = () => { const w = wallet(); return w.status === "connected" ? w.token : ""; };

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: `Bearer ${token()}` };
  }

  function playSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch { /* */ }
  }

  async function loadMessages() {
    if (!token()) return;
    try {
      const res = await fetch(`${API_BASE}/chat/messages`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as ChatMsg[];
        const adminMsgs = data.filter((m) => m.sender === "admin").length;
        // Detect new admin messages
        if (prevAdminCount >= 0 && adminMsgs > prevAdminCount) {
          playSound();
          if (!open()) setUnread((u) => u + (adminMsgs - prevAdminCount));
        }
        prevAdminCount = adminMsgs;
        setMsgs(data);
        if (open()) scrollBottom();
      }
    } catch { /* */ }
  }

  function scrollBottom() {
    setTimeout(() => messagesEnd?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function sendText() {
    const text = input().trim();
    if (!text || !token()) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setInput("");
        await loadMessages();
      }
    } catch { /* */ }
    setSending(false);
  }

  async function uploadImage(file: File) {
    if (!token()) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API_BASE}/chat/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      if (res.ok) {
        const data = await res.json() as { url: string };
        await fetch(`${API_BASE}/chat/send`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ imageUrl: data.url }),
        });
        await loadMessages();
      }
    } catch { /* */ }
    setUploading(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
  }

  onMount(() => {
    loadMessages();
    pollTimer = setInterval(loadMessages, 5000);
  });
  onCleanup(() => { if (pollTimer) clearInterval(pollTimer); });

  function imgUrl(url: string) {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
  }

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", "z-index": "9999" }}>
      {/* Floating button */}
      <Show when={!open()}>
        <button
          type="button"
          onClick={() => { setOpen(true); setUnread(0); loadMessages(); }}
          style={{
            position: "relative",
            width: "56px", height: "56px", "border-radius": "50%",
            background: "linear-gradient(135deg, #6366f1, #3b82f6)",
            border: "none", cursor: "pointer", "box-shadow": "0 4px 20px rgba(99,102,241,0.4)",
            display: "flex", "align-items": "center", "justify-content": "center",
            transition: "transform .2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <Show when={unread() > 0}>
            <span style={{
              position: "absolute", top: "-4px", right: "-4px",
              background: "#ef4444", color: "white", "font-size": "11px", "font-weight": "700",
              "min-width": "20px", height: "20px", "border-radius": "10px",
              display: "flex", "align-items": "center", "justify-content": "center",
              padding: "0 5px", "box-shadow": "0 2px 6px rgba(239,68,68,0.5)",
            }}>{unread()}</span>
          </Show>
        </button>
      </Show>

      {/* Chat panel */}
      <Show when={open()}>
        <div style={{
          width: "340px", height: "480px", background: "#1a1d23", "border-radius": "16px",
          "box-shadow": "0 8px 40px rgba(0,0,0,0.5)", display: "flex", "flex-direction": "column",
          overflow: "hidden", border: "1px solid #30363d",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px", background: "linear-gradient(135deg, #6366f1, #3b82f6)",
            display: "flex", "align-items": "center", "justify-content": "space-between",
          }}>
            <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span style={{ color: "white", "font-weight": "600", "font-size": "14px" }}>在线客服</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: "white", cursor: "pointer", "font-size": "18px", padding: "0",
            }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: "1", "overflow-y": "auto", padding: "12px", display: "flex", "flex-direction": "column", gap: "8px",
          }}>
            <Show when={!isConnected()}>
              <div style={{ "text-align": "center", color: "#8b949e", "font-size": "13px", padding: "40px 0" }}>
                请先连接钱包后使用在线客服
              </div>
            </Show>
            <Show when={isConnected() && msgs().length === 0}>
              <div style={{ "text-align": "center", color: "#8b949e", "font-size": "13px", padding: "40px 0" }}>
                您好！有什么可以帮助您的？
              </div>
            </Show>
            <For each={msgs()}>
              {(m) => (
                <div style={{
                  display: "flex", "flex-direction": "column",
                  "align-items": m.sender === "user" ? "flex-end" : "flex-start",
                }}>
                  <div style={{
                    "max-width": "80%", padding: "8px 12px", "border-radius": "12px",
                    "font-size": "13px", "line-height": "1.5", "word-break": "break-word",
                    background: m.sender === "user" ? "#3b82f6" : "#2d333b",
                    color: m.sender === "user" ? "white" : "#e6edf3",
                  }}>
                    <Show when={m.imageUrl}>
                      <img src={imgUrl(m.imageUrl)} alt="img" style={{ "max-width": "100%", "border-radius": "8px", "margin-bottom": m.content ? "6px" : "0" }} />
                    </Show>
                    <Show when={m.content}>
                      <div>{m.content}</div>
                    </Show>
                  </div>
                  <div style={{ "font-size": "10px", color: "#6e7681", "margin-top": "2px", padding: "0 4px" }}>
                    {new Date(m.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              )}
            </For>
            <div ref={messagesEnd} />
          </div>

          {/* Input area */}
          <Show when={isConnected()}>
            <div style={{
              padding: "10px 12px", "border-top": "1px solid #30363d",
              display: "flex", "align-items": "center", gap: "8px", background: "#161b22",
            }}>
              <label style={{ cursor: "pointer", display: "flex", "align-items": "center", color: "#8b949e" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
              </label>
              <input
                type="text"
                style={{
                  flex: "1", background: "#0d1117", border: "1px solid #30363d", "border-radius": "8px",
                  padding: "8px 10px", color: "#e6edf3", "font-size": "13px", outline: "none",
                }}
                placeholder={uploading() ? "图片上传中..." : "输入消息..."}
                value={input()}
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                disabled={sending() || uploading()}
              />
              <button
                type="button"
                onClick={sendText}
                disabled={sending() || !input().trim()}
                style={{
                  background: "#3b82f6", border: "none", "border-radius": "8px",
                  padding: "8px 12px", cursor: "pointer", color: "white", "font-size": "13px",
                  opacity: sending() || !input().trim() ? "0.5" : "1",
                }}
              >
                发送
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
