import React, { useState } from 'react'
import { api } from '../store'
import { Star, X } from './Icon'
import toast from 'react-hot-toast'

const STAR_LABELS = ['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично!']

export default function ReviewPopup({ deal, onClose, onSubmitted }) {
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)

  const seller = deal?.seller
  const active = hovered || rating

  const submit = async () => {
    if (!rating) { toast.error('Поставьте оценку'); return }
    setLoading(true)
    try {
      await api.post(`/deals/${deal._id || deal.id}/review`, { rating, text: text.trim() || undefined })
      toast.success('Отзыв отправлен!')
      onSubmitted?.()
      onClose()
    } catch(e) {
      toast.error(e.response?.data?.error || 'Ошибка')
    }
    setLoading(false)
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'rv-fade 0.2s ease',
      }}
    >
      <div style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        width: '100%',
        maxWidth: 420,
        padding: 32,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        animation: 'rv-slide 0.22s ease',
        position: 'relative',
      }}>
        {/* Закрыть */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg3)',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--t3)',
          }}
        >
          <X size={16} strokeWidth={2}/>
        </button>

        {/* Заголовок */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⭐</div>
          <h2 style={{
            fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 22,
            margin: '0 0 6px',
          }}>
            Оцените сделку
          </h2>
          <p style={{ color: 'var(--t3)', fontSize: 13, margin: 0 }}>
            {deal?.product?.title && (
              <span>«{deal.product.title.slice(0, 40)}»</span>
            )}
            {seller && (
              <span> · @{seller.username}</span>
            )}
          </p>
        </div>

        {/* Звёзды */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, transition: 'transform 0.12s',
                transform: active >= s ? 'scale(1.2)' : 'scale(1)',
              }}
            >
              <Star
                size={36}
                strokeWidth={active >= s ? 0 : 1.5}
                style={{
                  fill: active >= s ? '#f5c842' : 'none',
                  color: active >= s ? '#f5c842' : 'var(--t4)',
                  transition: 'all 0.12s',
                }}
              />
            </button>
          ))}
        </div>

        {/* Лейбл */}
        <div style={{
          textAlign: 'center', fontSize: 14, fontWeight: 700,
          color: active ? 'var(--accent)' : 'var(--t4)',
          marginBottom: 20, minHeight: 20, transition: 'color 0.15s',
          fontFamily: 'var(--font-h)',
        }}>
          {STAR_LABELS[active] || 'Выберите оценку'}
        </div>

        {/* Комментарий */}
        <textarea
          className="inp"
          placeholder="Напишите комментарий (необязательно)..."
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          rows={3}
          style={{
            width: '100%', resize: 'vertical', fontSize: 13,
            lineHeight: 1.6, marginBottom: 4,
            boxSizing: 'border-box',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'right', marginBottom: 20 }}>
          {text.length}/500
        </div>

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Пропустить
          </button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={loading || !rating}
            style={{ flex: 2 }}
          >
            {loading ? 'Отправка...' : 'Отправить отзыв'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rv-fade {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes rv-slide {
          from { opacity: 0; transform: scale(0.92) translateY(16px) }
          to   { opacity: 1; transform: scale(1) translateY(0) }
        }
      `}</style>
    </div>
  )
}
