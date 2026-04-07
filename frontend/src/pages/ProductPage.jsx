// ProductPage.jsx — Playerok-style refactor
// API сохранён 100%:
//   GET  /api/products/:id         → product + seller
//   GET  /api/products/:id/similar → похожие товары
//   POST /api/products/:id/favorite → добавить в избранное
//   POST /api/deals                 → создать сделку (покупка)
//   GET  /api/users/:id             → профиль продавца
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
};

// ─── Star rating ──────────────────────────────────────────────────────────────
function Stars({ rating = 5, size = 14 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: -1, color: T.yellow }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.25 }}>★</span>
      ))}
    </span>
  );
}

// ─── Seller card ──────────────────────────────────────────────────────────────
function SellerCard({ seller, navigate }) {
  const online = seller?.lastActive && (Date.now() / 1000 - seller.lastActive) < 300;
  const av = (seller?.username || seller?.firstName || "?")[0].toUpperCase();

  return (
    <div
      onClick={() => navigate(`/profile/${seller?._id}`)}
      style={{
        background: T.s2, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", marginBottom: 16,
        transition: "border-color 0.2s",
      }}
    >
      {/* Avatar */}
      <div style={{ position: "relative" }}>
        <div style={{
          width: 46, height: 46, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "#000", flexShrink: 0,
        }}>{av}</div>
        <div style={{
          position: "absolute", bottom: 0, right: 0,
          width: 12, height: 12, borderRadius: "50%",
          background: online ? T.green : T.muted,
          border: `2px solid ${T.s2}`,
          boxShadow: online ? `0 0 6px ${T.green}` : "none",
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
            @{seller?.username}
          </span>
          {seller?.isVerified && (
            <span style={{ fontSize: 12, color: "#29B6F6" }}>✓</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
          <Stars rating={seller?.rating || 5} size={12} />
          <span style={{ fontSize: 12, color: T.muted }}>
            {(seller?.rating || 5).toFixed(1)} · {seller?.reviewCount || 0} отзывов
          </span>
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Продаж</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{seller?.totalSales || 0}</div>
      </div>

      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round">
        <path d="m9 18 6-6-6-6"/>
      </svg>
    </div>
  );
}

// ─── Image gallery ────────────────────────────────────────────────────────────
function Gallery({ images }) {
  const [active, setActive] = useState(0);
  if (!images?.length) {
    return (
      <div style={{
        height: 220, background: T.s2, borderRadius: 18,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 56, marginBottom: 16,
        border: `1px solid ${T.border}`,
      }}>🎮</div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <img
        src={images[active]}
        alt=""
        style={{
          width: "100%", height: 220, objectFit: "cover",
          borderRadius: 18, display: "block",
          border: `1px solid ${T.border}`,
        }}
      />
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, overflowX: "auto" }}>
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              onClick={() => setActive(i)}
              style={{
                width: 60, height: 60, objectFit: "cover",
                borderRadius: 10, cursor: "pointer", flexShrink: 0,
                border: `2px solid ${i === active ? T.yellow : "transparent"}`,
                transition: "border-color 0.2s",
                boxShadow: i === active ? `0 0 10px ${T.yellow}40` : "none",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Checkout modal ───────────────────────────────────────────────────────────
function CheckoutModal({ product, onClose, onConfirm, loading }) {
  const { user } = useStore();
  const balance = parseFloat(user?.balance || 0);
  const price   = product?.price || 0;
  const enough  = balance >= price;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
        }}
      />

      {/* Sheet */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 480, margin: "0 auto",
        background: T.surface, borderRadius: "24px 24px 0 0",
        border: `1px solid ${T.border}`,
        padding: "6px 20px 40px",
        animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* Handle */}
        <div style={{
          width: 40, height: 4, borderRadius: 4,
          background: T.border, margin: "12px auto 20px",
        }} />

        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          Подтвердить покупку
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
          Безопасная сделка через эскроу
        </div>

        {/* Product row */}
        <div style={{
          background: T.s2, borderRadius: 14, padding: "14px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, border: `1px solid ${T.border}`,
        }}>
          <div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 4 }}>Товар</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, maxWidth: 200,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {product?.title}
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.yellow }}>
            ${price.toFixed(2)}
          </div>
        </div>

        {/* Balance */}
        <div style={{
          background: enough ? `${T.green}0D` : `${T.red}0D`,
          border: `1px solid ${enough ? T.green + "30" : T.red + "30"}`,
          borderRadius: 14, padding: "12px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 12, color: T.muted }}>Ваш баланс</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: enough ? T.green : T.red }}>
              ${balance.toFixed(2)}
            </div>
          </div>
          {!enough && (
            <div style={{ fontSize: 12, color: T.red, fontWeight: 600 }}>
              Не хватает ${(price - balance).toFixed(2)}
            </div>
          )}
          {enough && (
            <div style={{ fontSize: 20 }}>✅</div>
          )}
        </div>

        {/* Commission note */}
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 20, textAlign: "center" }}>
          🛡️ Средства заморожены до подтверждения получения товара.{" "}
          Комиссия сервиса: 5%
        </div>

        {enough ? (
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              width: "100%", padding: "15px",
              background: loading ? `${T.yellow}40` : T.yellow,
              border: "none", borderRadius: 14,
              fontSize: 16, fontWeight: 800, color: "#000",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : `0 4px 24px ${T.yellow}55`,
              fontFamily: "'Onest', system-ui, sans-serif",
            }}
          >
            {loading ? "⏳ Обработка..." : `Купить за $${price.toFixed(2)} →`}
          </button>
        ) : (
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "15px",
              background: "#5B21B6", border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 700, color: "#fff",
              cursor: "pointer",
              fontFamily: "'Onest', system-ui, sans-serif",
            }}
          >
            💳 Пополнить кошелёк
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ProductPage ─────────────────────────────────────────────────────────
export default function ProductPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useStore();

  const [product, setProduct]     = useState(null);
  const [similar, setSimilar]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [faved, setFaved]         = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [showBuy, setShowBuy]     = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [expanded, setExpanded]   = useState(false);

  // GET /api/products/:id
  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/products/${id}`)
      .then(({ data }) => setProduct(data))
      .catch(() => toast.error("Товар не найден"))
      .finally(() => setLoading(false));

    // GET /api/products/:id/similar
    axios.get(`${API}/products/${id}/similar`)
      .then(({ data }) => setSimilar(data.products || []))
      .catch(() => {});
  }, [id]);

  // POST /api/products/:id/favorite
  const handleFav = async () => {
    if (!user) { navigate("/auth"); return; }
    setFavLoading(true);
    try {
      await axios.post(`${API}/products/${id}/favorite`, {}, {
        headers: { Authorization: `Bearer ${useStore.getState().token}` },
      });
      setFaved(f => !f);
    } catch {
      toast.error("Ошибка");
    } finally {
      setFavLoading(false);
    }
  };

  // POST /api/deals — создать сделку
  const handleBuy = async () => {
    if (!user) { navigate("/auth"); return; }
    setBuyLoading(true);
    try {
      const { data } = await axios.post(`${API}/deals`, { productId: id }, {
        headers: { Authorization: `Bearer ${useStore.getState().token}` },
      });
      toast.success("Сделка создана! 🎉");
      setShowBuy(false);
      navigate(`/deals/${data.deal?._id || data._id}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка создания сделки");
    } finally {
      setBuyLoading(false);
    }
  };

  const isOwn = user && product?.seller?._id === user._id;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 32, animation: "spin 1s linear infinite" }}>⌛</div>
    </div>
  );

  if (!product) return (
    <div style={{ padding: "60px 20px", textAlign: "center", color: T.muted }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>Товар не найден</div>
    </div>
  );

  const descWords = product.description?.split(" ") || [];
  const isLong    = descWords.length > 40;
  const shortDesc = isLong && !expanded
    ? descWords.slice(0, 40).join(" ") + "..."
    : product.description;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ fontFamily: "'Onest', system-ui, sans-serif", animation: "fadeUp 0.3s ease" }}>

        {/* ── Back button ── */}
        <div style={{ padding: "12px 16px 0" }}>
          <button onClick={() => navigate(-1)} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 11, padding: "8px 14px",
            fontSize: 13, color: T.dim, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'Onest', system-ui, sans-serif",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Назад
          </button>
        </div>

        <div style={{ padding: "16px 16px 120px" }}>

          {/* ── Gallery ── */}
          <Gallery images={product.images} />

          {/* ── Badges row ── */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {product.isPromoted && (
              <span style={{ background: `${T.yellow}18`, color: T.yellow, border: `1px solid ${T.yellow}30`,
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                ⚡ Продвигается
              </span>
            )}
            {product.deliveryType === "auto" && (
              <span style={{ background: `${T.green}12`, color: T.green, border: `1px solid ${T.green}30`,
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                🤖 Авто-доставка
              </span>
            )}
            {product.category && (
              <span style={{ background: T.s2, color: T.dim, border: `1px solid ${T.border}`,
                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                {product.category}
              </span>
            )}
          </div>

          {/* ── Title + fav ── */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
            <h1 style={{
              flex: 1, fontSize: 20, fontWeight: 800, color: T.text,
              lineHeight: 1.25, letterSpacing: "-0.4px", margin: 0,
            }}>{product.title}</h1>
            <button
              onClick={handleFav}
              disabled={favLoading}
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: faved ? `${T.red}15` : T.s2,
                border: `1px solid ${faved ? T.red + "40" : T.border}`,
                cursor: "pointer", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}
            >{faved ? "❤️" : "🤍"}</button>
          </div>

          {/* ── Stats row ── */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 18,
            padding: "10px 14px", background: T.s2,
            borderRadius: 12, border: `1px solid ${T.border}`,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Просмотры</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{product.views || 0}</div>
            </div>
            <div style={{ width: 1, background: T.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>В избранном</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{product.favorites || 0}</div>
            </div>
            <div style={{ width: 1, background: T.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: T.muted }}>Статус</div>
              <div style={{ fontSize: 13, fontWeight: 700,
                color: product.status === "active" ? T.green : T.muted }}>
                {product.status === "active" ? "● Активен" : product.status}
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          {product.description && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.dim, marginBottom: 8 }}>
                Описание
              </div>
              <div style={{
                fontSize: 14, color: T.dim, lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}>{shortDesc}</div>
              {isLong && (
                <button onClick={() => setExpanded(e => !e)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: T.yellow, fontSize: 13, fontWeight: 600, padding: "6px 0",
                  fontFamily: "'Onest', system-ui, sans-serif",
                }}>
                  {expanded ? "Свернуть ↑" : "Читать далее ↓"}
                </button>
              )}
            </div>
          )}

          {/* ── Tags ── */}
          {product.tags?.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {product.tags.map((tag, i) => (
                <span key={i} style={{
                  background: T.s2, border: `1px solid ${T.border}`,
                  color: T.dim, fontSize: 12, fontWeight: 500,
                  padding: "4px 12px", borderRadius: 20,
                }}>#{tag}</span>
              ))}
            </div>
          )}

          {/* ── Seller ── */}
          <div style={{ fontSize: 14, fontWeight: 700, color: T.dim, marginBottom: 10 }}>Продавец</div>
          <SellerCard seller={product.seller} navigate={navigate} />

          {/* ── Similar ── */}
          {similar.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.dim, marginBottom: 12 }}>
                Похожие товары
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {similar.slice(0, 3).map(p => (
                  <div
                    key={p._id}
                    onClick={() => navigate(`/products/${p._id}`)}
                    style={{
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 14, padding: "12px 14px",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title}
                      </div>
                      <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                        @{p.seller?.username}
                      </div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.yellow, marginLeft: 12 }}>
                      ${p.price?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky buy bar ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "rgba(13,13,14,0.97)",
        backdropFilter: "blur(24px)",
        borderTop: `1px solid ${T.border}`,
        padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
        display: "flex", alignItems: "center", gap: 12, zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted }}>Цена</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: T.yellow, letterSpacing: "-0.5px" }}>
            ${(product?.price || 0).toFixed(2)}
          </div>
        </div>

        {isOwn ? (
          <button
            onClick={() => navigate(`/sell?edit=${id}`)}
            style={{
              flex: 1, padding: "14px",
              background: T.s2, border: `1px solid ${T.border}`,
              borderRadius: 13, fontSize: 15, fontWeight: 700, color: T.dim,
              cursor: "pointer", fontFamily: "'Onest', system-ui, sans-serif",
            }}
          >✏️ Редактировать</button>
        ) : (
          <button
            onClick={() => user ? setShowBuy(true) : navigate("/auth")}
            disabled={product?.status !== "active"}
            style={{
              flex: 1, padding: "14px",
              background: product?.status === "active" ? T.yellow : T.s2,
              border: "none", borderRadius: 13,
              fontSize: 15, fontWeight: 800,
              color: product?.status === "active" ? "#000" : T.muted,
              cursor: product?.status === "active" ? "pointer" : "not-allowed",
              boxShadow: product?.status === "active" ? `0 4px 20px ${T.yellow}45` : "none",
              fontFamily: "'Onest', system-ui, sans-serif",
              transition: "all 0.2s",
            }}
          >
            {product?.status === "active" ? "Купить сейчас →" : "Недоступен"}
          </button>
        )}

        <button
          onClick={() => {
            if (user) navigate(`/messages/${product?.seller?._id}`);
            else navigate("/auth");
          }}
          style={{
            width: 50, height: 50, borderRadius: 13,
            background: T.s2, border: `1px solid ${T.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 20,
          }}
        >💬</button>
      </div>

      {/* ── Checkout modal ── */}
      {showBuy && (
        <CheckoutModal
          product={product}
          onClose={() => setShowBuy(false)}
          onConfirm={handleBuy}
          loading={buyLoading}
        />
      )}
    </>
  );
}
