import React, { Suspense, lazy, Component, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import Layout from './components/Layout'
import { useStore, api } from './store'

const Home     = lazy(() => import('./pages/HomePage'))
const Auth     = lazy(() => import('./pages/AuthPage'))
const Catalog  = lazy(() => import('./pages/CatalogPage'))
const Product  = lazy(() => import('./pages/ProductPage'))
const Wallet   = lazy(() => import('./pages/WalletPage'))
const Deals    = lazy(() => import('./pages/DealsPage'))
const Sell     = lazy(() => import('./pages/SellPage'))
const Legal    = lazy(() => import('./pages/LegalPage'))
const Admin    = lazy(() => import('./pages/AdminPage'))
const Profile  = lazy(() => import('./pages/ProfilePage'))
const NotFound = lazy(() => import('./pages/NotFoundPage'))
const Messages = lazy(() => import('./pages/MessagesPage'))
import OfflineBanner from './components/OfflineBanner'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  componentDidCatch(e, info) { console.error('[ErrorBoundary]', e, info) }
  render() {
    if (this.state.error) return (
      <div style={{ maxWidth:600, margin:'80px auto', padding:'0 20px', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>💥</div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:22, marginBottom:12 }}>Что-то пошло не так</div>
        <div style={{ background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:12, padding:16, marginBottom:24, fontSize:13, color:'var(--red)', textAlign:'left', wordBreak:'break-all' }}>
          {this.state.error?.message || String(this.state.error)}
        </div>
        <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); window.location.href = '/' }}>На главную</button>
      </div>
    )
    return this.props.children
  }
}

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh' }}>
      <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
    </div>
  )
}

// ── TG Viewport: синхронизируем --app-height с реальным viewport ──────────────
function useTelegramViewport() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp

    const setHeight = (h) => {
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }

    if (tg) {
      // Используем стабильную высоту (не прыгает при появлении клавиатуры)
      const apply = () => {
        const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight
        setHeight(h)
      }
      apply()
      tg.onEvent('viewportChanged', apply)
      return () => tg.offEvent('viewportChanged', apply)
    } else {
      // Браузер — используем visualViewport если доступен
      const apply = () => {
        const h = window.visualViewport?.height || window.innerHeight
        setHeight(h)
      }
      apply()
      window.visualViewport?.addEventListener('resize', apply)
      window.addEventListener('resize', apply)
      return () => {
        window.visualViewport?.removeEventListener('resize', apply)
        window.removeEventListener('resize', apply)
      }
    }
  }, [])
}

// Telegram Mini App авто-логин
function TelegramWebAppAuth({ children }) {
  const { user, setUser } = useStore()
  const [tgReady, setTgReady] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg || !tg.initData) { setTgReady(true); return }

    tg.ready()
    tg.expand()
    tg.setHeaderColor('#0d0d14')
    tg.setBackgroundColor('#0d0d14')

    if (user) { setTgReady(true); return }

    api.post('/auth/tg-webapp', { initData: tg.initData })
      .then(({ data }) => {
        localStorage.setItem('mn_token', data.token)
        setUser(data.user)
        if (data.isNew) toast.success('Добро пожаловать, ' + (data.user.firstName || data.user.username) + '! 🎉')
      })
      .catch(err => console.warn('[TgWebApp] auth failed:', err.response?.data?.error))
      .finally(() => setTgReady(true))
  }, [])

  if (!tgReady) return <Loader />
  return children
}

const InnerRoutes = () => (
  <Suspense fallback={<Loader/>}>
    <Routes>
      <Route path="/"               element={<Home/>}/>
      <Route path="/catalog"        element={<Catalog/>}/>
      <Route path="/product/:id"    element={<Product/>}/>
      <Route path="/wallet"         element={<Wallet/>}/>
      <Route path="/deals"          element={<Deals/>}/>
      <Route path="/sell"           element={<Sell/>}/>
      <Route path="/profile"        element={<Profile/>}/>
      <Route path="/user/:id"       element={<Profile/>}/>
      <Route path="/messages"       element={<Messages/>}/>
      <Route path="/messages/:userId" element={<Messages/>}/>
      <Route path="/legal/:page"    element={<Legal/>}/>
      <Route path="/contacts"       element={<Navigate to="/legal/contacts"/>}/>
      <Route path="*"               element={<NotFound/>}/>
    </Routes>
  </Suspense>
)

export default function App() {
  useTelegramViewport()
  return (
    <BrowserRouter>
      <OfflineBanner/>
      <Toaster position="top-right" toastOptions={{
        style: { background:'var(--bg2)', color:'var(--t1)', border:'1px solid var(--border)' },
        success: { iconTheme:{ primary:'var(--accent)', secondary:'var(--bg)' } },
        duration: 4000,
      }}/>
      <ErrorBoundary>
        <TelegramWebAppAuth>
          <Suspense fallback={<Loader/>}>
            <Routes>
              <Route path="/admin" element={<Admin/>}/>
              <Route path="/auth"  element={<Auth/>}/>
              <Route path="/*"     element={<Layout><InnerRoutes/></Layout>}/>
            </Routes>
          </Suspense>
        </TelegramWebAppAuth>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
