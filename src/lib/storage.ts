import { DEFAULT_CATEGORIES } from '../data/categories'
import type { AppState, Category, Settings, Transaction } from '../types'
import { clampCutDay } from './date'

export const STORAGE_KEY = 'app-gastos:state'
export const STATE_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  currency: 'CLP',
  locale: 'es-CL',
  monthlyBudget: 0,
  categoryBudgets: {},
  theme: 'system',
  cutDay: 1,
}

export function emptyState(): AppState {
  return {
    version: STATE_VERSION,
    transactions: [],
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    settings: { ...DEFAULT_SETTINGS, categoryBudgets: {} },
  }
}

/**
 * Normaliza cualquier objeto (de localStorage o de un archivo importado) a un
 * `AppState` válido. Descarta registros corruptos en vez de reventar la app.
 */
export function normalizeState(raw: unknown): AppState {
  const base = emptyState()
  if (!raw || typeof raw !== 'object') return base
  const input = raw as Partial<AppState>

  const categories: Category[] = Array.isArray(input.categories)
    ? input.categories.filter(isCategory).map((c) => ({
        ...c,
        colorSlot: Number.isFinite(c.colorSlot) ? Math.abs(Math.trunc(c.colorSlot)) % 8 : 0,
      }))
    : base.categories

  // Garantiza que las categorías base existan aunque el archivo importado sea viejo.
  const byId = new Map(categories.map((c) => [c.id, c]))
  for (const def of DEFAULT_CATEGORIES) {
    if (!byId.has(def.id)) categories.push({ ...def })
  }

  const transactions: Transaction[] = Array.isArray(input.transactions)
    ? input.transactions.filter(isTransaction).map((t) => ({
        ...t,
        amount: Math.abs(t.amount),
        note: typeof t.note === 'string' ? t.note : '',
      }))
    : []

  const s = (input.settings ?? {}) as Partial<Settings>
  const settings: Settings = {
    currency: typeof s.currency === 'string' && s.currency ? s.currency : DEFAULT_SETTINGS.currency,
    locale: typeof s.locale === 'string' && s.locale ? s.locale : DEFAULT_SETTINGS.locale,
    monthlyBudget: numberOr(s.monthlyBudget, 0),
    categoryBudgets:
      s.categoryBudgets && typeof s.categoryBudgets === 'object'
        ? Object.fromEntries(
            Object.entries(s.categoryBudgets)
              .filter(([, v]) => Number.isFinite(v as number) && (v as number) > 0)
              .map(([k, v]) => [k, Number(v)]),
          )
        : {},
    theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : 'system',
    cutDay: clampCutDay(numberOr(s.cutDay, 1)),
  }

  return { version: STATE_VERSION, transactions, categories, settings }
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function isCategory(c: unknown): c is Category {
  if (!c || typeof c !== 'object') return false
  const x = c as Category
  return typeof x.id === 'string' && typeof x.name === 'string' && (x.type === 'gasto' || x.type === 'ingreso')
}

function isTransaction(t: unknown): t is Transaction {
  if (!t || typeof t !== 'object') return false
  const x = t as Transaction
  return (
    typeof x.id === 'string' &&
    (x.type === 'gasto' || x.type === 'ingreso') &&
    typeof x.amount === 'number' &&
    Number.isFinite(x.amount) &&
    typeof x.categoryId === 'string' &&
    typeof x.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.date)
  )
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return emptyState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    return normalizeState(JSON.parse(raw))
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Cuota llena o modo privado: la app sigue funcionando en memoria.
  }
}
