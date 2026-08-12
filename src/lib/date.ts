/**
 * Utilidades de fecha. Todo se maneja como fecha local en texto `YYYY-MM-DD`
 * para evitar los corrimientos de zona horaria que introduce `Date.toISOString()`.
 */

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** `YYYY-MM-DD` de una fecha local. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Interpreta `YYYY-MM-DD` como medianoche local (no UTC). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Clave de período `YYYY-MM`. */
export type PeriodKey = string

export function periodKey(year: number, month: number): PeriodKey {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function parsePeriodKey(key: PeriodKey): { year: number; month: number } {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m - 1 }
}

export function shiftPeriod(key: PeriodKey, delta: number): PeriodKey {
  const { year, month } = parsePeriodKey(key)
  const d = new Date(year, month + delta, 1)
  return periodKey(d.getFullYear(), d.getMonth())
}

export interface PeriodRange {
  key: PeriodKey
  /** Primer día incluido (`YYYY-MM-DD`). */
  start: string
  /** Último día incluido (`YYYY-MM-DD`). */
  end: string
}

/**
 * Rango del período que arranca en `key` con el día de corte dado.
 * Con `cutDay = 1` equivale exactamente al mes calendario.
 */
export function periodRange(key: PeriodKey, cutDay: number): PeriodRange {
  const { year, month } = parsePeriodKey(key)
  const cut = clampCutDay(cutDay)
  const start = new Date(year, month, cut)
  const endExclusive = new Date(year, month + 1, cut)
  const end = new Date(endExclusive.getTime() - 86400000)
  return { key, start: toISODate(start), end: toISODate(end) }
}

export function clampCutDay(cutDay: number): number {
  if (!Number.isFinite(cutDay)) return 1
  return Math.min(28, Math.max(1, Math.round(cutDay)))
}

/** Período al que pertenece una fecha dada el día de corte. */
export function periodKeyForDate(iso: string, cutDay: number): PeriodKey {
  const cut = clampCutDay(cutDay)
  const d = fromISODate(iso)
  if (d.getDate() >= cut) return periodKey(d.getFullYear(), d.getMonth())
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return periodKey(prev.getFullYear(), prev.getMonth())
}

export function currentPeriodKey(cutDay: number): PeriodKey {
  return periodKeyForDate(todayISO(), cutDay)
}

export function isInRange(iso: string, range: PeriodRange): boolean {
  return iso >= range.start && iso <= range.end
}

/** Etiqueta legible: "agosto 2026" o "25 ago – 24 sep" si hay día de corte. */
export function periodLabel(key: PeriodKey, cutDay: number): string {
  const { year, month } = parsePeriodKey(key)
  if (clampCutDay(cutDay) === 1) return `${MONTH_NAMES[month]} ${year}`
  const r = periodRange(key, cutDay)
  return `${shortDate(r.start)} – ${shortDate(r.end)}`
}

export function shortDate(iso: string): string {
  const d = fromISODate(iso)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`
}

/** "Hoy", "Ayer" o "lun 11 ago" para encabezados de lista. */
export function friendlyDate(iso: string): string {
  const today = todayISO()
  if (iso === today) return 'Hoy'
  const yesterday = toISODate(new Date(Date.now() - 86400000))
  if (iso === yesterday) return 'Ayer'
  const d = fromISODate(iso)
  const dow = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()]
  const base = `${dow} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`
}

/** Días transcurridos y totales del período, para proyectar el ritmo de gasto. */
export function periodProgress(range: PeriodRange): { elapsed: number; total: number } {
  const start = fromISODate(range.start)
  const end = fromISODate(range.end)
  const total = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const now = fromISODate(todayISO())
  if (now < start) return { elapsed: 0, total }
  if (now > end) return { elapsed: total, total }
  const elapsed = Math.round((now.getTime() - start.getTime()) / 86400000) + 1
  return { elapsed, total }
}
