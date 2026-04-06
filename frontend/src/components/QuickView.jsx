import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, useStore } from '../store'
import { Package, Star, Eye, Heart, ShoppingCart, X, ChevronLeft, ChevronRight } from './Icon'
import toast from 'react-hot-toast'
import { useCurrency } from '../hooks/useCurrency'

export default function QuickView({ product, onClose }) {
  const navigate   = useNavigate()
  const { user }   = useStore()
  const [detail, setDetail]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [buying, setBuying]       = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  const [imgIdx, setImgIdx]       = useState(0)
  const { fmt } = useCurrency()

  const pid = product?._id || product?.id

  // Загружаем полные данные товара
  useEffect(() => {
    if (!pid) return
    setLoading(true)
    setImgIdx(0)
    api.get(`/products/${pid}`)
      .then(r => {
        setDetail(r.data)
      })
      .catch(() => onClose())
      .finally(() => setLoading(false))
  }, [pid])

  // Загружаем статус избранного
  useEffect(() => {
    if (!user || !pid) return
    api.get('/users/me/favorites')
      .then(r => {
        const ids = (r.data.products || []).map(p => p.id || p._id)
        setFavorited(ids.includes(pid))
      })
      .catch(() => {})
  }, [user, pid])

  // Закрытие по Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Блокируем скролл под модалкой
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const buy = async () => {
    if (!user) { onClose(); navigate('/auth'); return }
    if (!window.confirm(`Купить "${detail.title}" за ${fmt(detail.price)}?`)) return
    setBuying(true)
    try {
      await api.post('/deals', { productId: pid })
      toast.success('Сделка создана!')
      onClose()
      navigate('/deals')
    } catch(e) { toast.error(e.response?.data?.error || 'Ошибка') }
    setBuying(false)
  }

  const toggleFavorite = async () => {
    if (!user) { onClose(); navigate('/auth'); return }
    setFavLoading(true)
    try {
      const r = await api.post(`/products/${pid}/favorite`)
      setFavorited(r.data.favorited)
      toast.success(r.data.favorited ? '❤️ Добавлено в избранное' : 'Удалено из избранного')
    } catch { toast.error('Ошибка') }
    setFavLoading(false)
  }

  const p = detail || product
  const seller = p?.seller
  const images = p?.images || []
  const isMine = user && String(seller?._id || seller?.id) === String(user._id || user.id)

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'qv-fade 0.18s ease',
      }}
    >
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        width: '100%',
        maxWidth: 780,
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: 'qv-slide 0.2s ease',
      }}>
        {/* Шапка */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 600 }}>
            Быстрый просмотр
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              to={`/product/${pid}`}
              onClick={onClose}
              style={{
                fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.3)',
              }}
            >
              Открыть страницу →
            </Link>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--t3)',
              }}
            >
              <X size={16} strokeWidth={2}/>
            </button>
          </div>
        </div>

        {/* Тело */}
        <div style={{ overflow: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: 24 }}>
              <div className="skel" style={{ height: 280, borderRadius: 16 }}/>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="skel" style={{ height: 32 }}/>
                <div className="skel" style={{ height: 24, width: '60%' }}/>
                <div className="skel" style={{ height: 80 }}/>
                <div className="skel" style={{ height: 48 }}/>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {/* Левая — картинки */}
              <div style={{ padding: 24, borderRight: '1px solid var(--border)' }}>
                {/* Главное фото */}
                <div style={{
                  height: 260, borderRadius: 16, overflow: 'hidden',
                  background: images[imgIdx]
                    ? `url(${images[imgIdx]}) center/cover no-repeat`
                    : 'var(--bg3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 48, color: 'var(--t4)', marginBottom: 12,
                  position: 'relative',
                }}>
                  {!images.length && <Package size={48} strokeWidth={0.75} style={{ opacity: 0.25 }}/>}

                  {/* Стрелки если несколько фото */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                        style={{
                          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <ChevronLeft size={18}/>
                      </button>
                      <button
                        onClick={() => setImgIdx(i => (i + 1) % images.length)}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          width: 32, height: 32, borderRadius: 8, border: 'none',
                          background: 'rgba(0,0,0,0.5)', color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <ChevronRight size={18}/>
                      </button>
                    </>
                  )}
                </div>

                {/* Миниатюры */}
                {images.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {images.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setImgIdx(i)}
                        style={{
                          width: 52, height: 52, borderRadius: 10, cursor: 'pointer',
                          backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center',
                          border: `2px solid ${imgIdx === i ? 'var(--accent)' : 'transparent'}`,
                          flexShrink: 0, transition: 'border-color 0.15s',
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Статистика */}
                <div style={{ display: 'flex', gap: 16, marginTop: 16, color: 'var(--t4)', fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={13} strokeWidth={1.75}/>{p.views || 0} просмотров
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Heart size={13} strokeWidth={1.75}/>{p.favorites || 0} в избранном
                  </span>
                </div>
              </div>

              {/* Правая — инфо */}
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Бейджи */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-yellow">{p.category}</span>
                  {p.game && <span className="badge badge-purple">{p.game}</span>}
                  {p.isPromoted && <span className="badge badge-yellow">🚀 ТОП</span>}
                </div>

                {/* Название */}
                <h2 style={{
                  fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 20,
                  lineHeight: 1.3, margin: 0,
                }}>
                  {p.title}
                </h2>

                {/* Цена */}
                <div style={{
                  fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 36,
                  color: 'var(--accent)',
                }}>
                  {fmt(p.price || 0)}
                </div>

                {/* Продавец */}
                {seller && (
                  <Link
                    to={`/user/${seller._id || seller.id}`}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', background: 'var(--bg3)',
                      borderRadius: 12, color: 'var(--t1)', textDecoration: 'none',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--purple),var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 13,
                    }}>
                      {(seller.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>@{seller.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={11} strokeWidth={2}/>
                        {parseFloat(seller.rating || 5).toFixed(1)} · {seller.totalSales || 0} продаж
                      </div>
                    </div>
                  </Link>
                )}

                {/* Описание (обрезанное) */}
                {p.description && (
                  <div style={{
                    fontSize: 13, color: 'var(--t2)', lineHeight: 1.7,
                    maxHeight: 90, overflow: 'hidden',
                    maskImage: 'linear-gradient(to bottom, black 60%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent)',
                  }}>
                    {p.description}
                  </div>
                )}

                {/* Кнопки */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {isMine ? (
                    <div className="badge badge-yellow" style={{ textAlign: 'center', padding: '12px' }}>
                      Это ваш товар
                    </div>
                  ) : p.status === 'active' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        onClick={buy}
                        disabled={buying}
                        style={{ flex: 1, padding: '14px', fontSize: 15 }}
                      >
                        {buying ? 'Создание...' : `Купить за ${fmt(p.price || 0)}`}
                      </button>
                      <button
                        onClick={toggleFavorite}
                        disabled={favLoading}
                        style={{
                          width: 50, height: 50, borderRadius: 12, border: '1px solid',
                          borderColor: favorited ? 'rgba(231,76,60,0.5)' : 'var(--border)',
                          background: favorited ? 'rgba(231,76,60,0.1)' : 'var(--bg3)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', flexShrink: 0,
                        }}
                      >
                        <Heart
                          size={20}
                          strokeWidth={favorited ? 0 : 1.75}
                          style={{ fill: favorited ? '#e74c3c' : 'none', color: favorited ? '#e74c3c' : 'var(--t3)' }}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="badge badge-red" style={{ textAlign: 'center', padding: '12px' }}>
                      Товар недоступен
                    </div>
                  )}

                  {!isMine && seller && (
                    <Link
                      to={`/messages/${seller._id || seller.id}`}
                      onClick={onClose}
                      className="btn btn-secondary btn-full"
                      style={{ fontSize: 13, textAlign: 'center' }}
                    >
                      💬 Написать продавцу
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes qv-fade {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes qv-slide {
          from { opacity: 0; transform: scale(0.95) translateY(10px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }
        @media (max-width: 600px) {
          .qv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
