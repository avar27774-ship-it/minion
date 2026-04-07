// MessagesPage.jsx — Playerok-style refactor
// API сохранён 100%:
//   GET  /api/messages              → список диалогов (dialogs[])
//   GET  /api/messages/:userId      → переписка + partner
//   POST /api/messages/:userId      → отправить { text, image }
//   GET  /api/messages/unread/count → { count }
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useStore } from "../store";

const API = "/api";
const T = {
  bg:      "#0D0D0E",
  surface: "#1B1B1D",
  s2:      "#242426",
  border:  "rgba(255,255,255,0.07)",
  yellow:  "#FFD600",
  green:   "#39FF14",
  text:    "#FFFFFF",
  muted:   "rgba(255,255,255,0.38)",
  dim:     "rgba(255,255,255,0.6)",
  red:     "#FF4D4D",
};

function authHeaders() {
  return { Authorization: `Bearer ${useStore.getState().token}` };
}

function timeAgo(ts) {
  if (!ts) return "";
  const sec = Math.floor(Date.now() / 1000 - (typeof ts === "number" ? ts : new Date(ts).getTime() / 1000));
  if (sec < 60)    return "только что";
  if (sec < 3600)  return `${Math.floor(sec / 60)} мин`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} ч`;
  return new Date(typeof ts === "number" ? ts * 1000 : ts).toLocaleDateString("ru");
}

function formatTime(ts) {
  if (!ts) return "";
  const d = typeof ts === "number" ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

// ─── Dialogs list ─────────────────────────────────────────────────────────────
function DialogsList({ onSelect }) {
  const [dialogs, setDialogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/messages`, { headers: authHeaders() })
      .then(({ data }) => setDialogs(data.dialogs || []))
      .catch(() => toast.error("Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
      <div style={{ fontSize: 28, opacity: 0.5 }}>💬</div>
    </div>
  );

  if (!dialogs.length) return (
    <div style={{ textAlign: "center", paddingTop: 80, color: T.muted }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.dim }}>Нет сообщений</div>
      <div style={{ fontSize: 13, marginTop: 6 }}>Начните общение с продавцом</div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.4px" }}>
          Сообщения
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
          {dialogs.length} {dialogs.length === 1 ? "диалог" : "диалогов"}
        </div>
      </div>

      {dialogs.map((d) => {
        const unread = parseInt(d.unread_count) || 0;
        const av = (d.partner_username || "?")[0].toUpperCase();
        const isMine = d.last_sender_id === user?._id;

        return (
          <div
            key={d.partner_id}
            onClick={() => navigate(`/messages/${d.partner_id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 13,
              padding: "13px 16px",
              borderBottom: `1px solid ${T.border}`,
              cursor: "pointer",
              background: unread > 0 ? `${T.yellow}05` : "transparent",
              transition: "background 0.15s",
            }}
          >
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 50, height: 50, borderRadius: "50%",
                background: `linear-gradient(135deg, #5B21B6, #7C3AED)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 800, color: "#fff",
              }}>{av}</div>
              {d.partner_verified && (
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#29B6F6", border: `2px solid ${T.bg}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, color: "#fff",
                }}>✓</div>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: unread > 0 ? 700 : 600, color: T.text }}>
                  @{d.partner_username}
                </span>
                <span style={{ fontSize: 11, color: T.muted }}>
                  {timeAgo(d.last_time)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {isMine && (
                  <span style={{ fontSize: 12, color: T.muted }}>Вы: </span>
                )}
                <span style={{
                  fontSize: 13, color: unread > 0 ? T.dim : T.muted,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  flex: 1, fontWeight: unread > 0 ? 600 : 400,
                }}>
                  {d.last_text || "Медиа"}
                </span>
                {unread > 0 && (
                  <div style={{
                    minWidth: 20, height: 20, borderRadius: 10,
                    background: T.yellow, color: "#000",
                    fontSize: 11, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 6px", flexShrink: 0,
                  }}>{unread}</div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, isMe }) {
  if (msg.is_system) {
    return (
      <div style={{ textAlign: "center", margin: "10px 0" }}>
        <span style={{
          fontSize: 12, color: T.muted,
          background: T.s2, padding: "5px 14px", borderRadius: 20,
          border: `1px solid ${T.border}`,
          display: "inline-block",
        }}>🔔 {msg.text}</span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      justifyContent: isMe ? "flex-end" : "flex-start",
      marginBottom: 8,
      animation: "fadeUp 0.2s ease",
    }}>
      <div style={{
        maxWidth: "78%",
        background: isMe
          ? `linear-gradient(135deg, ${T.yellow}, #FF8C00)`
          : T.s2,
        borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "10px 14px",
        border: isMe ? "none" : `1px solid ${T.border}`,
      }}>
        {msg.image && (
          <img
            src={msg.image}
            alt=""
            style={{
              width: "100%", borderRadius: 10,
              marginBottom: msg.text ? 8 : 0,
              maxHeight: 200, objectFit: "cover",
            }}
          />
        )}
        {msg.text && msg.text !== "📷 Фото" && (
          <div style={{
            fontSize: 14, lineHeight: 1.5,
            color: isMe ? "#000" : T.text,
            wordBreak: "break-word",
          }}>{msg.text}</div>
        )}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          gap: 4, marginTop: 4,
        }}>
          <span style={{ fontSize: 10, color: isMe ? "rgba(0,0,0,0.45)" : T.muted }}>
            {formatTime(msg.created_at)}
          </span>
          {isMe && (
            <span style={{ fontSize: 10, color: msg.is_read ? "#29B6F6" : "rgba(0,0,0,0.35)" }}>
              {msg.is_read ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chat view ────────────────────────────────────────────────────────────────
function ChatView({ userId }) {
  const navigate = useNavigate();
  const { user } = useStore();
  const [partner, setPartner]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  // GET /api/messages/:userId
  const loadChat = useCallback(() => {
    axios.get(`${API}/messages/${userId}`, { headers: authHeaders() })
      .then(({ data }) => {
        setPartner(data.partner);
        setMessages(data.messages || []);
      })
      .catch(() => toast.error("Ошибка загрузки чата"))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    loadChat();
    const poll = setInterval(loadChat, 8000); // polling
    return () => clearInterval(poll);
  }, [loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // POST /api/messages/:userId
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const { data } = await axios.post(
        `${API}/messages/${userId}`,
        { text: trimmed },
        { headers: authHeaders() }
      );
      setMessages(prev => [...prev, data.message]);
      setText("");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const av = (partner?.username || "?")[0].toUpperCase();

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 28, opacity: 0.4 }}>💬</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>

      {/* ── Chat header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: `1px solid ${T.border}`,
        background: "rgba(13,13,14,0.95)",
        backdropFilter: "blur(16px)",
        position: "sticky", top: 60, zIndex: 40,
        flexShrink: 0,
      }}>
        <button onClick={() => navigate("/messages")} style={{
          background: "none", border: "none", cursor: "pointer",
          color: T.muted, fontSize: 20, padding: 0,
        }}>←</button>

        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "linear-gradient(135deg, #5B21B6, #7C3AED)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>{av}</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            @{partner?.username}
            {partner?.is_verified && <span style={{ color: "#29B6F6", fontSize: 12 }}> ✓</span>}
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>
            {partner?.total_sales || 0} продаж
          </div>
        </div>

        <button
          onClick={() => navigate(`/profile/${userId}`)}
          style={{
            background: T.s2, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "6px 12px",
            fontSize: 12, color: T.dim, cursor: "pointer",
            fontFamily: "'Onest', system-ui, sans-serif",
          }}
        >Профиль</button>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "16px 14px 8px",
        display: "flex", flexDirection: "column",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, paddingTop: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
            <div style={{ fontSize: 14 }}>Начните диалог с @{partner?.username}</div>
          </div>
        )}

        {/* Group by date */}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?._id;
          const curr = new Date((msg.created_at || 0) * 1000).toDateString();
          const prev = i > 0 ? new Date((messages[i-1].created_at || 0) * 1000).toDateString() : null;
          const showDate = curr !== prev;

          return (
            <div key={msg.id || i}>
              {showDate && (
                <div style={{ textAlign: "center", margin: "12px 0 8px", fontSize: 11, color: T.muted }}>
                  {new Date((msg.created_at || 0) * 1000).toLocaleDateString("ru", {
                    day: "numeric", month: "long",
                  })}
                </div>
              )}
              <Bubble msg={msg} isMe={isMe} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        padding: "10px 12px calc(env(safe-area-inset-bottom, 0px) + 80px)",
        borderTop: `1px solid ${T.border}`,
        background: "rgba(13,13,14,0.97)",
        backdropFilter: "blur(16px)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: T.s2, borderRadius: 16,
          border: `1px solid ${T.border}`,
          padding: "8px 12px",
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 14, color: T.text, resize: "none",
              fontFamily: "'Onest', system-ui, sans-serif",
              lineHeight: 1.5, maxHeight: 100, overflowY: "auto",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              background: text.trim() ? T.yellow : T.surface,
              border: "none", cursor: text.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, transition: "all 0.2s",
              boxShadow: text.trim() ? `0 2px 12px ${T.yellow}40` : "none",
            }}
          >
            {sending ? "⏳" : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={text.trim() ? "#000" : T.muted} strokeWidth="2.5" strokeLinecap="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>}
          </button>
        </div>
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center", marginTop: 6 }}>
          Enter — отправить · Shift+Enter — новая строка
        </div>
      </div>
    </div>
  );
}

// ─── Root MessagesPage ────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { userId } = useParams();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{ fontFamily: "'Onest', system-ui, sans-serif", minHeight: "100vh", background: T.bg }}>
        {userId ? <ChatView userId={userId} /> : <DialogsList />}
      </div>
    </>
  );
}
