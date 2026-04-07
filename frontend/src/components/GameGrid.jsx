import { useState } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const logo  = (d) => `https://logo.clearbit.com/${d}`;
const steam = (id) =>
  `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id}/capsule_sm_120.jpg`;

// ── data ─────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "apps",
    title: "Приложения",
    icon: "📱",
    items: [
      { name: "Telegram",    img: logo("telegram.org"),          bg: "#229ED9", isNew: false },
      { name: "Spotify",     img: logo("spotify.com"),           bg: "#1DB954", isNew: false },
      { name: "Netflix",     img: logo("netflix.com"),           bg: "#E50914", isNew: false },
      { name: "Discord",     img: logo("discord.com"),           bg: "#5865F2", isNew: true  },
      { name: "YouTube",     img: logo("youtube.com"),           bg: "#FF0000", isNew: false },
      { name: "Adobe",       img: logo("adobe.com"),             bg: "#FF0000", isNew: false },
      { name: "Figma",       img: logo("figma.com"),             bg: "#F24E1E", isNew: true  },
      { name: "Canva",       img: logo("canva.com"),             bg: "#7C3AED", isNew: false },
      { name: "Windows",     img: logo("microsoft.com"),         bg: "#0078D4", isNew: false },
      { name: "TikTok",      img: logo("tiktok.com"),            bg: "#010101", isNew: true  },
      { name: "Xbox",        img: logo("xbox.com"),              bg: "#107C10", isNew: false },
      { name: "Nintendo",    img: logo("nintendo.com"),          bg: "#E4000F", isNew: false },
      { name: "Twitch",      img: logo("twitch.tv"),             bg: "#9146FF", isNew: false },
      { name: "Duolingo",    img: logo("duolingo.com"),          bg: "#58CC02", isNew: true  },
      { name: "Battle.net",  img: logo("blizzard.com"),          bg: "#00AEFF", isNew: false },
      { name: "Crunchyroll", img: logo("crunchyroll.com"),       bg: "#F47521", isNew: false },
      { name: "Steam",       img: logo("store.steampowered.com"),bg: "#1B2838", isNew: false },
      { name: "PlayStation", img: logo("playstation.com"),       bg: "#003791", isNew: true  },
      { name: "Midjourney",  img: logo("midjourney.com"),        bg: "#111111", isNew: false },
      { name: "Copilot",     img: logo("copilot.microsoft.com"), bg: "#0066BF", isNew: true  },
    ],
  },
  {
    id: "games",
    title: "Игры",
    icon: "🎮",
    items: [
      { name: "GTA 5",       img: steam(271590),                   bg: "#16A34A", isNew: false },
      { name: "Dota 2",      img: steam(570),                      bg: "#8B0000", isNew: false },
      { name: "CS2",         img: steam(730),                      bg: "#EA580C", isNew: true  },
      { name: "PUBG",        img: steam(578080),                   bg: "#F59E0B", isNew: true  },
      { name: "Rust",        img: steam(252490),                   bg: "#CD4520", isNew: false },
      { name: "Forza",       img: steam(1551360),                  bg: "#111111", isNew: false },
      { name: "DayZ",        img: steam(221100),                   bg: "#1A1A1A", isNew: false },
      { name: "The Sims",    img: steam(1222670),                  bg: "#2ECC71", isNew: false },
      { name: "Valorant",    img: logo("playvalorant.com"),        bg: "#FF4655", isNew: true  },
      { name: "Fortnite",    img: logo("fortnite.com"),            bg: "#1A78C2", isNew: false },
      { name: "Minecraft",   img: logo("minecraft.net"),           bg: "#92400E", isNew: false },
      { name: "Roblox",      img: logo("roblox.com"),              bg: "#E11D48", isNew: true  },
      { name: "LoL",         img: logo("leagueoflegends.com"),     bg: "#C89B3C", isNew: false },
      { name: "Genshin",     img: logo("genshin.hoyoverse.com"),   bg: "#0EA5E9", isNew: true  },
      { name: "Diablo 4",    img: logo("diablo4.blizzard.com"),    bg: "#8B0000", isNew: false },
      { name: "WoW",         img: logo("worldofwarcraft.com"),     bg: "#3B82F6", isNew: false },
      { name: "Apex",        img: logo("ea.com"),                  bg: "#CF0A0A", isNew: true  },
      { name: "Warframe",    img: logo("warframe.com"),            bg: "#00C8FF", isNew: false },
      { name: "Dead by Day", img: steam(381210),                   bg: "#1A1A2E", isNew: false },
      { name: "Helldivers",  img: steam(553850),                   bg: "#FFD700", isNew: true  },
    ],
  },
  {
    id: "mobile",
    title: "Мобильные",
    icon: "📲",
    items: [
      { name: "Brawl Stars",  img: logo("supercell.com"),           bg: "#F59E0B", isNew: false },
      { name: "Clash Royale", img: logo("clashroyale.com"),         bg: "#2563EB", isNew: true  },
      { name: "PUBG Mobile",  img: logo("pubgmobile.com"),          bg: "#92400E", isNew: true  },
      { name: "Standoff 2",   img: logo("axlebolt.com"),            bg: "#0F172A", isNew: false },
      { name: "Clash of Cl.", img: logo("clashofclans.com"),        bg: "#D97706", isNew: false },
      { name: "Mobile Leg.",  img: logo("mobilelegends.net"),       bg: "#7C3AED", isNew: true  },
      { name: "CoD Mobile",   img: logo("callofduty.com"),          bg: "#16A34A", isNew: false },
      { name: "Free Fire",    img: logo("ff.garena.com"),           bg: "#DC2626", isNew: false },
      { name: "Genshin",      img: logo("genshin.hoyoverse.com"),   bg: "#0EA5E9", isNew: true  },
      { name: "Mortal Kom.",  img: logo("mortalkombat.com"),        bg: "#7F1D1D", isNew: false },
      { name: "Brawlhalla",   img: logo("brawlhalla.com"),          bg: "#1E40AF", isNew: false },
      { name: "Car Parking",  img: logo("olzhass.kz"),              bg: "#374151", isNew: true  },
      { name: "Rise of King", img: logo("riseofkingdoms.com"),      bg: "#78350F", isNew: false },
      { name: "Vikings",      img: logo("vikingswarclans.com"),     bg: "#3B0764", isNew: false },
      { name: "RAID",         img: logo("plarium.com"),             bg: "#1E1E2E", isNew: true  },
      { name: "Stumble Guys", img: logo("stumbleguys.com"),         bg: "#F97316", isNew: false },
      { name: "Subway Surf",  img: logo("kiloo.com"),               bg: "#06B6D4", isNew: false },
      { name: "Among Us",     img: logo("innersloth.com"),          bg: "#C026D3", isNew: false },
      { name: "Blockman Go",  img: logo("blockmanego.com"),         bg: "#10B981", isNew: true  },
      { name: "Drag Racing",  img: logo("ol.ru"),                   bg: "#1E40AF", isNew: false },
    ],
  },
];

