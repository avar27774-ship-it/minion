import { useStore } from './store'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import HomePage     from './pages/HomePage'
import AuthPage     from './pages/AuthPage'
import CatalogPage  from './pages/CatalogPage'
import GamesPage    from './pages/GamesPage'
import ProductPage  from './pages/ProductPage'
import SellPage     from './pages/SellPage'
import ProfilePage  from './pages/ProfilePage'
import MessagesPage from './pages/MessagesPage'
import DealsPage    from './pages/DealsPage'
import WalletPage   from './pages/WalletPage'
import AdminPage    from './pages/AdminPage'
import LegalPage    from './pages/LegalPage'
import NotFoundPage from './pages/NotFoundPage'

// PrivateRoute и GuestRoute должны быть внутри BrowserRouter — вынесены как компоненты
function PrivateRoute({ children }) {
  const user     = useStore(s => s.user)
  const hydrated = useStore(s => s.hydrated)
  const location = useLocation()
  if (!hydrated) return null
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  return children
}

function GuestRoute({ children }) {
  const user     = useStore(s => s.user)
  const hydrated = useStore(s => s.hydrated)
  if (!hydrated) return null
  if (user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Без Layout */}
      <Route path="/auth"  element={<GuestRoute><AuthPage /></GuestRoute>} />
      <Route path="/admin" element={<AdminPage />} />

      {/* С Layout */}
      <Route element={<Layout />}>
        <Route path="/"                 element={<HomePage />} />
        <Route path="/catalog"          element={<CatalogPage />} />
        <Route path="/games"            element={<GamesPage />} />
        <Route path="/products/:id"     element={<ProductPage />} />
        <Route path="/legal"            element={<LegalPage />} />
        <Route path="/legal/:tab"       element={<LegalPage />} />
        <Route path="/profile/:userId"  element={<ProfilePage />} />
        <Route path="/sell"             element={<PrivateRoute><SellPage /></PrivateRoute>} />
        <Route path="/profile"          element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/messages"         element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
        <Route path="/messages/:userId" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
        <Route path="/deals"            element={<PrivateRoute><DealsPage /></PrivateRoute>} />
        <Route path="/deals/:dealId"    element={<PrivateRoute><DealsPage /></PrivateRoute>} />
        <Route path="/wallet"           element={<PrivateRoute><WalletPage /></PrivateRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1e1e24', color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', fontSize: '14px',
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  )
}
