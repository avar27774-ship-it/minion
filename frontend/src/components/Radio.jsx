import { useState, useRef, useEffect, useCallback } from 'react'

const STATIONS = [
  {
    id: 'europa',
    name: 'Europa Plus',
    genre: 'Pop / Dance',
    emoji: '🔥',
    color: '#e8500a',
    stream: 'https://ep256.hostingradio.ru:8052/ep256.mp3',
  },
  {
    id: 'russian',
    name: 'Русское Радио',
    genre: 'Русский поп',
    emoji: '🎵',
    color: '#f5c842',
    stream: 'https://rusradio.hostingradio.ru/rusradio96.aacp',
  },
  {
    id: 'dfm',
    name: 'DFM',
    genre: 'Dance / EDM',
    emoji: '⚡',
    color: '#7c6aff',
    stream: 'https://dfm.hostingradio.ru/dfm96.aacp',
  },
  {
    id: 'record',
    name: 'Радио Рекорд',
    genre: 'Electronic',
    emoji: '🎧',
    color: '#2ecc71',
    stream: 'https://radiorecord.hostingradio.ru/rr96.aacp',
  },
  {
    id: 'monte',
    name: 'Monte Carlo',
    genre: 'Lounge / Jazz',
    emoji: '🌙',
    color: '#22d3ee',
    stream: 'https://montecarlo.hostingradio.ru/montecarlo96.aacp',
  },
  {
    id: 'hitfm',
    name: 'Хит FM',
    genre: 'Хиты',
    emoji: '💫',
    color: '#ec4899',
    stream: 'https://hitfm.hostingradio.ru/hitfm96.aacp',
  },
]