// ── Squircle clip-path (CSS clip-path trick) ──────────────────────────────────
const squircleStyle = {
  borderRadius: "22%",
  overflow: "hidden",
};

// ── AppIcon ───────────────────────────────────────────────────────────────────
function AppIcon({ item, size = 64 }) {
  const [err, setErr] = useState(false);

  return (
    <div
      style={{ width: size, height: size, position: "relative", flexShrink: 0 }}
      className="group cursor-pointer"
    >
      {/* Glow on hover */}
      <div
        style={{
          position: "absolute",
          inset: -4,
          borderRadius: "26%",
          background: item.bg,
          opacity: 0,
          filter: "blur(12px)",
          transition: "opacity 0.25s",
          zIndex: 0,
        }}
        className="group-hover:opacity-60"
      />

      {/* Icon shell */}
      <div
        style={{
          width: size,
          height: size,
          background: item.bg,
          position: "relative",
          zIndex: 1,
          transform: "scale(1)",
          transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          ...squircleStyle,
        }}
        className="group-hover:scale-110"
      >
        {!err ? (
          <img
            src={item.img}
            alt={item.name}
            onError={() => setErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: size * 0.42,
              fontWeight: 800,
              color: "rgba(255,255,255,0.9)",
              fontFamily: "'SF Pro Display', 'Segoe UI', sans-serif",
              letterSpacing: "-1px",
            }}
          >
            {item.name[0]}
          </div>
        )}

        {/* NEW badge */}
        {item.isNew && (
          <div
            style={{
              position: "absolute",
              top: 4,
              left: 4,
              background: "#22C55E",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 20,
              letterSpacing: "0.03em",
              lineHeight: 1.4,
              fontFamily: "'SF Pro Text', 'Segoe UI', sans-serif",
              boxShadow: "0 2px 6px rgba(34,197,94,0.5)",
            }}
          >
            Новое
          </div>
        )}
      </div>
    </div>
  );
}

