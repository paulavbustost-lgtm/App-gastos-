import type { Category, Settings, Transaction } from '../types'
import { periodProgress, type PeriodRange } from './date'
import { byCategory, filterByPeriod } from './stats'

/** Fracción del tope a partir de la cual se avisa que queda poco. */
export const NEAR_LIMIT = 0.8

export type BudgetLevel =
  /** Va cómodo. */
  | 'ok'
  /** Gastando más rápido de lo que avanza el período. */
  | 'rapido'
  /** Llegando al tope (≥ 80%). */
  | 'cerca'
  /** Se pasó del tope. */
  | 'excedido'

export interface CategoryBudgetStatus {
  category: Category
  spent: number
  budget: number
  /** Gastado sobre el tope. Puede pasar de 1. */
  ratio: number
  remaining: number
  level: BudgetLevel
  /** Proyección al cierre del período según el ritmo actual, si aplica. */
  projected: number | null
}

/**
 * Estado de cada categoría con tope definido, ordenado por urgencia.
 * `level` combina dos señales: cuánto se lleva gastado del tope, y si el
 * ritmo de gasto va por delante de lo que avanza el período.
 *
 * Acota los movimientos al período por su cuenta, así da lo mismo si quien
 * llama ya filtró o pasa el historial completo.
 */
export function categoryBudgetStatuses(
  transactions: Transaction[],
  categories: Category[],
  settings: Settings,
  range: PeriodRange,
): CategoryBudgetStatus[] {
  const inPeriod = filterByPeriod(transactions, range)
  const spentByCategory = new Map(byCategory(inPeriod, categories).map((c) => [c.category.id, c.total]))
  const { elapsed, total } = periodProgress(range)
  const elapsedFraction = total > 0 ? elapsed / total : 0

  const statuses: CategoryBudgetStatus[] = []
  for (const [categoryId, budget] of Object.entries(settings.categoryBudgets)) {
    if (!(budget > 0)) continue
    const category = categories.find((c) => c.id === categoryId)
    if (!category || category.archived) continue

    const spent = spentByCategory.get(categoryId) ?? 0
    const ratio = spent / budget
    const projected = elapsed > 0 && elapsed < total ? (spent / elapsed) * total : null

    let level: BudgetLevel = 'ok'
    if (ratio >= 1) level = 'excedido'
    else if (ratio >= NEAR_LIMIT) level = 'cerca'
    else if (elapsedFraction > 0 && ratio > elapsedFraction + 0.15) level = 'rapido'

    statuses.push({
      category,
      spent,
      budget,
      ratio,
      remaining: budget - spent,
      level,
      projected,
    })
  }

  const order: Record<BudgetLevel, number> = { excedido: 0, cerca: 1, rapido: 2, ok: 3 }
  return statuses.sort((a, b) => order[a.level] - order[b.level] || b.ratio - a.ratio)
}

/** Solo las que ameritan aviso. */
export function activeAlerts(statuses: CategoryBudgetStatus[]): CategoryBudgetStatus[] {
  return statuses.filter((s) => s.level !== 'ok')
}

/**
 * Detecta qué categorías empeoraron su estado entre dos momentos.
 * Sirve para avisar justo después de anotar un gasto, no antes.
 */
export function newlyTriggered(
  before: CategoryBudgetStatus[],
  after: CategoryBudgetStatus[],
): CategoryBudgetStatus[] {
  const rank: Record<BudgetLevel, number> = { ok: 0, rapido: 1, cerca: 2, excedido: 3 }
  const previous = new Map(before.map((s) => [s.category.id, s.level]))
  return after.filter((s) => {
    const prev = previous.get(s.category.id) ?? 'ok'
    return rank[s.level] > rank[prev] && s.level !== 'ok' && s.level !== 'rapido'
  })
}