export default function Radio() {
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(true)
  const audioRef = useRef(null)
  const lastScrollY = useRef(0)

  const station = STATIONS[current]

  // Скрываем при скролле вниз
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setVisible(y < lastScrollY.current || y < 50)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Синхронизируем громкость
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

  const togglePlay = useCallback(() => {
    if (playing) pause()
    else play()
  }, [playing, play, pause])

  const switchStation = useCallback((idx) => {
    setCurrent(idx)
    setError(false)
    if (playing) play(idx)
  }, [playing, play])

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

      {/* ── Мини-плеер (всегда виден над навбаром) ── */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(var(--bot-nav) + env(safe-area-inset-bottom) + 8px)',
        left: 12, right: 12,
        zIndex: 89,
        transform: visible ? 'translateY(0)' : 'translateY(120px)',
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}>
        <div style={{
          background: 'rgba(18,18,28,0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
        }}>

          {/* Иконка станции с анимацией */}
          <button onClick={() => setOpen(true)} style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `linear-gradient(135deg, ${station.color}33, ${station.color}11)`,
            border: `1.5px solid ${station.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, cursor: 'pointer', position: 'relative', overflow: 'hidden',
          }}>
            {playing && !loading && (
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 12,
                background: `radial-gradient(circle, ${station.color}22 0%, transparent 70%)`,
                animation: 'radioPulse 2s ease-in-out infinite',
              }}/>
            )}
            {station.emoji}
          </button>

          {/* Инфо */}
          <div style={{ flex: 1, minWidth: 0 }} onClick={() => setOpen(true)}>
            <div style={{
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-h)',
              color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', lineHeight: 1.2,
            }}>
              {station.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {playing && !loading && !error ? (
                <WaveIcon color={station.color} />
              ) : loading ? (
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>Загрузка...</span>
              ) : error ? (
                <span style={{ fontSize: 10, color: 'var(--red)' }}>Ошибка потока</span>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>📻 Онлайн радио</span>
              )}
            </div>
          </div>

          {/* Кнопки управления */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={prev} style={btnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>
              </svg>
            </button>

            <button onClick={togglePlay} style={{
              ...btnStyle,
              width: 40, height: 40, borderRadius: 12,
              background: playing ? station.color : 'var(--bg3)',
              color: playing ? '#0d0d14' : 'var(--t1)',
              border: 'none',
              boxShadow: playing ? `0 4px 16px ${station.color}44` : 'none',
              transition: 'all 0.2s',
            }}>
              {loading
                ? <Spinner color={playing ? '#0d0d14' : 'var(--t3)'}/>
                : playing
                  ? <PauseIcon/>
                  : <PlayIcon/>
              }
            </button>

            <button onClick={next} style={btnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Полная шторка со станциями ── */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)', zIndex: 200, animation: 'fadeIn 0.2s ease',
          }}/>

          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: 'var(--bg2)',
            borderRadius: '24px 24px 0 0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            padding: '0 0 calc(env(safe-area-inset-bottom) + 16px)',
            animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Хедер */}
            <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
              <div style={{
                width: 36, height: 4, borderRadius: 2,
                background: 'var(--border2)', margin: '0 auto 20px',
              }}/>

              {/* Текущая станция — большой блок */}
              <div style={{
                background: `linear-gradient(135deg, ${station.color}18, ${station.color}06)`,
                border: `1px solid ${station.color}25`,
                borderRadius: 20, padding: '18px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                  background: `linear-gradient(135deg, ${station.color}44, ${station.color}18)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, position: 'relative',
                }}>
                  {playing && <div style={{
                    position: 'absolute', inset: -4, borderRadius: 20,
                    border: `2px solid ${station.color}`,
                    animation: 'radioRing 2s ease-in-out infinite',
                  }}/>}
                  {station.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-h)', marginBottom: 2 }}>
                    {station.name}
                  </div>
                  <div style={{ fontSize: 13, color: station.color, fontWeight: 600 }}>{station.genre}</div>
                  {playing && !error && <WaveIconBig color={station.color}/>}
                </div>
                <button onClick={togglePlay} style={{
                  width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                  background: station.color, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0d0d14',
                  boxShadow: `0 6px 24px ${station.color}55`,
                }}>
                  {loading ? <Spinner color="#0d0d14"/> : playing ? <PauseIcon size={22}/> : <PlayIcon size={22}/>}
                </button>
              </div>

              {/* Громкость */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 16 }}>🔇</span>
                <input type="range" min="0" max="1" step="0.01"
                  value={volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  style={{
                    flex: 1, height: 4, borderRadius: 2,
                    accentColor: station.color, cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 16 }}>🔊</span>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--t3)', marginBottom: 12 }}>
                СТАНЦИИ
              </div>
            </div>

            {/* Список станций */}
            <div style={{ overflowY: 'auto', padding: '0 12px 8px', flex: 1 }}>
              {STATIONS.map((s, i) => (
                <button key={s.id} onClick={() => { switchStation(i); setOpen(false) }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 12px', borderRadius: 14, marginBottom: 4,
                  background: i === current ? `${s.color}12` : 'transparent',
                  border: `1.5px solid ${i === current ? s.color + '35' : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: `linear-gradient(135deg, ${s.color}33, ${s.color}11)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, border: `1px solid ${s.color}25`,
                  }}>
                    {s.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-h)',
                      color: i === current ? s.color : 'var(--t1)',
                    }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{s.genre}</div>
                  </div>
                  {i === current && playing && <WaveIcon color={s.color}/>}
                  {i === current && !playing && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }}/>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes radioPulse {
          0%,100% { opacity:0.4; transform:scale(1); }
          50%      { opacity:0.9; transform:scale(1.15); }
        }
        @keyframes radioRing {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%      { opacity:0.2; transform:scale(1.12); }
        }
        @keyframes waveBar {
          0%,100% { transform:scaleY(0.3); }
          50%      { transform:scaleY(1); }
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp {
          from { transform:translateY(100%) }
          to   { transform:translateY(0) }
        }
      `}</style>
    </>
  )
}

// ── Иконки ────────────────────────────────────────────────────────────────────

const btnStyle = {
  width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center', color: 'var(--t2)',
  flexShrink: 0, transition: 'all 0.15s',
}

function PlayIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
}

function PauseIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  )
}

function Spinner({ color = 'var(--t3)' }) {
  return (
    <div style={{
      width: 14, height: 14,
      border: `2px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}/>
  )
}

function WaveIcon({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 16 }}>
      {[0, 0.2, 0.1, 0.3, 0.15].map((delay, i) => (
        <span key={i} style={{
          display: 'block', width: 2.5, height: 12, borderRadius: 2,
          background: color, transformOrigin: 'bottom',
          animation: `waveBar 0.9s ease-in-out ${delay}s infinite`,
        }}/>
      ))}
    </div>
  )
}

function WaveIconBig({ color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20, marginTop: 6 }}>
      {[0, 0.15, 0.05, 0.25, 0.1, 0.2].map((delay, i) => (
        <span key={i} style={{
          display: 'block', width: 3, height: 18, borderRadius: 2,
          background: color, transformOrigin: 'bottom', opacity: 0.8,
          animation: `waveBar 1s ease-in-out ${delay}s infinite`,
        }}/>
      ))}
    </div>
  )
}
