import { describe, expect, it } from 'vitest'
import type { Category, Settings, Transaction } from '../types'
import { DEFAULT_SETTINGS } from './storage'
import { periodRange, toISODate, todayISO } from './date'
import { activeAlerts, categoryBudgetStatuses, newlyTriggered } from './alerts'

const cats: Category[] = [
  { id: 'comida', name: 'Comida', emoji: '🍔', colorSlot: 1, type: 'gasto' },
  { id: 'ropa', name: 'Ropa', emoji: '👕', colorSlot: 7, type: 'gasto' },
]

/** Período que contiene el día de hoy, para que el avance sea el real. */
function currentRange() {
  const now = new Date()
  return periodRange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, 1)
}

function settings(categoryBudgets: Record<string, number>): Settings {
  return { ...DEFAULT_SETTINGS, categoryBudgets }
}

function tx(amount: number, categoryId = 'comida', date = todayISO()): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'gasto',
    amount,
    categoryId,
    date,
    note: '',
    method: 'debito',
    createdAt: 0,
  }
}

describe('categoryBudgetStatuses', () => {
  it('solo considera categorías con tope definido', () => {
    const s = categoryBudgetStatuses([tx(1000), tx(5000, 'ropa')], cats, settings({ comida: 10000 }), currentRange())
    expect(s).toHaveLength(1)
    expect(s[0].category.id).toBe('comida')
  })

  it('calcula gastado, restante y proporción', () => {
    const s = categoryBudgetStatuses([tx(8000)], cats, settings({ comida: 10000 }), currentRange())
    expect(s[0].spent).toBe(8000)
    expect(s[0].remaining).toBe(2000)
    expect(s[0].ratio).toBeCloseTo(0.8)
  })

  it('marca "cerca" al llegar al 80% del tope', () => {
    const s = categoryBudgetStatuses([tx(8000)], cats, settings({ comida: 10000 }), currentRange())
    expect(s[0].level).toBe('cerca')
  })

  it('marca "excedido" al pasarse', () => {
    const s = categoryBudgetStatuses([tx(12000)], cats, settings({ comida: 10000 }), currentRange())
    expect(s[0].level).toBe('excedido')
    expect(s[0].remaining).toBe(-2000)
  })

  it('marca "ok" cuando va holgado', () => {
    // Un gasto chico el primer día del período no dispara nada.
    const range = currentRange()
    const s = categoryBudgetStatuses([tx(100, 'comida', range.start)], cats, settings({ comida: 1000000 }), range)
    expect(s[0].level).toBe('ok')
  })

  it('ignora topes de categorías archivadas o inexistentes', () => {
    const archived: Category[] = [{ ...cats[0], archived: true }]
    expect(categoryBudgetStatuses([tx(9000)], archived, settings({ comida: 10000 }), currentRange())).toHaveLength(0)
    expect(categoryBudgetStatuses([tx(9000)], cats, settings({ fantasma: 100 }), currentRange())).toHaveLength(0)
  })

  it('ordena por urgencia: primero lo excedido', () => {
    const s = categoryBudgetStatuses(
      [tx(8500, 'comida'), tx(20000, 'ropa')],
      cats,
      settings({ comida: 10000, ropa: 10000 }),
      currentRange(),
    )
    expect(s.map((x) => x.category.id)).toEqual(['ropa', 'comida'])
  })

  it('no cuenta los ingresos contra el tope', () => {
    const income: Transaction = { ...tx(50000), type: 'ingreso' }
    const s = categoryBudgetStatuses([income], cats, settings({ comida: 10000 }), currentRange())
    expect(s[0].spent).toBe(0)
    expect(s[0].level).toBe('ok')
  })
})

describe('activeAlerts', () => {
  it('deja fuera lo que va al día', () => {
    const range = currentRange()
    const s = categoryBudgetStatuses(
      [tx(100, 'comida', range.start), tx(9500, 'ropa')],
      cats,
      settings({ comida: 1000000, ropa: 10000 }),
      range,
    )
    expect(activeAlerts(s).map((x) => x.category.id)).toEqual(['ropa'])
  })
})

describe('newlyTriggered', () => {
  const range = currentRange()
  const s = settings({ comida: 10000 })

  it('avisa cuando un gasto cruza el umbral', () => {
    const before = categoryBudgetStatuses([tx(5000)], cats, s, range)
    const after = categoryBudgetStatuses([tx(5000), tx(4000)], cats, s, range)
    expect(newlyTriggered(before, after).map((x) => x.category.id)).toEqual(['comida'])
  })

  it('no repite el aviso si ya estaba en ese estado', () => {
    const before = categoryBudgetStatuses([tx(9000)], cats, s, range)
    const after = categoryBudgetStatuses([tx(9000), tx(100)], cats, s, range)
    expect(newlyTriggered(before, after)).toHaveLength(0)
  })

  it('vuelve a avisar cuando pasa de "cerca" a "excedido"', () => {
    const before = categoryBudgetStatuses([tx(9000)], cats, s, range)
    const after = categoryBudgetStatuses([tx(9000), tx(2000)], cats, s, range)
    expect(newlyTriggered(before, after)[0].level).toBe('excedido')
  })

  it('no avisa si el gasto no mueve el estado', () => {
    const before = categoryBudgetStatuses([tx(1000)], cats, s, range)
    const after = categoryBudgetStatuses([tx(1000), tx(500)], cats, s, range)
    expect(newlyTriggered(before, after)).toHaveLength(0)
  })

  it('avisa por una categoría nueva que llega al tope de una', () => {
    const both = settings({ comida: 10000, ropa: 5000 })
    const before = categoryBudgetStatuses([tx(1000)], cats, both, range)
    const after = categoryBudgetStatuses([tx(1000), tx(6000, 'ropa')], cats, both, range)
    expect(newlyTriggered(before, after).map((x) => x.category.id)).toEqual(['ropa'])
  })

  it('ignora fechas fuera del período', () => {
    const outside = toISODate(new Date(2000, 0, 15))
    const st = categoryBudgetStatuses([tx(50000, 'comida', outside)], cats, s, range)
    expect(st[0].spent).toBe(0)
  })
})
