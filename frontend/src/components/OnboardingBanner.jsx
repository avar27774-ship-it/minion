import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'

const STORAGE_KEY = 'mn_onboarding_dismissed'

const STEPS = [
  { icon: '💰', title: 'Пополни баланс', desc: 'Через карту РФ, СБП или криптовалюту', to: '/wallet', cta: 'Пополнить' },
  { icon: '🛒', title: 'Купи товар', desc: 'Деньги защищены — продавец получит их только после подтверждения', to: '/catalog', cta: 'Каталог' },
  { icon: '✅', title: 'Подтверди получение', desc: 'Проверь товар и нажми «Подтвердить» — сделка завершится автоматически', to: '/deals', cta: 'Мои сделки' },
]

export default function OnboardingBanner() {
  const { user } = useStore()
  const [visible, setVisible] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    // Показываем только авторизованным пользователям, которые ещё не закрыли
    if (!user) return
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) return
    // Показываем если у пользователя 0 покупок и баланс 0
    const isNew = (parseFloat(user.balance || 0) === 0) && (parseInt(user.total_purchases || 0) === 0)
    if (isNew) setVisible(true)
  }, [user])

  // Авто-смена шага
  useEffect(() => {
    if (!visible) return
    const t = setInterval(() => setActiveStep(s => (s + 1) % STEPS.length), 3500)
    return () => clearInterval(t)
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!visible) return null

  return (
    <div style={{
      margin: '16px 20px 0',
      background: 'linear-gradient(135deg, rgba(124,106,255,0.08) 0%, rgba(245,200,66,0.06) 100%)',
      border: '1px solid rgba(245,200,66,0.2)',
      borderRadius: 20, padding: '20px 20px 16px',
      animation: 'fadeUp 0.4s ease both',
      position: 'relative',
    }}>
      {/* Закрыть */}
      <button onClick={dismiss} style={{
        position: 'absolute', top: 12, right: 12,
        width: 28, height: 28, borderRadius: 8,
        background: 'var(--bg3)', border: '1px solid var(--border)',
        cursor: 'pointer', color: 'var(--t3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, lineHeight: 1,
      }}>✕</button>

      {/* Заголовок */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: 'var(--accent)',
          fontFamily: 'var(--font-h)', letterSpacing: '0.1em',
          marginBottom: 4,
        }}>КАК НАЧАТЬ</div>
        <div style={{ fontFamily: 'var(--font-h)', fontWeight: 800, fontSize: 16 }}>
          3 шага до первой сделки
        </div>
      </div>

      {/* Шаги */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STEPS.map((step, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            style={{
              flex: 1, padding: '12px 8px', borderRadius: 14,
              border: `1px solid ${activeStep === i ? 'rgba(245,200,66,0.4)' : 'var(--border)'}`,
              background: activeStep === i ? 'rgba(245,200,66,0.08)' : 'var(--bg3)',
              cursor: 'pointer', transition: 'all 0.25s', textAlign: 'left',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 6 }}>{step.icon}</div>
            <div style={{
              fontFamily: 'var(--font-h)', fontWeight: 700,
              fontSize: 12, color: activeStep === i ? 'var(--t1)' : 'var(--t2)',
              lineHeight: 1.3, marginBottom: 2,
            }}>
              Шаг {i + 1}: {step.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4 }}>
              {step.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Прогресс и CTA */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {/* Точки-индикаторы */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 2, transition: 'all 0.3s',
              width: activeStep === i ? 20 : 8,
              background: activeStep === i ? 'var(--accent)' : 'var(--border2)',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={dismiss} style={{
            fontSize: 12, color: 'var(--t4)', background: 'none',
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-b)',
          }}>
            Понятно, закрыть
          </button>
          <Link
            to={STEPS[activeStep].to}
            className="btn btn-primary btn-sm"
            style={{ fontSize: 12, padding: '7px 16px' }}
          >
            {STEPS[activeStep].cta} →
          </Link>
        </div>
      </div>
    </div>
  )
}
