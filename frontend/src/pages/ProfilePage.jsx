import React, { useState, useEffect, Component, useMemo } from 'react'
import useMeta from '../hooks/useMeta'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, useStore } from '../store'
import toast from 'react-hot-toast'
import ProductCard from '../components/ProductCard'
import ProfileCard from '../components/ProfileCard/ProfileCard'
import Aurora from '../components/Aurora/Aurora'
import { UserCircle, Package, ShoppingCart, Calendar, Wallet, Zap, Star, Heart } from '../components/Icon'

// ── Detect TG Mini App ────────────────────────────────────────────────────────
const isTG = () => !!(window.Telegram?.WebApp?.initData)

class CardBoundary extends Component {
  state = { error: false }
  static getDerivedStateFromError() { return { error: true } }
  componentDidCatch(e) { console.error('[ProfileCard crash]', e.message) }
  render() {
    if (this.state.error) return this.props.fallback
    return this.props.children
  }
}

const LEVELS = {
  newcomer:    { label:'Новичок',  emoji:'🌱', color:'#6b7280', bg:'rgba(107,114,128,0.12)' },
  experienced: { label:'Опытный',  emoji:'⭐', color:'#3b82f6', bg:'rgba(59,130,246,0.12)' },
  pro:         { label:'Про',       emoji:'💎', color:'#8b5cf6', bg:'rgba(139,92,246,0.12)' },
  legend:      { label:'Легенда',   emoji:'👑', color:'#f5c842', bg:'rgba(245,200,66,0.12)' },
}

function calcLevel(totalSales) {
  const s = parseInt(totalSales) || 0
  if (s >= 50) return 'legend'
  if (s >= 20) return 'pro'
  if (s >= 5)  return 'experienced'
  return 'newcomer'
}

