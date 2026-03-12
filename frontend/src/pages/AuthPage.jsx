import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api, useStore } from '../store'
import toast from 'react-hot-toast'
import MagicRings from '../components/MagicRings/MagicRings'

export default function AuthPage() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const { setUser } = useStore()
  const [mode, setMode]           = useState(params.get('mode')==='register' ? 'register' : 'login')
  const [step, setStep]           = useState(1)
  const [resetStep, setResetStep] = useState(1)
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [code, setCode]           = useState('')
  const [newPass, setNewPass]     = useState('')
  const [botName, setBotName]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [showPass, setShowPass]   = useState(false)

  const Spinner = () => (
    <span style={{ width:16, height:16, border:'2px solid transparent', borderTopColor:'currentColor', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }}/>
  )

  const handleLogin = async () => {
    if (!username||!password) return toast.error('Заполните все поля')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { username, password })
      localStorage.setItem('mn_token', data.token)
      setUser(data.user)
      toast.success('Добро пожаловать!')
      navigate('/')
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка входа') }
    setLoading(false)
  }

  const handleRegisterCheck = async () => {
    if (username.length < 3) return toast.error('Минимум 3 символа')
    setLoading(true)
    try {
      await api.post('/auth/register/init', { username })
      const { data } = await api.post('/auth/register/check', { username })
      setBotName(data.botUsername)
      setStep(2)
      toast.success('Логин свободен! Получите код в боте.')
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setLoading(false)
  }

  const handleRegisterVerify = async () => {
    if (!code||!password) return toast.error('Заполните все поля')
    if (password.length < 6) return toast.error('Пароль минимум 6 символов')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register/verify', { username, code, password })
      localStorage.setItem('mn_token', data.token)
      setUser(data.user)
      toast.success('Аккаунт создан!')
      navigate('/')
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setLoading(false)
  }

  const handleResetRequest = async () => {
    if (!username) return toast.error('Введите логин')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset/request', { username })
      setBotName(data.botUsername)
      setResetStep(2)
      toast.success('Запросите код в боте!')
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setLoading(false)
  }

  const handleResetConfirm = async () => {
    if (!code||!newPass) return toast.error('Заполните все поля')
    setLoading(true)
    try {
      await api.post('/auth/reset/confirm', { username, code, newPassword: newPass })
      toast.success('Пароль изменён! Войдите.')
      setMode('login'); setResetStep(1)
    } catch(e) { toast.error(e.response?.data?.error||'Ошибка') }
    setLoading(false)
  }

  const Label = ({ children }) => (
    <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', fontFamily:'var(--font-h)', letterSpacing:'0.12em', marginBottom:6 }}>{children}</div>
  )

  const BotInstructions = ({ action }) => (
    <div style={{ background:'rgba(245,200,66,0.06)', border:'1px solid rgba(245,200,66,0.2)', borderRadius:14, padding:16, marginBottom:20 }}>
      <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:13, color:'var(--accent)', marginBottom:10 }}>📱 Инструкция</div>
      <ol style={{ color:'var(--t2)', fontSize:13, lineHeight:2, paddingLeft:18, margin:0 }}>
        <li>Откройте бота <a href={`https://t.me/${botName||'MinionsMarketBot'}`} target="_blank" rel="noopener" style={{ color:'var(--accent)' }}>{botName ? `@${botName}` : 'Telegram Bot'}</a></li>
        <li>Отправьте: <code style={{ background:'var(--bg3)', padding:'2px 8px', borderRadius:6, color:'var(--accent)', fontFamily:'monospace' }}>/{action} {username}</code></li>
        <li>Скопируйте код и вставьте ниже</li>
      </ol>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden', background:'var(--bg)' }}>

      {/* MagicRings фон */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <MagicRings
          color="#f5c842"
          colorTwo="#7c6aff"
          ringCount={5}
          speed={0.6}
          attenuation={12}
          lineThickness={1.8}
          baseRadius={0.3}
          radiusStep={0.12}
          scaleRate={0.08}
          opacity={0.7}
          blur={0}
          noiseAmount={0.05}
          ringGap={1.6}
          fadeIn={0.7}
          fadeOut={0.5}
          followMouse={true}
          mouseInfluence={0.15}
          hoverScale={1.1}
          parallax={0.03}
          clickBurst={false}
        />
      </div>

      {/* Затемнение поверх колец */}
      <div style={{ position:'fixed', inset:0, zIndex:1, background:'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(13,13,20,0.85) 100%)', pointerEvents:'none' }}/>

      {/* Карточка */}
      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:2 }}>

        {/* Лого */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:44, marginBottom:6 }}>🟡</div>
          <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:26, letterSpacing:'-0.02em' }}>
            Minions<span style={{ color:'var(--accent)' }}>.</span>Market
          </div>
          <div style={{ color:'var(--t3)', fontSize:13, marginTop:4 }}>
            {mode==='login' && 'Рады видеть снова 👋'}
            {mode==='register' && 'Создайте аккаунт 🚀'}
            {mode==='reset' && 'Восстановление пароля 🔑'}
          </div>
        </div>

        {/* Форма */}
        <div style={{
          background:'rgba(18,18,28,0.85)', backdropFilter:'blur(20px)',
          border:'1px solid rgba(255,255,255,0.07)', borderRadius:24, padding:32,
          boxShadow:'0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,200,66,0.04)'
        }}>

          {/* Табы */}
          {mode !== 'reset' && (
            <div style={{ display:'flex', background:'rgba(255,255,255,0.04)', borderRadius:12, padding:4, marginBottom:28 }}>
              {[['login','Войти'],['register','Регистрация']].map(([m,l]) => (
                <button key={m} onClick={() => { setMode(m); setStep(1); setUsername(''); setPassword(''); setCode('') }} style={{
                  flex:1, padding:'10px', borderRadius:9, border:'none', cursor:'pointer',
                  fontFamily:'var(--font-h)', fontWeight:700, fontSize:13, transition:'all 0.2s',
                  background: mode===m ? 'rgba(245,200,66,0.12)' : 'transparent',
                  color: mode===m ? 'var(--accent)' : 'var(--t3)',
                  boxShadow: mode===m ? '0 1px 8px rgba(245,200,66,0.1)' : 'none'
                }}>{l}</button>
              ))}
            </div>
          )}

          {/* LOGIN */}
          {mode==='login' && (
            <div className="anim-in">
              <div style={{ marginBottom:14 }}>
                <Label>ЛОГИН</Label>
                <input className="inp" placeholder="your_username" value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleLogin()}/>
              </div>
              <div style={{ marginBottom:24 }}>
                <Label>ПАРОЛЬ</Label>
                <div style={{ position:'relative' }}>
                  <input className="inp" type={showPass?'text':'password'} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleLogin()}
                    style={{ paddingRight:44 }}/>
                  <button onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:16 }}>
                    {showPass?'🙈':'👁'}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleLogin} disabled={loading}>
                {loading ? <Spinner/> : 'Войти →'}
              </button>
              <button onClick={() => { setMode('reset'); setUsername(''); setResetStep(1) }}
                style={{ marginTop:12, background:'none', border:'none', color:'var(--t3)', fontSize:13, cursor:'pointer', width:'100%', textAlign:'center' }}>
                Забыл пароль?
              </button>
            </div>
          )}

          {/* REGISTER step 1 */}
          {mode==='register' && step===1 && (
            <div className="anim-in">
              <div style={{ background:'rgba(124,106,255,0.08)', border:'1px solid rgba(124,106,255,0.2)', borderRadius:12, padding:14, marginBottom:20, fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>
                💡 Регистрация через Telegram — просто и безопасно. Никакой почты!
              </div>
              <div style={{ marginBottom:20 }}>
                <Label>ПРИДУМАЙТЕ ЛОГИН</Label>
                <input className="inp" placeholder="только латиница и цифры"
                  value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                  onKeyDown={e => e.key==='Enter' && handleRegisterCheck()}/>
                <div style={{ fontSize:11, color:'var(--t4)', marginTop:6 }}>Минимум 3 символа, только a-z, 0-9, _</div>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleRegisterCheck} disabled={loading}>
                {loading ? <Spinner/> : 'Далее →'}
              </button>
            </div>
          )}

          {/* REGISTER step 2 */}
          {mode==='register' && step===2 && (
            <div className="anim-in">
              <button onClick={() => setStep(1)} style={{ background:'none', border:'none', color:'var(--t3)', fontSize:13, cursor:'pointer', marginBottom:16, padding:0, display:'flex', alignItems:'center', gap:6 }}>← Назад</button>
              <BotInstructions action="code"/>
              <div style={{ marginBottom:14 }}>
                <Label>КОД ИЗ БОТА</Label>
                <input className="inp" placeholder="123456" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))}
                  style={{ letterSpacing:'0.3em', fontSize:20, fontFamily:'var(--font-h)', textAlign:'center' }}/>
              </div>
              <div style={{ marginBottom:24 }}>
                <Label>ПРИДУМАЙТЕ ПАРОЛЬ</Label>
                <div style={{ position:'relative' }}>
                  <input className="inp" type={showPass?'text':'password'} placeholder="Минимум 6 символов"
                    value={password} onChange={e => setPassword(e.target.value)} style={{ paddingRight:44 }}/>
                  <button onClick={() => setShowPass(!showPass)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:16 }}>
                    {showPass?'🙈':'👁'}
                  </button>
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleRegisterVerify} disabled={loading}>
                {loading ? <Spinner/> : 'Создать аккаунт →'}
              </button>
            </div>
          )}

          {/* RESET step 1 */}
          {mode==='reset' && resetStep===1 && (
            <div className="anim-in">
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, marginBottom:20 }}>🔑 Сброс пароля</div>
              <div style={{ marginBottom:20 }}>
                <Label>ВАШ ЛОГИН</Label>
                <input className="inp" placeholder="your_username"
                  value={username} onChange={e => setUsername(e.target.value.toLowerCase())}/>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleResetRequest} disabled={loading}>
                {loading ? <Spinner/> : 'Получить код →'}
              </button>
              <button onClick={() => setMode('login')} style={{ marginTop:12, background:'none', border:'none', color:'var(--t3)', fontSize:13, cursor:'pointer', width:'100%', textAlign:'center' }}>
                ← Назад к входу
              </button>
            </div>
          )}

          {/* RESET step 2 */}
          {mode==='reset' && resetStep===2 && (
            <div className="anim-in">
              <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20, marginBottom:20 }}>Введите новый пароль</div>
              <BotInstructions action="reset"/>
              <div style={{ marginBottom:14 }}>
                <Label>КОД ИЗ БОТА</Label>
                <input className="inp" placeholder="123456" maxLength={6}
                  value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))}
                  style={{ letterSpacing:'0.3em', fontSize:20, fontFamily:'var(--font-h)', textAlign:'center' }}/>
              </div>
              <div style={{ marginBottom:24 }}>
                <Label>НОВЫЙ ПАРОЛЬ</Label>
                <input className="inp" type={showPass?'text':'password'} placeholder="Минимум 6 символов"
                  value={newPass} onChange={e => setNewPass(e.target.value)}/>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleResetConfirm} disabled={loading}>
                {loading ? <Spinner/> : 'Сохранить пароль →'}
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign:'center', color:'var(--t4)', fontSize:12, marginTop:16, lineHeight:1.6 }}>
          Регистрируясь, вы принимаете{' '}
          <Link to="/legal/rules" style={{ color:'var(--t3)' }}>правила</Link> и{' '}
          <Link to="/legal/privacy" style={{ color:'var(--t3)' }}>политику конфиденциальности</Link>
        </p>
      </div>
    </div>
  )
}
