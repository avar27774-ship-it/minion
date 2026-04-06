import React from 'react'
import { Link } from 'react-router-dom'

// ── Универсальный компонент пустого состояния ─────────────────────────────────
export default function EmptyState({
  emoji = '📭',
  title,
  description,
  action,        // { label, to, onClick }
  secondAction,  // { label, to, onClick }
  compact = false,
}) {
  const padding = compact ? '32px 16px' : '60px 20px'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding, gap: 0,
      animation: 'fadeUp 0.3s ease both',
    }}>
      {/* Иконка в кружке */}
      <div style={{
        width: compact ? 64 : 80, height: compact ? 64 : 80,
        borderRadius: compact ? 20 : 24,
        background: 'linear-gradient(135deg, rgba(245,200,66,0.08), rgba(124,106,255,0.08))',
        border: '1px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 28 : 36, marginBottom: compact ? 14 : 20,
        flexShrink: 0,
      }}>
        {emoji}
      </div>

      <div style={{
        fontFamily: 'var(--font-h)', fontWeight: 800,
        fontSize: compact ? 16 : 20,
        marginBottom: 8, letterSpacing: '-0.02em',
      }}>
        {title}
      </div>

      {description && (
        <p style={{
          color: 'var(--t3)', fontSize: compact ? 13 : 14,
          lineHeight: 1.6, maxWidth: 320, marginBottom: 20,
        }}>
          {description}
        </p>
      )}

      {/* Кнопки действий */}
      {(action || secondAction) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            action.to ? (
              <Link to={action.to} className="btn btn-primary btn-sm">
                {action.label}
              </Link>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={action.onClick}>
                {action.label}
              </button>
            )
          )}
          {secondAction && (
            secondAction.to ? (
              <Link to={secondAction.to} className="btn btn-secondary btn-sm">
                {secondAction.label}
              </Link>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={secondAction.onClick}>
                {secondAction.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Пресеты для частых случаев ────────────────────────────────────────────────

export function EmptyDeals({ role = 'all' }) {
  const configs = {
    buyer:  { emoji: '🛒', title: 'Покупок пока нет', description: 'Найдите интересный товар в каталоге и совершите свою первую сделку с гарантией возврата.', action: { label: 'Перейти в каталог', to: '/catalog' } },
    seller: { emoji: '📦', title: 'Продаж пока нет', description: 'Разместите первый товар — это займёт меньше минуты. Комиссия всего 5%.', action: { label: 'Разместить товар', to: '/sell' } },
    all:    { emoji: '🤝', title: 'Сделок пока нет', description: 'Здесь будут отображаться все ваши сделки — покупки и продажи.', action: { label: 'В каталог', to: '/catalog' }, secondAction: { label: 'Продать', to: '/sell' } },
  }
  const cfg = configs[role] || configs.all
  return <EmptyState {...cfg} />
}

export function EmptyProducts({ onSell }) {
  return (
    <EmptyState
      emoji="🗃️"
      title="Товаров пока нет"
      description="Добавьте первый товар и начните зарабатывать. Процесс займёт меньше минуты."
      action={{ label: '+ Разместить товар', to: '/sell' }}
    />
  )
}

export function EmptySearch({ query, onReset }) {
  return (
    <EmptyState
      emoji="🔍"
      title="Ничего не найдено"
      description={query ? `По запросу «${query}» товаров не найдено. Попробуйте другие слова или сбросьте фильтры.` : 'Попробуйте изменить параметры поиска или выбрать другую категорию.'}
      action={onReset ? { label: 'Сбросить фильтры', onClick: onReset } : undefined}
    />
  )
}

export function EmptyNotifications() {
  return (
    <EmptyState
      emoji="🔕"
      title="Уведомлений нет"
      description="Здесь будут появляться уведомления о сделках, пополнениях и новых сообщениях."
      compact
    />
  )
}

export function EmptyMessages() {
  return (
    <EmptyState
      emoji="💬"
      title="Нет активных чатов"
      description="Чаты появляются автоматически при создании сделки."
      action={{ label: 'В каталог', to: '/catalog' }}
    />
  )
}
