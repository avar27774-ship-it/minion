import { useState, useEffect } from 'react'
import { fetchUsdToRub, formatRub, toRub, getCachedRate } from '../utils/currency'

let globalRate = null
let listeners = []

function notifyListeners(rate) {
  globalRate = rate
  listeners.forEach(fn => fn(rate))
}

// Инициируем загрузку курса один раз глобально
let fetchStarted = false
function ensureFetched() {
  if (fetchStarted) return
  fetchStarted = true
  fetchUsdToRub().then(rate => notifyListeners(rate))
  // Обновляем курс каждый час
  setInterval(() => {
    fetchUsdToRub().then(rate => notifyListeners(rate))
  }, 60 * 60 * 1000)
}

export function useCurrency() {
  const [rate, setRate] = useState(globalRate || getCachedRate())

  useEffect(() => {
    ensureFetched()
    const handler = r => setRate(r)
    listeners.push(handler)
    if (globalRate) setRate(globalRate)
    return () => { listeners = listeners.filter(l => l !== handler) }
  }, [])

  return {
    rate,
    // Форматировать USD-значение как рубли: formatRub(9.99) → "900 ₽"
    fmt: (usdAmount) => formatRub(usdAmount, rate),
    // Просто число рублей: rub(9.99) → 900
    rub: (usdAmount) => toRub(usdAmount, rate),
  }
}
