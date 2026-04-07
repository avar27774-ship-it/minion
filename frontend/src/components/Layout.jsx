import React, { useEffect, useState, useCallback } from 'react'
import { Wallet, Handshake, FileText, RotateCcw, Mail, Zap, UserCircle, LogOut, Settings, Home, LayoutGrid, Plus, DollarSign, ShieldCheck, MessageCircle, Search, Bell } from './Icon'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useStore, api } from '../store'
import { useCurrency } from '../hooks/useCurrency'
import Radio from './Radio'
import OnboardingBanner from './OnboardingBanner'

// ── Иконки для нижней навигации ────────────────────────────────────────────────
const IconHome     = () => <Home size={22} strokeWidth={1.75}/>
const IconSearch   = () => <Search size={22} strokeWidth={1.75}/>
const IconGrid     = () => <LayoutGrid size={22} strokeWidth={1.75}/>
const IconPlus     = () => <Plus size={26} strokeWidth={2.5}/>
const IconMessages = () => <MessageCircle size={22} strokeWidth={1.75}/>
const IconProfile  = () => <UserCircle size={22} strokeWidth={1.75}/>
const IconDeals    = () => <Handshake size={22} strokeWidth={1.75}/>

function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (sec < 60)   return 'только что'
  if (sec < 3600) return `${Math.floor(sec/60)} мин назад`
  if (sec < 86400) return `${Math.floor(sec/3600)} ч назад`
  return `${Math.floor(sec/86400)} дн назад`
}

