// ─── App.jsx — Playerok-style refactor ───────────────────────────────────────
// СОХРАНЕНА 100% бизнес-логика: маршруты, auth guard, useStore, handleTab, radioOpen
import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useStore } from "./store";

// Страницы (без изменений — только визуал App.jsx)
import SellPage     from "./pages/SellPage";
import ProfilePage  from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import DealsPage    from "./pages/DealsPage";
import WalletPage   from "./pages/WalletPage";
import AdminPage    from "./pages/AdminPage";
import LegalPage    from "./pages/LegalPage";
import AuthPage     from "./pages/AuthPage";
import CatalogPage  from "./pages/CatalogPage";
import GamesPage    from "./pages/GamesPage";
import ProductPage  from "./pages/ProductPage";
import Radio        from "./components/Radio";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:       "#0D0D0E",
  surface:  "#1B1B1D",
  surface2: "#242426",
  border:   "rgba(255,255,255,0.06)",
  yellow:   "#FFD600",
  green:    "#39FF14",
  text:     "#FFFFFF",
  muted:    "rgba(255,255,255,0.38)",
  dim:      "rgba(255,255,255,0.55)",
};

// ─── Icon sources (без изменений) ─────────────────────────────────────────────
const logo  = (d) => `https://logo.clearbit.com/${d}`;
const steam = (id) => `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/capsule_sm_120.jpg`;

