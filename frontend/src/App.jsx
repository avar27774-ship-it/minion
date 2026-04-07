import { useState } from "react";

// ─── Icon sources ─────────────────────────────────────────────────────────────
const logo  = (d) => `https://logo.clearbit.com/${d}`;
const steam = (id) => `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/capsule_sm_120.jpg`;

// ─── Mock Data ────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "apps", title: "Приложения", emoji: "📱",
    items: [
      { name: "Telegram",     img: logo("telegram.org"),           bg: "#229ED9", isNew: false },
      { name: "Steam",        img: logo("store.steampowered.com"), bg: "#1B2838", isNew: false },
      { name: "App Store",    img: logo("apple.com"),              bg: "#0A84FF", isNew: false },
      { name: "PlayStation",  img: logo("playstation.com"),        bg: "#003791", isNew: false },
      { name: "TikTok",       img: logo("tiktok.com"),             bg: "#010101", isNew: false },
      { name: "Claude",       img: logo("anthropic.com"),          bg: "#CC785C", isNew: false },
      { name: "ЧатГПТ",       img: logo("openai.com"),             bg: "#10A37F", isNew: false },
      { name: "Spotify",      img: logo("spotify.com"),            bg: "#1DB954", isNew: false },
      { name: "Perplexity",   img: logo("perplexity.ai"),          bg: "#1C1C1C", isNew: false },
      { name: "Discord",      img: logo("discord.com"),            bg: "#5865F2", isNew: false },
      { name: "YouTube",      img: logo("youtube.com"),            bg: "#FF0000", isNew: false },
      { name: "Adobe",        img: logo("adobe.com"),              bg: "#FF0000", isNew: false },
      { name: "Suno",         img: logo("suno.com"),               bg: "#7C3AED", isNew: false },
      { name: "ВКонтакте",    img: logo("vk.com"),                 bg: "#0077FF", isNew: false },
      { name: "CapCut",       img: logo("capcut.com"),             bg: "#000000", isNew: false },
      { name: "Grok",         img: logo("x.ai"),                   bg: "#111111", isNew: false },
      { name: "Windows",      img: logo("microsoft.com"),          bg: "#0078D4", isNew: false },
      { name: "Battle.net",   img: logo("blizzard.com"),           bg: "#00AEFF", isNew: false },
      { name: "Soundcloud",   img: logo("soundcloud.com"),         bg: "#FF5500", isNew: false },
      { name: "Razer Gold",   img: logo("razer.com"),              bg: "#00FF00", isNew: false },
      { name: "FL Studio",    img: logo("image-line.com"),         bg: "#FF6B00", isNew: false },
      { name: "HeyGen",       img: logo("heygen.com"),             bg: "#6366F1", isNew: true  },
      { name: "Rockstar Ga.", img: logo("rockstargames.com"),      bg: "#F5A623", isNew: false },
      { name: "EA Play",      img: logo("ea.com"),                 bg: "#FF4747", isNew: false },
      { name: "Twitch",       img: logo("twitch.tv"),              bg: "#9146FF", isNew: false },
      { name: "Figma",        img: logo("figma.com"),              bg: "#F24E1E", isNew: false },
      { name: "Netflix",      img: logo("netflix.com"),            bg: "#E50914", isNew: false },
      { name: "Midjourney",   img: logo("midjourney.com"),         bg: "#111111", isNew: false },
      { name: "Duolingo",     img: logo("duolingo.com"),           bg: "#58CC02", isNew: true  },
      { name: "Canva",        img: logo("canva.com"),              bg: "#7C3AED", isNew: false },
      { name: "Copilot",      img: logo("copilot.microsoft.com"),  bg: "#0A66C2", isNew: false },
      { name: "Crunchyroll",  img: logo("crunchyroll.com"),        bg: "#F47521", isNew: true  },
      { name: "Faceit",       img: logo("faceit.com"),             bg: "#FF5500", isNew: false },
      { name: "Xbox",         img: logo("xbox.com"),               bg: "#107C10", isNew: false },
      { name: "Nintendo",     img: logo("nintendo.com"),           bg: "#E4000F", isNew: false },
      { name: "Zoom",         img: logo("zoom.us"),                bg: "#2D8CFF", isNew: false },
    ],
  },
  {
    id: "games", title: "Игры", emoji: "🎮",
    items: [
      { name: "Majestic RP",  img: steam(0),                       bg: "#1a1a2e", isNew: false },
      { name: "GTA 5 Online", img: steam(271590),                  bg: "#16A34A", isNew: false },
      { name: "Dota 2",       img: steam(570),                     bg: "#8B0000", isNew: false },
      { name: "Roblox",       img: logo("roblox.com"),             bg: "#E11D48", isNew: false },
      { name: "Valorant",     img: logo("playvalorant.com"),       bg: "#FF4655", isNew: true  },
      { name: "Genshin Imp.", img: logo("genshin.hoyoverse.com"),  bg: "#0EA5E9", isNew: true  },
      { name: "Fortnite",     img: logo("fortnite.com"),           bg: "#1A78C2", isNew: true  },
      { name: "Minecraft",    img: logo("minecraft.net"),          bg: "#92400E", isNew: false },
      { name: "Arena Break.", img: steam(0),                       bg: "#1a1a1a", isNew: true  },
      { name: "Counter-Str.", img: steam(730),                     bg: "#EA580C", isNew: false },
      { name: "SCraft",       img: steam(0),                       bg: "#facc15", isNew: false },
      { name: "Hearthstone",  img: logo("blizzard.com"),           bg: "#C89B3C", isNew: false },
      { name: "EA SPORTS",    img: logo("ea.com"),                 bg: "#0066CC", isNew: false },
      { name: "World of War", img: logo("worldofwarcraft.com"),    bg: "#3B82F6", isNew: false },
      { name: "ARC Raiders",  img: steam(0),                       bg: "#4B0082", isNew: false },
      { name: "Танки ПК",     img: steam(0),                       bg: "#374151", isNew: false },
      { name: "Rust",         img: steam(252490),                  bg: "#CD4520", isNew: false },
      { name: "GTA 5 RP",     img: steam(271590),                  bg: "#15803D", isNew: false },
      { name: "Warframe",     img: logo("warframe.com"),           bg: "#00C8FF", isNew: false },
      { name: "Resident Evi", img: steam(0),                       bg: "#7F1D1D", isNew: false },
      { name: "Diablo 4",     img: logo("diablo4.blizzard.com"),   bg: "#8B0000", isNew: false },
      { name: "Dead by Day",  img: steam(381210),                  bg: "#1A1A2E", isNew: false },
      { name: "Resident Evi", img: steam(0),                       bg: "#7F1D1D", isNew: false },
      { name: "Crimson Des.", img: steam(0),                       bg: "#7C2D12", isNew: true  },
    ],
  },
  {
    id: "mobile", title: "Мобильные игры", emoji: "📲",
    items: [
      { name: "Brawl Stars",  img: logo("supercell.com"),          bg: "#F59E0B", isNew: false },
      { name: "Clash Royale", img: logo("clashroyale.com"),        bg: "#2563EB", isNew: true  },
      { name: "PUBG Mobile",  img: logo("pubgmobile.com"),         bg: "#92400E", isNew: true  },
      { name: "Standoff 2",   img: logo("axlebolt.com"),           bg: "#0F172A", isNew: false },
      { name: "Clash of Cla.",img: logo("clashofclans.com"),       bg: "#D97706", isNew: false },
      { name: "Mobile Lege.", img: logo("mobilelegends.net"),      bg: "#7C3AED", isNew: true  },
      { name: "Call of Duty", img: logo("callofduty.com"),         bg: "#16A34A", isNew: false },
      { name: "Black Russia", img: steam(0),                       bg: "#1E293B", isNew: false },
      { name: "Oxide: Surv.", img: steam(0),                       bg: "#DC2626", isNew: false },
      { name: "Танки Мобайл", img: steam(0),                       bg: "#7F1D1D", isNew: false },
      { name: "EA SPORTS FC", img: logo("ea.com"),                 bg: "#0066CC", isNew: false },
      { name: "Grand Mobile", img: steam(0),                       bg: "#16A34A", isNew: false },
      { name: "Free Fire",    img: logo("ff.garena.com"),          bg: "#DC2626", isNew: false },
      { name: "RAID: Shadow", img: logo("plarium.com"),            bg: "#1E1E2E", isNew: false },
      { name: "Матрешка F",   img: steam(0),                       bg: "#7C3AED", isNew: false },
      { name: "Drag Racing",  img: steam(0),                       bg: "#1E40AF", isNew: false },
      { name: "My Singing M", img: steam(0),                       bg: "#0EA5E9", isNew: false },
      { name: "Mortal Kom.",  img: logo("mortalkombat.com"),       bg: "#7F1D1D", isNew: false },
      { name: "The Spike",    img: steam(0),                       bg: "#4338CA", isNew: false },
      { name: "Last Island",  img: steam(0),                       bg: "#166534", isNew: false },
      { name: "Blockman Go",  img: logo("blockmanego.com"),        bg: "#10B981", isNew: false },
      { name: "Vikings: War", img: logo("vikingswarclans.com"),    bg: "#3B0764", isNew: false },
      { name: "Rise of King", img: logo("riseofkingdoms.com"),     bg: "#78350F", isNew: false },
      { name: "Car Parking",  img: logo("olzhass.kz"),             bg: "#374151", isNew: false },
    ],
  },
];