// ── TG Profile — мобильный layout ────────────────────────────────────────────
function TGProfile({ profile, products, reviews, favorites, tab, setTab, isMe, navigate, me }) {
  const joinDate   = profile.created_at ? new Date(Number(profile.created_at) * 1000) : new Date()
  const name       = profile.username || profile.firstName || 'Пользователь'
  const rating     = Math.min(5, Math.max(0, parseFloat(profile.rating) || 5))
  const stars      = Math.round(rating)
  const reviewCount = parseInt(profile.reviewCount) || parseInt(profile.review_count) || 0
  const totalSales  = parseInt(profile.totalSales)  || parseInt(profile.total_sales)  || 0
  const totalPurch  = parseInt(profile.totalPurchases) || parseInt(profile.total_purchases) || 0
  const lvlKey     = profile.seller_level || calcLevel(profile.total_sales)
  const lvl        = LEVELS[lvlKey] || LEVELS.newcomer
  const avatarLetter = name[0].toUpperCase()

  return (
    <div style={{ paddingBottom: 8 }}>
      {/* Шапка профиля */}
      <div style={{
        background: 'linear-gradient(160deg, #0d0d14 0%, #12102a 100%)',
        padding: '24px 16px 20px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,106,255,0.15) 0%, transparent 70%)',
        }}/>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Аватар */}
          <div style={{
            width: 72, height: 72, borderRadius: 20, flexShrink: 0,
            background: profile.photoUrl ? 'transparent' : 'linear-gradient(135deg, var(--purple), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-h)', color: '#0d0d14',
            border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden',
          }}>
            {profile.photoUrl
              ? <img src={profile.photoUrl} alt={name} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              : avatarLetter
            }
          </div>

          {/* Имя и бейджи */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20, margin: 0 }}>@{name}</h1>
              {!!profile.isAdmin && (
                <span className="badge badge-purple" style={{ fontSize: 10 }}>
                  <Zap size={10} style={{ marginRight: 2 }}/> Админ
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 100,
                background: lvl.bg, color: lvl.color,
                fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-h)',
                border: '1px solid ' + lvl.color + '44',
              }}>
                {lvl.emoji} {lvl.label}
              </span>
              {!!profile.isVerified && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Верифицирован</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'var(--accent)', fontSize: 12, letterSpacing: 1 }}>
                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
              </span>
              <span style={{ color: 'var(--t3)', fontSize: 12 }}>{rating.toFixed(1)} · {reviewCount} отз.</span>
            </div>
            {profile.bio && (
              <p style={{ color: 'var(--t2)', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>{String(profile.bio)}</p>
            )}
          </div>
        </div>

        {/* Статистика */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
          {[
            ['🛒', 'Продаж', totalSales],
            ['📦', 'Покупок', totalPurch],
            ['📅', 'С ' + joinDate.toLocaleDateString('ru', { month:'short', year:'2-digit' }), ''],
          ].map(([icon, label, val]) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.05)', borderRadius: 12,
              padding: '10px 8px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{icon}</div>
              {val !== '' && <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{val}</div>}
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, lineHeight: 1.2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Кнопки действий */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {isMe
            ? <Link to="/wallet" className="btn btn-primary" style={{ flex: 1, padding: '11px 16px', fontSize: 13 }}>
                <Wallet size={14} style={{ marginRight: 4 }}/> Кошелёк
              </Link>
            : <Link to={`/messages/${profile._id || profile.id}`} className="btn btn-secondary" style={{ flex: 1, padding: '11px 16px', fontSize: 13 }}>
                💬 Написать
              </Link>
          }
        </div>
      </div>

      {/* Табы */}
      <div style={{
        display: 'flex', gap: 0, padding: '0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {[
          ['products', `Товары (${products.length})`],
          ['reviews',  `Отзывы (${reviews.length})`],
          ...(isMe ? [['favorites', `Избранное (${favorites.length})`]] : [])
        ].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            flex: 1, minWidth: 'max-content',
            padding: '13px 16px', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-h)',
            background: 'transparent',
            color: tab === v ? 'var(--accent)' : 'var(--t3)',
            borderBottom: tab === v ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {/* Контент табов */}
      <div style={{ padding: '12px 16px' }}>
        {tab === 'products' && (
          products.length === 0
            ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--t3)' }}>
                <Package size={36} strokeWidth={0.75} style={{ marginBottom:10, opacity:0.3 }}/>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, marginBottom:12 }}>Товаров нет</div>
                {isMe && <Link to="/sell" className="btn btn-primary" style={{ fontSize:13 }}>+ Выставить товар</Link>}
              </div>
            : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {products.map(p => <ProductCard key={p.id||p._id} product={p}/>)}
              </div>
        )}

        {tab === 'reviews' && (
          reviews.length === 0
            ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--t3)' }}>
                <Star size={36} strokeWidth={0.75} style={{ marginBottom:10, opacity:0.3 }}/>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16 }}>Отзывов пока нет</div>
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {reviews.map(r => (
                  <div key={r.id||r._id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, padding:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <div style={{
                        width:32, height:32, borderRadius:10, flexShrink:0,
                        background:'linear-gradient(135deg,var(--purple),var(--accent))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:700,
                      }}>
                        {(r.reviewer_username||'?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>@{r.reviewer_username}</div>
                        <div style={{ fontSize:10, color:'var(--t4)' }}>
                          {r.product_title ? `${r.product_title} · ` : ''}
                          {new Date((r.created_at||0)*1000).toLocaleDateString('ru')}
                        </div>
                      </div>
                      <span style={{ color:'var(--accent)', fontSize:12 }}>{'★'.repeat(Math.min(5,Math.max(0,parseInt(r.rating)||0)))}</span>
                    </div>
                    {r.text && <p style={{ color:'var(--t2)', fontSize:12, lineHeight:1.6, margin:0 }}>{r.text}</p>}
                  </div>
                ))}
              </div>
        )}

        {tab === 'favorites' && (
          favorites.length === 0
            ? <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--t3)' }}>
                <Heart size={36} strokeWidth={0.75} style={{ marginBottom:10, opacity:0.3 }}/>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, marginBottom:6 }}>Избранное пусто</div>
                <div style={{ fontSize:12, marginBottom:16, color:'var(--t3)' }}>Добавляйте товары нажав ❤️ на странице товара</div>
                <Link to="/catalog" className="btn btn-primary" style={{ fontSize:13 }}>Перейти в каталог</Link>
              </div>
            : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {favorites.map(p => <ProductCard key={p.id||p._id} product={p}/>)}
              </div>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { id } = useParams()
  const { user: me, hydrated } = useStore()
  const navigate = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [tab, setTab]           = useState('products')
  const [favorites, setFavorites] = useState([])
  const tg = useMemo(() => isTG(), [])

  useMeta(profile ? {
    title: `@${profile.username} — профиль продавца`,
    description: `Профиль @${profile.username} на Minions Market. Рейтинг ${profile.rating}, ${profile.total_sales || 0} продаж.`,
  } : { title: 'Профиль' })

  useEffect(() => {
    if (!hydrated) return
    const targetId = id || me?._id || me?.id
    if (!targetId) { navigate('/auth'); return }
    const isMyProfile = !id || id === (me?._id || me?.id)
    setLoading(true)
    setError(null)
    const requests = [api.get(`/users/${targetId}`)]
    if (isMyProfile) requests.push(api.get('/users/me/favorites').catch(() => ({ data: { products: [] } })))
    Promise.all(requests)
      .then(([r, favR]) => {
        setProfile(r.data.user)
        setProducts(r.data.products || [])
        setReviews(r.data.reviews || [])
        if (favR) setFavorites(favR.data.products || [])
      })
      .catch(() => { setError('Пользователь не найден'); toast.error('Пользователь не найден') })
      .finally(() => setLoading(false))
  }, [id, me, hydrated])

  if (!hydrated || loading) return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 12px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24 }}>
        <div className="skel" style={{ width:72, height:72, borderRadius:20, flexShrink:0 }}/>
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
          <div className="skel" style={{ height:20, width:160 }}/>
          <div className="skel" style={{ height:14, width:120 }}/>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns: tg ? '1fr 1fr' : 'repeat(3,1fr)', gap:12 }}>
        {[0,1,2].map(i => <div key={i} className="skel" style={{ height:180 }}/>)}
      </div>
    </div>
  )

  if (error || !profile) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <UserCircle size={48} strokeWidth={1} style={{marginBottom:16, opacity:0.35}}/>
      <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:24, marginBottom:16 }}>
        {error || 'Пользователь не найден'}
      </div>
      <Link to="/" className="btn btn-secondary">На главную</Link>
    </div>
  )

  const isMe        = !id || id === me?._id || id === me?.id
  const joinDate    = profile.created_at ? new Date(Number(profile.created_at) * 1000) : new Date()
  const name        = profile.username || profile.firstName || 'Пользователь'
  const rating      = Math.min(5, Math.max(0, parseFloat(profile.rating) || 5))
  const stars       = Math.round(rating)
  const reviewCount = parseInt(profile.reviewCount)    || parseInt(profile.review_count)    || 0
  const totalSales  = parseInt(profile.totalSales)     || parseInt(profile.total_sales)     || 0
  const totalPurch  = parseInt(profile.totalPurchases) || parseInt(profile.total_purchases) || 0
  const glowColor   = rating >= 4.5 ? 'rgba(245,200,66,0.55)' : 'rgba(124,106,255,0.55)'

  const iconPattern = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='20' cy='20' r='8' fill='white' opacity='0.6'/%3E%3Ccircle cx='60' cy='20' r='5' fill='white' opacity='0.4'/%3E%3Ccircle cx='40' cy='50' r='10' fill='white' opacity='0.7'/%3E%3Ccircle cx='10' cy='60' r='4' fill='white' opacity='0.3'/%3E%3Ccircle cx='70' cy='65' r='7' fill='white' opacity='0.5'/%3E%3Crect x='30' y='5' width='6' height='6' fill='white' opacity='0.5' transform='rotate(45 33 8)'/%3E%3Crect x='55' y='40' width='5' height='5' fill='white' opacity='0.4' transform='rotate(45 57 42)'/%3E%3C/svg%3E`
  const grainPattern = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E`

  const CardFallback = (
    <div style={{
      width:300, background:'linear-gradient(145deg,#1a1a2e,#0f3460)',
      border:'1px solid var(--border)', borderRadius:24, padding:32, textAlign:'center'
    }}>
      <div style={{
        width:80, height:80, borderRadius:20, margin:'0 auto 16px',
        background:'linear-gradient(135deg,var(--purple),var(--accent))',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:32, fontWeight:800, fontFamily:'var(--font-h)', color:'#0d0d14'
      }}>
        {name[0].toUpperCase()}
      </div>
      <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, marginBottom:4 }}>@{name}</div>
      <div style={{ color:'var(--t3)', fontSize:13 }}>★ {rating.toFixed(1)} · {reviewCount} отзывов</div>
    </div>
  )

  // ── TG Mini App ──────────────────────────────────────────────────────────────
  if (tg) {
    return (
      <TGProfile
        profile={profile} products={products} reviews={reviews}
        favorites={favorites} tab={tab} setTab={setTab}
        isMe={isMe} navigate={navigate} me={me}
      />
    )
  }

  // ── Web / Desktop ────────────────────────────────────────────────────────────
  return (
    <div style={{ position:'relative', minHeight:'var(--app-height)', overflow:'hidden' }}>
      {/* Aurora фон */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <Aurora
          colorStops={["#7cff67", "#B19EEF", "#5227FF"]}
          blend={0.5} amplitude={1.0} speed={1}
        />
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'24px 12px' }}>
      <div className="profile-grid">

        {/* Левая колонка — ProfileCard */}
        <div style={{ display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>
          <CardBoundary fallback={CardFallback}>
            <ProfileCard
              name={name}
              title={profile.isVerified
                ? '✓ Верифицирован'
                : `На сайте с ${joinDate.toLocaleDateString('ru', { month:'long', year:'numeric' })}`}
              handle={profile.username || profile.firstName || ''}
              status={`★ ${rating.toFixed(1)} · ${reviewCount} отзывов`}
              contactText={isMe ? 'Кошелёк' : 'Профиль'}
              avatarUrl={profile.photoUrl || ''}
              iconUrl={iconPattern}
              grainUrl={grainPattern}
              showUserInfo={true}
              enableTilt={true}
              enableMobileTilt={false}
              behindGlowEnabled={true}
              behindGlowColor={glowColor}
              innerGradient="linear-gradient(145deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)"
              onContactClick={() => isMe ? navigate('/wallet') : null}
            />
          </CardBoundary>

          {/* Статистика */}
          <div style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:'16px 20px' }}>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:11, color:'var(--t3)', letterSpacing:'0.12em', marginBottom:12 }}>СТАТИСТИКА</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              {[[<Package size={18} strokeWidth={1.5}/>, 'Продаж', totalSales],[<ShoppingCart size={18} strokeWidth={1.5}/>, 'Покупок', totalPurch]].map(([icon,label,val]) => (
                <div key={label} style={{ background:'var(--bg3)', borderRadius:12, padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:18 }}>{icon}</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20 }}>{val}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, display:'flex', justifyContent:'space-between', paddingTop:10, borderTop:'1px solid var(--border)' }}>
              <span style={{ color:'var(--t3)', display:'flex', alignItems:'center', gap:4 }}><Calendar size={13} strokeWidth={1.75}/> На сайте с</span>
              <span style={{ fontWeight:600 }}>{joinDate.toLocaleDateString('ru', { month:'long', year:'numeric' })}</span>
            </div>
          </div>

          {isMe && <Link to="/wallet" className="btn btn-primary btn-full"><Wallet size={15} style={{marginRight:6}}/> Кошелёк</Link>}
          {!isMe && <Link to={`/messages/${id}`} className="btn btn-secondary btn-full" style={{marginTop:8}}>💬 Написать сообщение</Link>}
        </div>

        {/* Правая колонка */}
        <div>
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:8 }}>
              <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:26, margin:0 }}>@{name}</h1>
              {!!profile.isVerified && <span className="badge badge-green">✓ Верифицирован</span>}
              {(() => {
                const lvlKey = profile.seller_level || calcLevel(profile.total_sales)
                const lvl = LEVELS[lvlKey] || LEVELS.newcomer
                return (
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:4,
                    padding:'3px 10px', borderRadius:100,
                    background: lvl.bg, color: lvl.color,
                    fontSize:11, fontWeight:700, fontFamily:'var(--font-h)',
                    border: '1px solid ' + lvl.color + '44',
                  }}>
                    {lvl.emoji} {lvl.label}
                  </span>
                )
              })()}
              {!!profile.isAdmin && <span className="badge badge-purple"><Zap size={12} style={{marginRight:3}}/> Админ</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <span style={{ color:'var(--accent)', fontSize:14, letterSpacing:2 }}>
                {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
              </span>
              <span style={{ color:'var(--t3)', fontSize:13 }}>{rating.toFixed(1)} · {reviewCount} отзывов</span>
            </div>
            {profile.bio && (
              <p style={{ color:'var(--t2)', fontSize:13, lineHeight:1.6, margin:0, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 14px' }}>
                {String(profile.bio)}
              </p>
            )}
          </div>

          {/* Табы */}
          <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
            {[
              ['products', `Товары (${products.length})`],
              ['reviews',  `Отзывы (${reviews.length})`],
              ...(!id || id === (me?._id || me?.id) ? [['favorites', `Избранное (${favorites.length})`]] : [])
            ].map(([v,l]) => (
              <button key={v} onClick={() => setTab(v)} style={{
                padding:'10px 20px', borderRadius:10, border:'1px solid', cursor:'pointer',
                fontSize:13, fontWeight:700, fontFamily:'var(--font-h)', transition:'all 0.15s',
                background: tab===v ? (v==='favorites' ? 'rgba(231,76,60,0.1)' : 'rgba(245,200,66,0.1)') : 'transparent',
                borderColor: tab===v ? (v==='favorites' ? 'rgba(231,76,60,0.4)' : 'rgba(245,200,66,0.4)') : 'var(--border)',
                color: tab===v ? (v==='favorites' ? '#e74c3c' : 'var(--accent)') : 'var(--t3)',
              }}>{l}</button>
            ))}
          </div>

          {tab === 'products' && (
            products.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--t3)' }}>
                  <Package size={40} strokeWidth={0.75} style={{marginBottom:12, opacity:0.3}}/>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:18, marginBottom:16 }}>Товаров нет</div>
                  {isMe && <Link to="/sell" className="btn btn-primary">+ Выставить товар</Link>}
                </div>
              : <div className="profile-products-grid">
                  {products.map(p => <ProductCard key={p.id||p._id} product={p}/>)}
                </div>
          )}

          {tab === 'reviews' && (
            reviews.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--t3)' }}>
                  <Star size={40} strokeWidth={0.75} style={{marginBottom:12, opacity:0.3}}/>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:18 }}>Отзывов пока нет</div>
                </div>
              : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {reviews.map(r => (
                    <div key={r.id||r._id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,var(--purple),var(--accent))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700 }}>
                          {(r.reviewer_username||'?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>@{r.reviewer_username}</div>
                          <div style={{ fontSize:11, color:'var(--t4)' }}>
                            {r.product_title ? `${r.product_title} · ` : ''}
                            {new Date((r.created_at||0)*1000).toLocaleDateString('ru')}
                          </div>
                        </div>
                        <span style={{ color:'var(--accent)', fontSize:14 }}>{'★'.repeat(Math.min(5,Math.max(0,parseInt(r.rating)||0)))}</span>
                      </div>
                      {r.text && <p style={{ color:'var(--t2)', fontSize:13, lineHeight:1.7, margin:0 }}>{r.text}</p>}
                    </div>
                  ))}
                </div>
          )}

          {tab === 'favorites' && (
            favorites.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--t3)' }}>
                  <Heart size={40} strokeWidth={0.75} style={{marginBottom:12, opacity:0.3}}/>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:18, marginBottom:8 }}>Избранное пусто</div>
                  <div style={{ fontSize:13, marginBottom:20 }}>Добавляйте товары в избранное нажав ❤️ на странице товара</div>
                  <Link to="/catalog" className="btn btn-primary">Перейти в каталог</Link>
                </div>
              : <div>
                  <div style={{ fontSize:13, color:'var(--t3)', marginBottom:16 }}>
                    {favorites.length} {favorites.length === 1 ? 'товар' : favorites.length < 5 ? 'товара' : 'товаров'} в избранном
                  </div>
                  <div className="profile-products-grid">
                    {favorites.map(p => <ProductCard key={p.id||p._id} product={p}/>)}
                  </div>
                </div>
          )}
        </div>
      </div>

      <style>{`
        .profile-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .profile-grid { grid-template-columns: 1fr !important; }
          .profile-grid > div:first-child { width: 100%; max-width: 400px; margin: 0 auto; }
        }
        @media (max-width: 480px) {
          .profile-grid > div:first-child { max-width: 100%; }
        }
        .profile-products-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 860px) { .profile-products-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .profile-products-grid { grid-template-columns: 1fr; } }
      `}</style>
      </div>
    </div>
  )
}