// ── GridSection ───────────────────────────────────────────────────────────────
function GridSection({ section, cols = 4 }) {
  const [expanded, setExpanded] = useState(false);
  const ICON_SIZE = cols === 5 ? 58 : 64;
  const visible = expanded ? section.items : section.items.slice(0, cols * 4);

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{section.icon}</span>
          <span
            style={{
              fontFamily: "'SF Pro Display', 'Segoe UI Black', sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              letterSpacing: "-0.3px",
            }}
          >
            {section.title}
          </span>
        </div>
        {section.items.length > cols * 4 && (
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#A78BFA",
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.2)",
              padding: "4px 12px",
              borderRadius: 20,
              cursor: "pointer",
              fontFamily: "'SF Pro Text', 'Segoe UI', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {expanded ? "Свернуть" : "Все →"}
          </button>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: "18px 10px",
        }}
      >
        {visible.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              animation: `fadeUp 0.3s ease both`,
              animationDelay: `${i * 30}ms`,
            }}
          >
            <AppIcon item={item} size={ICON_SIZE} />
            <span
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.65)",
                fontWeight: 500,
                textAlign: "center",
                maxWidth: ICON_SIZE + 8,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "'SF Pro Text', 'Segoe UI', sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export default function GameGrid() {
  const [cols, setCols] = useState(4);

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px) }
          to   { opacity:1; transform:translateY(0) }
        }
        .group:hover .group-hover\\:scale-110 { transform: scale(1.1) !important }
        .group:hover .group-hover\\:opacity-60 { opacity: 0.6 !important }
        * { box-sizing: border-box; margin: 0; padding: 0 }
        ::-webkit-scrollbar { width: 0 }
      `}</style>

      <div
        style={{
          background: "#121214",
          minHeight: "100vh",
          padding: "24px 16px 48px",
          fontFamily: "'SF Pro Text', 'Segoe UI', sans-serif",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#fff",
                fontFamily: "'SF Pro Display', 'Segoe UI Black', sans-serif",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}
            >
              Маркет
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              Цифровые товары
            </div>
          </div>

          {/* Cols switcher */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 3,
              gap: 3,
            }}
          >
            {[4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setCols(n)}
                style={{
                  width: 34,
                  height: 28,
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  transition: "all 0.15s",
                  background: cols === n ? "rgba(255,255,255,0.15)" : "transparent",
                  color: cols === n ? "#fff" : "rgba(255,255,255,0.35)",
                }}
              >
                {n}×
              </button>
            ))}
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <GridSection key={section.id} section={section} cols={cols} />
        ))}
      </div>
    </>
  );
}
