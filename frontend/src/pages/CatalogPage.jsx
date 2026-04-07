import React, { useState, useEffect, useCallback } from 'react'
import useMeta from '../hooks/useMeta'
import { Gamepad2, Coins, Sword, Palette, KeyRound, Star, Rocket, Package, Search } from '../components/Icon'
import DarkVeil from '../components/DarkVeil/DarkVeil'
import { useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { api } from '../store'
import ProductCard from '../components/ProductCard'

// ── Апп-стор категории (большие иконки сверху) ────────────────────────────────
const APP_SECTIONS = [
  {
    slug: 'apps',
    name: 'Приложения',
    shortName: 'Приложения',
    emoji: '📱',
    bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)',
    shadow: 'rgba(14,165,233,0.45)',
    mapTo: 'subscriptions', // маппим на существующую категорию
    apps: [
      { name:'Windows',    emoji:'🪟', bg:'#0078d4' },
      { name:'Canva',      emoji:'🎨', bg:'#7c3aed' },
      { name:'Spotify',    emoji:'🎵', bg:'#1db954' },
      { name:'Netflix',    emoji:'🎬', bg:'#e50914' },
      { name:'Discord',    emoji:'💬', bg:'#5865f2' },
      { name:'Adobe',      emoji:'🅰️', bg:'#ff0000' },
      { name:'Figma',      emoji:'✏️', bg:'#f24e1e' },
      { name:'YouTube',    emoji:'▶️', bg:'#ff0000' },
    ]
  },
  {
    slug: 'games',
    name: 'Игры',
    shortName: 'Игры',
    emoji: '🎮',
    bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    shadow: 'rgba(124,58,237,0.45)',
    mapTo: 'game-accounts',
    apps: [
      { name:'PUBG',       emoji:'🔫', bg:'#f59e0b' },
      { name:'CS2',        emoji:'💣', bg:'#ea580c' },
      { name:'LoL',        emoji:'⚔️', bg:'#c89b3c' },
      { name:'Forza',      emoji:'🏎️', bg:'#111' },
      { name:'GTA V',      emoji:'🌆', bg:'#16a34a' },
      { name:'Minecraft',  emoji:'⛏️', bg:'#92400e' },
      { name:'Roblox',     emoji:'🧱', bg:'#e11d48' },
      { name:'Dota 2',     emoji:'🛡️', bg:'#7f1d1d' },
    ]
  },
  {
    slug: 'mobile',
    name: 'Мобильные игры',
    shortName: 'Мобильные',
    emoji: '📲',
    bg: 'linear-gradient(135deg,#059669,#10b981)',
    shadow: 'rgba(5,150,105,0.45)',
    mapTo: 'items',
    apps: [
      { name:'Brawl Stars', emoji:'⭐', bg:'#f59e0b' },
      { name:'PUBG Mobile', emoji:'🪖', bg:'#92400e' },
      { name:'Free Fire',   emoji:'🔥', bg:'#dc2626' },
      { name:'Clash',       emoji:'👑', bg:'#d97706' },
      { name:'Mobile Leg.', emoji:'🏆', bg:'#7c3aed' },
      { name:'CoD Mobile',  emoji:'🎯', bg:'#16a34a' },
      { name:'Standoff 2',  emoji:'🔪', bg:'#0f172a' },
      { name:'Genshin',     emoji:'💎', bg:'#0ea5e9' },
    ]
  },
]

// Иконка одного приложения (маленькая, 4 в ряд)
function MiniAppIcon({ app }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{
        width:52, height:52, borderRadius:14,
        background: app.bg,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:24,
        boxShadow:'0 3px 10px rgba(0,0,0,0.35)',
      }}>{app.emoji}</div>
      <div style={{
        fontSize:9, color:'rgba(255,255,255,0.75)', fontWeight:500,
        textAlign:'center', maxWidth:56,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
      }}>{app.name}</div>
    </div>
  )
}