// ─── Mock Data (без изменений) ────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "apps", title: "Приложения", emoji: "📱",
    items: [
      { name: "Telegram",     img: logo("telegram.org"),           bg: "#229ED9", isNew: false, isTop: false },
      { name: "Steam",        img: logo("store.steampowered.com"), bg: "#1B2838", isNew: false, isTop: true  },
      { name: "App Store",    img: logo("apple.com"),              bg: "#0A84FF", isNew: false, isTop: false },
      { name: "PlayStation",  img: logo("playstation.com"),        bg: "#003791", isNew: false, isTop: false },
      { name: "TikTok",       img: logo("tiktok.com"),             bg: "#010101", isNew: false, isTop: false },
      { name: "Claude",       img: logo("anthropic.com"),          bg: "#CC785C", isNew: false, isTop: false },
      { name: "ЧатГПТ",       img: logo("openai.com"),             bg: "#10A37F", isNew: false, isTop: true  },
      { name: "Spotify",      img: logo("spotify.com"),            bg: "#1DB954", isNew: false, isTop: false },
      { name: "Perplexity",   img: logo("perplexity.ai"),          bg: "#1C1C1C", isNew: false, isTop: false },
      { name: "Discord",      img: logo("discord.com"),            bg: "#5865F2", isNew: false, isTop: false },
      { name: "YouTube",      img: logo("youtube.com"),            bg: "#FF0000", isNew: false, isTop: true  },
      { name: "Adobe",        img: logo("adobe.com"),              bg: "#FF0000", isNew: false, isTop: false },
      { name: "Suno",         img: logo("suno.com"),               bg: "#7C3AED", isNew: false, isTop: false },
      { name: "ВКонтакте",    img: logo("vk.com"),                 bg: "#0077FF", isNew: false, isTop: false },
      { name: "CapCut",       img: logo("capcut.com"),             bg: "#000000", isNew: false, isTop: false },
      { name: "Grok",         img: logo("x.ai"),                   bg: "#111111", isNew: false, isTop: false },
      { name: "Windows",      img: logo("microsoft.com"),          bg: "#0078D4", isNew: false, isTop: false },
      { name: "Battle.net",   img: logo("blizzard.com"),           bg: "#00AEFF", isNew: false, isTop: false },
      { name: "Soundcloud",   img: logo("soundcloud.com"),         bg: "#FF5500", isNew: false, isTop: false },
      { name: "Razer Gold",   img: logo("razer.com"),              bg: "#00FF00", isNew: false, isTop: false },
      { name: "FL Studio",    img: logo("image-line.com"),         bg: "#FF6B00", isNew: false, isTop: false },
      { name: "HeyGen",       img: logo("heygen.com"),             bg: "#6366F1", isNew: true,  isTop: false },
      { name: "Rockstar Ga.", img: logo("rockstargames.com"),      bg: "#F5A623", isNew: false, isTop: false },
      { name: "EA Play",      img: logo("ea.com"),                 bg: "#FF4747", isNew: false, isTop: false },
      { name: "Twitch",       img: logo("twitch.tv"),              bg: "#9146FF", isNew: false, isTop: false },
      { name: "Figma",        img: logo("figma.com"),              bg: "#F24E1E", isNew: false, isTop: false },
      { name: "Netflix",      img: logo("netflix.com"),            bg: "#E50914", isNew: false, isTop: true  },
      { name: "Midjourney",   img: logo("midjourney.com"),         bg: "#111111", isNew: false, isTop: false },
      { name: "Duolingo",     img: logo("duolingo.com"),           bg: "#58CC02", isNew: true,  isTop: false },
      { name: "Canva",        img: logo("canva.com"),              bg: "#7C3AED", isNew: false, isTop: false },
      { name: "Copilot",      img: logo("copilot.microsoft.com"),  bg: "#0A66C2", isNew: false, isTop: false },
      { name: "Crunchyroll",  img: logo("crunchyroll.com"),        bg: "#F47521", isNew: true,  isTop: false },
      { name: "Faceit",       img: logo("faceit.com"),             bg: "#FF5500", isNew: false, isTop: false },
      { name: "Xbox",         img: logo("xbox.com"),               bg: "#107C10", isNew: false, isTop: false },
      { name: "Nintendo",     img: logo("nintendo.com"),           bg: "#E4000F", isNew: false, isTop: false },
      { name: "Zoom",         img: logo("zoom.us"),                bg: "#2D8CFF", isNew: false, isTop: false },
    ],
  },
  {
    id: "games", title: "Игры", emoji: "🎮",
    items: [
      { name: "Majestic RP",  img: steam(0),           bg: "#1a1a2e", isNew: false, isTop: false },
      { name: "GTA 5 Online", img: steam(271590),      bg: "#16A34A", isNew: false, isTop: true  },
      { name: "Dota 2",       img: steam(570),         bg: "#8B0000", isNew: false, isTop: true  },
      { name: "Roblox",       img: logo("roblox.com"), bg: "#E11D48", isNew: false, isTop: false },
      { name: "Valorant",     img: logo("playvalorant.com"), bg: "#FF4655", isNew: true,  isTop: true  },
      { name: "Genshin Imp.", img: logo("genshin.hoyoverse.com"), bg: "#0EA5E9", isNew: true,  isTop: false },
      { name: "Fortnite",     img: logo("fortnite.com"), bg: "#1A78C2", isNew: true,  isTop: false },
      { name: "Minecraft",    img: logo("minecraft.net"), bg: "#92400E", isNew: false, isTop: false },
      { name: "Arena Break.", img: steam(0),           bg: "#1a1a1a", isNew: true,  isTop: false },
      { name: "Counter-Str.", img: steam(730),         bg: "#EA580C", isNew: false, isTop: true  },
      { name: "SCraft",       img: steam(0),           bg: "#facc15", isNew: false, isTop: false },
      { name: "Hearthstone",  img: logo("blizzard.com"), bg: "#C89B3C", isNew: false, isTop: false },
      { name: "EA SPORTS",    img: logo("ea.com"),     bg: "#0066CC", isNew: false, isTop: false },
      { name: "World of War", img: logo("worldofwarcraft.com"), bg: "#3B82F6", isNew: false, isTop: false },
      { name: "ARC Raiders",  img: steam(0),           bg: "#4B0082", isNew: false, isTop: false },
      { name: "Танки ПК",     img: steam(0),           bg: "#374151", isNew: false, isTop: false },
      { name: "Rust",         img: steam(252490),      bg: "#CD4520", isNew: false, isTop: false },
      { name: "GTA 5 RP",     img: steam(271590),      bg: "#15803D", isNew: false, isTop: false },
      { name: "Warframe",     img: logo("warframe.com"), bg: "#00C8FF", isNew: false, isTop: false },
      { name: "Diablo 4",     img: logo("diablo4.blizzard.com"), bg: "#8B0000", isNew: false, isTop: false },
      { name: "Dead by Day",  img: steam(381210),      bg: "#1A1A2E", isNew: false, isTop: false },
      { name: "Crimson Des.", img: steam(0),           bg: "#7C2D12", isNew: true,  isTop: false },
    ],
  },
  {
    id: "mobile", title: "Мобильные игры", emoji: "📲",
    items: [
      { name: "Brawl Stars",  img: logo("supercell.com"),      bg: "#F59E0B", isNew: false, isTop: true  },
      { name: "Clash Royale", img: logo("clashroyale.com"),    bg: "#2563EB", isNew: true,  isTop: false },
      { name: "PUBG Mobile",  img: logo("pubgmobile.com"),     bg: "#92400E", isNew: true,  isTop: true  },
      { name: "Standoff 2",   img: logo("axlebolt.com"),       bg: "#0F172A", isNew: false, isTop: false },
      { name: "Clash of Cla.",img: logo("clashofclans.com"),   bg: "#D97706", isNew: false, isTop: false },
      { name: "Mobile Lege.", img: logo("mobilelegends.net"),  bg: "#7C3AED", isNew: true,  isTop: false },
      { name: "Call of Duty", img: logo("callofduty.com"),     bg: "#16A34A", isNew: false, isTop: false },
      { name: "Black Russia", img: steam(0),                   bg: "#1E293B", isNew: false, isTop: false },
      { name: "Free Fire",    img: logo("ff.garena.com"),      bg: "#DC2626", isNew: false, isTop: false },
      { name: "RAID: Shadow", img: logo("plarium.com"),        bg: "#1E1E2E", isNew: false, isTop: false },
      { name: "Mortal Kom.",  img: logo("mortalkombat.com"),   bg: "#7F1D1D", isNew: false, isTop: false },
      { name: "Blockman Go",  img: logo("blockmanego.com"),    bg: "#10B981", isNew: false, isTop: false },
    ],
  },
];

