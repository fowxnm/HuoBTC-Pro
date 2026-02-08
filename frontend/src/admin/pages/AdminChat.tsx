import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { adminFetch } from "../store";
import { API_BASE } from "../../shared/config";
import { playNotificationSound } from "../lib/notify";

interface Conversation {
  uid: string;
  address: string;
  balanceUsdt: string;
  lastOnlineAt: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

interface ChatMsg {
  id: string;
  sender: string;
  content: string;
  imageUrl: string;
  createdAt: string;
}

export default function AdminChat() {
  const [convs, setConvs] = createSignal<Conversation[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [selectedUid, setSelectedUid] = createSignal<string | null>(null);
  const [msgs, setMsgs] = createSignal<ChatMsg[]>([]);
  const [msgsLoading, setMsgsLoading] = createSignal(false);
  const [input, setInput] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);
  let messagesEnd: HTMLDivElement | undefined;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let prevTotalUnread = -1;

  async function loadConvs() {
    try {
      const res = await adminFetch("/admin/chat/conversations");
      if (res.ok) {
        const data = await res.json() as Conversation[];
        const totalUnread = data.reduce((s, c) => s + c.unread, 0);
        if (prevTotalUnread >= 0 && totalUnread > prevTotalUnread) {
          playNotificationSound();
        }
        prevTotalUnread = totalUnread;
        setConvs(data);
      }
    } catch { /* */ }
    setLoading(false);
  }

  async function loadMessages(uid: string, silent = false) {
    if (!silent) setMsgsLoading(true);
    try {
      const res = await adminFetch(`/admin/chat/messages/${uid}`);
      if (res.ok) {
        const newMsgs = await res.json() as ChatMsg[];
        const prevLen = msgs().length;
        setMsgs(newMsgs);
        if (newMsgs.length > prevLen) scrollBottom();
      }
    } catch { /* */ }
    if (!silent) setMsgsLoading(false);
    if (!silent) scrollBottom();
  }

  function selectUser(uid: string) {
    setSelectedUid(uid);
    loadMessages(uid);
  }

  function scrollBottom() {
    setTimeout(() => messagesEnd?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function sendText() {
    const uid = selectedUid();
    const text = input().trim();
    if (!uid || !text) return;
    setSending(true);
    try {
      await adminFetch(`/admin/chat/send/${uid}`, {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      setInput("");
      await loadMessages(uid);
      await loadConvs();
    } catch { /* */ }
    setSending(false);
  }

  async function uploadImage(file: File) {
    const uid = selectedUid();
    if (!uid) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const token = (await import("../store")).getAdminToken();
      const uploadRes = await fetch(`${API_BASE}/admin/chat/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (uploadRes.ok) {
        const data = await uploadRes.json() as { url: string };
        await adminFetch(`/admin/chat/send/${uid}`, {
          method: "POST",
          body: JSON.stringify({ imageUrl: data.url }),
        });
        await loadMessages(uid);
        await loadConvs();
      }
    } catch { /* */ }
    setUploading(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
  }

  function imgUrl(url: string) {
    if (!url) return "";
    return url.startsWith("http") ? url : `${API_BASE}${url}`;
  }

  function timeAgo(iso: string) {
    if (!iso) return "—";
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(iso).toLocaleDateString("zh-CN");
  }

  onMount(() => {
    loadConvs();
    pollTimer = setInterval(() => {
      loadConvs();
      const uid = selectedUid();
      if (uid) loadMessages(uid, true);
    }, 3000);
  });
  onCleanup(() => { if (pollTimer) clearInterval(pollTimer); });

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", gap: "0" }}>
      {/* Left: conversation list */}
      <div style={{
        width: "300px", "min-width": "300px", "border-right": "1px solid #e5e7eb",
        background: "white", "overflow-y": "auto", display: "flex", "flex-direction": "column",
      }}>
        <div style={{ padding: "16px", "border-bottom": "1px solid #e5e7eb" }}>
          <h2 style={{ "font-size": "16px", "font-weight": "700", color: "#1f2937", margin: "0" }}>在线客服</h2>
          <p style={{ "font-size": "12px", color: "#9ca3af", margin: "4px 0 0" }}>{convs().length} 个对话</p>
        </div>
        <Show when={!loading()} fallback={<div style={{ padding: "20px", "text-align": "center", color: "#9ca3af" }}>加载中…</div>}>
          <Show when={convs().length > 0} fallback={<div style={{ padding: "20px", "text-align": "center", color: "#9ca3af", "font-size": "13px" }}>暂无对话</div>}>
            <For each={convs()}>
              {(c) => (
                <div
                  style={{
                    padding: "12px 16px", cursor: "pointer", "border-bottom": "1px solid #f3f4f6",
                    background: selectedUid() === c.uid ? "#eff6ff" : "transparent",
                    transition: "background .15s",
                  }}
                  onClick={() => selectUser(c.uid)}
                >
                  <div style={{ display: "flex", "align-items": "center", "justify-content": "space-between" }}>
                    <span style={{ "font-size": "13px", "font-weight": "600", color: "#1f2937", "font-family": "monospace" }}>{c.uid}</span>
                    <Show when={c.unread > 0}>
                      <span style={{
                        background: "#ef4444", color: "white", "font-size": "10px", "font-weight": "700",
                        padding: "1px 6px", "border-radius": "10px", "min-width": "18px", "text-align": "center",
                      }}>{c.unread}</span>
                    </Show>
                  </div>
                  <div style={{ "font-size": "11px", color: "#6b7280", "margin-top": "2px", "white-space": "nowrap", overflow: "hidden", "text-overflow": "ellipsis" }}>
                    {c.lastMessage || "…"}
                  </div>
                  <div style={{ "font-size": "10px", color: "#9ca3af", "margin-top": "3px" }}>
                    最近上线: {c.lastOnlineAt ? timeAgo(c.lastOnlineAt) : "未知"}
                  </div>
                </div>
              )}
            </For>
          </Show>
        </Show>
      </div>

      {/* Right: chat area */}
      <div style={{ flex: "1", display: "flex", "flex-direction": "column", background: "#f9fafb" }}>
        <Show when={selectedUid()} fallback={
          <div style={{ flex: "1", display: "flex", "align-items": "center", "justify-content": "center", color: "#9ca3af" }}>
            <div style={{ "text-align": "center" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <p style={{ "margin-top": "8px", "font-size": "14px" }}>选择一个对话开始回复</p>
            </div>
          </div>
        }>
          {/* Chat header */}
          {(() => {
            const conv = () => convs().find((c) => c.uid === selectedUid());
            return (
              <>
                <div style={{
                  padding: "12px 20px", background: "white", "border-bottom": "1px solid #e5e7eb",
                  display: "flex", "align-items": "center", "justify-content": "space-between",
                }}>
                  <div>
                    <div style={{ "font-size": "14px", "font-weight": "600", color: "#1f2937" }}>
                      UID: <span style={{ "font-family": "monospace" }}>{selectedUid()}</span>
                    </div>
                    <div style={{ "font-size": "11px", color: "#6b7280", "margin-top": "2px" }}>
                      {conv()?.address ? `${conv()!.address.slice(0, 10)}...${conv()!.address.slice(-6)}` : ""}
                      {conv()?.lastOnlineAt ? ` · 上线: ${timeAgo(conv()!.lastOnlineAt)}` : ""}
                    </div>
                  </div>
                  <div style={{ "font-size": "12px", color: "#6b7280" }}>
                    余额: <span style={{ "font-weight": "600" }}>{Number(conv()?.balanceUsdt || 0).toFixed(2)} USDT</span>
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: "1", "overflow-y": "auto", padding: "16px 20px", display: "flex", "flex-direction": "column", gap: "10px" }}>
                  <Show when={!msgsLoading()} fallback={<div style={{ "text-align": "center", color: "#9ca3af", padding: "20px" }}>加载中…</div>}>
                    <For each={msgs()}>
                      {(m) => (
                        <div style={{
                          display: "flex", "flex-direction": "column",
                          "align-items": m.sender === "admin" ? "flex-end" : "flex-start",
                        }}>
                          <div style={{ "font-size": "10px", color: "#9ca3af", "margin-bottom": "2px", padding: "0 4px" }}>
                            {m.sender === "admin" ? "客服" : "用户"}
                          </div>
                          <div style={{
                            "max-width": "70%", padding: "10px 14px", "border-radius": "12px",
                            "font-size": "13px", "line-height": "1.5", "word-break": "break-word",
                            background: m.sender === "admin" ? "#3b82f6" : "white",
                            color: m.sender === "admin" ? "white" : "#1f2937",
                            "box-shadow": m.sender === "admin" ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                          }}>
                            <Show when={m.imageUrl}>
                              <img src={imgUrl(m.imageUrl)} alt="img" style={{ "max-width": "100%", "max-height": "200px", "border-radius": "8px", "margin-bottom": m.content ? "6px" : "0" }} />
                            </Show>
                            <Show when={m.content}>
                              <div>{m.content}</div>
                            </Show>
                          </div>
                          <div style={{ "font-size": "10px", color: "#9ca3af", "margin-top": "2px", padding: "0 4px" }}>
                            {new Date(m.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                  <div ref={messagesEnd} />
                </div>

                {/* Input */}
                <div style={{
                  padding: "12px 20px", background: "white", "border-top": "1px solid #e5e7eb",
                  display: "flex", "align-items": "center", gap: "10px",
                }}>
                  <label style={{ cursor: "pointer", display: "flex", "align-items": "center", color: "#6b7280" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.currentTarget.files?.[0]; if (f) uploadImage(f); e.currentTarget.value = ""; }} />
                  </label>
                  <input
                    type="text"
                    style={{
                      flex: "1", border: "1px solid #d1d5db", "border-radius": "8px",
                      padding: "10px 12px", "font-size": "13px", outline: "none", background: "#f9fafb",
                    }}
                    placeholder={uploading() ? "图片上传中..." : "输入回复..."}
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
                      padding: "10px 20px", cursor: "pointer", color: "white", "font-size": "13px", "font-weight": "600",
                      opacity: sending() || !input().trim() ? "0.5" : "1",
                    }}
                  >
                    发送
                  </button>
                </div>
              </>
            );
          })()}
        </Show>
      </div>
    </div>
  );
}