// Большой баннер-секции (как в апп-сторе)
function AppSection({ section, onSelect, active }) {
  const isActive = active === section.slug
  return (
    <div
      onClick={() => onSelect(isActive ? null : section.slug)}
      style={{
        borderRadius:20, overflow:'hidden', cursor:'pointer', flexShrink:0,
        width:'calc(100vw - 32px)', maxWidth:440,
        background: isActive
          ? section.bg
          : 'rgba(255,255,255,0.04)',
        border: isActive
          ? 'none'
          : '1px solid rgba(255,255,255,0.08)',
        transition:'all 0.22s',
        boxShadow: isActive ? `0 8px 32px ${section.shadow}` : 'none',
        scrollSnapAlign:'start',
      }}
    >
      {/* Header */}
      <div style={{ padding:'14px 16px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:40, height:40, borderRadius:12,
            background: isActive ? 'rgba(255,255,255,0.2)' : section.bg,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22,
            boxShadow: isActive ? 'none' : `0 4px 16px ${section.shadow}`,
          }}>{section.emoji}</div>
          <div>
            <div style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:15, color: isActive ? '#fff' : 'var(--t1)' }}>
              {section.name}
            </div>
            <div style={{ fontSize:11, color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--t4)', marginTop:1 }}>
              {isActive ? 'Нажми ещё раз для сброса' : 'Нажми для фильтра'}
            </div>
          </div>
        </div>
        <div style={{
          fontSize:11, fontWeight:700,
          color: isActive ? 'rgba(255,255,255,0.9)' : 'var(--accent)',
          background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(245,200,66,0.12)',
          padding:'4px 10px', borderRadius:20,
          border: isActive ? 'none' : '1px solid rgba(245,200,66,0.25)',
        }}>
          {isActive ? '✓ Выбрано' : 'Смотреть'}
        </div>
      </div>

      {/* App icons grid — 8 иконок 4x2 */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        gap:'10px 6px', padding:'6px 16px 14px',
      }}>
        {section.apps.slice(0,8).map((app, i) => (
          <MiniAppIcon key={i} app={app}/>
        ))}
      </div>
    </div>
  )
}

const CATEGORIES = [
  { slug:'', name:'Все' },
  { slug:'game-accounts', name:'Аккаунты', icon: <Gamepad2 size={18} strokeWidth={1.5}/> },
  { slug:'game-currency', name:'Валюта', icon: <Coins size={18} strokeWidth={1.5}/> },
  { slug:'items', name:'Предметы', icon: <Sword size={18} strokeWidth={1.5}/> },
  { slug:'skins', name:'Скины', icon: <Palette size={18} strokeWidth={1.5}/> },
  { slug:'keys', name:'Ключи', icon: <KeyRound size={18} strokeWidth={1.5}/> },
  { slug:'subscriptions', name:'Подписки', icon: <Star size={18} strokeWidth={1.5}/> },
  { slug:'boost', name:'Буст', icon: <Rocket size={18} strokeWidth={1.5}/> },
  { slug:'other', name:'Прочее', icon: <Package size={18} strokeWidth={1.5}/> },
]
const SORTS = [{ v:'newest',label:'Новые' },{ v:'price_asc',label:'Дешевле' },{ v:'price_desc',label:'Дороже' },{ v:'popular',label:'Популярные' }]