// ─── Squircle AppIcon ─────────────────────────────────────────────────────────
function AppIcon({ item, size = 72 }) {
  const [err, setErr] = useState(false);
  const [hov, setHov] = useState(false);

  // Squircle SVG clip-path (superellipse)
  const squircleId = `sq-${item.name.replace(/\s/g, "")}`;

  return (
    <div
      style={{ width: size, height: size, position: "relative", cursor: "pointer" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Glow halo */}
      <div style={{
        position: "absolute", inset: -6, borderRadius: "32%",
        background: item.bg, opacity: hov ? 0.45 : 0,
        filter: "blur(14px)", transition: "opacity 0.3s ease", pointerEvents: "none",
      }} />

      {/* SVG squircle clip */}
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <clipPath id={squircleId} clipPathUnits="objectBoundingBox">
            <path d="M 0,0.5 C 0,0.08 0.08,0 0.5,0 C 0.92,0 1,0.08 1,0.5 C 1,0.92 0.92,1 0.5,1 C 0.08,1 0,0.92 0,0.5 Z" />
          </clipPath>
        </defs>
      </svg>

      <div style={{
        width: size, height: size,
        background: item.bg,
        clipPath: `url(#${squircleId})`,
        transform: hov ? "scale(1.10)" : "scale(1)",
        transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative", zIndex: 1,
        overflow: "hidden",
      }}>
        {!err ? (
          <img
            src={item.img} alt={item.name}
            onError={() => setErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.4, fontWeight: 800, color: "rgba(255,255,255,0.9)",
          }}>{item.name[0]}</div>
        )}
      </div>

      {/* Бейджи */}
      {item.isNew && (
        <div style={{
          position: "absolute", top: -2, right: -2, zIndex: 2,
          background: T.green, color: "#000",
          fontSize: 8, fontWeight: 800,
          padding: "2px 5px", borderRadius: 20,
          letterSpacing: "0.04em", lineHeight: 1.6,
          boxShadow: `0 0 8px ${T.green}88`,
          fontFamily: "'Onest', system-ui, sans-serif",
        }}>NEW</div>
      )}
      {item.isTop && !item.isNew && (
        <div style={{
          position: "absolute", top: -2, right: -2, zIndex: 2,
          background: T.yellow, color: "#000",
          fontSize: 8, fontWeight: 800,
          padding: "2px 5px", borderRadius: 20,
          letterSpacing: "0.04em", lineHeight: 1.6,
          boxShadow: `0 0 8px ${T.yellow}88`,
          fontFamily: "'Onest', system-ui, sans-serif",
        }}>ТОП</div>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ section }) {
  const [expanded, setExpanded] = useState(false);
  const cols = 4;
  const perPage = cols * 4;
  const visible = expanded ? section.items : section.items.slice(0, perPage);
  const hasMore = section.items.length > perPage;

  return (
    <div style={{ marginBottom: 36 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16, padding: "0 2px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{section.emoji}</span>
          <span style={{
            fontSize: 17, fontWeight: 700, color: T.text,
            fontFamily: "'Onest', system-ui, sans-serif", letterSpacing: "-0.4px",
          }}>{section.title}</span>
          <span style={{
            fontSize: 11, color: T.muted, fontWeight: 500,
            background: T.surface, padding: "2px 8px", borderRadius: 20,
            border: `1px solid ${T.border}`,
          }}>{section.items.length}</span>
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              fontSize: 12, fontWeight: 600, color: T.yellow,
              background: `${T.yellow}10`, border: `1px solid ${T.yellow}25`,
              padding: "4px 13px", borderRadius: 20, cursor: "pointer",
              fontFamily: "'Onest', system-ui, sans-serif",
              transition: "all 0.2s",
            }}
          >{expanded ? "Свернуть" : "Все →"}</button>
        )}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "18px 6px",
      }}>
        {visible.map((item, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 7,
            animation: "fadeUp 0.35s ease both",
            animationDelay: `${i * 18}ms`,
          }}>
            <AppIcon item={item} size={70} />
            <span style={{
              fontSize: 10, color: T.dim, fontWeight: 500,
              textAlign: "center", maxWidth: 78,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "'Onest', system-ui, sans-serif",
            }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SearchPage (главная) ─────────────────────────────────────────────────────
function SearchPage() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const filtered = query.trim()
    ? SECTIONS.map(s => ({
        ...s,
        items: s.items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())),
      })).filter(s => s.items.length > 0)
    : SECTIONS;

  return (
    <div style={{ padding: "16px 14px 110px" }}>

      {/* Hero banner */}
      {!query && (
        <div style={{
          background: `linear-gradient(135deg, ${T.surface} 0%, #242428 100%)`,
          border: `1px solid ${T.border}`,
          borderRadius: 18, padding: "18px 18px 16px",
          marginBottom: 20, position: "relative", overflow: "hidden",
        }}>
          {/* Accent glow */}
          <div style={{
            position: "absolute", top: -30, right: -20,
            width: 120, height: 120, borderRadius: "50%",
            background: T.yellow, opacity: 0.07, filter: "blur(30px)",
            pointerEvents: "none",
          }} />
          <div style={{ fontSize: 11, color: T.yellow, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 6, fontFamily: "'Onest', system-ui, sans-serif" }}>
            🔥 ГОРЯЧИЕ ПРЕДЛОЖЕНИЯ
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1.2, fontFamily: "'Onest', system-ui, sans-serif", letterSpacing: "-0.5px" }}>
            Лучший маркетплейс<br />цифровых товаров
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>
            Аккаунты, игровые ценности, подписки
          </div>
        </div>
      )}

      {/* Search input */}
      <div style={{
        background: focused ? T.surface2 : T.surface,
        borderRadius: 14, display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px", marginBottom: 28,
        border: `1px solid ${focused ? `${T.yellow}40` : T.border}`,
        transition: "all 0.2s",
        boxShadow: focused ? `0 0 0 3px ${T.yellow}10` : "none",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={focused ? T.yellow : "rgba(255,255,255,0.25)"} strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Найти игру или приложение..."
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 14, color: T.text,
            fontFamily: "'Onest', system-ui, sans-serif",
          }}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.muted, fontSize: 16, padding: 0, lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      {/* Sections */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: T.muted, paddingTop: 40, fontFamily: "'Onest', system-ui, sans-serif" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.dim }}>Ничего не найдено</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Попробуйте другой запрос</div>
        </div>
      ) : (
        filtered.map(s => <Section key={s.id} section={s} />)
      )}
    </div>
  );
}

