// ProfilePage.jsx — Playerok-style UPGRADED
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
  bg:       "#0D0D0F",
  surface:  "#161618",
  s2:       "#1E1E21",
  s3:       "#252528",
  border:   "rgba(255,255,255,0.07)",
  border2:  "rgba(255,255,255,0.12)",
  yellow:   "#FFD600",
  yellowDim:"rgba(255,214,0,0.12)",
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

function Stars({ rating = 5, size = 13 }) {
  return (
    <span style={{ fontSize: size, letterSpacing: -0.5 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? T.yellow : T.muted }}>★</span>
      ))}
    </span>
  );
}

function SellerBadge({ sales = 0 }) {
  let level = "Новичок", color = "#64748B", emoji = "🌱";
  if (sales >= 500) { level = "Легенда";      color = "#F59E0B"; emoji = "👑"; }
  else if (sales >= 100) { level = "Топ-продавец"; color = "#8B5CF6"; emoji = "💎"; }
  else if (sales >= 20)  { level = "Продавец";     color = "#3B82F6"; emoji = "⚡"; }
  else if (sales >= 1)   { level = "Продавец";     color = "#22C55E"; emoji = "✅"; }

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: "4px 10px",
    }}>
      <span style={{ fontSize: 12 }}>{emoji}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.04em" }}>{level}</span>
    </div>
  );
}

function IncomeChart({ txs }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toDateString();
  });
  const grouped = days.map(dayStr =>
    txs.filter(t => ["sale","deposit"].includes(t.type) && t.status === "completed")
       .filter(t => new Date(t.createdAt || t.created_at * 1000).toDateString() === dayStr)
       .reduce((acc, t) => acc + parseFloat(t.amount), 0)
  );
  const maxV = Math.max(...grouped, 1);
  const W = 300, H = 60;
  const pts = grouped.map((v, i) => `${(i/(grouped.length-1))*W},${H-(v/maxV)*(H-4)}`).join(" ");
  const area = [`0,${H}`, ...grouped.map((v,i) => `${(i/(grouped.length-1))*W},${H-(v/maxV)*(H-4)}`), `${W},${H}`].join(" ");
  const dayLabels = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block", marginBottom:8 }}>
        <defs><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.yellow} stopOpacity="0.3"/><stop offset="100%" stopColor={T.yellow} stopOpacity="0"/></linearGradient></defs>
        <polygon fill="url(#ig)" points={area}/>
        <polyline fill="none" stroke={T.yellow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts}/>
        {grouped.map((v,i) => v>0 && <circle key={i} cx={(i/(grouped.length-1))*W} cy={H-(v/maxV)*(H-4)} r="3.5" fill={T.yellow}/>)}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        {days.map((d,i) => <span key={i} style={{ fontSize:10, color:T.muted }}>{dayLabels[new Date(d).getDay()===0?6:new Date(d).getDay()-1]}</span>)}
      </div>
    </div>
  );
}