export default function CatalogPage() {
  const [sp, setSp] = useSearchParams()
  const [products, setProducts] = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [activeSection, setActiveSection] = useState(null)

  const handleSectionSelect = (slug) => {
    setActiveSection(slug)
    const section = APP_SECTIONS.find(s => s.slug === slug)
    const ns = new URLSearchParams(sp)
    if (section) ns.set("category", section.mapTo)
    else ns.delete("category")
    setSp(ns)
  }


  const category = sp.get('category') || ''
  const search   = sp.get('search') || ''
  const sort     = sp.get('sort') || 'newest'
  const minPrice = sp.get('minPrice') || ''
  const maxPrice = sp.get('maxPrice') || ''

  const [searchInput, setSearchInput] = useState(search)
  const [minP, setMinP] = useState(minPrice)
  const [maxP, setMaxP] = useState(maxPrice)
  const searchRef   = useRef(null)
  const debounceRef = useRef(null)

  // Автофокус на поиске если пришли с кнопки Поиск
  useEffect(() => {
    if (sp.get('focus') === 'search' && searchRef.current) {
      searchRef.current.focus()
      searchRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  useMeta({
    title: 'Каталог товаров — игровые аккаунты, валюта, предметы',
    description: 'Каталог цифровых товаров на Minions Market. Игровые аккаунты, внутриигровая валюта, скины, ключи и буст от проверенных продавцов.',
    keywords: 'каталог игровых товаров, аккаунты игр, игровая валюта купить, скины купить',
  })

  const load = useCallback(async (p=1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit:20, page:p, sort })
      if (category) params.set('category', category)
      if (search)   params.set('search', search)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)
      const { data } = await api.get('/products?' + params)
      if (p===1) setProducts(data.products||[])
      else setProducts(prev => [...prev, ...(data.products||[])])
      setTotal(data.total||0)
    } catch {}
    setLoading(false)
  }, [category, search, sort, minPrice, maxPrice])

  useEffect(() => { setPage(1); load(1) }, [load])

  const applySearch = () => {
    const ns = new URLSearchParams(sp)
    if (searchInput) ns.set('search', searchInput); else ns.delete('search')
    if (minP) ns.set('minPrice', minP); else ns.delete('minPrice')
    if (maxP) ns.set('maxPrice', maxP); else ns.delete('maxPrice')
    setSp(ns)
  }

  return (
    <div style={{ position:'relative', minHeight:'var(--app-height)', overflow:'hidden' }}>
      {/* DarkVeil фон */}
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

      {/* Контент поверх */}
      <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', padding:'24px 12px' }}>
      <h1 style={{ fontFamily:'var(--font-h)', fontWeight:800, fontSize:32, marginBottom:16 }}>Каталог</h1>

      {/* App-store sections */}
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--t4)', letterSpacing:'0.1em', marginBottom:12 }}>КАТЕГОРИИ</div>
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4, scrollSnapType:'x mandatory', WebkitOverflowScrolling:'touch', msOverflowStyle:'none', scrollbarWidth:'none' }}>
          {APP_SECTIONS.map(section => (
            <AppSection key={section.slug} section={section} onSelect={handleSectionSelect} active={activeSection}/>
          ))}
        </div>
      </div>

      {/* Строка поиска */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <input
          ref={searchRef}
          className="inp"
          placeholder="Поиск товаров..."
          value={searchInput}
          onChange={e => {
            setSearchInput(e.target.value)
            clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
              const ns = new URLSearchParams(sp)
              if (e.target.value) ns.set('search', e.target.value)
              else ns.delete('search')
              setSp(ns)
            }, 500)
          }}
          onKeyDown={e => e.key === 'Enter' && applySearch()}
          style={{ flex:1, fontSize:15 }}
        />
        <button className="btn btn-primary" onClick={applySearch} style={{ flexShrink:0, padding:'0 18px' }}>
          Найти
        </button>
      </div>

      {/* Фильтр по цене */}
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        <input className="inp" placeholder="$ от" value={minP} onChange={e => setMinP(e.target.value)}
          style={{ flex:1 }} onKeyDown={e => e.key === 'Enter' && applySearch()}/>
        <input className="inp" placeholder="$ до" value={maxP} onChange={e => setMaxP(e.target.value)}
          style={{ flex:1 }} onKeyDown={e => e.key === 'Enter' && applySearch()}/>
      </div>

      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {CATEGORIES.map(c => (
          <button key={c.slug} onClick={() => { const ns=new URLSearchParams(sp); if(c.slug) ns.set('category',c.slug); else ns.delete('category'); setSp(ns) }} style={{
            padding:'8px 16px', borderRadius:100, border:'1px solid', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
            background: category===c.slug ? 'rgba(245,200,66,0.15)' : 'var(--bg2)',
            borderColor: category===c.slug ? 'rgba(245,200,66,0.5)' : 'var(--border)',
            color: category===c.slug ? 'var(--accent)' : 'var(--t2)',
          }}>{c.icon} {c.name}</button>
        ))}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <span style={{ color:'var(--t3)', fontSize:13 }}>{loading ? '...' : `${total} товаров`}</span>
        <div style={{ display:'flex', gap:6 }}>
          {SORTS.map(s => (
            <button key={s.v} onClick={() => { const ns=new URLSearchParams(sp); ns.set('sort',s.v); setSp(ns) }} style={{
              padding:'6px 14px', borderRadius:8, border:'1px solid', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all 0.15s',
              background: sort===s.v ? 'rgba(245,200,66,0.12)' : 'transparent',
              borderColor: sort===s.v ? 'rgba(245,200,66,0.4)' : 'var(--border)',
              color: sort===s.v ? 'var(--accent)' : 'var(--t3)',
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {loading && page===1 ? (
        <div className="grid-4">{Array(8).fill(0).map((_,i) => <div key={i} className="skel" style={{ height:280 }}/>)}</div>
      ) : products.length===0 ? (
        <div style={{ textAlign:'center', padding:'80px 20px', color:'var(--t3)' }}>
          <Search size={48} strokeWidth={1} style={{marginBottom:16, opacity:0.35}}/>
          <div style={{ fontFamily:'var(--font-h)', fontWeight:700, fontSize:20 }}>Товары не найдены</div>
          <p style={{ color:'var(--t4)', marginTop:8 }}>Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <>
          <div className="grid-4">
            {products.map((p,i) => <ProductCard key={p._id||p.id} product={p} style={{ animationDelay:`${i*30}ms` }}/>)}
          </div>
          {products.length < total && (
            <div style={{ textAlign:'center', marginTop:32 }}>
              <button className="btn btn-secondary" onClick={() => { const np=page+1; setPage(np); load(np) }} disabled={loading}>
                {loading ? 'Загрузка...' : 'Загрузить ещё'}
              </button>
            </div>
          )}
        </>
      )}</div>
    </div>
  )
}
