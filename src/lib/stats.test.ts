import { describe, expect, it } from 'vitest'
import type { Category, Transaction } from '../types'
import { periodRange } from './date'
import { byCategory, filterByPeriod, periodSeries, projectedSpend, totals } from './stats'

const cats: Category[] = [
  { id: 'a', name: 'Comida', emoji: '🍔', colorSlot: 0, type: 'gasto' },
  { id: 'b', name: 'Bus', emoji: '🚌', colorSlot: 1, type: 'gasto' },
  { id: 's', name: 'Sueldo', emoji: '💼', colorSlot: 5, type: 'ingreso' },
]

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'gasto',
    amount: 1000,
    categoryId: 'a',
    date: '2026-08-10',
    note: '',
    method: 'debito',
    createdAt: 0,
    ...over,
  }
}

describe('totals', () => {
  it('separa gastos de ingresos y calcula el balance', () => {
    const t = totals([
      tx({ amount: 1000 }),
      tx({ amount: 500 }),
      tx({ amount: 3000, type: 'ingreso', categoryId: 's' }),
    ])
    expect(t).toEqual({ gastos: 1500, ingresos: 3000, balance: 1500, count: 3 })
  })

  it('devuelve ceros sin movimientos', () => {
    expect(totals([])).toEqual({ gastos: 0, ingresos: 0, balance: 0, count: 0 })
  })
})

describe('filterByPeriod', () => {
  it('incluye los bordes del rango', () => {
    const range = periodRange('2026-08', 1)
    const list = [tx({ date: '2026-07-31' }), tx({ date: '2026-08-01' }), tx({ date: '2026-08-31' }), tx({ date: '2026-09-01' })]
    expect(filterByPeriod(list, range).map((t) => t.date)).toEqual(['2026-08-01', '2026-08-31'])
  })
})

describe('byCategory', () => {
  it('agrupa, ordena de mayor a menor y reparte la participación', () => {
    const result = byCategory(
      [tx({ amount: 1000 }), tx({ amount: 500 }), tx({ amount: 2500, categoryId: 'b' })],
      cats,
    )
    expect(result.map((r) => [r.category.id, r.total, r.count])).toEqual([
      ['b', 2500, 1],
      ['a', 1500, 2],
    ])
    expect(result[0].share).toBeCloseTo(2500 / 4000)
  })

  it('no mezcla ingresos con gastos', () => {
    const result = byCategory([tx({ amount: 999 }), tx({ type: 'ingreso', categoryId: 's', amount: 5 })], cats)
    expect(result).toHaveLength(1)
    expect(result[0].category.id).toBe('a')
  })

  it('sobrevive a una categoría borrada', () => {
    const result = byCategory([tx({ categoryId: 'fantasma' })], cats)
    expect(result[0].category.name).toBe('Sin categoría')
  })
})

describe('periodSeries', () => {
  it('devuelve la cantidad pedida terminando en el período dado', () => {
    const series = periodSeries([tx({ date: '2026-08-10', amount: 700 })], '2026-08', 3, 1)
    expect(series.map((p) => p.key)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(series[2].gastos).toBe(700)
    expect(series[0].gastos).toBe(0)
  })
})

describe('projectedSpend', () => {
  it('extrapola el ritmo al total del período', () => {
    expect(projectedSpend(3000, 10, 30)).toBe(9000)
  })

  it('no proyecta si el período no empezó o ya cerró', () => {
    expect(projectedSpend(3000, 0, 30)).toBeNull()
    expect(projectedSpend(3000, 30, 30)).toBeNull()
  })
})
