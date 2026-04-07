import { useState, useRef, useEffect, useCallback } from 'react'

const STATIONS = [
  { id:'europa',  name:'Europa Plus',   genre:'Pop / Dance',   emoji:'🔥', color:'#e8500a', stream:'https://ep256.hostingradio.ru:8052/ep256.mp3' },
  { id:'russian', name:'Русское Радио', genre:'Русский поп',   emoji:'🎵', color:'#f5c842', stream:'https://rusradio.hostingradio.ru/rusradio96.aacp' },
  { id:'dfm',     name:'DFM',           genre:'Dance / EDM',   emoji:'⚡', color:'#7c6aff', stream:'https://dfm.hostingradio.ru/dfm96.aacp' },
  { id:'record',  name:'Рекорд',        genre:'Electronic',    emoji:'🎧', color:'#2ecc71', stream:'https://radiorecord.hostingradio.ru/rr96.aacp' },
  { id:'monte',   name:'Monte Carlo',   genre:'Lounge / Jazz', emoji:'🌙', color:'#22d3ee', stream:'https://montecarlo.hostingradio.ru/montecarlo96.aacp' },
  { id:'hitfm',   name:'Хит FM',        genre:'Хиты',          emoji:'💫', color:'#ec4899', stream:'https://hitfm.hostingradio.ru/hitfm96.aacp' },
]

