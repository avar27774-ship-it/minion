// Утилита конвертации валют USD → RUB
// Курс обновляется автоматически через ЦБ РФ (CORS-proxy) или fallback

let cachedRate = null
let cacheTime = 0
const CACHE_TTL = 60 * 60 * 1000 // 1 час

const FALLBACK_RATE = 90 // fallback если API недоступен

export async function fetchUsdToRub() {
  const now = Date.now()
  if (cachedRate && now - cacheTime < CACHE_TTL) return cachedRate

  try {
    // Используем открытый API ЦБ РФ через CORS-прокси
    const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js')
    if (!res.ok) throw new Error('CBR fetch failed')
    const data = await res.json()
    const rate = data?.Valute?.USD?.Value
    if (rate && typeof rate === 'number') {
      cachedRate = rate
      cacheTime = now
      return rate
    }
    throw new Error('No USD rate in response')
  } catch {
    // Второй fallback — exchangerate-api (бесплатный)
    try {
      const res2 = await fetch('https://open.er-api.com/v6/latest/USD')
      if (!res2.ok) throw new Error()
      const data2 = await res2.json()
      const rate2 = data2?.rates?.RUB
      if (rate2 && typeof rate2 === 'number') {
        cachedRate = rate2
        cacheTime = now
        return rate2
      }
      throw new Error()
    } catch {
      cachedRate = cachedRate || FALLBACK_RATE
      return cachedRate
    }
  }
}

// Синхронный геттер кэшированного курса (для render без async)
export function getCachedRate() {
  return cachedRate || FALLBACK_RATE
}

// Форматировать цену в рублях
// usdAmount — число в USD (как хранится в БД)
// rate — текущий курс (из useCurrency hook)
export function formatRub(usdAmount, rate) {
  const r = rate || getCachedRate()
  const rub = parseFloat(usdAmount || 0) * r
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(rub)
}

// Возвращает только число рублей (без символа)
export function toRub(usdAmount, rate) {
  const r = rate || getCachedRate()
  return Math.round(parseFloat(usdAmount || 0) * r)
}
