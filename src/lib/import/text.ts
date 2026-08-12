/** Utilidades de texto para leer cartolas chilenas. */

/** Monto con puntos de miles y coma decimal opcional: `-2.500.000`, `915`, `1.053`. */
export const MONEY_RE = /-?\d{1,3}(?:\.\d{3})+|-?\d+(?:,\d+)?/g

/** `dd/mm/yy` o `dd/mm/yyyy`. */
export const DATE_RE = /\b(\d{2})\/(\d{2})\/(\d{2}|\d{4})\b/

/** Número de cuota: `01/01`, `05/06`, `10/36`. */
export const INSTALLMENT_RE = /\b(\d{2})\/(\d{2})\b(?!\/)/

/**
 * Convierte `dd/mm/yy` a `YYYY-MM-DD`.
 * Los años de dos dígitos se interpretan en el siglo actual (25 → 2025).
 */
export function parseStatementDate(raw: string): string | null {
  const m = raw.match(DATE_RE)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  let year = Number(m[3])
  if (m[3].length === 2) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  // Rechaza fechas imposibles (31 de febrero, etc.).
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** `-2.500.000` → -2500000; `1.053` → 1053; `12,5` → 12,5. */
export function parseChileanMoney(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, '')
  if (!cleaned) return NaN
  const negative = cleaned.startsWith('-')
  const digits = cleaned.replace(/-/g, '')
  const lastComma = digits.lastIndexOf(',')
  let normalized: string
  if (lastComma >= 0) {
    normalized = `${digits.slice(0, lastComma).replace(/\./g, '')}.${digits.slice(lastComma + 1)}`
  } else {
    normalized = digits.replace(/\./g, '')
  }
  const n = Number(normalized)
  if (!Number.isFinite(n)) return NaN
  return negative ? -n : n
}

/** Todos los montos de un texto, en orden de aparición. */
export function extractAmounts(text: string): number[] {
  return (text.match(MONEY_RE) ?? []).map(parseChileanMoney).filter((n) => Number.isFinite(n))
}

/**
 * Prefijos de pasarelas de pago que aparecen antes del comercio real.
 * "MERCADOPAGO*ALMACEN" es el almacén, no Mercado Pago.
 */
const PROCESSOR_PREFIXES = [
  'MERCADOPAGO',
  'MERPAGO',
  'MERCPAGO',
  'MP',
  'PAYU',
  'DLOCAL',
  'DL',
  'FLOW',
  'SUMUP',
  'TOKU',
  'TUU',
  'KHIPU',
  'WEBPAY',
  'TRANSBANK',
  'PAGOFACIL',
  'GETNET',
  'KLAP',
]

/**
 * Limpia la descripción de la cartola: saca el código de referencia, los
 * prefijos de pasarela y los sufijos de local ("L9210", "4 04").
 */
export function cleanMerchant(raw: string): string {
  let s = raw.trim()

  // Código de referencia de 10-14 dígitos al inicio.
  s = s.replace(/^\d{10,14}\s*/, '')

  // Prefijo de pasarela, con o sin asterisco: "PAYU *UBER TRIP", "MP*PETVET".
  for (const p of PROCESSOR_PREFIXES) {
    const re = new RegExp(`^${p}\\s*\\*\\s*`, 'i')
    if (re.test(s)) {
      s = s.replace(re, '')
      break
    }
  }
  // "DL RAPPI CHILE RA": prefijo separado por espacio, sin asterisco.
  s = s.replace(/^(DL|MP)\s+(?=[A-Za-zÁÉÍÓÚÑ])/i, '')

  // Códigos de local pegados al final: "CRUZ VERDE L9210", "MC DONALDS 4 04".
  // El de dos grupos va primero: si no, el otro deja un número suelto atrás.
  s = s.replace(/\s+\d{1,2}\s+\d{1,2}$/, '')
  s = s.replace(/\s+[A-Z]?\d{2,6}$/i, '')

  s = s.replace(/\s{2,}/g, ' ').trim()
  return s || raw.trim()
}

/** Forma canónica para comparar y para guardar reglas: sin tildes, mayúsculas. */
export function normalizeKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Palabras que se dejan en minúscula dentro de un nombre. */
const LOWERCASE_WORDS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al'])

/** Convierte MAYÚSCULAS a "Capitalización de Título" para que se lea mejor. */
export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (i > 0 && LOWERCASE_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/**
 * Ruido al final de la descripción que agrega la cartola y no es parte del
 * comercio: la tasa de interés de las compras en cuotas.
 */
export function stripTrailingNoise(s: string): string {
  return s
    .replace(/\bTASA\s+INT\.?\s*[\d.,]+\s*%?\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