// ─── AppIcon ──────────────────────────────────────────────────────────────────
function AppIcon({ item, size = 68 }) {
  const [err, setErr] = useState(false);
  const [hov, setHov] = useState(false);

  return (
    <div style={{ width: size, height: size, position: "relative" }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Glow */}
      <div style={{
        position: "absolute", inset: -5,
        borderRadius: "28%",
        background: item.bg,
        opacity: hov ? 0.5 : 0,
        filter: "blur(12px)",
        transition: "opacity 0.25s",
        pointerEvents: "none",
      }} />

      {/* Shell */}
      <div style={{
        width: size, height: size,
        borderRadius: "22%",
        overflow: "hidden",
        background: item.bg,
        transform: hov ? "scale(1.10)" : "scale(1)",
        transition: "transform 0.22s cubic-bezier(0.34,1.56,0.64,1)",
        cursor: "pointer",
        position: "relative",
        zIndex: 1,
        boxShadow: hov ? `0 6px 20px ${item.bg}55` : "0 2px 8px rgba(0,0,0,0.45)",
      }}>
        {!err ? (
          <img src={item.img} alt={item.name} onError={() => setErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.42, fontWeight: 800,
            color: "rgba(255,255,255,0.9)",
          }}>{item.name[0]}</div>
        )}

        {/* NEW badge */}
        {item.isNew && (
          <div style={{
            position: "absolute", top: 4, left: 4,
            background: "#22C55E",
            color: "#fff",
            fontSize: 9, fontWeight: 700,
            padding: "2px 6px", borderRadius: 20,
            letterSpacing: "0.02em", lineHeight: 1.5,
            boxShadow: "0 2px 6px rgba(34,197,94,0.5)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}>Новое</div>
        )}
      </div>
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
    <div style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 20 }}>{section.emoji}</span>
          <span style={{
            fontSize: 18, fontWeight: 800, color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-0.3px",
          }}>{section.title}</span>
        </div>
        {hasMore && (
          <button onClick={() => setExpanded(e => !e)} style={{
            fontSize: 12, fontWeight: 600, color: "#A78BFA",
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.18)",
            padding: "4px 14px", borderRadius: 20, cursor: "pointer",
            fontFamily: "Inter, system-ui, sans-serif",
            transition: "all 0.15s",
          }}>
            {expanded ? "Свернуть" : "Все →"}
          </button>
        )}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "16px 4px",
      }}>
        {visible.map((item, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            animation: "fadeUp 0.3s ease both",
            animationDelay: `${i * 22}ms`,
          }}>
            <AppIcon item={item} size={68} />
            <span style={{
              fontSize: 10, color: "rgba(255,255,255,0.55)",
              fontWeight: 500, textAlign: "center",
              maxWidth: 76,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: "Inter, system-ui, sans-serif",
              letterSpacing: "0.01em",
            }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
const NAV_TABS = [
  {
    id: "search", label: "Поиск",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366F1" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    id: "steam", label: "Steam",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "#6366F1" : "rgba(255,255,255,0.4)"}>
        <path d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.65 7.86 6.39 9.29l2.3-4.72A3.5 3.5 0 0 1 12 9.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5 3.5 3.5 0 0 1-1.42-.3L8.2 21.1C9.37 21.68 10.65 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
      </svg>
    ),
  },
  {
    id: "sell", label: "Продать",
    icon: (active) => (
      <div style={{
        width: 34, height: 34, borderRadius: "50%",
        background: active ? "#6366F1" : "rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: -8,
        boxShadow: active ? "0 0 16px rgba(99,102,241,0.5)" : "none",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </div>
    ),
  },
  {
    id: "chats", label: "Чаты",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#6366F1" : "rgba(255,255,255,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    badge: 1,
  },
  {
    id: "profile", label: "Профиль",
    icon: (active) => (
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        background: active ? "#6366F1" : "rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: "#fff",
      }}>А</div>
    ),
  },
];

function BottomNav({ active, setActive }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: "rgba(18,18,20,0.97)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center",
      padding: "6px 0 10px",
      zIndex: 100,
    }}>
      {NAV_TABS.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => setActive(tab.id)} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 3,
            background: "none", border: "none", cursor: "pointer",
            padding: "4px 0", position: "relative",
          }}>
            <div style={{ position: "relative" }}>
              {tab.icon(isActive)}
              {tab.badge && (
                <div style={{
                  position: "absolute", top: -3, right: -5,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "#6366F1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  border: "2px solid #121214",
                }}>{tab.badge}</div>
              )}
            </div>
            <span style={{
              fontSize: 10, fontWeight: isActive ? 600 : 400,
              color: isActive ? "#6366F1" : "rgba(255,255,255,0.38)",
              fontFamily: "Inter, system-ui, sans-serif",
            }}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Search Page ──────────────────────────────────────────────────────────────
