import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../types'
import { markDuplicates, signature } from './dedupe'
import type { ImportCandidate } from './types'

function candidate(over: Partial<ImportCandidate>): ImportCandidate {
  return {
    key: Math.random().toString(36),
    kind: 'compra',
    type: 'gasto',
    date: '2026-01-10',
    operationDate: '2026-01-10',
    description: 'Jumbo Oneclick',
    rawDescription: 'JUMBO ONECLICK',
    place: 'Santiago',
    amount: 25000,
    operationAmount: 25000,
    installment: null,
    categoryId: 'supermercado',
    duplicate: false,
    selected: true,
    method: 'credito',
    ...over,
  }
}

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'gasto',
    amount: 25000,
    categoryId: 'supermercado',
    date: '2026-01-10',
    note: 'Jumbo Oneclick',
    method: 'credito',
    createdAt: 0,
    ...over,
  }
}

describe('signature', () => {
  it('ignora diferencias de tildes y mayúsculas', () => {
    expect(signature('2026-01-10', 1000, 'Café Central')).toBe(signature('2026-01-10', 1000, 'CAFE CENTRAL'))
  })

  it('distingue montos y fechas distintas', () => {
    expect(signature('2026-01-10', 1000, 'X')).not.toBe(signature('2026-01-11', 1000, 'X'))
    expect(signature('2026-01-10', 1000, 'X')).not.toBe(signature('2026-01-10', 2000, 'X'))
  })
})

describe('markDuplicates', () => {
  it('marca y desmarca lo que ya está registrado', () => {
    const result = markDuplicates([candidate({})], [tx({})])
    expect(result[0].duplicate).toBe(true)
    expect(result[0].selected).toBe(false)
  })

  it('deja pasar lo que no existe todavía', () => {
    const result = markDuplicates([candidate({})], [tx({ amount: 999 })])
    expect(result[0].duplicate).toBe(false)
    expect(result[0].selected).toBe(true)
  })

  it('detecta repetidos dentro del mismo archivo', () => {
    const result = markDuplicates([candidate({}), candidate({})], [])
    expect(result.map((c) => c.duplicate)).toEqual([false, true])
  })

  it('no confunde dos compras iguales en días distintos', () => {
    const result = markDuplicates([candidate({}), candidate({ date: '2026-01-11' })], [])
    expect(result.map((c) => c.duplicate)).toEqual([false, false])
  })
})
