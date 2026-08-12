const formatterCache = new Map<string, Intl.NumberFormat>()

function currencyFormatter(locale: string, currency: string, compact = false): Intl.NumberFormat {
  const key = `${locale}|${currency}|${compact}`
  let f = formatterCache.get(key)
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 0 : undefined,
      })
    } catch {
      f = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
    }
    formatterCache.set(key, f)
  }
  return f
}

export function formatMoney(value: number, locale: string, currency: string): string {
  return currencyFormatter(locale, currency).format(value)
}

/** Versión corta para ejes y etiquetas apretadas: $12,9 mil. */
export function formatMoneyCompact(value: number, locale: string, currency: string): string {
  if (Math.abs(value) < 1000) return currencyFormatter(locale, currency).format(value)
  return currencyFormatter(locale, currency, true).format(value)
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatPercent(fraction: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: fraction < 0.1 ? 1 : 0,
  }).format(fraction)
}

/**
 * Convierte lo que el usuario escribe en un monto.
 * Tolera "$", puntos de miles y coma decimal: "12.500" → 12500, "12,5" → 12,5.
 */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned) return NaN

  const dots = (cleaned.match(/\./g) ?? []).length
  const commas = (cleaned.match(/,/g) ?? []).length

  let decimalSep = ''
  if (dots > 0 && commas > 0) {
    // Conviven ambos: el último es el decimal y el otro agrupa miles.
    decimalSep = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.') ? ',' : '.'
  } else if (dots === 1 || commas === 1) {
    const sep = dots === 1 ? '.' : ','
    const decimals = cleaned.length - cleaned.lastIndexOf(sep) - 1
    // Un único separador seguido de tres dígitos es agrupación de miles
    // ("12.500"), no una fracción.
    if (decimals !== 3) decimalSep = sep
  }
  // Con dos o más separadores del mismo tipo siempre son miles ("1.200.000").

  let normalized: string
  if (decimalSep) {
    const cut = cleaned.lastIndexOf(decimalSep)
    normalized = `${cleaned.slice(0, cut).replace(/[.,]/g, '')}.${cleaned.slice(cut + 1)}`
  } else {
    normalized = cleaned.replace(/[.,]/g, '')
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : NaN
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