function SearchPage() {
  const [query, setQuery] = useState("");
  return (
    <div style={{ padding: "16px 12px 100px" }}>
      {/* Search bar */}
      <div style={{
        background: "rgba(255,255,255,0.07)",
        borderRadius: 14,
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", marginBottom: 24,
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по маркету..."
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 15, color: "#fff",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        />
      </div>
      {/* Sections */}
      {SECTIONS.map(s => <Section key={s.id} section={s} />)}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function PlayerokApp() {
  const [activeTab, setActiveTab] = useState("search");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(8px) }
          to   { opacity:1; transform:translateY(0) }
        }
        * { box-sizing:border-box; margin:0; padding:0 }
        body { background:#121214; overflow-x:hidden }
        input::placeholder { color:rgba(255,255,255,0.3) }
        ::-webkit-scrollbar { width: 0 }
      `}</style>

      <div style={{
        background: "#121214",
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        {/* Top bar */}
        <div style={{
          padding: "14px 16px 0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(18,18,20,0.95)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          paddingBottom: 12,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: "linear-gradient(135deg,#6366F1,#8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>🎮</div>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
              Playerok
            </span>
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Notifications */}
            <div style={{ position: "relative", cursor: "pointer" }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg,#6366F1,#A78BFA)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer",
            }}>А</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ paddingBottom: 80 }}>
          {activeTab === "search" && <SearchPage />}
          {activeTab === "steam" && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Steam Маркет</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Скоро...</div>
            </div>
          )}
          {activeTab === "sell" && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Продать товар</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Форма создания объявления</div>
            </div>
          )}
          {activeTab === "chats" && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Чаты</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>Нет активных чатов</div>
            </div>
          )}
          {activeTab === "profile" && (
            <div style={{ padding: "24px 16px", paddingTop: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366F1,#A78BFA)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, fontWeight: 800, color: "#fff",
                }}>А</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Пользователь</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>@user123</div>
                </div>
              </div>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
                {[["0", "Продаж"], ["0", "Покупок"], ["0 ₽", "Баланс"]].map(([val, label]) => (
                  <div key={label} style={{
                    background: "rgba(255,255,255,0.05)", borderRadius: 14,
                    padding: "14px 10px", textAlign: "center",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{val}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <BottomNav active={activeTab} setActive={setActiveTab} />
      </div>
    </>
  );
}