function ListingCard({ product, onDelete, navigate }) {
  const [delLoading, setDelLoading] = useState(false);
  const statusColor = { active:T.green, paused:T.yellow, sold:T.muted, deleted:T.red }[product.status] || T.muted;
  const handleDelete = async () => {
    if (!window.confirm("Удалить лот?")) return;
    setDelLoading(true);
    try {
      await axios.delete(`${API}/products/${product._id}`, { headers: authHeaders() });
      onDelete(product._id); toast.success("Лот удалён");
    } catch (e) { toast.error(e.response?.data?.error || "Ошибка"); }
    finally { setDelLoading(false); }
  };
  return (
    <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"13px 14px", marginBottom:10, display:"flex", gap:12, alignItems:"center" }}>
      <div style={{ width:52, height:52, borderRadius:12, flexShrink:0, background:T.s2, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
        {product.images?.[0] ? <img src={product.images[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : "🎮"}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4 }}>{product.title}</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:14, fontWeight:800, color:T.yellow }}>${parseFloat(product.price).toFixed(2)}</span>
          <span style={{ fontSize:10, fontWeight:600, color:statusColor, background:`${statusColor}15`, padding:"2px 8px", borderRadius:20 }}>● {product.status}</span>
        </div>
        <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>👁 {product.views||0} · ❤️ {product.favorites||0}</div>
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={() => navigate(`/products/${product._id}`)} style={{ width:34, height:34, borderRadius:10, background:T.s2, border:`1px solid ${T.border}`, cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>👁</button>
        <button onClick={handleDelete} disabled={delLoading} style={{ width:34, height:34, borderRadius:10, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>{delLoading?"⏳":"🗑"}</button>
      </div>
    </div>
  );
}

function EditModal({ user, onClose, onSave }) {
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName,  setLastName]  = useState(user?.lastName  || "");
  const [bio,       setBio]       = useState(user?.bio       || "");
  const [loading,   setLoading]   = useState(false);
  const handleSave = async () => {
    setLoading(true);
    try {
      const { data } = await axios.put(`${API}/users/me`, { firstName, lastName, bio }, { headers: authHeaders() });
      onSave(data.user); toast.success("Профиль обновлён ✓"); onClose();
    } catch (e) { toast.error(e.response?.data?.error || "Ошибка"); }
    finally { setLoading(false); }
  };
  const fieldStyle = { width:"100%", background:T.s2, border:`1px solid ${T.border}`, borderRadius:13, padding:"13px 15px", fontSize:15, color:T.text, outline:"none", fontFamily:"inherit" };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-end" }}>
      <div onClick={onClose} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(12px)" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:480, margin:"0 auto", background:T.surface, borderRadius:"28px 28px 0 0", border:`1px solid ${T.border}`, borderBottom:"none", padding:"6px 20px 44px", animation:"slideUp 0.3s cubic-bezier(0.22,1,0.36,1)" }}>
        <div style={{ width:36, height:4, borderRadius:4, background:T.border, margin:"14px auto 24px" }}/>
        <div style={{ fontSize:18, fontWeight:800, color:T.text, marginBottom:22 }}>Редактировать профиль</div>
        {[{label:"Имя",value:firstName,set:setFirstName,ph:"Ваше имя"},{label:"Фамилия",value:lastName,set:setLastName,ph:"Фамилия"}].map(({label,value,set,ph})=>(
          <div key={label} style={{ marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.dim, marginBottom:6 }}>{label}</div>
            <input value={value} onChange={e=>set(e.target.value)} placeholder={ph} style={fieldStyle}/>
          </div>
        ))}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.dim, marginBottom:6 }}>О себе</div>
          <textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,300))} placeholder="Расскажите о себе..." rows={3} style={{ ...fieldStyle, resize:"none" }}/>
          <div style={{ fontSize:11, color:T.muted, textAlign:"right", marginTop:4 }}>{bio.length}/300</div>
        </div>
        <button onClick={handleSave} disabled={loading} style={{ width:"100%", padding:"15px", background:loading?`${T.yellow}40`:T.yellow, border:"none", borderRadius:14, fontSize:15, fontWeight:800, color:"#000", cursor:loading?"not-allowed":"pointer", fontFamily:"inherit", boxShadow:loading?"none":`0 4px 24px ${T.yellow}40`, transition:"all 0.2s" }}>
          {loading?"⏳ Сохранение...":"Сохранить ✓"}
        </button>
      </div>
    </div>
  );
}

function Avatar({ user, size = 88 }) {
  const letter = (user?.username || user?.firstName || "?")[0].toUpperCase();
  const hue = (user?.username || "").split("").reduce((s,c) => s+c.charCodeAt(0), 0) % 360;
  const avatarStyle = {
    width: size, height: size, borderRadius: "50%",
    border: `3px solid ${T.bg}`,
    boxShadow: `0 0 0 2.5px ${T.yellow}55, 0 8px 28px rgba(0,0,0,0.5)`,
    flexShrink: 0, overflow: "hidden",
  };
  if (user?.avatar) return (
    <div style={avatarStyle}><img src={user.avatar} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>
  );
  return (
    <div style={{ ...avatarStyle, background:`linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue+50)%360},65%,38%))`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.37, fontWeight:900, color:"#fff", letterSpacing:"-1px" }}>{letter}</div>
  );
}

