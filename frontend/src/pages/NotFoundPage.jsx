import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DarkVeil from '../components/DarkVeil/DarkVeil'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const [glitch, setGlitch] = useState(false)

  // Эффект глитча каждые 3 сек
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true)
      setTimeout(() => setGlitch(false), 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ position:'relative', minHeight:'var(--app-height)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* Particles фон */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }}>
        <DarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={2}
          scanlineFrequency={0}
          warpAmount={0}
        />
      </div>

      {/* Контент */}
      <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:'40px 20px', userSelect:'none' }}>

        {/* Большой 404 */}
        <div style={{ position:'relative', marginBottom:8 }}>
          <div style={{
            fontFamily:'var(--font-h)', fontWeight:900, fontSize:'clamp(100px, 20vw, 180px)',
            lineHeight:1, letterSpacing:'-0.05em',
            background:'linear-gradient(135deg, var(--accent) 0%, var(--purple) 60%, #22d3ee 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            filter: glitch ? 'blur(2px)' : 'none',
            transform: glitch ? 'translate(3px, -2px)' : 'none',
            transition:'filter 0.05s, transform 0.05s',
            textShadow:'none',
          }}>
            404
          </div>
          {/* Глитч копия */}
          {glitch && (
            <div style={{
              position:'absolute', inset:0,
              fontFamily:'var(--font-h)', fontWeight:900, fontSize:'clamp(100px, 20vw, 180px)',
              lineHeight:1, letterSpacing:'-0.05em',
              background:'linear-gradient(135deg, #22d3ee 0%, var(--red) 100%)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              transform:'translate(-4px, 3px)',
              opacity:0.6,
            }}>
              404
            </div>
          )}
        </div>

        <div style={{
          fontFamily:'var(--font-h)', fontWeight:800, fontSize:'clamp(18px, 4vw, 28px)',
          marginBottom:12, color:'var(--t1)',
          letterSpacing:'0.05em',
        }}>
          СТРАНИЦА НЕ НАЙДЕНА
        </div>

        <div style={{ color:'var(--t3)', fontSize:15, marginBottom:40, maxWidth:360, margin:'0 auto 40px', lineHeight:1.7 }}>
          Похоже, эта страница улетела в космос.<br/>
          Но мы можем вернуть тебя обратно.
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/')}
            style={{ padding:'14px 32px', fontSize:15, fontWeight:700 }}>
            На главную
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}
            style={{ padding:'14px 32px', fontSize:15, fontWeight:700 }}>
            Назад
          </button>
        </div>

        {/* Декоративные линии */}
        <div style={{ marginTop:60, display:'flex', alignItems:'center', gap:16, justifyContent:'center', opacity:0.3 }}>
          <div style={{ height:1, width:80, background:'linear-gradient(to right, transparent, var(--accent))' }}/>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }}/>
          <div style={{ height:1, width:80, background:'linear-gradient(to left, transparent, var(--accent))' }}/>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
