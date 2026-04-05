import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, useStore } from '../store'
import { ArrowLeft, Send, Camera } from '../components/Icon'
import toast from 'react-hot-toast'

export default function MessagesPage() {
  const { userId } = useParams()
  const navigate   = useNavigate()
  const { user }   = useStore()

  const [dialogs,  setDialogs]  = useState([])
  const [partner,  setPartner]  = useState(null)
  const [messages, setMessages] = useState([])
  const [text,     setText]     = useState('')
  const [loading,  setLoading]  = useState(true)
  const [sending,  setSending]  = useState(false)
  const [viewImg,  setViewImg]  = useState(null)  // полноэкранный просмотр фото
  const [image,    setImage]    = useState(null)   // base64 превью
  const fileRef = useRef(null)
  const bottomRef = useRef(null)

  // Загружаем диалоги
  useEffect(() => {
    if (!user) { navigate('/auth'); return }
    api.get('/messages')
      .then(r => setDialogs(r.data.dialogs || []))
      .catch(() => {})
  }, [user])

  // Загружаем переписку
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    setLoading(true)
    api.get(`/messages/${userId}`)
      .then(r => {
        setPartner(r.data.partner)
        setMessages(r.data.messages || [])
      })
      .catch(() => toast.error('Не удалось загрузить переписку'))
      .finally(() => setLoading(false))
  }, [userId])

  // Скроллим вниз
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Polling — новые сообщения каждые 3 сек
  useEffect(() => {
    if (!userId) return
    const interval = setInterval(() => {
      api.get(`/messages/${userId}`)
        .then(r => setMessages(r.data.messages || []))
        .catch(() => {})
    }, 3000)
    return () => clearInterval(interval)
  }, [userId])

  const send = async () => {
    if (!text.trim() && !image) return
    if (!userId) return
    setSending(true)
    try {
      const { data } = await api.post(`/messages/${userId}`, {
        text: text.trim() || '📷 Фото',
        image: image || null,
      })
      setMessages(prev => [...prev, data.message])
      setText('')
      setImage(null)
    } catch(e) {
      toast.error(e.response?.data?.error || 'Ошибка отправки')
    }
    setSending(false)
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Максимальный размер фото 5MB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Только изображения'); return }
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (!user) return null

  const myId = user._id || user.id

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'0', height:'calc(var(--app-height) - 130px)', display:'flex', gap:0 }}>

      {/* ── Список диалогов (слева) ── */}
      <div style={{
        width: userId ? 0 : '100%',
        minWidth: userId ? 0 : '100%',
        overflow: 'hidden',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
      }} className="dialogs-panel">
        <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid var(--border)' }}>
          <h2 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:20 }}>💬 Сообщения</h2>
        </div>

        {dialogs.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:40, color:'var(--t3)' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>💬</div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:16, marginBottom:8 }}>Нет сообщений</div>
            <div style={{ fontSize:13, textAlign:'center' }}>Напишите продавцу со страницы товара</div>
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto' }}>
            {dialogs.map(d => (
              <Link key={d.partner_id} to={`/messages/${d.partner_id}`} style={{
                display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                borderBottom:'1px solid var(--border)', color:'inherit',
                background: userId === d.partner_id ? 'rgba(245,200,66,0.06)' : 'transparent',
                transition:'background 0.15s',
              }}>
                {/* Аватар */}
                <div style={{
                  width:44, height:44, borderRadius:12, flexShrink:0,
                  background:'linear-gradient(135deg,var(--purple),var(--accent))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:16, fontWeight:700, fontFamily:'var(--font-h)', position:'relative',
                }}>
                  {(d.partner_username||'?')[0].toUpperCase()}
                  {parseInt(d.unread_count) > 0 && (
                    <div style={{
                      position:'absolute', top:-4, right:-4,
                      width:18, height:18, borderRadius:'50%',
                      background:'var(--accent)', color:'#0d0d14',
                      fontSize:10, fontWeight:800, display:'flex',
                      alignItems:'center', justifyContent:'center',
                    }}>{d.unread_count}</div>
                  )}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>@{d.partner_username}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {d.last_sender_id === myId ? 'Вы: ' : ''}{d.last_text}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--t4)', flexShrink:0 }}>
                  {new Date((d.last_time||0)*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Переписка (справа) ── */}
      {userId && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

          {/* Шапка */}
          <div style={{
            padding:'12px 16px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:12,
            background:'var(--bg2)',
          }}>
            <button onClick={() => navigate('/messages')} style={{
              width:36, height:36, borderRadius:10, border:'1px solid var(--border)',
              background:'var(--bg3)', cursor:'pointer', color:'var(--t2)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <ArrowLeft size={16} strokeWidth={2}/>
            </button>
            {partner && (
              <Link to={`/user/${partner.id}`} style={{ display:'flex', alignItems:'center', gap:10, color:'inherit' }}>
                <div style={{
                  width:36, height:36, borderRadius:10, flexShrink:0,
                  background:'linear-gradient(135deg,var(--purple),var(--accent))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:700,
                }}>{(partner.username||'?')[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>@{partner.username}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>★ {parseFloat(partner.rating||5).toFixed(1)} · {partner.total_sales||0} продаж</div>
                </div>
              </Link>
            )}
          </div>

          {/* Сообщения */}
          <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:8 }}>
            {loading ? (
              <div style={{ textAlign:'center', color:'var(--t3)', padding:40 }}>Загрузка...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--t3)', padding:40 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>👋</div>
                <div style={{ fontSize:14 }}>Начните переписку!</div>
              </div>
            ) : messages.map(m => {
              const isMine = m.sender_id === myId
              return (
                <div key={m.id} style={{
                  display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start',
                }}>
                  <div style={{
                    maxWidth:'75%',
                    padding: m.image ? '6px' : '10px 14px',
                    borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMine ? 'var(--accent)' : 'var(--bg3)',
                    color: isMine ? '#0d0d14' : 'var(--t1)',
                    fontSize:14, lineHeight:1.5, overflow:'hidden',
                  }}>
                    {m.image && (
                      <img
                        src={m.image}
                        alt="фото"
                        style={{ width:'100%', maxWidth:260, borderRadius:12, display:'block', cursor:'pointer' }}
                        onClick={() => setViewImg(m.image)}
                      />
                    )}
                    {m.text && m.text !== '📷 Фото' && (
                      <div style={{ padding: m.image ? '6px 8px 2px' : '0' }}>{m.text}</div>
                    )}
                    <div style={{ fontSize:10, opacity:0.6, marginTop:4, textAlign:'right', padding: m.image ? '0 8px 4px' : '0' }}>
                      {new Date((m.created_at||0)*1000).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}
                      {isMine && <span style={{ marginLeft:4 }}>{m.is_read ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef}/>
          </div>

          {/* Превью фото */}
          {image && (
            <div style={{ padding:'8px 16px 0', background:'var(--bg2)', display:'flex', alignItems:'center', gap:10 }}>
              <img src={image} alt="preview" style={{ width:60, height:60, borderRadius:10, objectFit:'cover' }}/>
              <button onClick={() => setImage(null)} style={{
                width:24, height:24, borderRadius:'50%', background:'var(--red)',
                border:'none', cursor:'pointer', color:'#fff', fontSize:14,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>✕</button>
            </div>
          )}

          {/* Поле ввода */}
          <div style={{
            padding:'12px 16px', borderTop:'1px solid var(--border)',
            background:'var(--bg2)', display:'flex', gap:8, alignItems:'flex-end',
          }}>
            {/* Кнопка фото */}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display:'none' }}/>
            <button onClick={() => fileRef.current?.click()} style={{
              width:44, height:44, borderRadius:12, flexShrink:0,
              background:'var(--bg3)', border:'1px solid var(--border)',
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', color:'var(--t3)',
            }}>
              <Camera size={18} strokeWidth={1.75}/>
            </button>

            <textarea
              className="inp"
              placeholder="Написать сообщение..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              rows={1}
              style={{
                flex:1, resize:'none', minHeight:44, maxHeight:120,
                fontSize:14, padding:'12px 14px', borderRadius:14,
              }}
            />
            <button
              onClick={send}
              disabled={sending || (!text.trim() && !image)}
              style={{
                width:44, height:44, borderRadius:12, flexShrink:0,
                background: (text.trim() || image) ? 'var(--accent)' : 'var(--bg3)',
                border:'none', cursor: (text.trim() || image) ? 'pointer' : 'default',
                display:'flex', alignItems:'center', justifyContent:'center',
                color: (text.trim() || image) ? '#0d0d14' : 'var(--t3)',
                transition:'all 0.15s',
              }}
            >
              <Send size={18} strokeWidth={2}/>
            </button>
          </div>
        </div>
      )}

      {/* Просмотр фото */}
      {viewImg && (
        <div onClick={() => setViewImg(null)} style={{
          position:'fixed', inset:0, zIndex:999,
          background:'rgba(0,0,0,0.95)',
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:16,
        }}>
          <img src={viewImg} alt="фото" style={{
            maxWidth:'100%', maxHeight:'100%',
            borderRadius:12, objectFit:'contain',
          }}/>
          <button onClick={() => setViewImg(null)} style={{
            position:'absolute', top:16, right:16,
            width:40, height:40, borderRadius:'50%',
            background:'rgba(255,255,255,0.15)', border:'none',
            color:'#fff', fontSize:20, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>
      )}

      <style>{`
        @media (min-width: 769px) {
          .dialogs-panel {
            width: 320px !important;
            min-width: 320px !important;
          }
        }
      `}</style>
    </div>
  )
}
