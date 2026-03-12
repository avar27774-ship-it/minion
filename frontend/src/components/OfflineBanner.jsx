import { useEffect, useState } from 'react'
import DarkVeil from './DarkVeil/DarkVeil'

function WifiOff({ size = 24, strokeWidth = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  )
}

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    const goOffline = () => { setOffline(true); setWasOffline(true) }
    const goOnline  = () => {
      setOffline(false)
      if (wasOffline) {
        setShowRestored(true)
        setTimeout(() => setShowRestored(false), 3000)
      }
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, [wasOffline])

  if (offline) return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none' }}>
        <DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={2} scanlineFrequency={0} warpAmount={0}/>
      </div>
      <div style={{ position:'relative', zIndex:1, textAlign:'center', padding:'40px 20px' }}>
        <div style={{
          width:96, height:96, borderRadius:28, margin:'0 auto 28px',
          background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'pulse 2s ease infinite'
        }}>
          <WifiOff size={44} strokeWidth={1.5} style={{ color:'var(--red)', opacity:0.9 }}/>
        </div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:900, fontSize:'clamp(36px, 8vw, 64px)', lineHeight:1, marginBottom:12,
          background:'linear-gradient(135deg, var(--red) 0%, #ff6b6b 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'
        }}>
          ОФЛАЙН
        </div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:'clamp(14px, 3vw, 18px)', color:'var(--t1)', marginBottom:10 }}>
          Нет подключения к интернету
        </div>
        <div style={{ color:'var(--t3)', fontSize:14, marginBottom:40, maxWidth:340, margin:'0 auto 40px', lineHeight:1.7 }}>
          Проверьте подключение к Wi-Fi или мобильной сети и попробуйте снова.
        </div>
        <button onClick={() => window.location.reload()} className="btn btn-primary"
          style={{ padding:'14px 36px', fontSize:15, fontWeight:700 }}>
          Повторить попытку
        </button>
        <div style={{ marginTop:48, display:'flex', alignItems:'center', gap:12, justifyContent:'center', opacity:0.25 }}>
          <div style={{ height:1, width:60, background:'linear-gradient(to right, transparent, var(--red))' }}/>
          <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)' }}/>
          <div style={{ height:1, width:60, background:'linear-gradient(to left, transparent, var(--red))' }}/>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0.3); }
          50% { box-shadow: 0 0 0 16px rgba(231,76,60,0); }
        }
      `}</style>
    </div>
  )

  if (showRestored) return (
    <div style={{
      position:'fixed', top:16, left:'50%', transform:'translateX(-50%)',
      zIndex:9999, display:'flex', alignItems:'center', gap:10,
      padding:'12px 20px', borderRadius:14,
      background:'rgba(46,204,113,0.95)', border:'1px solid rgba(46,204,113,0.5)',
      backdropFilter:'blur(12px)', boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
      animation:'slideDown 0.3s ease', whiteSpace:'nowrap',
    }}>
      <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:13, color:'#fff' }}>Соединение восстановлено</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:1 }}>Добро пожаловать обратно!</div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translateX(-50%) translateY(-16px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )

  return null
}
