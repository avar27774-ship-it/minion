// WalletPage.jsx — Playerok-style UPGRADED
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
  bg:       "#0D0D0F",
  surface:  "#161618",
  s2:       "#1E1E21",
  s3:       "#252528",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  yellow:   "#FFD600",
  yellowDim:"rgba(255,214,0,0.10)",
  green:    "#22C55E",
  text:     "#FFFFFF",
  muted:    "rgba(255,255,255,0.35)",
  dim:      "rgba(255,255,255,0.6)",
  red:      "#EF4444",
  purple:   "#8B5CF6",
  blue:     "#3B82F6",
};

function authHeaders() {
  return { Authorization: `Bearer ${useStore.getState().token}` };
}

// ─── Amount presets ───────────────────────────────────────────────────────────
const AMOUNTS = [
  { value: 5,   label: "$5",    popular: false },
  { value: 10,  label: "$10",   popular: false },
  { value: 25,  label: "$25",   popular: true  },
  { value: 50,  label: "$50",   popular: true  },
  { value: 100, label: "$100",  popular: false },
  { value: 200, label: "$200",  popular: false },
];

// ─── Tx helpers ───────────────────────────────────────────────────────────────
function txMeta(type) {
  switch (type) {
    case "deposit":    return { icon: "⬇️",  color: T.green,  label: "Пополнение" };
    case "withdrawal": return { icon: "⬆️",  color: T.red,    label: "Вывод" };
    case "sale":       return { icon: "💰",  color: T.yellow, label: "Продажа" };
    case "purchase":   return { icon: "🛒",  color: T.red,    label: "Покупка" };
    case "commission": return { icon: "📊",  color: T.muted,  label: "Комиссия" };
    case "refund":     return { icon: "↩️",  color: T.green,  label: "Возврат" };
    default:           return { icon: "💳",  color: T.dim,    label: type };
  }
}

function txStatusBadge(status) {
  switch (status) {
    case "completed":  return { label: "Выполнено", color: T.green };
    case "pending":    return { label: "Ожидание",  color: T.yellow };
    case "failed":     return { label: "Ошибка",    color: T.red };
    case "processing": return { label: "Обработка", color: "#29B6F6" };
    default:           return { label: status,      color: T.muted };
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
        border: `1px solid ${focused ? T.yellow + "60" : T.border}`,
        borderRadius: 13, padding: "13px 15px",
        transition: "all 0.2s",
        boxShadow: focused ? `0 0 0 3px ${T.yellow}12` : "none",
      }}>
        {icon && <span style={{ fontSize: 17 }}>{icon}</span>}
        {prefix && <span style={{ color: T.yellow, fontWeight: 800, fontSize: 15 }}>{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 15, color: T.text, fontFamily: "inherit" }}
        />
      </div>
    </div>
  );
}

// ─── Payment method groups ────────────────────────────────────────────────────
const METHOD_GROUPS = [
  {
    id: "cards",
    label: "Карты и СБП",
    icon: "💳",
    color: "#E040FB",
    methods: [
      { id: "rukassa", label: "RuKassa", sub: "Visa · MC · МИР · СБП", color: "#E040FB", icon: "💳" },
    ],
  },
  {
    id: "crypto",
    label: "Крипта",
    icon: "₿",
    color: "#F7931A",
    methods: [
      { id: "cryptopay",   label: "CryptoPay",   sub: "Telegram · USDT · BTC", color: "#229ED9", icon: "✈️" },
      { id: "nowpayments", label: "NOWPayments", sub: "100+ монет",             color: "#F7931A", icon: "₿" },
      { id: "crystalpay",  label: "CrystalPAY",  sub: "Крипта + РФ карты",     color: "#00E5FF", icon: "💎" },
    ],
  },
  {
    id: "skins",
    label: "Скины CS2",
    icon: "🎮",
    color: "#FF6B35",
    methods: [],
    comingSoon: true,
  },
];

