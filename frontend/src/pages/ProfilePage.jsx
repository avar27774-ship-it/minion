// ProfilePage.jsx — Playerok-style refactor
// API сохранён 100%:
//   GET  /api/users/:id             → { user, reviews, products }
//   GET  /api/auth/me               → собственный профиль
//   PUT  /api/users/me              → { bio, firstName, lastName }
//   GET  /api/products/my/listings  → активные лоты
//   DELETE /api/products/:id        → удалить лот
//   GET  /api/wallet/transactions   → история для графика доходов
import { useState, useEffect } from "react";
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
  purple:  "#7C3AED",
};

function authHeaders() {
  return { Authorization: `Bearer ${useStore.getState().token}` };
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating = 5 }) {
  return (
    <span style={{ fontSize: 13, letterSpacing: -1 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? T.yellow : T.muted }}>★</span>
      ))}
    </span>
  );
}

// ─── Income SVG chart ─────────────────────────────────────────────────────────
function IncomeChart({ txs }) {
  // Берём последние 7 дней доходов
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toDateString();
  });

  const grouped = days.map(dayStr => {
    const sum = txs
      .filter(t => ["sale","deposit"].includes(t.type) && t.status === "completed")
      .filter(t => new Date(t.createdAt || t.created_at * 1000).toDateString() === dayStr)
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);
    return sum;
  });

  const maxV = Math.max(...grouped, 1);
  const W = 300, H = 80;
  const pts = grouped.map((v, i) =>
    `${(i / (grouped.length - 1)) * W},${H - (v / maxV) * H}`
  ).join(" ");

  const area = [
    `0,${H}`,
    ...grouped.map((v, i) => `${(i / (grouped.length - 1)) * W},${H - (v / maxV) * H}`),
    `${W},${H}`,
  ].join(" ");

  const dayLabels = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginBottom: 6 }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={T.yellow} stopOpacity="0.25" />
            <stop offset="100%" stopColor={T.yellow} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon fill="url(#chartGrad)" points={area} />
        <polyline
          fill="none" stroke={T.yellow} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          points={pts}
        />
        {grouped.map((v, i) => (
          <circle
            key={i}
            cx={(i / (grouped.length - 1)) * W}
            cy={H - (v / maxV) * H}
            r="3"
            fill={T.yellow}
            opacity={v > 0 ? 1 : 0}
          />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {days.map((d, i) => (
          <span key={i} style={{ fontSize: 10, color: T.muted }}>
            {dayLabels[new Date(d).getDay() === 0 ? 6 : new Date(d).getDay() - 1]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Listing card ─────────────────────────────────────────────────────────────
function ListingCard({ product, onDelete, navigate }) {
  const [delLoading, setDelLoading] = useState(false);
  const statusColor = {
    active: T.green, paused: T.yellow, sold: T.muted, deleted: T.red,
  }[product.status] || T.muted;

  const handleDelete = async () => {
    if (!window.confirm("Удалить лот?")) return;
    setDelLoading(true);
    try {
      await axios.delete(`${API}/products/${product._id}`, { headers: authHeaders() });
      onDelete(product._id);
      toast.success("Лот удалён");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка");
    } finally {
      setDelLoading(false);
    }
  };

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "13px 14px", marginBottom: 10,
      display: "flex", gap: 12, alignItems: "center",
    }}>
      {/* Thumb */}
      <div style={{
        width: 50, height: 50, borderRadius: 12, flexShrink: 0,
        background: T.s2, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>
        {product.images?.[0]
          ? <img src={product.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : "🎮"
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: T.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 4,
        }}>{product.title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.yellow }}>
            ${parseFloat(product.price).toFixed(2)}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: statusColor,
            background: `${statusColor}15`, padding: "2px 8px", borderRadius: 20,
          }}>● {product.status}</span>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
          👁 {product.views || 0} · ❤️ {product.favorites || 0}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => navigate(`/products/${product._id}`)}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: T.s2, border: `1px solid ${T.border}`,
            cursor: "pointer", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >👁</button>
        <button
          onClick={handleDelete}
          disabled={delLoading}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(255,77,77,0.08)", border: "1px solid rgba(255,77,77,0.2)",
            cursor: "pointer", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >{delLoading ? "⏳" : "🗑"}</button>
      </div>
    </div>
  );
}

// ─── Edit profile modal ───────────────────────────────────────────────────────
function EditModal({ user, onClose, onSave }) {
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName,  setLastName]  = useState(user?.lastName  || "");
  const [bio,       setBio]       = useState(user?.bio       || "");
  const [loading,   setLoading]   = useState(false);

  // PUT /api/users/me
  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${API}/users/me`,
        { firstName, lastName, bio },
        { headers: authHeaders() }
      );
      onSave(data.user);
      toast.success("Профиль обновлён ✓");
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 480, margin: "0 auto",
        background: T.surface, borderRadius: "24px 24px 0 0",
        border: `1px solid ${T.border}`, padding: "6px 20px 40px",
        animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: T.border, margin: "12px auto 22px" }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 20 }}>Редактировать профиль</div>

        {[
          { label: "Имя", value: firstName, set: setFirstName, placeholder: "Ваше имя" },
          { label: "Фамилия", value: lastName, set: setLastName, placeholder: "Фамилия" },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 6 }}>{label}</div>
            <input
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              style={{
                width: "100%", background: T.s2, border: `1px solid ${T.border}`,
                borderRadius: 13, padding: "12px 14px",
                fontSize: 14, color: T.text, outline: "none",
                fontFamily: "'Onest', system-ui, sans-serif",
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 6 }}>О себе</div>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 300))}
            placeholder="Расскажите о себе..."
            rows={3}
            style={{
              width: "100%", background: T.s2, border: `1px solid ${T.border}`,
              borderRadius: 13, padding: "12px 14px",
              fontSize: 14, color: T.text, outline: "none", resize: "none",
              fontFamily: "'Onest', system-ui, sans-serif",
            }}
          />
          <div style={{ fontSize: 11, color: T.muted, textAlign: "right" }}>{bio.length}/300</div>
        </div>

        <button onClick={handleSave} disabled={loading} style={{
          width: "100%", padding: "14px",
          background: loading ? `${T.yellow}40` : T.yellow,
          border: "none", borderRadius: 13,
          fontSize: 15, fontWeight: 800, color: "#000",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Onest', system-ui, sans-serif",
          boxShadow: loading ? "none" : `0 4px 20px ${T.yellow}45`,
        }}>
          {loading ? "⏳ Сохранение..." : "Сохранить ✓"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ProfilePage ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { userId }   = useParams();
  const navigate     = useNavigate();
  const { user: me, login } = useStore();

  const isOwn = !userId || userId === me?._id;
  const targetId = isOwn ? me?._id : userId;

  const [profile,   setProfile]   = useState(null);
  const [reviews,   setReviews]   = useState([]);
  const [products,  setProducts]  = useState([]);
  const [listings,  setListings]  = useState([]);
  const [txs,       setTxs]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState("listings"); // listings | reviews | stats
  const [showEdit,  setShowEdit]  = useState(false);

  // GET /api/users/:id
  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    axios.get(`${API}/users/${targetId}`)
      .then(({ data }) => {
        setProfile(data.user);
        setReviews(data.reviews || []);
        setProducts(data.products || []);
      })
      .catch(() => toast.error("Ошибка загрузки профиля"))
      .finally(() => setLoading(false));

    if (isOwn) {
      // GET /api/products/my/listings
      axios.get(`${API}/products/my/listings`, { headers: authHeaders() })
        .then(({ data }) => setListings(data.products || []))
        .catch(() => {});

      // GET /api/wallet/transactions (for chart)
      axios.get(`${API}/wallet/transactions`, { headers: authHeaders() })
        .then(({ data }) => setTxs(data.transactions || []))
        .catch(() => {});
    }
  }, [targetId, isOwn]);

  const p = profile || me;
  const av = (p?.username || p?.firstName || "?")[0].toUpperCase();
  const salesTotal = txs
    .filter(t => t.type === "sale" && t.status === "completed")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 28, opacity: 0.4 }}>👤</div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ fontFamily: "'Onest', system-ui, sans-serif", paddingBottom: 110, animation: "fadeUp 0.3s ease" }}>

        {/* ── Hero banner ── */}
        <div style={{
          background: `linear-gradient(180deg, #1a1020 0%, ${T.bg} 100%)`,
          padding: "28px 18px 20px",
          position: "relative", overflow: "hidden",
        }}>
          {/* BG glow */}
          <div style={{
            position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)",
            width: 200, height: 200, borderRadius: "50%",
            background: T.purple, opacity: 0.08, filter: "blur(50px)", pointerEvents: "none",
          }} />

          {/* Avatar */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 14 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 76, height: 76, borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30, fontWeight: 900, color: "#000",
                border: `3px solid ${T.bg}`,
                boxShadow: `0 0 0 2px ${T.yellow}40`,
              }}>{av}</div>
              {p?.isVerified && (
                <div style={{
                  position: "absolute", bottom: 2, right: 2,
                  width: 22, height: 22, borderRadius: "50%",
                  background: "#29B6F6", border: `2px solid ${T.bg}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#fff", fontWeight: 700,
                }}>✓</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: T.text, letterSpacing: "-0.4px" }}>
                @{p?.username}
              </div>
              {(p?.firstName || p?.lastName) && (
                <div style={{ fontSize: 14, color: T.dim, marginTop: 2 }}>
                  {[p.firstName, p.lastName].filter(Boolean).join(" ")}
                </div>
              )}
            </div>
            {isOwn && (
              <button onClick={() => setShowEdit(true)} style={{
                background: T.s2, border: `1px solid ${T.border}`,
                borderRadius: 11, padding: "8px 14px",
                fontSize: 13, color: T.dim, cursor: "pointer",
                fontFamily: "'Onest', system-ui, sans-serif",
              }}>✏️ Изменить</button>
            )}
          </div>

          {/* Bio */}
          {p?.bio && (
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6, marginBottom: 14 }}>
              {p.bio}
            </div>
          )}

          {/* Stats strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}>
            {[
              { label: "Продаж", value: p?.totalSales || 0 },
              { label: "Рейтинг", value: `${(p?.rating || 5).toFixed(1)}★` },
              { label: "Отзывов", value: p?.reviewCount || 0 },
              { label: "На сайте", value: p?.createdAt
                ? `${Math.floor((Date.now() / 1000 - p.createdAt) / 86400)}д`
                : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: `${T.surface}90`, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "10px 8px", textAlign: "center",
              }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{value}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons (non-own) ── */}
        {!isOwn && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "14px 16px 4px" }}>
            <button onClick={() => navigate(`/messages/${userId}`)} style={{
              padding: "12px", borderRadius: 13,
              background: T.yellow, border: "none",
              fontSize: 14, fontWeight: 700, color: "#000",
              cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
            }}>💬 Написать</button>
            <button onClick={() => navigate(`/catalog?seller=${userId}`)} style={{
              padding: "12px", borderRadius: 13,
              background: T.s2, border: `1px solid ${T.border}`,
              fontSize: 14, fontWeight: 700, color: T.dim,
              cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
            }}>🛍 Лоты</button>
          </div>
        )}

        {/* ── Tabs ── */}
        {isOwn && (
          <div style={{ display: "flex", padding: "14px 16px 0", gap: 8 }}>
            {[
              { id: "listings", label: "📦 Мои лоты" },
              { id: "stats",    label: "📊 Статистика" },
              { id: "reviews",  label: "⭐ Отзывы" },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: "9px 4px", borderRadius: 11,
                background: tab === t.id ? T.yellow : T.s2,
                border: `1px solid ${tab === t.id ? T.yellow : T.border}`,
                fontSize: 12, fontWeight: 700,
                color: tab === t.id ? "#000" : T.dim,
                cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
                transition: "all 0.2s",
              }}>{t.label}</button>
            ))}
          </div>
        )}

        <div style={{ padding: "16px 16px 0" }}>

          {/* ── Listings tab ── */}
          {(tab === "listings" || !isOwn) && (
            <>
              {isOwn && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                      Активные лоты <span style={{ color: T.muted }}>({listings.length})</span>
                    </div>
                    <button onClick={() => navigate("/sell")} style={{
                      background: `${T.yellow}15`, border: `1px solid ${T.yellow}30`,
                      borderRadius: 20, padding: "5px 14px",
                      fontSize: 12, fontWeight: 700, color: T.yellow,
                      cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
                    }}>+ Добавить</button>
                  </div>
                  {listings.map(l => (
                    <ListingCard
                      key={l._id} product={l}
                      onDelete={id => setListings(prev => prev.filter(x => x._id !== id))}
                      navigate={navigate}
                    />
                  ))}
                  {listings.length === 0 && (
                    <div style={{ textAlign: "center", paddingTop: 30, color: T.muted }}>
                      <div style={{ fontSize: 36 }}>📦</div>
                      <div style={{ marginTop: 10, fontSize: 14 }}>Нет активных лотов</div>
                      <button onClick={() => navigate("/sell")} style={{
                        marginTop: 14, padding: "10px 20px", borderRadius: 12,
                        background: T.yellow, border: "none",
                        fontSize: 14, fontWeight: 700, color: "#000",
                        cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
                      }}>Создать первый лот →</button>
                    </div>
                  )}
                </>
              )}

              {!isOwn && products.map(p => (
                <div
                  key={p._id}
                  onClick={() => navigate(`/products/${p._id}`)}
                  style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 16, padding: "13px 14px", marginBottom: 10,
                    display: "flex", gap: 12, alignItems: "center", cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 50, height: 50, borderRadius: 12, background: T.s2,
                    overflow: "hidden", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  }}>
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "🎮"
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>
                      {p.category} · 👁 {p.views}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.yellow }}>
                    ${p.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Stats tab ── */}
          {isOwn && tab === "stats" && (
            <div>
              {/* Income card */}
              <div style={{
                background: `linear-gradient(135deg, #1a1a00, #242400)`,
                border: `1px solid ${T.yellow}25`,
                borderRadius: 18, padding: "18px 18px 14px", marginBottom: 14,
              }}>
                <div style={{ fontSize: 12, color: `${T.yellow}80`, fontWeight: 600, marginBottom: 8, letterSpacing: "0.06em" }}>
                  💰 ДОХОД ЗА 7 ДНЕЙ
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: T.yellow, letterSpacing: "-0.5px", marginBottom: 16 }}>
                  +${salesTotal.toFixed(2)}
                </div>
                <IncomeChart txs={txs} />
              </div>

              {/* Detailed stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Активных лотов", value: listings.filter(l => l.status === "active").length, icon: "📦" },
                  { label: "Всего продаж",   value: p?.totalSales || 0,       icon: "🤝" },
                  { label: "Средний чек",    value: p?.totalSales > 0 ? `$${(salesTotal / p.totalSales).toFixed(2)}` : "$0", icon: "💳" },
                  { label: "Рейтинг",        value: `${(p?.rating || 5).toFixed(1)} ★`, icon: "⭐" },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{
                    background: T.surface, border: `1px solid ${T.border}`,
                    borderRadius: 16, padding: "14px",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{value}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => navigate("/deals")} style={{
                  padding: "13px", borderRadius: 13,
                  background: T.s2, border: `1px solid ${T.border}`,
                  fontSize: 13, fontWeight: 700, color: T.dim,
                  cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
                }}>🤝 Мои сделки</button>
                <button onClick={() => navigate("/wallet")} style={{
                  padding: "13px", borderRadius: 13,
                  background: `${T.yellow}12`, border: `1px solid ${T.yellow}25`,
                  fontSize: 13, fontWeight: 700, color: T.yellow,
                  cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
                }}>💳 Кошелёк</button>
              </div>
            </div>
          )}

          {/* ── Reviews tab ── */}
          {(tab === "reviews" || !isOwn) && tab !== "listings" && tab !== "stats" && (
            <div>
              {!isOwn && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <Stars rating={p?.rating} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                    {(p?.rating || 5).toFixed(1)}
                  </span>
                  <span style={{ fontSize: 13, color: T.muted }}>({reviews.length} отзывов)</span>
                </div>
              )}

              {reviews.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: 30, color: T.muted }}>
                  <div style={{ fontSize: 36 }}>⭐</div>
                  <div style={{ marginTop: 10, fontSize: 14 }}>Отзывов пока нет</div>
                </div>
              )}

              {reviews.map((r, i) => (
                <div key={r._id || i} style={{
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 16, padding: "14px 16px", marginBottom: 10,
                  animation: `fadeUp 0.3s ${i * 0.04}s ease both`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${T.purple}, #A78BFA)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 800, color: "#fff",
                      }}>
                        {(r.reviewer_username || "?")[0].toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        @{r.reviewer_username}
                      </span>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && (
                    <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>{r.comment}</div>
                  )}
                  {r.product_title && (
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>
                      📦 {r.product_title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Own profile bottom actions ── */}
          {isOwn && tab === "listings" && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
              <button onClick={() => {
                useStore.getState().logout();
                navigate("/");
              }} style={{
                width: "100%", padding: "13px",
                background: "rgba(255,77,77,0.07)", border: "1px solid rgba(255,77,77,0.15)",
                borderRadius: 13, fontSize: 14, fontWeight: 700, color: T.red,
                cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
              }}>
                → Выйти из аккаунта
              </button>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditModal
          user={me}
          onClose={() => setShowEdit(false)}
          onSave={(updatedUser) => {
            login(updatedUser, useStore.getState().token);
            setProfile(updatedUser);
          }}
        />
      )}
    </>
  );
}
