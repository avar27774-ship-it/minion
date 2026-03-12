import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, useStore } from '../store'
import toast from 'react-hot-toast'
import ProductCard from '../components/ProductCard'

const StarRating = ({ value, onRate }) => (
  <div style={{ display:'flex', gap:4 }}>
    {[1,2,3,4,5].map(s => (
      <button key={s} onClick={() => onRate?.(s)} style={{
        background:'none', border:'none', cursor: onRate ? 'pointer' : 'default',
        fontSize:22, color: s <= value ? 'var(--accent)' : 'var(--bg3)',
        transition:'color 0.15s', padding:2
      }}>★</button>
    ))}
  </div>
)

export default function ProfilePage() {
  const { id } = useParams()
  const { user: me } = useStore()
  const navigate = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('products')

  useEffect(() => {
    // Если смотрим свой профиль (/profile без id) — ждём пока загрузится user
    if (!id && !me) {
      // Ещё грузится — подождём
      return
    }
    if (!id && me === undefined) return

    // Если своя страница — используем /users/me эндпоинт через id пользователя
    const targetId = id || me?._id || me?.id

    if (!targetId) {
      // user точно null (не залогинен)
      navigate('/auth')
      return
    }

    setLoading(true)
    api.get(`/users/${targetId}`)
      .then(r => {
        setProfile(r.data.user)
        setProducts(r.data.products || [])
        setReviews(r.data.reviews || [])
      })
      .catch(() => toast.error('Пользователь не найден'))
      .finally(() => setLoading(false))
  }, [id, me])

  // Показываем лоадер пока me ещё не определился (null = не залогинен, undefined = грузится)
  if (!id && me === undefined) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh' }}>
      <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
    </div>
  )

  if (loading) return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'40px 20px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:24 }}>
        <div className="skel" style={{ height:300, borderRadius:20 }}/>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[0,1,2].map(i => <div key={i} className="skel" style={{ height:80 }}/>)}
        </div>
      </div>
    </div>
  )

  if (!profile) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>👤</div>
      <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:24 }}>Пользователь не найден</div>
    </div>
  )

  const joinDate = new Date((profile.created_at || 0) * 1000 || profile.createdAt)

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 20px' }}>
      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:24, alignItems:'start' }}>

        {/* Sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{
            background:'linear-gradient(135deg, rgba(124,106,255,0.1), var(--bg2) 60%, rgba(245,200,66,0.05))',
            border:'1px solid var(--border)', borderRadius:24, padding:28, textAlign:'center'
          }}>
            <div style={{
              width:80, height:80, borderRadius:20,
              background:'linear-gradient(135deg,var(--purple),var(--accent))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-h)', fontWeight:800, fontSize:32,
              margin:'0 auto 16px'
            }}>
              {(profile.username || profile.firstName || '?')[0].toUpperCase()}
            </div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, marginBottom:4 }}>
              @{profile.username || profile.firstName}
            </div>
            {profile.isVerified && (
              <span className="badge badge-green" style={{ marginBottom:12, display:'inline-flex' }}>✓ Верифицирован</span>
            )}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
              <StarRating value={Math.round(profile.rating || 5)} />
            </div>
            <div style={{ color:'var(--t3)', fontSize:13 }}>
              {(profile.rating || 5).toFixed(1)} · {profile.reviewCount || 0} отзывов
            </div>
            {profile.bio && (
              <p style={{ color:'var(--t2)', fontSize:13, lineHeight:1.7, marginTop:12 }}>{profile.bio}</p>
            )}
          </div>

          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:12, color:'var(--t3)', letterSpacing:'0.1em', marginBottom:14 }}>СТАТИСТИКА</div>
            {[
              ['📦 Продаж', profile.totalSales || 0],
              ['🛒 Покупок', profile.totalPurchases || 0],
              ['📅 На сайте', joinDate.toLocaleDateString('ru', { month:'long', year:'numeric' })],
            ].map(([l, v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--t3)' }}>{l}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {(!id || id === me?._id || id === me?.id) && (
            <Link to="/wallet" className="btn btn-secondary" style={{ textAlign:'center' }}>💰 Кошелёк</Link>
          )}
        </div>

        {/* Content */}
        <div>
          <div style={{ display:'flex', gap:6, marginBottom:20 }}>
            {[['products','📦 Товары'], ['reviews','★ Отзывы']].map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} style={{
                padding:'10px 20px', borderRadius:10, border:'1px solid', cursor:'pointer',
                fontSize:13, fontWeight:700, fontFamily:'var(--font-h)', transition:'all 0.15s',
                background: tab === v ? 'rgba(245,200,66,0.1)' : 'transparent',
                borderColor: tab === v ? 'rgba(245,200,66,0.4)' : 'var(--border)',
                color: tab === v ? 'var(--accent)' : 'var(--t3)'
              }}>{l}</button>
            ))}
          </div>

          {tab === 'products' && (
            products.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--t3)' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700 }}>Товаров нет</div>
                </div>
              : <div className="grid-3">
                  {products.map(p => <ProductCard key={p.id||p._id} product={p}/>)}
                </div>
          )}

          {tab === 'reviews' && (
            reviews.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--t3)' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>★</div>
                  <div style={{ fontFamily:'var(--font-h)', fontWeight:700 }}>Отзывов нет</div>
                </div>
              : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {reviews.map(r => (
                    <div key={r.id||r._id} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:16, padding:20 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                        <div style={{
                          width:32, height:32, borderRadius:8,
                          background:'linear-gradient(135deg,var(--purple),var(--accent))',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:12, fontWeight:700
                        }}>
                          {(r.reviewer_username||'?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>@{r.reviewer_username}</div>
                          <div style={{ fontSize:11, color:'var(--t4)' }}>
                            {r.product_title && `${r.product_title} · `}
                            {new Date((r.created_at||0)*1000).toLocaleDateString('ru')}
                          </div>
                        </div>
                        <StarRating value={r.rating}/>
                      </div>
                      {r.text && <p style={{ color:'var(--t2)', fontSize:13, lineHeight:1.7 }}>{r.text}</p>}
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>
    </div>
  )
}
