// WalletPage.jsx — Playerok-style refactor
// API сохранён 100%:
//   GET  /api/wallet/transactions
//   POST /api/wallet/deposit/rukassa      → { payUrl }
//   POST /api/wallet/deposit/cryptopay   → { payUrl }
//   POST /api/wallet/deposit/crystalpay  → { payUrl }
//   POST /api/wallet/deposit/nowpayments → { payUrl }
//   POST /api/wallet/withdraw            → CryptoBot { amount, address, currency }
//   POST /api/wallet/withdraw/rukassa    → { amount, account, method }
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const QUICK_AMOUNTS = [5, 10, 25, 50, 100, 200];

// ─── Tx icon + color ──────────────────────────────────────────────────────────
function txMeta(type) {
  switch (type) {
    case "deposit":    return { icon: "⬇️", color: T.green,  label: "Пополнение" };
    case "withdrawal": return { icon: "⬆️", color: T.red,    label: "Вывод" };
    case "sale":       return { icon: "💰", color: T.yellow, label: "Продажа" };
    case "purchase":   return { icon: "🛒", color: T.red,    label: "Покупка" };
    case "commission": return { icon: "📊", color: T.muted,  label: "Комиссия" };
    case "refund":     return { icon: "↩️", color: T.green,  label: "Возврат" };
    default:           return { icon: "💳", color: T.dim,    label: type };
  }
}

function txStatusBadge(status) {
  switch (status) {
    case "completed":  return { label: "✓ Выполнено", color: T.green };
    case "pending":    return { label: "⏳ Ожидание",  color: T.yellow };
    case "failed":     return { label: "✗ Ошибка",    color: T.red };
    case "processing": return { label: "🔄 Обработка", color: "#29B6F6" };
    default:           return { label: status,         color: T.muted };
  }
}

// ─── Input atom ───────────────────────────────────────────────────────────────
function Input({ label, value, onChange, placeholder, type = "text", icon, prefix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 6 }}>{label}</div>}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: focused ? T.s2 : T.surface,
        border: `1px solid ${focused ? T.yellow + "50" : T.border}`,
        borderRadius: 13, padding: "12px 14px",
        transition: "all 0.2s",
        boxShadow: focused ? `0 0 0 3px ${T.yellow}10` : "none",
      }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        {prefix && <span style={{ color: T.yellow, fontWeight: 700, fontSize: 15 }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            fontSize: 15, color: T.text,
            fontFamily: "'Onest', system-ui, sans-serif",
          }}
        />
      </div>
    </div>
  );
}

// ─── Deposit modal ────────────────────────────────────────────────────────────
const DEPOSIT_METHODS = [
  { id: "rukassa",     label: "RuKassa",     sub: "Карты / СБП",  icon: "💳", color: "#E040FB" },
  { id: "cryptopay",  label: "CryptoPay",   sub: "Telegram",     icon: "✈️", color: "#229ED9" },
  { id: "nowpayments",label: "NOWPayments", sub: "Крипта",       icon: "₿",  color: "#F7931A" },
  { id: "crystalpay", label: "CrystalPAY",  sub: "Крипта / РФ",  icon: "💎", color: "#00E5FF" },
];

