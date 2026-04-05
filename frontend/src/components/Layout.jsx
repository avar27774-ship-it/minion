import React, { useEffect, useState, useCallback } from 'react'
import { Wallet, Handshake, FileText, RotateCcw, Mail, Zap, UserCircle, LogOut, Settings, Home, LayoutGrid, Plus, DollarSign, ShieldCheck, MessageCircle, Search, Bell } from './Icon'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useStore, api } from '../store'

// ── Иконки для нижней навигации ────────────────────────────────────────────────
const IconHome     = () => <Home size={22} strokeWidth={1.75}/>
const IconSearch   = () => <Search size={22} strokeWidth={1.75}/>
const IconGrid     = () => <LayoutGrid size={22} strokeWidth={1.75}/>
const IconPlus     = () => <Plus size={26} strokeWidth={2.5}/>
const IconMessages = () => <MessageCircle size={22} strokeWidth={1.75}/>
const IconProfile  = () => <UserCircle size={22} strokeWidth={1.75}/>

function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (sec < 60)   return 'только что'
  if (sec < 3600) return `${Math.floor(sec/60)} мин назад`
  if (sec < 86400) return `${Math.floor(sec/3600)} ч назад`
  return `${Math.floor(sec/86400)} дн назад`
}

export default function Layout({ children }) {
  const { user, setUser, logout, refreshUser } = useStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [notifs,     setNotifs]     = useState([])
  const [unread,     setUnread]     = useState(0)

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
      // Обновляем баланс сразу при загрузке
      refreshUser()
    }
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)

    // Обновляем баланс каждые 30 секунд
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

  // Закрывать мобильное меню по ESC
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setMobileMenu(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Блокировать скролл когда открыто мобильное меню
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
        background: scrolled ? 'rgba(13,13,20,0.97)' : 'rgba(13,13,20,0.7)',
        backdropFilter: 'blur(24px)',
        borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
        transition: 'all 0.3s', padding: '0 max(12px, env(safe-area-inset-left))',
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
                        {/* Шапка дропдауна */}
                        <div style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'14px 16px', borderBottom:'1px solid var(--border)',
                          flexShrink:0,
                        }}>
                          <span style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:15 }}>
                            🔔 Уведомления
                          </span>
                          <div style={{ display:'flex', gap:8 }}>
                            {notifs.length > 0 && (
                              <button onClick={clearAll} style={{
                                fontSize:11, color:'var(--t4)', background:'none',
                                border:'none', cursor:'pointer', padding:'2px 6px',
                                borderRadius:6,
                              }}>
                                Очистить
                              </button>
                            )}
                            {unread > 0 && (
                              <button onClick={markAllRead} style={{
                                fontSize:11, color:'var(--accent)', background:'none',
                                border:'none', cursor:'pointer', padding:'2px 6px',
                                borderRadius:6,
                              }}>
                                Прочитать все
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Список */}
                        <div style={{ overflow:'auto', flex:1 }}>
                          {notifs.length === 0 ? (
                            <div style={{
                              padding:'40px 20px', textAlign:'center',
                              color:'var(--t4)', fontSize:13,
                            }}>
                              <div style={{ fontSize:32, marginBottom:8 }}>🔕</div>
                              Уведомлений пока нет
                            </div>
                          ) : notifs.map(n => (
                            <div
                              key={n.id || n._id}
                              onClick={() => {
                                setNotifOpen(false)
                                if (n.link) navigate(n.link)
                              }}
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
                              {/* Иконка */}
                              <div style={{
                                width:36, height:36, borderRadius:10, flexShrink:0,
                                background:'var(--bg3)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:18,
                              }}>
                                {n.icon || '🔔'}
                              </div>

                              {/* Текст */}
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{
                                  fontSize:13, fontWeight: n.is_read ? 500 : 700,
                                  color: n.is_read ? 'var(--t2)' : 'var(--t1)',
                                  marginBottom:2,
                                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                                }}>
                                  {n.title}
                                </div>
                                {n.body && (
                                  <div style={{
                                    fontSize:12, color:'var(--t3)', lineHeight:1.4,
                                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                                  }}>
                                    {n.body}
                                  </div>
                                )}
                                <div style={{ fontSize:11, color:'var(--t4)', marginTop:3 }}>
                                  {timeAgo(n.createdAt || n.created_at)}
                                </div>
                              </div>

                              {/* Точка непрочитанного */}
                              {!n.is_read && (
                                <div style={{
                                  width:8, height:8, borderRadius:100,
                                  background:'var(--accent)', flexShrink:0,
                                  marginTop:4,
                                }}/>
                              )}
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
                    <span style={{ color:'var(--accent)', fontSize:12, fontWeight:700 }}>${parseFloat(user.balance||0).toFixed(2)}</span>
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
                          { to:'/profile', icon:'', label:'Профиль' },
                          { to:'/wallet',  icon: <Wallet size={16} strokeWidth={1.75}/>, label:'Кошелёк' },
                          { to:'/deals',   icon: <Handshake size={16} strokeWidth={1.75}/>, label:'Сделки' },
                        ].map(item => (
                          <Link key={item.to} to={item.to} style={{
                            display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                            borderRadius:10, color:'var(--t2)', fontSize:14,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background='var(--bg3)'; e.currentTarget.style.color='var(--t1)' }}
                          onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--t2)' }}>
                            <span>{item.icon}</span> {item.label}
                          </Link>
                        ))}
                        {(user.isAdmin || user.isSubAdmin) && (
                          <Link to="/admin" style={{
                            display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                            borderRadius:10, color:'var(--accent)', fontSize:14
                          }}>
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
                </div>
              </>
            ) : (
              <>
                <Link to="/auth" className="btn btn-sm btn-ghost">Войти</Link>
                <Link to="/auth?mode=register" className="btn btn-sm btn-primary">Регистрация</Link>
              </>
            )}
          </div>

          {/* Mobile: balance + burger */}
          <div style={{ display:'none', alignItems:'center', gap:10, marginLeft:'auto' }} className="mobile-header-right">
            {user && (
              <div style={{
                display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
                background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10,
                fontSize:13, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-h)'
              }}>
                <DollarSign size={13} strokeWidth={2} style={{marginRight:2}}/>${parseFloat(user.balance||0).toFixed(2)}
              </div>
            )}
            <button
              onClick={() => setMobileMenu(true)}
              style={{
                width:40, height:40, borderRadius:10, background:'var(--bg3)',
                border:'1px solid var(--border)', display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer',
              }}
              aria-label="Меню"
            >
              <span style={{ width:18, height:2, background:'var(--t1)', borderRadius:2, display:'block', transition:'all 0.2s' }}/>
              <span style={{ width:18, height:2, background:'var(--t1)', borderRadius:2, display:'block', transition:'all 0.2s' }}/>
              <span style={{ width:12, height:2, background:'var(--t1)', borderRadius:2, display:'block', transition:'all 0.2s', marginLeft:-6 }}/>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Sidebar Menu ───────────────────────────────────────────────── */}
      {mobileMenu && (
        <>
          {/* Backdrop */}
          <div onClick={() => setMobileMenu(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
            backdropFilter:'blur(8px)', zIndex:200, animation:'fadeIn 0.2s ease'
          }}/>
          {/* Drawer */}
          <div style={{
            position:'fixed', top:0, right:0, bottom:0, width:'min(320px, 85vw)',
            background:'var(--bg2)', borderLeft:'1px solid var(--border)',
            zIndex:201, display:'flex', flexDirection:'column',
            animation:'slideIn 0.25s ease', overflowY:'auto',
          }}>
            {/* Drawer header */}
            <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:16 }}>
                Minions<span style={{ color:'var(--accent)' }}>.</span>Market
              </span>
              <button onClick={() => setMobileMenu(false)} style={{
                width:36, height:36, borderRadius:8, background:'var(--bg3)',
                border:'1px solid var(--border)', cursor:'pointer', color:'var(--t2)',
                fontSize:18, display:'flex', alignItems:'center', justifyContent:'center'
              }}>✕</button>
            </div>

            {/* User info */}
            {user && (
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg3)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:44, height:44, borderRadius:12,
                    background:'linear-gradient(135deg,var(--purple),var(--accent))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:18, fontWeight:700, fontFamily:'var(--font-h)'
                  }}>{avatar}</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>@{user.username || user.firstName}</div>
                    <div style={{ color:'var(--accent)', fontSize:13, fontWeight:700 }}>
                      ${parseFloat(user.balance||0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div style={{ padding:'12px 12px', flex:1 }}>
              {[
                { to:'/',        icon:'', label:'Главная' },
                { to:'/catalog', icon:'', label:'Каталог' },
                ...(user ? [
                  { to:'/sell',    icon:'', label:'Продать' },
                  { to:'/deals',   icon: <Handshake size={16} strokeWidth={1.75}/>, label:'Мои сделки' },
                  { to:'/wallet',  icon: <Wallet size={16} strokeWidth={1.75}/>, label:'Кошелёк' },
                  { to:'/profile', icon:'', label:'Профиль' },
                ] : []),
                { to:'/legal/rules',    icon: <FileText size={16} strokeWidth={1.75}/>, label:'Правила' },
                { to:'/legal/offer',    icon: <FileText size={16} strokeWidth={1.75}/>, label:'Оферта' },
                { to:'/legal/delivery', icon: <Mail size={16} strokeWidth={1.75}/>, label:'Доставка' },
                { to:'/legal/refund',   icon: <RotateCcw size={16} strokeWidth={1.75}/>, label:'Возврат' },
                { to:'/legal/contacts', icon: <Mail size={16} strokeWidth={1.75}/>, label:'Контакты' },
              ].map(item => (
                <Link key={item.to} to={item.to} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'13px 12px',
                  borderRadius:12, color: isActive(item.to) ? 'var(--t1)' : 'var(--t2)',
                  background: isActive(item.to) ? 'rgba(245,200,66,0.08)' : 'transparent',
                  fontSize:15, fontWeight: isActive(item.to) ? 600 : 400,
                  marginBottom:2, transition:'all 0.15s',
                }}>
                  <span style={{ fontSize:20, width:24, textAlign:'center' }}>{item.icon}</span>
                  {item.label}
                  {isActive(item.to) && <span style={{ marginLeft:'auto', color:'var(--accent)', fontSize:12 }}>●</span>}
                </Link>
              ))}

              {(user?.isAdmin || user?.isSubAdmin) && (
                <Link to="/admin" style={{
                  display:'flex', alignItems:'center', gap:14, padding:'13px 12px',
                  borderRadius:12, color:'var(--accent)', fontSize:15, fontWeight:600,
                  background:'rgba(245,200,66,0.06)', marginTop:8,
                }}>
                  <Zap size={20} strokeWidth={1.75}/>
                  Админ панель
                </Link>
              )}
            </div>

            {/* Bottom actions */}
            <div style={{ padding:'12px 20px 24px', borderTop:'1px solid var(--border)' }}>
              {user ? (
                <button onClick={() => { logout(); navigate('/'); setMobileMenu(false) }} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'13px 16px',
                  borderRadius:12, color:'var(--red)', fontSize:15, background:'rgba(231,76,60,0.08)',
                  border:'1px solid rgba(231,76,60,0.2)', cursor:'pointer', width:'100%',
                }}>
                  <span>→</span> Выйти
                </button>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <Link to="/auth" className="btn btn-ghost btn-full">Войти</Link>
                  <Link to="/auth?mode=register" className="btn btn-primary btn-full">Регистрация</Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main style={{ flex:1 }}>{children}</main>

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

      {/* ── Mobile bottom navigation ──────────────────────────────────────────── */}
      <nav className="mobile-bottom-nav" style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:90,
        background:'rgba(13,13,20,0.98)', backdropFilter:'blur(24px)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        display:'none', alignItems:'center',
        paddingBottom:'env(safe-area-inset-bottom)',
        height:'calc(var(--bot-nav) + env(safe-area-inset-bottom))',
        boxShadow:'0 -4px 24px rgba(0,0,0,0.4)',
      }}>
        {[
          { to:'/',        icon:<IconHome/>,      label:'Главная' },
          { to:'/catalog', icon:<IconGrid/>,      label:'Каталог' },
          { to:'/sell',    icon:<IconPlus/>,      label:'Продать', center:true },
          { to:'/messages', icon:<IconMessages/>, label:'Чаты' },
          { to: user ? '/profile' : '/auth', icon:<IconProfile/>, label: user ? 'Профиль' : 'Войти' },
        ].map(item => (
          <Link key={item.to} to={item.to} style={{
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:3, padding:'8px 0', textDecoration:'none',
            color: isActive(item.to) ? 'var(--accent)' : 'var(--t3)',
            transition:'color 0.15s', position:'relative',
          }}>
            {item.center ? (
              <div style={{
                width:52, height:52, borderRadius:16,
                background:'linear-gradient(135deg, var(--accent), #e8a020)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#0d0d14', marginTop:-20,
                boxShadow:'0 4px 24px rgba(245,200,66,0.5)',
                border:'3px solid rgba(13,13,20,0.8)',
              }}>
                {item.icon}
              </div>
            ) : (
              <>
                <div style={{
                  width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
                  borderRadius:8,
                  background: isActive(item.to) ? 'rgba(245,200,66,0.12)' : 'transparent',
                  transition:'background 0.2s',
                }}>
                  {item.icon}
                </div>
                <span style={{
                  fontSize:10, fontWeight:700, fontFamily:'var(--font-h)',
                  marginTop:1,
                  color: isActive(item.to) ? 'var(--accent)' : 'var(--t3)',
                }}>{item.label}</span>
              </>
            )}
          </Link>
        ))}
      </nav>

      {/* ── Responsive CSS ────────────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav    { display: none !important; }
          .desktop-actions { display: none !important; }
          .mobile-header-right { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
          .desktop-footer { display: none !important; }
          .mobile-footer  { display: block !important; }
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