// ─── Burger Menu ──────────────────────────────────────────────────────────────
function BurgerMenu({ open, onClose, navigate, user, onRadio }) {
  // Сохранена оригинальная логика links
  if (!open) return null;
  const links = [
    { label: "🏠 Главная",     path: "/" },
    { label: "🛍 Каталог",     path: "/catalog" },
    { label: "🎮 Игры",        path: "/games" },
    ...(user ? [
      { label: "📦 Продать",   path: "/sell" },
      { label: "🤝 Сделки",    path: "/deals" },
      { label: "💳 Кошелёк",   path: "/wallet" },
      { label: "💬 Сообщения", path: "/messages" },
      { label: "👤 Профиль",   path: "/profile" },
    ] : [
      { label: "🔑 Войти",     path: "/auth" },
    ]),
    { label: "📋 Правила",     path: "/legal/rules" },
    { label: "📄 Оферта",      path: "/legal/offer" },
    { label: "✉️ Контакты",    path: "/legal/contacts" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        zIndex: 200,
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(290px, 80vw)",
        background: "rgba(13,13,14,0.98)",
        backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)",
        borderLeft: `1px solid ${T.border}`,
        zIndex: 201, display: "flex", flexDirection: "column",
        animation: "slideIn 0.28s cubic-bezier(0.22,1,0.36,1)",
        overflowY: "auto",
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 18px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.text, fontFamily: "'Onest', system-ui, sans-serif" }}>
            Minions<span style={{ color: T.yellow }}>.</span>Market
          </span>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10,
            background: T.surface, border: `1px solid ${T.border}`,
            cursor: "pointer", color: T.muted, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* User info */}
        {user && (
          <div style={{
            padding: "14px 18px",
            borderBottom: `1px solid ${T.border}`,
            background: `${T.yellow}06`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 800, color: "#000",
              }}>{(user.username || user.firstName || "?")[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text, fontFamily: "'Onest', system-ui, sans-serif" }}>@{user.username}</div>
                <div style={{ color: T.yellow, fontSize: 12, fontWeight: 600, marginTop: 1 }}>
                  ${parseFloat(user.balance || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <div style={{ padding: "10px 10px", flex: 1 }}>
          {/* Radio button */}
          <button onClick={() => { onRadio(); onClose(); }} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 13px", borderRadius: 12, width: "100%",
            background: `${T.yellow}0D`, border: `1px solid ${T.yellow}20`,
            color: T.yellow, fontSize: 14, cursor: "pointer", marginBottom: 8,
            fontFamily: "'Onest', system-ui, sans-serif",
          }}>
            📻 Онлайн радио
          </button>

          {links.map(l => (
            <button key={l.path} onClick={() => { navigate(l.path); onClose(); }} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 13px", borderRadius: 12, width: "100%",
              background: "transparent", border: "none",
              color: T.dim, fontSize: 14, cursor: "pointer",
              textAlign: "left", marginBottom: 2,
              fontFamily: "'Onest', system-ui, sans-serif",
              transition: "background 0.15s",
            }}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Logout */}
        {user && (
          <div style={{ padding: "10px 10px 24px", borderTop: `1px solid ${T.border}` }}>
            <button onClick={() => {
              useStore.getState().logout();
              navigate("/");
              onClose();
            }} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "11px 16px", borderRadius: 12, width: "100%",
              color: "#FF4D4D", background: "rgba(255,77,77,0.07)",
              border: "1px solid rgba(255,77,77,0.15)", cursor: "pointer", fontSize: 14,
              fontFamily: "'Onest', system-ui, sans-serif",
            }}>
              → Выйти из аккаунта
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
// Сохранена оригинальная логика onTab + active state
function BottomNav({ active, onTab }) {
  const tabs = [
    {
      id: "search", label: "Главная",
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={a ? T.yellow : "rgba(255,255,255,0.35)"} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      ),
    },
    {
      id: "catalog", label: "Каталог",
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={a ? T.yellow : "rgba(255,255,255,0.35)"} strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
    },
    {
      id: "sell", label: "Продать",
      icon: (a) => (
        <div style={{
          width: 46, height: 46, borderRadius: "50%",
          background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: -18,
          boxShadow: `0 4px 20px ${T.yellow}55, 0 0 0 4px ${T.bg}`,
          transition: "transform 0.2s",
          transform: a ? "scale(1.08)" : "scale(1)",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#000" strokeWidth="2.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </div>
      ),
    },
    {
      id: "chats", label: "Чаты",
      icon: (a) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={a ? T.yellow : "rgba(255,255,255,0.35)"} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
    {
      id: "menu", label: "Меню",
      icon: (a) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4.5, alignItems: "flex-start", width: 22 }}>
          <span style={{ width: 22, height: 1.8, background: a ? T.yellow : "rgba(255,255,255,0.4)", borderRadius: 2, display: "block" }}/>
          <span style={{ width: 16, height: 1.8, background: a ? T.yellow : "rgba(255,255,255,0.4)", borderRadius: 2, display: "block" }}/>
          <span style={{ width: 19, height: 1.8, background: a ? T.yellow : "rgba(255,255,255,0.4)", borderRadius: 2, display: "block" }}/>
        </div>
      ),
    },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(13,13,14,0.96)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderTop: `1px solid ${T.border}`,
      display: "flex", alignItems: "flex-end",
      padding: "0 0 env(safe-area-inset-bottom, 10px)", zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onTab(tab.id)} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "flex-end",
            gap: 4, background: "none", border: "none",
            cursor: "pointer", padding: "12px 0 10px",
            transition: "opacity 0.15s",
          }}>
            {tab.icon(isActive)}
            {tab.id !== "sell" && (
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                color: isActive ? T.yellow : T.muted,
                fontFamily: "'Onest', system-ui, sans-serif",
                transition: "color 0.15s",
              }}>{tab.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── MainApp (сохранена 100% оригинальная логика) ────────────────────────────
function MainApp() {
  // STATE — без изменений
  const [activeTab, setActiveTab] = useState("search");
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [radioOpen, setRadioOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useStore();

  // Синхронизируем таб с URL — без изменений
  const handleTab = (id) => {
    if (id === "menu")    { setMenuOpen(true); return; }
    if (id === "sell")    { user ? navigate("/sell")     : navigate("/auth"); return; }
    if (id === "chats")   { user ? navigate("/messages") : navigate("/auth"); return; }
    if (id === "catalog") { navigate("/catalog"); return; }
    setActiveTab(id);
    if (location.pathname !== "/") navigate("/");
  };

  const urlTab = (() => {
    const p = location.pathname;
    if (p.startsWith("/catalog"))  return "catalog";
    if (p.startsWith("/sell"))     return "sell";
    if (p.startsWith("/messages")) return "chats";
    if (p === "/")                 return activeTab;
    return null;
  })();

  const avatar = user ? (user.username || user.firstName || "?")[0].toUpperCase() : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; overflow-x: hidden; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        ::-webkit-scrollbar { width: 0; }
        button { font-family: 'Onest', system-ui, sans-serif; }
      `}</style>

      <div style={{
        background: T.bg, minHeight: "100vh",
        maxWidth: 480, margin: "0 auto",
        position: "relative",
        fontFamily: "'Onest', system-ui, sans-serif",
      }}>

        {/* ── Top Bar ────────────────────────────────────────────────────── */}
        <div style={{
          padding: "12px 16px 11px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(13,13,14,0.95)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
        }}>
          {/* Logo */}
          <div
            onClick={() => { setActiveTab("search"); navigate("/"); }}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 11,
              background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 900, color: "#000",
              boxShadow: `0 4px 16px ${T.yellow}40`,
            }}>M</div>
            <span style={{
              fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-0.4px",
            }}>
              Minions<span style={{ color: T.yellow }}>.</span>Market
            </span>
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Radio */}
            <button onClick={() => setRadioOpen(true)} style={{
              width: 34, height: 34, borderRadius: 10,
              background: T.surface, border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 15,
            }}>📻</button>

            {user ? (
              <>
                {/* Balance */}
                <button onClick={() => navigate("/wallet")} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px",
                  background: `${T.yellow}12`, border: `1px solid ${T.yellow}25`,
                  borderRadius: 10, fontSize: 12, fontWeight: 700, color: T.yellow,
                  cursor: "pointer",
                }}>
                  💳 ${parseFloat(user.balance || 0).toFixed(2)}
                </button>
                {/* Avatar */}
                <div onClick={() => navigate("/profile")} style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${T.yellow}, #FF8C00)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "#000", cursor: "pointer",
                  boxShadow: `0 2px 10px ${T.yellow}40`,
                }}>{avatar}</div>
              </>
            ) : (
              <button onClick={() => navigate("/auth")} style={{
                padding: "7px 15px", borderRadius: 10,
                background: T.yellow, border: "none",
                color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: `0 2px 12px ${T.yellow}45`,
              }}>Войти</button>
            )}
          </div>
        </div>

        {/* ── Page Content ─────────────────────────────────────────────── */}
        <div style={{ paddingBottom: 80 }}>
          <Routes>
            <Route path="/"                  element={<SearchPage />} />
            <Route path="/catalog"           element={<CatalogPage />} />
            <Route path="/games"             element={<GamesPage />} />
            <Route path="/products/:id"      element={<ProductPage />} />
            <Route path="/auth"              element={<AuthPage />} />
            <Route path="/legal"             element={<LegalPage />} />
            <Route path="/legal/:tab"        element={<LegalPage />} />
            <Route path="/admin"             element={<AdminPage />} />
            <Route path="/sell"              element={user ? <SellPage />     : <Navigate to="/auth" replace />} />
            <Route path="/profile"           element={user ? <ProfilePage />  : <Navigate to="/auth" replace />} />
            <Route path="/profile/:userId"   element={<ProfilePage />} />
            <Route path="/messages"          element={user ? <MessagesPage /> : <Navigate to="/auth" replace />} />
            <Route path="/messages/:userId"  element={user ? <MessagesPage /> : <Navigate to="/auth" replace />} />
            <Route path="/deals"             element={user ? <DealsPage />    : <Navigate to="/auth" replace />} />
            <Route path="/deals/:dealId"     element={user ? <DealsPage />    : <Navigate to="/auth" replace />} />
            <Route path="/wallet"            element={user ? <WalletPage />   : <Navigate to="/auth" replace />} />
            <Route path="*" element={
              <div style={{ padding: "80px 20px", textAlign: "center", color: T.muted, fontSize: 15 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌑</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: T.dim }}>404</div>
                <div style={{ marginTop: 6 }}>Страница не найдена</div>
              </div>
            } />
          </Routes>
        </div>

        <BottomNav active={urlTab} onTab={handleTab} />
      </div>

      {/* Burger Menu — без изменений в логике */}
      <BurgerMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        navigate={navigate}
        user={user}
        onRadio={() => setRadioOpen(true)}
      />

      {/* Radio — без изменений */}
      <Radio triggerOpen={radioOpen} onTriggerHandled={() => setRadioOpen(false)} />
    </>
  );
}

// ─── Root — без изменений ─────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: T.surface, color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: "14px", fontSize: "14px",
            fontFamily: "'Onest', system-ui, sans-serif",
          },
        }}
      />
      <MainApp />
    </BrowserRouter>
  );
}