export default function ProfilePage() {
  const { userId }   = useParams();
  const navigate     = useNavigate();
  const { user: me, login } = useStore();
  const isOwn     = !userId || userId === me?._id;
  const targetId  = isOwn ? me?._id : userId;

  const [profile,  setProfile]  = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [products, setProducts] = useState([]);
  const [listings, setListings] = useState([]);
  const [txs,      setTxs]      = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("listings");
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    setLoading(true);
    axios.get(`${API}/users/${targetId}`)
      .then(({ data }) => { setProfile(data.user); setReviews(data.reviews||[]); setProducts(data.products||[]); })
      .catch(() => toast.error("Ошибка загрузки профиля"))
      .finally(() => setLoading(false));
    if (isOwn) {
      axios.get(`${API}/products/my/listings`, { headers: authHeaders() }).then(({ data }) => setListings(data.products||[])).catch(()=>{});
      axios.get(`${API}/wallet/transactions`,   { headers: authHeaders() }).then(({ data }) => setTxs(data.transactions||[])).catch(()=>{});
    }
  }, [targetId, isOwn]);

  const p = profile || me;
  const balance    = parseFloat(p?.balance || 0);
  const totalSales = p?.totalSales || 0;
  const salesTotal = txs.filter(t=>t.type==="sale"&&t.status==="completed").reduce((sum,t)=>sum+parseFloat(t.amount),0);

  if (loading) return <div style={{ display:"flex", justifyContent:"center", paddingTop:100 }}><div style={{ fontSize:32, opacity:0.3 }}>⌛</div></div>;

  return (
    <>
      <style>{`
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ fontFamily:"inherit", paddingBottom:120, animation:"fadeUp 0.35s ease" }}>

        {/* ── Hero ── */}
        <div style={{ position:"relative", overflow:"hidden", background:`linear-gradient(180deg, #1C1008 0%, ${T.bg} 100%)`, paddingBottom:20 }}>
          <div style={{ position:"absolute", top:-60, left:"50%", transform:"translateX(-50%)", width:280, height:280, borderRadius:"50%", background:T.yellow, opacity:0.04, filter:"blur(60px)", pointerEvents:"none" }}/>
          {/* Cover bar */}
          <div style={{ height:86, background:"linear-gradient(135deg, #1A1200 0%, #100D00 50%, #120D1A 100%)", position:"relative", marginBottom:-44 }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle at 20% 50%, rgba(255,214,0,0.07) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(139,92,246,0.07) 0%, transparent 60%)" }}/>
          </div>

          <div style={{ padding:"0 18px", position:"relative" }}>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14, marginBottom:16 }}>
              <Avatar user={p} size={88}/>
              <div style={{ flex:1, paddingBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                  <div style={{ fontSize:19, fontWeight:900, color:T.text, letterSpacing:"-0.3px" }}>@{p?.username}</div>
                  {p?.isVerified && <div style={{ width:20, height:20, borderRadius:"50%", background:"#29B6F6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:700, flexShrink:0 }}>✓</div>}
                </div>
                {(p?.firstName||p?.lastName) && <div style={{ fontSize:13, color:T.dim, marginBottom:6 }}>{[p.firstName,p.lastName].filter(Boolean).join(" ")}</div>}
                <SellerBadge sales={totalSales}/>
              </div>
              {isOwn && <button onClick={()=>setShowEdit(true)} style={{ background:T.s2, border:`1px solid ${T.border}`, borderRadius:12, padding:"8px 14px", fontSize:12, fontWeight:600, color:T.dim, cursor:"pointer", flexShrink:0, marginBottom:6 }}>✏️ Изменить</button>}
            </div>

            {p?.bio && <div style={{ fontSize:13, color:T.dim, lineHeight:1.65, marginBottom:16, padding:"12px 14px", background:T.surface, borderRadius:13, border:`1px solid ${T.border}` }}>{p.bio}</div>}

            {/* Balance strip (own) */}
            {isOwn && (
              <div onClick={()=>navigate("/wallet")} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"linear-gradient(135deg, #1A1400, #1E1600)", border:`1px solid ${T.yellow}25`, borderRadius:14, padding:"12px 16px", marginBottom:14, cursor:"pointer" }}>
                <div>
                  <div style={{ fontSize:11, color:`${T.yellow}80`, fontWeight:700, marginBottom:2 }}>💰 БАЛАНС</div>
                  <div style={{ fontSize:22, fontWeight:900, color:T.yellow, letterSpacing:"-0.5px" }}>${balance.toFixed(2)}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();navigate("/wallet");}} style={{ background:T.yellow, border:"none", borderRadius:11, padding:"9px 18px", fontSize:13, fontWeight:800, color:"#000", cursor:"pointer", boxShadow:`0 4px 16px ${T.yellow}50` }}>⬇️ Пополнить</button>
              </div>
            )}

            {/* Stats strip */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8 }}>
              {[
                { label:"Продаж",  value:totalSales },
                { label:"Рейтинг", value:`${(p?.rating||5.0).toFixed(1)}★` },
                { label:"Отзывов", value:p?.reviewCount||reviews.length||0 },
                { label:"Дней",    value:p?.createdAt ? Math.floor((Date.now()/1000-p.createdAt)/86400) : "—" },
              ].map(({label,value})=>(
                <div key={label} style={{ background:`${T.surface}CC`, border:`1px solid ${T.border}`, borderRadius:13, padding:"10px 8px", textAlign:"center" }}>
                  <div style={{ fontSize:15, fontWeight:800, color:T.text }}>{value}</div>
                  <div style={{ fontSize:10, color:T.muted, marginTop:2 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Non-own actions ── */}
        {!isOwn && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"16px 16px 4px" }}>
            <button onClick={()=>navigate(`/messages/${userId}`)} style={{ padding:"13px", borderRadius:14, background:T.yellow, border:"none", fontSize:14, fontWeight:800, color:"#000", cursor:"pointer", boxShadow:`0 4px 20px ${T.yellow}40` }}>💬 Написать</button>
            <button onClick={()=>navigate(`/catalog?seller=${userId}`)} style={{ padding:"13px", borderRadius:14, background:T.s2, border:`1px solid ${T.border}`, fontSize:14, fontWeight:700, color:T.dim, cursor:"pointer" }}>🛍 Все лоты</button>
          </div>
        )}

        {/* ── Tabs (own) ── */}
        {isOwn && (
          <div style={{ display:"flex", gap:6, padding:"14px 16px 12px", position:"sticky", top:0, zIndex:10, background:`${T.bg}F0`, backdropFilter:"blur(12px)" }}>
            {[{id:"listings",label:"Лоты",icon:"📦"},{id:"stats",label:"Статистика",icon:"📊"},{id:"reviews",label:"Отзывы",icon:"⭐"}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"9px 4px", borderRadius:12, background:tab===t.id?T.yellow:T.s2, border:`1px solid ${tab===t.id?T.yellow:T.border}`, fontSize:12, fontWeight:700, color:tab===t.id?"#000":T.dim, cursor:"pointer", transition:"all 0.2s" }}>
                <span style={{ marginRight:4 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding:"14px 16px 0" }}>

          {/* Listings */}
          {(tab==="listings"||!isOwn) && (
            <>
              {isOwn && (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:T.text }}>Активные лоты <span style={{ color:T.muted, fontSize:13 }}>({listings.length})</span></div>
                    <button onClick={()=>navigate("/sell")} style={{ background:T.yellowDim, border:`1px solid ${T.yellow}30`, borderRadius:20, padding:"6px 14px", fontSize:12, fontWeight:700, color:T.yellow, cursor:"pointer" }}>+ Добавить</button>
                  </div>
                  {listings.map(l=><ListingCard key={l._id} product={l} onDelete={id=>setListings(prev=>prev.filter(x=>x._id!==id))} navigate={navigate}/>)}
                  {listings.length===0 && (
                    <div style={{ textAlign:"center", padding:"40px 20px", color:T.muted }}>
                      <div style={{ fontSize:44, marginBottom:12 }}>📦</div>
                      <div style={{ fontSize:15, fontWeight:600, color:T.dim, marginBottom:6 }}>Нет активных лотов</div>
                      <div style={{ fontSize:13, marginBottom:20 }}>Разместите первый товар и начните зарабатывать</div>
                      <button onClick={()=>navigate("/sell")} style={{ padding:"12px 24px", borderRadius:13, background:T.yellow, border:"none", fontSize:14, fontWeight:800, color:"#000", cursor:"pointer", boxShadow:`0 4px 20px ${T.yellow}40` }}>Создать лот →</button>
                    </div>
                  )}
                </>
              )}
              {!isOwn && products.map(prod=>(
                <div key={prod._id} onClick={()=>navigate(`/products/${prod._id}`)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"13px 14px", marginBottom:10, display:"flex", gap:12, alignItems:"center", cursor:"pointer" }}>
                  <div style={{ width:52, height:52, borderRadius:12, background:T.s2, overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                    {prod.images?.[0]?<img src={prod.images[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>:"🎮"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{prod.title}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{prod.category} · 👁 {prod.views}</div>
                  </div>
                  <div style={{ fontSize:16, fontWeight:800, color:T.yellow }}>${parseFloat(prod.price).toFixed(2)}</div>
                </div>
              ))}
            </>
          )}

          {/* Stats */}
          {isOwn && tab==="stats" && (
            <div>
              <div style={{ background:"linear-gradient(135deg, #181100, #201800)", border:`1px solid ${T.yellow}22`, borderRadius:20, padding:"18px 18px 14px", marginBottom:14 }}>
                <div style={{ fontSize:11, color:`${T.yellow}80`, fontWeight:700, marginBottom:8, letterSpacing:"0.08em" }}>💰 ДОХОД ЗА 7 ДНЕЙ</div>
                <div style={{ fontSize:34, fontWeight:900, color:T.yellow, letterSpacing:"-0.5px", marginBottom:18 }}>+${salesTotal.toFixed(2)}</div>
                <IncomeChart txs={txs}/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                {[
                  { label:"Активных лотов", value:listings.filter(l=>l.status==="active").length, icon:"📦", color:"#3B82F6" },
                  { label:"Всего продаж",   value:totalSales,  icon:"🤝", color:"#22C55E" },
                  { label:"Средний чек",    value:totalSales>0?`$${(salesTotal/totalSales).toFixed(2)}`:"$0", icon:"💳", color:"#8B5CF6" },
                  { label:"Рейтинг",        value:`${(p?.rating||5.0).toFixed(1)} ★`, icon:"⭐", color:T.yellow },
                ].map(({label,value,icon,color})=>(
                  <div key={label} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"14px" }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:`${color}15`, border:`1px solid ${color}25`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, marginBottom:10 }}>{icon}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:T.text }}>{value}</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:3 }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button onClick={()=>navigate("/deals")} style={{ padding:"13px", borderRadius:13, background:T.s2, border:`1px solid ${T.border}`, fontSize:13, fontWeight:700, color:T.dim, cursor:"pointer" }}>🤝 Мои сделки</button>
                <button onClick={()=>navigate("/wallet")} style={{ padding:"13px", borderRadius:13, background:T.yellowDim, border:`1px solid ${T.yellow}25`, fontSize:13, fontWeight:700, color:T.yellow, cursor:"pointer" }}>💳 Кошелёк</button>
              </div>
            </div>
          )}

          {/* Reviews */}
          {(tab==="reviews"||(!isOwn&&tab!=="listings"&&tab!=="stats")) && (
            <div>
              {reviews.length===0 && <div style={{ textAlign:"center", padding:"40px 20px", color:T.muted }}><div style={{ fontSize:40 }}>⭐</div><div style={{ marginTop:12, fontSize:14 }}>Отзывов пока нет</div></div>}
              {reviews.map((r,i)=>(
                <div key={r._id||i} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:"14px 16px", marginBottom:10, animation:`fadeUp 0.3s ${i*0.05}s ease both` }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, alignItems:"center" }}>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:"linear-gradient(135deg, #8B5CF6, #A78BFA)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:"#fff", flexShrink:0 }}>{(r.reviewer_username||"?")[0].toUpperCase()}</div>
                      <div><div style={{ fontSize:13, fontWeight:700, color:T.text }}>@{r.reviewer_username}</div><Stars rating={r.rating} size={12}/></div>
                    </div>
                    <div style={{ fontSize:11, color:T.muted }}>{new Date(r.createdAt||r.created_at*1000).toLocaleDateString("ru")}</div>
                  </div>
                  {r.comment && <div style={{ fontSize:13, color:T.dim, lineHeight:1.65 }}>{r.comment}</div>}
                  {r.product_title && <div style={{ fontSize:11, color:T.muted, marginTop:10, padding:"6px 10px", background:T.s2, borderRadius:8, display:"inline-block" }}>📦 {r.product_title}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Logout */}
          {isOwn && tab==="listings" && (
            <div style={{ marginTop:24, paddingTop:20, borderTop:`1px solid ${T.border}` }}>
              <button onClick={()=>{useStore.getState().logout();navigate("/");}} style={{ width:"100%", padding:"13px", background:"rgba(239,68,68,0.07)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:13, fontSize:14, fontWeight:700, color:T.red, cursor:"pointer" }}>→ Выйти из аккаунта</button>
            </div>
          )}
        </div>
      </div>

      {showEdit && <EditModal user={me} onClose={()=>setShowEdit(false)} onSave={u=>{login(u,useStore.getState().token);setProfile(u);}}/>}
    </>
  );
}
