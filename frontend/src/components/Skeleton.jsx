import React from 'react'

// ── Базовый скелетон ──────────────────────────────────────────────────────────
export function Skeleton({ width, height, borderRadius = 10, style = {} }) {
  return (
    <div className="skel" style={{ width, height, borderRadius, flexShrink: 0, ...style }} />
  )
}

// ── Карточка товара ───────────────────────────────────────────────────────────
export function ProductCardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <Skeleton height={160} borderRadius={0} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={14} width="80%" />
        <Skeleton height={12} width="55%" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Skeleton height={18} width={60} />
          <Skeleton height={28} width={80} borderRadius={8} />
        </div>
      </div>
    </div>
  )
}

// ── Строка сделки ─────────────────────────────────────────────────────────────
export function DealRowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <Skeleton width={44} height={44} borderRadius={12} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Skeleton height={13} width="65%" />
        <Skeleton height={11} width="40%" />
      </div>
      <Skeleton height={22} width={60} borderRadius={8} />
    </div>
  )
}

// ── Профиль юзера ─────────────────────────────────────────────────────────────
export function ProfileHeaderSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0' }}>
      <Skeleton width={72} height={72} borderRadius={20} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={20} width={160} />
        <Skeleton height={14} width={120} />
        <Skeleton height={12} width={90} />
      </div>
    </div>
  )
}

// ── Список сделок (n штук) ────────────────────────────────────────────────────
export function DealListSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array(count).fill(0).map((_, i) => <DealRowSkeleton key={i} />)}
    </div>
  )
}

// ── Сетка карточек товаров (n штук) ──────────────────────────────────────────
export function ProductGridSkeleton({ count = 8, columns = 'repeat(auto-fill,minmax(220px,1fr))' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 16 }}>
      {Array(count).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  )
}

export default Skeleton
