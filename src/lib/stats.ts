import type { Category, Transaction } from '../types'
import { isInRange, periodRange, shiftPeriod, type PeriodKey, type PeriodRange } from './date'

export interface PeriodTotals {
  gastos: number
  ingresos: number
  balance: number
  count: number
}

export function filterByPeriod(transactions: Transaction[], range: PeriodRange): Transaction[] {
  return transactions.filter((t) => isInRange(t.date, range))
}

export function totals(transactions: Transaction[]): PeriodTotals {
  let gastos = 0
  let ingresos = 0
  for (const t of transactions) {
    if (t.type === 'gasto') gastos += t.amount
    else ingresos += t.amount
  }
  return { gastos, ingresos, balance: ingresos - gastos, count: transactions.length }
}

export interface CategoryTotal {
  category: Category
  total: number
  count: number
  share: number
}

export function byCategory(
  transactions: Transaction[],
  categories: Category[],
  type: 'gasto' | 'ingreso' = 'gasto',
): CategoryTotal[] {
  const catById = new Map(categories.map((c) => [c.id, c]))
  const sums = new Map<string, { total: number; count: number }>()
  let grand = 0

  for (const t of transactions) {
    if (t.type !== type) continue
    const entry = sums.get(t.categoryId) ?? { total: 0, count: 0 }
    entry.total += t.amount
    entry.count += 1
    sums.set(t.categoryId, entry)
    grand += t.amount
  }

  return [...sums.entries()]
    .map(([id, { total, count }]) => ({
      category: catById.get(id) ?? unknownCategory(id),
      total,
      count,
      share: grand > 0 ? total / grand : 0,
    }))
    .sort((a, b) => b.total - a.total)
}

function unknownCategory(id: string): Category {
  return { id, name: 'Sin categoría', emoji: '❔', colorSlot: 6, type: 'gasto' }
}

export interface PeriodPoint {
  key: PeriodKey
  gastos: number
  ingresos: number
}

/** Serie de los últimos `count` períodos terminando en `endKey` (incluido). */
export function periodSeries(
  transactions: Transaction[],
  endKey: PeriodKey,
  count: number,
  cutDay: number,
): PeriodPoint[] {
  const points: PeriodPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const key = shiftPeriod(endKey, -i)
    const range = periodRange(key, cutDay)
    const t = totals(filterByPeriod(transactions, range))
    points.push({ key, gastos: t.gastos, ingresos: t.ingresos })
  }
  return points
}

/**
 * Proyección del gasto al cierre del período, extrapolando el ritmo actual.
 * Devuelve `null` si el período aún no empieza o ya cerró.
 */
export function projectedSpend(spent: number, elapsedDays: number, totalDays: number): number | null {
  if (elapsedDays <= 0 || elapsedDays >= totalDays) return null
  return (spent / elapsedDays) * totalDays
}

export function averagePerDay(spent: number, elapsedDays: number): number {
  return elapsedDays > 0 ? spent / elapsedDays : 0
}