// ── Бейдж-пузырь ─────────────────────────────────────────────────────────────
function Badge({ count }) {
  if (!count || count === 0) return null
  return (
    <span style={{
      position: 'absolute', top: -3, right: -3,
      background: 'var(--red)', color: '#fff',
      fontSize: 9, fontWeight: 800, fontFamily: 'var(--font-h)',
      minWidth: 16, height: 16, borderRadius: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid rgba(13,13,20,0.98)', padding: '0 3px',
    }}>
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function Layout({ children }) {
  const { user, setUser, logout, refreshUser } = useStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [radioOpen,   setRadioOpen]   = useState(false)
  const [mobileMenu,  setMobileMenu]  = useState(false)
  const [scrolled,    setScrolled]    = useState(false)
  const [notifOpen,   setNotifOpen]   = useState(false)
  const [notifs,      setNotifs]      = useState([])
  const [unread,      setUnread]      = useState(0)
  const [activeDeals, setActiveDeals] = useState(0)   // ← бейдж сделок
  const { fmt } = useCurrency()

  const loadNotifs = useCallback(async () => {
    if (!user) return
    try {
      const r = await api.get('/users/me/notifications')
      setNotifs(r.data.notifications || [])
      setUnread(r.data.unread || 0)
    } catch {}
  }, [user])

  useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 30000)
    return () => clearInterval(t)
  }, [loadNotifs])

  // ── Активные сделки для бейджа ────────────────────────────────────────────
  const loadActiveDeals = useCallback(async () => {
    if (!user) return
    try {
      const r = await api.get('/deals?role=all')
      const count = (r.data || []).filter(d =>
        d.status === 'active' || d.status === 'disputed'
      ).length
      setActiveDeals(count)
    } catch {}
  }, [user])

  useEffect(() => {
    loadActiveDeals()
    const t = setInterval(loadActiveDeals, 30000)
    return () => clearInterval(t)
  }, [loadActiveDeals])

  useEffect(() => {
    if (location.pathname === '/deals') loadActiveDeals()
  }, [location.pathname])

  const markAllRead = async () => {
    try {
      await api.post('/users/me/notifications/read', {})
      setNotifs(n => n.map(x => ({ ...x, is_read: 1 })))
      setUnread(0)
    } catch {}
  }

  const clearAll = async () => {
    try {
      await api.delete('/users/me/notifications')
      setNotifs([])
      setUnread(0)
    } catch {}
  }

  useEffect(() => {
    const token = localStorage.getItem('mn_token')
    if (token && !user) {
      api.get('/auth/me').then(r => setUser(r.data.user || r.data)).catch(() => localStorage.removeItem('mn_token'))
    } else if (token && user) {
      refreshUser()
    }
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    const interval = setInterval(() => { refreshUser() }, 30000)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setMobileMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setMobileMenu(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenu])

  const isActive = useCallback(path =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  , [location.pathname])

  const avatar = (user?.username || user?.firstName || '?')[0].toUpperCase()

  return (
    <div style={{ minHeight:'var(--app-height)', display:'flex', flexDirection:'column' }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(8,8,16,0.6)' : 'rgba(8,8,16,0.2)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
        transition: 'all 0.3s', padding: '0 max(12px, env(safe-area-inset-left))',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.2)' : 'none',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', height:64, display:'flex', alignItems:'center', gap:12 }}>

          {/* Logo */}
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{
              width:36, height:36, borderRadius:10,
              background:'linear-gradient(135deg, #f5c842, #e8500a)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, boxShadow:'0 4px 16px rgba(245,200,66,0.4)'
            }}>M</div>
            <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, letterSpacing:'-0.02em' }}>
              Minions<span style={{ color:'var(--accent)' }}>.</span>Market
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display:'flex', alignItems:'center', gap:4, flex:1, marginLeft:8 }} className="desktop-nav">
            {[{ to:'/', label:'Главная' }, { to:'/catalog', label:'Каталог' }].map(n => (
              <Link key={n.to} to={n.to} style={{
                padding:'6px 14px', borderRadius:8, fontSize:14, fontWeight:500,
                color: isActive(n.to) ? 'var(--accent)' : 'var(--t2)',
                background: isActive(n.to) ? 'rgba(245,200,66,0.08)' : 'transparent',
                transition:'all 0.15s'
              }}>{n.label}</Link>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }} className="desktop-actions">
            {user ? (
              <>
                <Link to="/sell" className="btn btn-sm btn-secondary">+ Продать</Link>

                {/* Бейдж активных сделок (десктоп) */}
                {activeDeals > 0 && (
                  <Link to="/deals" style={{
                    display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                    borderRadius:10, background:'rgba(245,200,66,0.08)',
                    border:'1px solid rgba(245,200,66,0.25)',
                    color:'var(--accent)', fontSize:13, fontWeight:700, fontFamily:'var(--font-h)',
                  }}>
                    <Handshake size={15} strokeWidth={2}/> {activeDeals} активн.
                  </Link>
                )}

                {/* Колокольчик уведомлений */}
                <div style={{ position:'relative' }}>
                  <button
                    onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unread > 0) markAllRead() }}
                    style={{
                      width:38, height:38, borderRadius:10, border:'1px solid var(--border)',
                      background:'var(--bg3)', cursor:'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color: unread > 0 ? 'var(--accent)' : 'var(--t3)', position:'relative',
                    }}
                  >
                    <Bell size={18} strokeWidth={1.75}/>
                    {unread > 0 && (
                      <span style={{
                        position:'absolute', top:-4, right:-4,
                        background:'var(--red)', color:'#fff',
                        fontSize:10, fontWeight:800, fontFamily:'var(--font-h)',
                        width:18, height:18, borderRadius:100,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        border:'2px solid var(--bg1)',
                      }}>
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div onClick={() => setNotifOpen(false)} style={{ position:'fixed', inset:0, zIndex:50 }}>
                      <div onClick={e => e.stopPropagation()} style={{
                        position:'absolute', top:'calc(100% + 8px)', right:0,
                        width:340, maxHeight:480,
                        background:'var(--bg2)', border:'1px solid var(--border)',
                        borderRadius:20, overflow:'hidden',
                        boxShadow:'0 16px 48px rgba(0,0,0,0.6)', zIndex:51,
                        animation:'fadeUp 0.2s ease',
                        display:'flex', flexDirection:'column',
                      }}>
                        <div style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0,
                        }}>
                          <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15 }}>🔔 Уведомления</span>
                          <div style={{ display:'flex', gap:8 }}>
                            {notifs.length > 0 && (
                              <button onClick={clearAll} style={{ fontSize:11, color:'var(--t4)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:6 }}>Очистить</button>
                            )}
                            {unread > 0 && (
                              <button onClick={markAllRead} style={{ fontSize:11, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:6 }}>Прочитать все</button>
                            )}
                          </div>
                        </div>
                        <div style={{ overflow:'auto', flex:1 }}>
                          {notifs.length === 0 ? (
                            <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--t4)', fontSize:13 }}>
                              <div style={{ fontSize:32, marginBottom:8 }}>🔕</div>
                              Уведомлений пока нет
                            </div>
                          ) : notifs.map(n => (
                            <div key={n.id || n._id}
                              onClick={() => { setNotifOpen(false); if (n.link) navigate(n.link) }}
                              style={{
                                display:'flex', gap:12, padding:'12px 16px',
                                borderBottom:'1px solid var(--border)',
                                cursor: n.link ? 'pointer' : 'default',
                                background: n.is_read ? 'transparent' : 'rgba(245,200,66,0.04)',
                                transition:'background 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg3)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(245,200,66,0.04)' }}
                            >
                              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>{n.icon || '🔔'}</div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight: n.is_read ? 500 : 700, color: n.is_read ? 'var(--t2)' : 'var(--t1)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</div>
                                {n.body && <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.body}</div>}
                                <div style={{ fontSize:11, color:'var(--t4)', marginTop:3 }}>{timeAgo(n.createdAt || n.created_at)}</div>
                              </div>
                              {!n.is_read && <div style={{ width:8, height:8, borderRadius:100, background:'var(--accent)', flexShrink:0, marginTop:4 }}/>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => setMenuOpen(!menuOpen)} style={{
                  display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
                  background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10,
                  cursor:'pointer', color:'var(--t1)',
                }}>
                  <div style={{
                    width:28, height:28, borderRadius:8,
                    background:'linear-gradient(135deg,var(--purple),var(--accent))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:12, fontWeight:700, fontFamily:'var(--font-h)', flexShrink:0
                  }}>{avatar}</div>
                  <span style={{ fontSize:13, fontWeight:600 }}>{user.username || user.firstName}</span>
                  <span style={{ color:'var(--accent)', fontSize:12, fontWeight:700 }}>{fmt(user.balance||0)}</span>
                </button>

                {menuOpen && (
                  <div onClick={() => setMenuOpen(false)} style={{ position:'fixed', inset:0, zIndex:50 }}>
                    <div onClick={e => e.stopPropagation()} style={{
                      position:'absolute', top:'calc(100% + 8px)', right:0,
                      background:'var(--bg2)', border:'1px solid var(--border)',
                      borderRadius:20, padding:8, minWidth:190,
                      boxShadow:'0 16px 48px rgba(0,0,0,0.6)', zIndex:51,
                      animation:'fadeUp 0.2s ease'
                    }}>
                      {[
                        { to:'/profile', icon:'👤', label:'Профиль' },
                        { to:'/wallet',  icon:'💳', label:'Кошелёк' },
                        { to:'/deals',   icon:'🤝', label:'Сделки', badge: activeDeals },
                      ].map(item => (
                        <Link key={item.to} to={item.to} style={{
                          display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                          borderRadius:10, color:'var(--t2)', fontSize:14,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--t1)' }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)' }}>
                          <span>{item.icon}</span> {item.label}
                          {item.badge > 0 && (
                            <span style={{ marginLeft:'auto', background:'var(--red)', color:'#fff', fontSize:10, fontWeight:800, padding:'1px 6px', borderRadius:100 }}>{item.badge}</span>
                          )}
                        </Link>
                      ))}
                      {(user.isAdmin || user.isSubAdmin) && (
                        <Link to="/admin" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, color:'var(--accent)', fontSize:14 }}>
                          <Zap size={13} strokeWidth={2}/> Админка
                        </Link>
                      )}
                      <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>
                      <button onClick={() => { logout(); navigate('/') }} style={{
                        display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                        borderRadius:10, color:'var(--red)', fontSize:14, background:'transparent',
                        border:'none', cursor:'pointer', width:'100%', textAlign:'left'
                      }}>
                        <span>→</span> Выйти
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Link to="/auth" className="btn btn-sm btn-ghost">Войти</Link>
                <Link to="/auth?mode=register" className="btn btn-sm btn-primary">Регистрация</Link>
              </>
            )}
          </div>

          {/* Mobile: balance + bell only (burger is in bottom nav) */}
          <div style={{ display:'none', alignItems:'center', gap:8, marginLeft:'auto' }} className="mobile-header-right">
            {user && (
              <div style={{
                display:'flex', alignItems:'center', gap:5, padding:'5px 11px',
                background:'rgba(245,200,66,0.08)',
                border:'1px solid rgba(245,200,66,0.15)',
                borderRadius:10,
                fontSize:12, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-h)',
              }}>
                <DollarSign size={11} strokeWidth={2.5}/>{fmt(user.balance||0)}
              </div>
            )}
            {user && (
              <button
                onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unread > 0) markAllRead() }}
                style={{
                  width:38, height:38, borderRadius:10,
                  background:'rgba(255,255,255,0.06)',
                  border:'1px solid rgba(255,255,255,0.08)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', position:'relative', color:'var(--t2)',
                }}
              >
                <Bell size={17} strokeWidth={1.75}/>
                {unread > 0 && (
                  <span style={{
                    position:'absolute', top:6, right:6,
                    width:7, height:7, borderRadius:'50%',
                    background:'var(--accent)',
                    boxShadow:'0 0 6px var(--accent)',
                  }}/>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Menu ───────────────────────────────────────────────── */}
      {mobileMenu && (
        <>
          {/* Backdrop */}
          <div onClick={() => setMobileMenu(false)} style={{
            position:'fixed', inset:0,
            background:'rgba(0,0,0,0.35)',
            backdropFilter:'blur(6px)',
            WebkitBackdropFilter:'blur(6px)',
            zIndex:200, animation:'fadeIn 0.2s ease'
          }}/>

          {/* Drawer */}
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:'min(300px, 82vw)',
            background:'rgba(8,8,18,0.55)',
            backdropFilter:'blur(48px) saturate(180%)',
            WebkitBackdropFilter:'blur(48px) saturate(180%)',
            borderLeft:'1px solid rgba(255,255,255,0.07)',
            zIndex:201, display:'flex', flexDirection:'column',
            animation:'slideIn 0.28s cubic-bezier(0.32,0.72,0,1)',
            overflowY:'auto',
            boxShadow:'-4px 0 40px rgba(0,0,0,0.3)',
          }}>

            {/* Header */}
            <div style={{
              padding:'20px 18px 16px',
              borderBottom:'1px solid rgba(255,255,255,0.05)',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'rgba(255,255,255,0.02)',
            }}>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:17, letterSpacing:'-0.02em' }}>
                Minions<span style={{ color:'var(--accent)' }}>.</span>Market
              </div>
              <button onClick={() => setMobileMenu(false)} style={{
                width:32, height:32, borderRadius:8,
                background:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.08)',
                cursor:'pointer', color:'var(--t2)',
                fontSize:14, display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.15s',
              }}>✕</button>
            </div>

            {/* User card */}
            {user && (
              <Link to="/profile" onClick={() => setMobileMenu(false)} style={{
                padding:'14px 18px', textDecoration:'none',
                borderBottom:'1px solid rgba(255,255,255,0.05)',
                background:'rgba(245,200,66,0.05)',
                display:'flex', alignItems:'center', gap:12,
                transition:'background 0.15s',
              }}>
                <div style={{
                  width:46, height:46, borderRadius:14, flexShrink:0,
                  background:'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(245,200,66,0.8))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:19, fontWeight:800, fontFamily:'var(--font-h)',
                  boxShadow:'0 4px 16px rgba(139,92,246,0.3)',
                  color:'#fff',
                }}>{avatar}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:'var(--t1)' }}>@{user.username || user.firstName}</div>
                  <div style={{ color:'var(--accent)', fontSize:13, fontWeight:700, marginTop:1 }}>{fmt(user.balance||0)}</div>
                </div>
                <div style={{ color:'rgba(255,255,255,0.2)', fontSize:16 }}>›</div>
              </Link>
            )}

            {/* Nav links */}
            <div style={{ padding:'10px 10px', flex:1 }}>

              {/* Main section */}
              <div style={{ marginBottom:6 }}>
                {[
                  { to:'/',        icon:'🏠', label:'Главная' },
                  { to:'/catalog', icon:'🛍', label:'Каталог' },
                  ...(user ? [
                    { to:'/sell',    icon:'📦', label:'Продать' },
                    { to:'/deals',   icon:'🤝', label:'Мои сделки', badge: activeDeals },
                    { to:'/wallet',  icon:'💳', label:'Кошелёк' },
                    { to:'/profile', icon:'👤', label:'Профиль' },
                  ] : []),
                ].map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileMenu(false)} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'11px 12px',
                    borderRadius:11, textDecoration:'none',
                    color: isActive(item.to) ? 'var(--t1)' : 'rgba(255,255,255,0.65)',
                    background: isActive(item.to) ? 'rgba(245,200,66,0.1)' : 'transparent',
                    fontSize:14, fontWeight: isActive(item.to) ? 600 : 400,
                    marginBottom:1, transition:'all 0.15s',
                    borderLeft: isActive(item.to) ? '2px solid var(--accent)' : '2px solid transparent',
                  }}>
                    <span style={{ fontSize:17, width:22, textAlign:'center', opacity: isActive(item.to) ? 1 : 0.7 }}>{item.icon}</span>
                    <span style={{ flex:1 }}>{item.label}</span>
                    {item.badge > 0
                      ? <span style={{ background:'var(--red)', color:'#fff', fontSize:10, fontWeight:800, padding:'2px 7px', borderRadius:100 }}>{item.badge}</span>
                      : isActive(item.to) && <span style={{ color:'var(--accent)', fontSize:10, opacity:0.8 }}>●</span>
                    }
                  </Link>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height:'1px', background:'rgba(255,255,255,0.05)', margin:'8px 4px 10px' }}/>

              {/* Legal section label */}
              <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em', padding:'0 12px', marginBottom:6 }}>ИНФОРМАЦИЯ</div>

              {[
                { to:'/legal/rules',    icon:'📋', label:'Правила' },
                { to:'/legal/offer',    icon:'📄', label:'Оферта' },
                { to:'/legal/delivery', icon:'🚚', label:'Доставка' },
                { to:'/legal/refund',   icon:'↩️', label:'Возврат' },
                { to:'/legal/contacts', icon:'✉️', label:'Контакты' },
              ].map(item => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenu(false)} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'9px 12px',
                  borderRadius:10, textDecoration:'none',
                  color:'rgba(255,255,255,0.4)',
                  fontSize:13, fontWeight:400,
                  marginBottom:1, transition:'color 0.15s',
                }}>
                  <span style={{ fontSize:15, width:22, textAlign:'center', opacity:0.6 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              {/* Admin */}
              {(user?.isAdmin || user?.isSubAdmin) && (
                <>
                  <div style={{ height:'1px', background:'rgba(255,255,255,0.05)', margin:'8px 4px 10px' }}/>
                  <Link to="/admin" onClick={() => setMobileMenu(false)} style={{
                    display:'flex', alignItems:'center', gap:12, padding:'11px 12px',
                    borderRadius:11, color:'var(--accent)', fontSize:14, fontWeight:600,
                    background:'rgba(245,200,66,0.07)',
                    border:'1px solid rgba(245,200,66,0.12)',
                    textDecoration:'none',
                  }}>
                    <Zap size={18} strokeWidth={1.75}/>
                    Админ панель
                  </Link>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div style={{ padding:'10px 10px 20px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(255,255,255,0.01)' }}>
              {user ? (
                <button onClick={() => { logout(); navigate('/'); setMobileMenu(false) }} style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  padding:'11px 16px', borderRadius:11,
                  color:'rgba(231,76,60,0.8)', fontSize:14,
                  background:'rgba(231,76,60,0.07)',
                  border:'1px solid rgba(231,76,60,0.12)',
                  cursor:'pointer', width:'100%',
                  transition:'all 0.15s',
                }}>
                  <LogOut size={15} strokeWidth={1.75}/> Выйти
                </button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <Link to="/auth" onClick={() => setMobileMenu(false)} className="btn btn-ghost btn-full">Войти</Link>
                  <Link to="/auth?mode=register" onClick={() => setMobileMenu(false)} className="btn btn-primary btn-full">Регистрация</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main style={{ flex:1 }}>
        {/* Онбординг для новых юзеров (только на главной и каталоге) */}
        {(location.pathname === '/' || location.pathname === '/catalog') && (
          <OnboardingBanner />
        )}
        {children}
      </main>

      {/* ── Footer (desktop) ─────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'32px 20px', background:'var(--bg)' }} className="desktop-footer">
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:32 }}>
            <div>
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:18, marginBottom:12 }}>
                Minions<span style={{ color:'var(--accent)' }}>.</span>Market
              </div>
              <p style={{ color:'var(--t3)', fontSize:13, lineHeight:1.7, maxWidth:280 }}>
                Безопасный маркетплейс цифровых товаров. Все сделки через систему гаранта.
              </p>
            </div>
            {[
              { title:'Маркетплейс', links:[{to:'/catalog',label:'Каталог'},{to:'/sell',label:'Продать'},{to:'/deals',label:'Сделки'}] },
              { title:'Поддержка',   links:[{to:'/legal/rules',label:'Правила'},{to:'/legal/offer',label:'Оферта'},{to:'/legal/delivery',label:'Доставка'},{to:'/legal/refund',label:'Возврат'},{to:'/legal/privacy',label:'Конфиденциальность'},{to:'/legal/contacts',label:'Контакты'}] },
              { title:'Аккаунт',     links:[{to:'/auth',label:'Войти'},{to:'/wallet',label:'Кошелёк'},{to:'/profile',label:'Профиль'}] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:12, color:'var(--t3)', letterSpacing:'0.12em', marginBottom:14 }}>{col.title.toUpperCase()}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {col.links.map(l => (
                    <Link key={l.to} to={l.to} style={{ color:'var(--t2)', fontSize:13 }}
                      onMouseEnter={e => e.target.style.color='var(--t1)'}
                      onMouseLeave={e => e.target.style.color='var(--t2)'}>{l.label}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:20, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <span style={{ color:'var(--t4)', fontSize:12 }}>© 2025 Minions Market.</span>
            <span style={{ color:'var(--t4)', fontSize:12 }}>Комиссия платформы 5%</span>
          </div>
        </div>
      </footer>

      {/* ── Mobile footer (simple) ────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'20px 16px', background:'var(--bg)', textAlign:'center' }} className="mobile-footer">
        <div style={{ color:'var(--t4)', fontSize:12, marginBottom:10 }}>© 2025 Minions Market · Комиссия 5%</div>
        <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
          {[{to:'/legal/rules',l:'Правила'},{to:'/legal/privacy',l:'Конфид.'},{to:'/legal/contacts',l:'Контакты'}].map(x => (
            <Link key={x.to} to={x.to} style={{ color:'var(--t3)', fontSize:12 }}>{x.l}</Link>
          ))}
        </div>
      </footer>

      {/* ── Онлайн радио (над навбаром) ──────────────────────────────────────── */}
      <Radio triggerOpen={radioOpen} onTriggerHandled={() => setRadioOpen(false)}/>

      {/* ── Mobile bottom navigation ──────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:90,
        background:'rgba(8,8,16,0.4)',
        backdropFilter:'blur(30px) saturate(150%)',
        WebkitBackdropFilter:'blur(30px) saturate(150%)',
        borderTop:'1px solid rgba(255,255,255,0.05)',
        display:'none', alignItems:'center',
        paddingBottom:'env(safe-area-inset-bottom)',
        height:'calc(var(--bot-nav) + env(safe-area-inset-bottom))',
        boxShadow:'none',
      }}>
        {[
          { to:'/',        icon:<IconHome/>,   label:'Главная' },
          { to:'/catalog', icon:<IconGrid/>,   label:'Каталог' },
          { to:'/sell',    icon:<IconPlus/>,   label:'Продать', center:true },
          { to:'/deals',   icon:<IconDeals/>,  label:'Сделки',  badge: activeDeals },
          { radio:true,    label:'Радио' },
          { menu:true,     label:'Меню' },
        ].map(item => (
          item.radio ? (
            <button key="radio" onClick={() => setRadioOpen(true)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:2, padding:'8px 0',
              background:'transparent', border:'none', cursor:'pointer',
            }}>
              <div style={{
                width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:10, fontSize:17,
                background: 'transparent',
                transition:'all 0.2s',
              }}>📻</div>
              <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.02em', color:'var(--t3)' }}>Радио</span>
            </button>
          ) : item.menu ? (
            <button key="menu" onClick={() => setMobileMenu(true)} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:2, padding:'8px 0',
              background:'transparent', border:'none', cursor:'pointer',
            }}>
              <div style={{
                width:30, height:30, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:4, borderRadius:10,
                background: mobileMenu ? 'rgba(245,200,66,0.15)' : 'transparent',
                transition:'all 0.2s',
              }}>
                <span style={{ width:15, height:1.5, background: mobileMenu ? 'var(--accent)' : 'rgba(255,255,255,0.5)', borderRadius:2, display:'block', transition:'all 0.2s' }}/>
                <span style={{ width:15, height:1.5, background: mobileMenu ? 'var(--accent)' : 'rgba(255,255,255,0.5)', borderRadius:2, display:'block', transition:'all 0.2s' }}/>
                <span style={{ width:10, height:1.5, background: mobileMenu ? 'var(--accent)' : 'rgba(255,255,255,0.5)', borderRadius:2, display:'block', alignSelf:'flex-start', marginLeft:3, transition:'all 0.2s' }}/>
              </div>
              <span style={{ fontSize:10, fontWeight:600, letterSpacing:'0.02em', color: mobileMenu ? 'var(--accent)' : 'var(--t3)', transition:'color 0.2s' }}>Меню</span>
            </button>
          ) : (
            <Link key={item.to} to={item.to} style={{
              flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              justifyContent:'center', gap:2, padding:'8px 0', textDecoration:'none',
              transition:'all 0.15s', position:'relative',
            }}>
              {item.center ? (
                <div style={{
                  width:50, height:50, borderRadius:16,
                  background:'linear-gradient(145deg, #f5c842, #d4930a)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#0d0d14', marginTop:-22,
                  boxShadow:'0 6px 28px rgba(245,200,66,0.45), 0 2px 8px rgba(0,0,0,0.4)',
                  border:'2.5px solid rgba(13,13,20,0.9)',
                  transition:'transform 0.15s, box-shadow 0.15s',
                }}>
                  {item.icon}
                </div>
              ) : (
                <>
                  <div style={{
                    width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center',
                    borderRadius:10, position:'relative',
                    background: isActive(item.to) ? 'rgba(245,200,66,0.15)' : 'transparent',
                    transition:'all 0.2s',
                  }}>
                    <span style={{ color: isActive(item.to) ? 'var(--accent)' : 'rgba(255,255,255,0.45)', transition:'color 0.2s' }}>
                      {item.icon}
                    </span>
                    <Badge count={item.badge} />
                  </div>
                  <span style={{
                    fontSize:10, fontWeight:600, letterSpacing:'0.02em',
                    color: isActive(item.to) ? 'var(--accent)' : 'var(--t3)',
                    transition:'color 0.2s',
                  }}>{item.label}</span>
                  {isActive(item.to) && (
                    <span style={{
                      position:'absolute', bottom:4, width:4, height:4,
                      borderRadius:'50%', background:'var(--accent)',
                      boxShadow:'0 0 6px var(--accent)',
                    }}/>
                  )}
                </>
              )}
            </Link>
          )
        ))}
      </nav>

      {/* ── Responsive CSS ────────────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav     { display: none !important; }
          .desktop-actions { display: none !important; }
          .mobile-header-right { display: flex !important; }
          .mobile-bottom-nav   { display: flex !important; }
          .desktop-footer  { display: none !important; }
          .mobile-footer   { display: block !important; }
          header { padding-left: 12px !important; padding-right: 12px !important; }
          header > div { padding: 0 !important; }
        }
        @media (min-width: 769px) {
          .mobile-footer  { display: none !important; }
          .desktop-footer { display: block !important; }
        }
      `}</style>
    </div>
  )
}