export default function Radio({ triggerOpen, onTriggerHandled }) {
  const [open,    setOpen]    = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [volume,  setVolume]  = useState(0.7)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)
  const audioRef = useRef(null)
  const station  = STATIONS[current]

  // Открываем по внешнему триггеру (кнопка в навбаре)
  useEffect(() => {
    if (triggerOpen) {
      setOpen(true)
      onTriggerHandled?.()
    }
  }, [triggerOpen])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const play = useCallback(async (idx = current) => {
    const audio = audioRef.current
    if (!audio) return
    setError(false)
    setLoading(true)
    audio.src = STATIONS[idx].stream
    audio.volume = volume
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setError(true)
      setPlaying(false)
    } finally {
      setLoading(false)
    }
  }, [current, volume])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    setPlaying(false)
  }, [])

  const togglePlay = () => { if (playing) pause(); else play() }

  const switchStation = (idx) => {
    setCurrent(idx)
    setError(false)
    if (playing) play(idx)
  }

  const next = () => switchStation((current + 1) % STATIONS.length)
  const prev = () => switchStation((current - 1 + STATIONS.length) % STATIONS.length)

  return (
    <>
      <audio
        ref={audioRef}
        onError={() => { setError(true); setPlaying(false); setLoading(false) }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => { setLoading(false); setPlaying(true) }}
        preload="none"
      />

      {/* Мини-плеер — показывается когда играет, над навбаром */}
      {playing && (
        <div style={{
          position:'fixed',
          bottom:'calc(var(--bot-nav) + env(safe-area-inset-bottom) + 8px)',
          left:12, right:12, zIndex:88,
        }}>
          <div style={{
            background:'rgba(18,18,28,0.97)',
            backdropFilter:'blur(20px)',
            border:`1px solid ${station.color}33`,
            borderRadius:16, padding:'10px 14px',
            display:'flex', alignItems:'center', gap:10,
            boxShadow:`0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)`,
          }}>
            <button onClick={() => setOpen(true)} style={{
              width:38, height:38, borderRadius:10, flexShrink:0,
              background:`${station.color}22`,
              border:`1.5px solid ${station.color}44`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:18, cursor:'pointer',
            }}>{station.emoji}</button>

            <div style={{ flex:1, minWidth:0 }} onClick={() => setOpen(true)}>
              <div style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-h)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {station.name}
              </div>
              <WaveIcon color={station.color}/>
            </div>

            <button onClick={prev} style={miniBtn}>⏮</button>
            <button onClick={togglePlay} style={{
              ...miniBtn, width:38, height:38, borderRadius:10,
              background:station.color, color:'#0d0d14', border:'none',
              fontSize:loading ? 10 : 14,
            }}>
              {loading ? '⏳' : '⏸'}
            </button>
            <button onClick={next} style={miniBtn}>⏭</button>
          </div>
        </div>
      )}

      {/* Полная шторка */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
            backdropFilter:'blur(8px)', zIndex:300, animation:'fadeIn 0.2s ease',
          }}/>
          <div style={{
            position:'fixed', bottom:0, left:0, right:0, zIndex:301,
            background:'var(--bg2)',
            borderRadius:'24px 24px 0 0',
            border:'1px solid rgba(255,255,255,0.08)',
            borderBottom:'none',
            paddingBottom:'calc(env(safe-area-inset-bottom) + 16px)',
            animation:'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
            maxHeight:'85vh', display:'flex', flexDirection:'column',
          }}>
            {/* Шапка */}
            <div style={{ padding:'16px 20px 0', flexShrink:0 }}>
              <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.12)', margin:'0 auto 20px' }}/>

              {/* Текущая станция */}
              <div style={{
                background:`linear-gradient(135deg, ${station.color}15, ${station.color}05)`,
                border:`1px solid ${station.color}22`,
                borderRadius:20, padding:'16px 20px', marginBottom:16,
                display:'flex', alignItems:'center', gap:14,
              }}>
                <div style={{
                  width:56, height:56, borderRadius:16, flexShrink:0,
                  background:`linear-gradient(135deg, ${station.color}44, ${station.color}15)`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:26,
                  boxShadow: playing ? `0 0 0 3px ${station.color}33` : 'none',
                  transition:'box-shadow 0.3s',
                }}>{station.emoji}</div>

                <div style={{ flex:1 }}>
                  <div style={{ fontSize:17, fontWeight:800, fontFamily:'var(--font-h)' }}>{station.name}</div>
                  <div style={{ fontSize:12, color:station.color, fontWeight:600, marginTop:2 }}>{station.genre}</div>
                  {playing && !error && <WaveIconBig color={station.color}/>}
                  {error && <div style={{ fontSize:11, color:'var(--red)', marginTop:4 }}>⚠️ Ошибка потока</div>}
                </div>

                <button onClick={togglePlay} style={{
                  width:50, height:50, borderRadius:14, flexShrink:0,
                  background:station.color, border:'none', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#0d0d14', fontSize:20,
                  boxShadow:`0 6px 20px ${station.color}44`,
                }}>
                  {loading ? '⏳' : playing ? '⏸' : '▶'}
                </button>
              </div>

              {/* Переключение */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <button onClick={prev} style={navBtn}>⏮ Назад</button>
                <div style={{ fontSize:12, color:'var(--t4)' }}>{current+1} / {STATIONS.length}</div>
                <button onClick={next} style={navBtn}>Далее ⏭</button>
              </div>

              {/* Громкость */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <span>🔇</span>
                <input type="range" min="0" max="1" step="0.01" value={volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  style={{ flex:1, accentColor:station.color, cursor:'pointer' }}
                />
                <span>🔊</span>
              </div>

              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--t3)', marginBottom:10 }}>ВСЕ СТАНЦИИ</div>
            </div>

            {/* Список */}
            <div style={{ overflowY:'auto', padding:'0 12px 8px', flex:1 }}>
              {STATIONS.map((s, i) => (
                <button key={s.id} onClick={() => { switchStation(i); }} style={{
                  width:'100%', display:'flex', alignItems:'center', gap:12,
                  padding:'11px 12px', borderRadius:14, marginBottom:4,
                  background: i===current ? `${s.color}10` : 'transparent',
                  border:`1.5px solid ${i===current ? s.color+'30' : 'transparent'}`,
                  cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                }}>
                  <div style={{
                    width:42, height:42, borderRadius:12, flexShrink:0,
                    background:`linear-gradient(135deg,${s.color}33,${s.color}11)`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:20, border:`1px solid ${s.color}22`,
                  }}>{s.emoji}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-h)', color: i===current ? s.color : 'var(--t1)' }}>{s.name}</div>
                    <div style={{ fontSize:12, color:'var(--t3)' }}>{s.genre}</div>
                  </div>
                  {i===current && playing && <WaveIcon color={s.color}/>}
                  {i===current && !playing && <div style={{ width:8, height:8, borderRadius:'50%', background:s.color }}/>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes waveBar { 0%,100%{transform:scaleY(0.3)}50%{transform:scaleY(1)} }
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(100%)}to{transform:translateY(0)} }
      `}</style>
    </>
  )
}

const miniBtn = {
  width:32, height:32, borderRadius:8, border:'1px solid rgba(255,255,255,0.08)',
  background:'rgba(255,255,255,0.05)', cursor:'pointer', color:'var(--t2)',
  display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0,
}
const navBtn = {
  padding:'7px 14px', borderRadius:10, border:'1px solid var(--border)',
  background:'var(--bg3)', cursor:'pointer', color:'var(--t2)', fontSize:13,
}

function WaveIcon({ color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:2, height:14 }}>
      {[0,0.2,0.1,0.3,0.15].map((d,i) => (
        <span key={i} style={{ display:'block', width:2.5, height:12, borderRadius:2, background:color, transformOrigin:'bottom', animation:`waveBar 0.9s ease-in-out ${d}s infinite` }}/>
      ))}
    </div>
  )
}
function WaveIconBig({ color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:3, height:16, marginTop:5 }}>
      {[0,0.15,0.05,0.25,0.1,0.2].map((d,i) => (
        <span key={i} style={{ display:'block', width:3, height:14, borderRadius:2, background:color, transformOrigin:'bottom', opacity:0.8, animation:`waveBar 1s ease-in-out ${d}s infinite` }}/>
      ))}
    </div>
  )
}