function DepositModal({ onClose }) {
  const [method, setMethod] = useState("rukassa");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // POST /api/wallet/deposit/:method
  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return toast.error("Минимум $1");
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API}/wallet/deposit/${method}`,
        { amount: amt },
        { headers: authHeaders() }
      );
      if (data.payUrl) window.open(data.payUrl, "_blank");
      onClose();
      toast.success("Открываем страницу оплаты...");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка платёжной системы");
    } finally {
      setLoading(false);
    }
  };

  const m = DEPOSIT_METHODS.find(x => x.id === method);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      display: "flex", alignItems: "flex-end",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 480, margin: "0 auto",
        background: T.surface, borderRadius: "24px 24px 0 0",
        border: `1px solid ${T.border}`, padding: "6px 20px 40px",
        animation: "slideUp 0.3s cubic-bezier(0.22,1,0.36,1)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: T.border, margin: "12px auto 22px" }} />

        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>Пополнить баланс</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Выберите способ оплаты</div>

        {/* Method selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {DEPOSIT_METHODS.map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)} style={{
              background: method === m.id ? `${m.color}15` : T.s2,
              border: `1px solid ${method === m.id ? m.color + "50" : T.border}`,
              borderRadius: 14, padding: "12px 10px",
              cursor: "pointer", textAlign: "left",
              transition: "all 0.2s",
              boxShadow: method === m.id ? `0 0 0 2px ${m.color}30` : "none",
            }}>
              <div style={{ fontSize: 22, marginBottom: 5 }}>{m.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: method === m.id ? m.color : T.text }}>
                {m.label}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.sub}</div>
            </button>
          ))}
        </div>

        {/* Quick amounts */}
        <div style={{ fontSize: 12, fontWeight: 600, color: T.dim, marginBottom: 8 }}>Быстрый выбор</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {QUICK_AMOUNTS.map(a => (
            <button key={a} onClick={() => setAmount(String(a))} style={{
              padding: "6px 14px", borderRadius: 20,
              background: amount === String(a) ? T.yellow : T.s2,
              border: `1px solid ${amount === String(a) ? T.yellow : T.border}`,
              color: amount === String(a) ? "#000" : T.dim,
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "'Onest', system-ui, sans-serif",
            }}>${a}</button>
          ))}
        </div>

        <Input
          label="Сумма пополнения"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="0.00"
          icon="💵"
          prefix="$"
        />

        <button onClick={handleDeposit} disabled={loading} style={{
          width: "100%", padding: "14px",
          background: loading ? `${m?.color}40` : (m?.color || T.yellow),
          border: "none", borderRadius: 13,
          fontSize: 15, fontWeight: 800,
          color: loading ? "rgba(255,255,255,0.4)" : "#000",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Onest', system-ui, sans-serif",
          boxShadow: loading ? "none" : `0 4px 20px ${m?.color || T.yellow}45`,
          transition: "all 0.2s",
        }}>
          {loading ? "⏳ Создаём счёт..." : `${m?.icon} Оплатить ${amount ? `$${amount}` : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Withdraw modal ───────────────────────────────────────────────────────────
const WITHDRAW_METHODS = [
  { id: "crypto",   label: "CryptoBot",   sub: "USDT/BTC/TRX",  icon: "🤖", color: "#F7931A" },
  { id: "sbp",      label: "СБП",         sub: "По номеру тел.", icon: "📱", color: "#1DB954" },
  { id: "card",     label: "Банк. карта", sub: "Visa / MC",     icon: "💳", color: "#E040FB" },
];

function WithdrawModal({ onClose, balance }) {
  const [wMethod, setWMethod] = useState("crypto");
  const [amount,  setAmount]  = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  // POST /api/wallet/withdraw (CryptoBot)
  // POST /api/wallet/withdraw/rukassa (СБП / карта)
  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5)    return toast.error("Минимальный вывод $5");
    if (!address.trim())    return toast.error("Введите реквизиты");
    if (amt > parseFloat(balance)) return toast.error("Недостаточно средств");

    setLoading(true);
    try {
      if (wMethod === "crypto") {
        const { data } = await axios.post(
          `${API}/wallet/withdraw`,
          { amount: amt, address: address.trim(), currency: "USDT" },
          { headers: authHeaders() }
        );
        toast.success(data.message || "Запрос создан");
      } else {
        const { data } = await axios.post(
          `${API}/wallet/withdraw/rukassa`,
          { amount: amt, account: address.trim(), method: wMethod },
          { headers: authHeaders() }
        );
        toast.success(data.message || "Выплата отправлена!");
      }
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка вывода");
    } finally {
      setLoading(false);
    }
  };

  const fee      = (parseFloat(amount) || 0) * 0.05;
  const receive  = Math.max(0, (parseFloat(amount) || 0) - fee);
  const m        = WITHDRAW_METHODS.find(x => x.id === wMethod);

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
        <div style={{ fontSize: 18, fontWeight: 800, color: T.text, marginBottom: 4 }}>Вывод средств</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 18 }}>Комиссия сервиса: 5%</div>

        {/* Method */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto" }}>
          {WITHDRAW_METHODS.map(m => (
            <button key={m.id} onClick={() => setWMethod(m.id)} style={{
              flex: 1, padding: "10px 8px", borderRadius: 12,
              background: wMethod === m.id ? `${m.color}15` : T.s2,
              border: `1px solid ${wMethod === m.id ? m.color + "50" : T.border}`,
              cursor: "pointer", textAlign: "center",
              whiteSpace: "nowrap", transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 20, marginBottom: 3 }}>{m.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: wMethod === m.id ? m.color : T.dim }}>{m.label}</div>
              <div style={{ fontSize: 10, color: T.muted }}>{m.sub}</div>
            </button>
          ))}
        </div>

        <Input
          label="Сумма вывода"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          placeholder="Минимум $5"
          prefix="$"
          icon="💸"
        />

        <Input
          label={wMethod === "crypto" ? "Адрес в CryptoBot" : wMethod === "sbp" ? "Номер телефона (СБП)" : "Номер карты"}
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder={wMethod === "crypto" ? "@username или адрес" : wMethod === "sbp" ? "+7 999 ..." : "0000 0000 0000 0000"}
          icon={m?.icon}
        />

        {/* Fee preview */}
        {parseFloat(amount) > 0 && (
          <div style={{
            background: T.s2, borderRadius: 12, padding: "12px 14px",
            marginBottom: 16, border: `1px solid ${T.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: T.muted }}>Комиссия (5%)</span>
              <span style={{ fontSize: 13, color: T.red }}>-${fee.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.dim }}>Вы получите</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.green }}>${receive.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button onClick={handleWithdraw} disabled={loading} style={{
          width: "100%", padding: "14px",
          background: loading ? `${T.red}40` : T.red,
          border: "none", borderRadius: 13,
          fontSize: 15, fontWeight: 800, color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Onest', system-ui, sans-serif",
          boxShadow: loading ? "none" : "0 4px 20px rgba(255,77,77,0.4)",
        }}>
          {loading ? "⏳ Обработка..." : `${m?.icon} Вывести ${receive > 0 ? `$${receive.toFixed(2)}` : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main WalletPage ──────────────────────────────────────────────────────────
export default function WalletPage() {
  const { user, updateUser } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [txs, setTxs]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // GET /api/wallet/transactions
  useEffect(() => {
    if (searchParams.get("success")) toast.success("Пополнение прошло успешно! 🎉");
    axios.get(`${API}/wallet/transactions`, { headers: authHeaders() })
      .then(({ data }) => setTxs(data.transactions || []))
      .catch(() => toast.error("Ошибка загрузки транзакций"))
      .finally(() => setLoading(false));
  }, []);

  const balance = parseFloat(user?.balance || 0);
  const frozen  = parseFloat(user?.frozenBalance || 0);

  // SVG mini chart (last 7 deposits)
  const deposits = txs
    .filter(t => t.type === "deposit" && t.status === "completed")
    .slice(0, 7)
    .reverse()
    .map(t => parseFloat(t.amount));
  const maxD = Math.max(...deposits, 1);
  const chartH = 40;
  const chartW = 200;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800;900&display=swap');
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ fontFamily: "'Onest', system-ui, sans-serif", padding: "16px 16px 110px", animation: "fadeUp 0.3s ease" }}>

        {/* ── Balance card ── */}
        <div style={{
          background: `linear-gradient(135deg, #1a1a00, #2a2400)`,
          border: `1px solid ${T.yellow}30`,
          borderRadius: 22, padding: "24px 22px",
          marginBottom: 16, position: "relative", overflow: "hidden",
        }}>
          {/* Glow */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 160, height: 160, borderRadius: "50%",
            background: T.yellow, opacity: 0.08, filter: "blur(40px)",
          }} />

          {/* Mini chart */}
          {deposits.length > 1 && (
            <div style={{ position: "absolute", bottom: 16, right: 16, opacity: 0.3 }}>
              <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
                <polyline
                  fill="none"
                  stroke={T.yellow}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={deposits.map((v, i) =>
                    `${(i / (deposits.length - 1)) * chartW},${chartH - (v / maxD) * chartH}`
                  ).join(" ")}
                />
              </svg>
            </div>
          )}

          <div style={{ fontSize: 13, color: `${T.yellow}90`, fontWeight: 600, marginBottom: 10, letterSpacing: "0.06em" }}>
            💳 ВАШ БАЛАНС
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: T.yellow, letterSpacing: "-1px", lineHeight: 1 }}>
            ${balance.toFixed(2)}
          </div>
          {frozen > 0 && (
            <div style={{ fontSize: 13, color: `${T.yellow}70`, marginTop: 6 }}>
              🔒 В заморозке: ${frozen.toFixed(2)}
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Всего пополнено</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.green }}>
              +${parseFloat(user?.totalDeposited || 0).toFixed(2)}
            </div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Всего выведено</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.red }}>
              -${parseFloat(user?.totalWithdrawn || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          <button onClick={() => setShowDeposit(true)} style={{
            padding: "14px", borderRadius: 14,
            background: T.yellow, border: "none",
            fontSize: 15, fontWeight: 800, color: "#000",
            cursor: "pointer",
            boxShadow: `0 4px 20px ${T.yellow}45`,
            fontFamily: "'Onest', system-ui, sans-serif",
          }}>
            ⬇️ Пополнить
          </button>
          <button onClick={() => setShowWithdraw(true)} style={{
            padding: "14px", borderRadius: 14,
            background: T.s2, border: `1px solid ${T.border}`,
            fontSize: 15, fontWeight: 700, color: T.dim,
            cursor: "pointer",
            fontFamily: "'Onest', system-ui, sans-serif",
          }}>
            ⬆️ Вывести
          </button>
        </div>

        {/* ── Transactions ── */}
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 14 }}>
          История транзакций
        </div>

        {loading && (
          <div style={{ textAlign: "center", paddingTop: 30, color: T.muted }}>
            <div style={{ fontSize: 24 }}>⏳</div>
          </div>
        )}

        {!loading && txs.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 40, color: T.muted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14 }}>Транзакций пока нет</div>
          </div>
        )}

        {txs.map((tx, i) => {
          const meta   = txMeta(tx.type);
          const status = txStatusBadge(tx.status);
          const isPlus = ["deposit", "sale", "refund"].includes(tx.type);

          return (
            <div key={tx._id || i} style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 16, padding: "14px 16px", marginBottom: 10,
              display: "flex", alignItems: "center", gap: 12,
              animation: `fadeUp 0.3s ${i * 0.04}s ease both`,
            }}>
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                background: `${meta.color}12`,
                border: `1px solid ${meta.color}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>{meta.icon}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>
                  {meta.label}
                </div>
                <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {tx.description || ""}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: T.muted }}>
                    {new Date(tx.createdAt || tx.created_at * 1000).toLocaleDateString("ru")}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: status.color }}>
                    {status.label}
                  </span>
                </div>
              </div>

              {/* Amount */}
              <div style={{
                fontSize: 16, fontWeight: 800,
                color: isPlus ? T.green : T.red,
                flexShrink: 0,
              }}>
                {isPlus ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>

      {showDeposit  && <DepositModal  onClose={() => setShowDeposit(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} balance={balance} />}
    </>
  );
}