// ─── Deposit Modal ────────────────────────────────────────────────────────────
function DepositModal({ onClose }) {
  const [groupId, setGroupId]   = useState("cards");
  const [method,  setMethod]    = useState("rukassa");
  const [amount,  setAmount]    = useState("");
  const [loading, setLoading]   = useState(false);

  const currentGroup = METHOD_GROUPS.find(g => g.id === groupId);
  const currentMethod = currentGroup?.methods.find(m => m.id === method) || currentGroup?.methods[0];

  const handleGroupSelect = (gid) => {
    setGroupId(gid);
    const grp = METHOD_GROUPS.find(g => g.id === gid);
    if (grp?.methods?.[0]) setMethod(grp.methods[0].id);
  };

  // POST /api/wallet/deposit/:method
  const handleDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1) return toast.error("Минимум $1");
    if (currentGroup?.comingSoon) return toast("Скоро доступно!", { icon: "🚧" });
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/wallet/deposit/${method}`, { amount: amt }, { headers: authHeaders() });
      if (data.payUrl) window.open(data.payUrl, "_blank");
      onClose();
      toast.success("Открываем страницу оплаты...");
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка платёжной системы");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)" }}/>
      <div style={{
        position:"relative", width:"100%", maxWidth:480, margin:"0 auto",
        background:T.surface, borderRadius:"28px 28px 0 0",
        border:`1px solid ${T.border}`, borderBottom:"none",
        padding:"6px 20px 44px",
        animation:"slideUp 0.3s cubic-bezier(0.22,1,0.36,1)",
        maxHeight:"90vh", overflowY:"auto",
      }}>
        <div style={{ width:36, height:4, borderRadius:4, background:T.border, margin:"14px auto 22px" }}/>
        <div style={{ fontSize:19, fontWeight:900, color:T.text, marginBottom:4 }}>Пополнение баланса</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:22 }}>Выберите способ оплаты и сумму</div>

        {/* Group tabs */}
        <div style={{ display:"flex", gap:8, marginBottom:18, overflowX:"auto" }}>
          {METHOD_GROUPS.map(g => (
            <button key={g.id} onClick={() => handleGroupSelect(g.id)} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"8px 14px", borderRadius:22, flexShrink:0,
              background: groupId===g.id ? `${g.color}18` : T.s2,
              border: `1px solid ${groupId===g.id ? g.color+"50" : T.border}`,
              color: groupId===g.id ? g.color : T.dim,
              fontSize:13, fontWeight:700, cursor:"pointer",
              transition:"all 0.2s",
            }}>
              <span>{g.icon}</span>
              <span>{g.label}</span>
              {g.comingSoon && <span style={{ fontSize:9, background:`${g.color}30`, color:g.color, padding:"2px 6px", borderRadius:8, fontWeight:700 }}>СКОРО</span>}
            </button>
          ))}
        </div>

        {/* Method cards */}
        {!currentGroup?.comingSoon && currentGroup?.methods.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns: currentGroup.methods.length > 1 ? "1fr 1fr 1fr" : "1fr", gap:10, marginBottom:22 }}>
            {currentGroup.methods.map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)} style={{
                background: method===m.id ? `${m.color}18` : T.s2,
                border: `1px solid ${method===m.id ? m.color+"55" : T.border}`,
                borderRadius:14, padding:"14px 10px",
                cursor:"pointer", textAlign:"center",
                transition:"all 0.2s",
                boxShadow: method===m.id ? `0 0 0 2px ${m.color}25` : "none",
              }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{m.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:method===m.id?m.color:T.text, marginBottom:3 }}>{m.label}</div>
                <div style={{ fontSize:10, color:T.muted, lineHeight:1.4 }}>{m.sub}</div>
              </button>
            ))}
          </div>
        )}

        {/* Coming soon */}
        {currentGroup?.comingSoon && (
          <div style={{ textAlign:"center", padding:"30px 20px", marginBottom:16 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🚧</div>
            <div style={{ fontSize:15, fontWeight:700, color:T.dim, marginBottom:6 }}>Скоро доступно!</div>
            <div style={{ fontSize:13, color:T.muted }}>Оплата скинами CS2 появится в ближайшее время</div>
          </div>
        )}

        {/* Amount presets */}
        {!currentGroup?.comingSoon && (
          <>
            <div style={{ fontSize:12, fontWeight:600, color:T.dim, marginBottom:10 }}>Выберите сумму</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
              {AMOUNTS.map(a => (
                <button key={a.value} onClick={() => setAmount(String(a.value))} style={{
                  padding:"11px 8px", borderRadius:12, textAlign:"center",
                  background: amount===String(a.value) ? T.yellow : T.s2,
                  border: `1px solid ${amount===String(a.value) ? T.yellow : T.border}`,
                  color: amount===String(a.value) ? "#000" : T.dim,
                  fontSize:14, fontWeight:800, cursor:"pointer",
                  position:"relative", transition:"all 0.15s",
                }}>
                  {a.label}
                  {a.popular && amount!==String(a.value) && (
                    <span style={{ position:"absolute", top:-6, right:4, fontSize:8, background:T.yellow, color:"#000", padding:"1px 5px", borderRadius:6, fontWeight:800 }}>ХИТ</span>
                  )}
                </button>
              ))}
            </div>

            <Input
              label="Или введите свою сумму"
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              icon="💵"
              prefix="$"
            />

            <button onClick={handleDeposit} disabled={loading || !amount} style={{
              width:"100%", padding:"15px",
              background: loading||!amount ? T.s2 : T.yellow,
              border:"none", borderRadius:14,
              fontSize:15, fontWeight:800,
              color: loading||!amount ? T.muted : "#000",
              cursor: loading||!amount ? "not-allowed" : "pointer",
              fontFamily:"inherit",
              boxShadow: loading||!amount ? "none" : `0 4px 24px ${T.yellow}45`,
              transition:"all 0.2s",
            }}>
              {loading ? "⏳ Создаём счёт..." : `⬇️ Пополнить ${amount ? `$${amount}` : ""}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Withdraw Modal ───────────────────────────────────────────────────────────
const WITHDRAW_METHODS = [
  { id:"crypto", label:"CryptoBot",   sub:"USDT · BTC · TRX",  icon:"🤖", color:"#F7931A" },
  { id:"sbp",    label:"СБП",         sub:"По номеру тел.",     icon:"📱", color:"#22C55E" },
  { id:"card",   label:"Карта",       sub:"Visa · MC",          icon:"💳", color:"#E040FB" },
];

function WithdrawModal({ onClose, balance }) {
  const [wMethod, setWMethod] = useState("crypto");
  const [amount,  setAmount]  = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5)             return toast.error("Минимальный вывод $5");
    if (!address.trim())             return toast.error("Введите реквизиты");
    if (amt > parseFloat(balance))   return toast.error("Недостаточно средств");
    setLoading(true);
    try {
      if (wMethod === "crypto") {
        const { data } = await axios.post(`${API}/wallet/withdraw`, { amount:amt, address:address.trim(), currency:"USDT" }, { headers:authHeaders() });
        toast.success(data.message || "Запрос создан");
      } else {
        const { data } = await axios.post(`${API}/wallet/withdraw/rukassa`, { amount:amt, account:address.trim(), method:wMethod }, { headers:authHeaders() });
        toast.success(data.message || "Выплата отправлена!");
      }
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.error || "Ошибка вывода");
    } finally {
      setLoading(false);
    }
  };

  const fee     = (parseFloat(amount) || 0) * 0.05;
  const receive = Math.max(0, (parseFloat(amount) || 0) - fee);
  const m       = WITHDRAW_METHODS.find(x => x.id === wMethod);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.85)", backdropFilter:"blur(12px)" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:480, margin:"0 auto", background:T.surface, borderRadius:"28px 28px 0 0", border:`1px solid ${T.border}`, borderBottom:"none", padding:"6px 20px 44px", animation:"slideUp 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ width:36, height:4, borderRadius:4, background:T.border, margin:"14px auto 22px" }}/>
        <div style={{ fontSize:19, fontWeight:900, color:T.text, marginBottom:4 }}>Вывод средств</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:20 }}>Комиссия сервиса: 5%</div>

        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {WITHDRAW_METHODS.map(wm => (
            <button key={wm.id} onClick={() => setWMethod(wm.id)} style={{
              flex:1, padding:"11px 6px", borderRadius:13,
              background: wMethod===wm.id ? `${wm.color}18` : T.s2,
              border: `1px solid ${wMethod===wm.id ? wm.color+"55" : T.border}`,
              cursor:"pointer", textAlign:"center", transition:"all 0.2s",
            }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{wm.icon}</div>
              <div style={{ fontSize:11, fontWeight:700, color:wMethod===wm.id?wm.color:T.dim }}>{wm.label}</div>
              <div style={{ fontSize:9, color:T.muted, marginTop:2 }}>{wm.sub}</div>
            </button>
          ))}
        </div>

        <Input label="Сумма вывода" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,""))} placeholder="Минимум $5" prefix="$" icon="💸"/>
        <Input
          label={wMethod==="crypto"?"Адрес в CryptoBot":wMethod==="sbp"?"Номер телефона (СБП)":"Номер карты"}
          value={address} onChange={e=>setAddress(e.target.value)}
          placeholder={wMethod==="crypto"?"@username или адрес":wMethod==="sbp"?"+7 999 ...":"0000 0000 0000 0000"}
          icon={m?.icon}
        />

        {parseFloat(amount) > 0 && (
          <div style={{ background:T.s2, borderRadius:13, padding:"13px 15px", marginBottom:16, border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:13, color:T.muted }}>Комиссия (5%)</span>
              <span style={{ fontSize:13, color:T.red, fontWeight:600 }}>-${fee.toFixed(2)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:14, fontWeight:700, color:T.dim }}>Вы получите</span>
              <span style={{ fontSize:17, fontWeight:900, color:T.green }}>${receive.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button onClick={handleWithdraw} disabled={loading} style={{ width:"100%", padding:"15px", background:loading?`rgba(239,68,68,0.3)`:T.red, border:"none", borderRadius:14, fontSize:15, fontWeight:800, color:"#fff", cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:loading?"none":"0 4px 24px rgba(239,68,68,0.4)", transition:"all 0.2s" }}>
          {loading?"⏳ Обработка...":`${m?.icon} Вывести${receive>0?` $${receive.toFixed(2)}`:""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Tx filter tabs ───────────────────────────────────────────────────────────
const TX_FILTERS = [
  { id:"all",       label:"Все" },
  { id:"deposit",   label:"Пополнения" },
  { id:"sale",      label:"Продажи" },
  { id:"purchase",  label:"Покупки" },
  { id:"withdrawal",label:"Выводы" },
];

// ─── Main WalletPage ──────────────────────────────────────────────────────────
export default function WalletPage() {
  const { user, refreshUser } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [txs,          setTxs]          = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showDeposit,  setShowDeposit]  = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [txFilter,     setTxFilter]     = useState("all");

  // GET /api/wallet/transactions
  useEffect(() => {
    if (searchParams.get("success")) toast.success("Пополнение прошло успешно! 🎉");
    axios.get(`${API}/wallet/transactions`, { headers: authHeaders() })
      .then(({ data }) => setTxs(data.transactions || []))
      .catch(() => toast.error("Ошибка загрузки транзакций"))
      .finally(() => setLoading(false));
    // Refresh balance from server
    refreshUser?.();
  }, []);

  const balance = parseFloat(user?.balance || 0);
  const frozen  = parseFloat(user?.frozenBalance || 0);

  const filteredTxs = txFilter === "all" ? txs : txs.filter(t => t.type === txFilter);

  // Balance chart (last 7 deposits)
  const deposits = txs.filter(t => t.type==="deposit" && t.status==="completed").slice(0,7).reverse().map(t=>parseFloat(t.amount));
  const maxD = Math.max(...deposits, 1);
  const cH = 44, cW = 220;

  return (
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{opacity:0.5} 50%{opacity:1} 100%{opacity:0.5} }
      `}</style>

      <div style={{ fontFamily:"inherit", padding:"16px 16px 120px", animation:"fadeUp 0.35s ease" }}>

        {/* ── Balance card ── */}
        <div style={{
          background:"linear-gradient(135deg, #1C1500, #221900, #1A1200)",
          border:`1px solid ${T.yellow}30`,
          borderRadius:24, padding:"22px 22px 20px",
          marginBottom:14, position:"relative", overflow:"hidden",
        }}>
          {/* Glow */}
          <div style={{ position:"absolute", top:-50, right:-50, width:180, height:180, borderRadius:"50%", background:T.yellow, opacity:0.07, filter:"blur(50px)" }}/>

          {/* Mini chart */}
          {deposits.length > 1 && (
            <div style={{ position:"absolute", bottom:16, right:16, opacity:0.25 }}>
              <svg width={cW} height={cH} viewBox={`0 0 ${cW} ${cH}`}>
                <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.yellow} stopOpacity="0.5"/><stop offset="100%" stopColor={T.yellow} stopOpacity="0"/></linearGradient></defs>
                <polygon fill="url(#cg)" points={[`0,${cH}`,...deposits.map((v,i)=>`${(i/(deposits.length-1))*cW},${cH-(v/maxD)*cH}`),`${cW},${cH}`].join(" ")}/>
                <polyline fill="none" stroke={T.yellow} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                  points={deposits.map((v,i)=>`${(i/(deposits.length-1))*cW},${cH-(v/maxD)*cH}`).join(" ")}/>
              </svg>
            </div>
          )}

          <div style={{ fontSize:12, color:`${T.yellow}80`, fontWeight:700, marginBottom:10, letterSpacing:"0.08em" }}>💳 ВАШ БАЛАНС</div>
          <div style={{ fontSize:46, fontWeight:900, color:T.yellow, letterSpacing:"-2px", lineHeight:1, marginBottom:6 }}>
            ${balance.toFixed(2)}
          </div>
          {frozen > 0 && (
            <div style={{ fontSize:12, color:`${T.yellow}65`, marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
              🔒 В заморозке: <strong>${frozen.toFixed(2)}</strong>
            </div>
          )}

          {/* Action buttons inside card */}
          <div style={{ display:"flex", gap:10, marginTop:20 }}>
            <button onClick={() => setShowDeposit(true)} style={{
              flex:1, padding:"12px",
              background:T.yellow, border:"none", borderRadius:13,
              fontSize:14, fontWeight:800, color:"#000",
              cursor:"pointer", boxShadow:`0 4px 20px ${T.yellow}50`,
              fontFamily:"inherit",
            }}>⬇️ Пополнить</button>
            <button onClick={() => setShowWithdraw(true)} style={{
              flex:1, padding:"12px",
              background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)",
              borderRadius:13, fontSize:14, fontWeight:700, color:T.dim,
              cursor:"pointer", backdropFilter:"blur(4px)",
              fontFamily:"inherit",
            }}>⬆️ Вывести</button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:T.muted, marginBottom:5, fontWeight:600 }}>Всего пополнено</div>
            <div style={{ fontSize:20, fontWeight:900, color:T.green }}>+${parseFloat(user?.totalDeposited||0).toFixed(2)}</div>
          </div>
          <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:T.muted, marginBottom:5, fontWeight:600 }}>Всего выведено</div>
            <div style={{ fontSize:20, fontWeight:900, color:T.red }}>-${parseFloat(user?.totalWithdrawn||0).toFixed(2)}</div>
          </div>
        </div>

        {/* ── Transaction filters ── */}
        <div style={{ fontSize:16, fontWeight:800, color:T.text, marginBottom:12 }}>История транзакций</div>
        <div style={{ display:"flex", gap:6, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
          {TX_FILTERS.map(f => (
            <button key={f.id} onClick={() => setTxFilter(f.id)} style={{
              padding:"6px 14px", borderRadius:20, flexShrink:0,
              background: txFilter===f.id ? T.yellow : T.s2,
              border: `1px solid ${txFilter===f.id ? T.yellow : T.border}`,
              color: txFilter===f.id ? "#000" : T.dim,
              fontSize:12, fontWeight:700, cursor:"pointer",
              transition:"all 0.15s",
            }}>{f.label}</button>
          ))}
        </div>

        {/* ── Tx list ── */}
        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height:72, borderRadius:16, background:T.surface, border:`1px solid ${T.border}`, animation:"shimmer 1.5s ease infinite" }}/>
            ))}
          </div>
        )}

        {!loading && filteredTxs.length === 0 && (
          <div style={{ textAlign:"center", padding:"50px 20px", color:T.muted }}>
            <div style={{ fontSize:44, marginBottom:12 }}>📭</div>
            <div style={{ fontSize:15, fontWeight:600, color:T.dim, marginBottom:4 }}>
              {txFilter==="all" ? "Транзакций пока нет" : "Нет транзакций этого типа"}
            </div>
            {txFilter==="all" && <div style={{ fontSize:13 }}>Пополните баланс, чтобы начать</div>}
          </div>
        )}

        {!loading && filteredTxs.map((tx, i) => {
          const meta   = txMeta(tx.type);
          const status = txStatusBadge(tx.status);
          const isPlus = ["deposit","sale","refund"].includes(tx.type);
          return (
            <div key={tx._id||i} style={{
              background:T.surface, border:`1px solid ${T.border}`,
              borderRadius:16, padding:"14px 15px", marginBottom:10,
              display:"flex", alignItems:"center", gap:13,
              animation:`fadeUp 0.3s ${Math.min(i,8)*0.04}s ease both`,
            }}>
              <div style={{
                width:46, height:46, borderRadius:14, flexShrink:0,
                background:`${meta.color}12`, border:`1px solid ${meta.color}22`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
              }}>{meta.icon}</div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.text, marginBottom:2 }}>{meta.label}</div>
                {tx.description && <div style={{ fontSize:11, color:T.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{tx.description}</div>}
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:T.muted }}>{new Date(tx.createdAt||tx.created_at*1000).toLocaleDateString("ru", { day:"2-digit", month:"short" })}</span>
                  <span style={{ width:3, height:3, borderRadius:"50%", background:T.muted, flexShrink:0 }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:status.color }}>● {status.label}</span>
                </div>
              </div>

              <div style={{ fontSize:16, fontWeight:900, color:isPlus?T.green:T.red, flexShrink:0, letterSpacing:"-0.3px" }}>
                {isPlus?"+":"-"}${parseFloat(tx.amount).toFixed(2)}
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
