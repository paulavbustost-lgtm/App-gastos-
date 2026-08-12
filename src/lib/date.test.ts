import { describe, expect, it } from 'vitest'
import {
  fromISODate,
  periodKeyForDate,
  periodLabel,
  periodProgress,
  periodRange,
  shiftPeriod,
  toISODate,
} from './date'

describe('toISODate / fromISODate', () => {
  it('usa la fecha local, no UTC', () => {
    // 23:30 local del 31 de diciembre no debe caer en el año siguiente.
    const d = new Date(2025, 11, 31, 23, 30)
    expect(toISODate(d)).toBe('2025-12-31')
  })

  it('hace ida y vuelta sin corrimiento', () => {
    expect(toISODate(fromISODate('2026-03-08'))).toBe('2026-03-08')
  })
})

describe('periodRange', () => {
  it('con corte 1 es el mes calendario', () => {
    expect(periodRange('2026-02', 1)).toEqual({ key: '2026-02', start: '2026-02-01', end: '2026-02-28' })
  })

  it('respeta los años bisiestos', () => {
    expect(periodRange('2028-02', 1).end).toBe('2028-02-29')
  })

  it('con día de corte arranca ese día y cierra la víspera del siguiente', () => {
    expect(periodRange('2026-08', 25)).toEqual({ key: '2026-08', start: '2026-08-25', end: '2026-09-24' })
  })
})

describe('periodKeyForDate', () => {
  it('con corte 1 devuelve el mes de la fecha', () => {
    expect(periodKeyForDate('2026-08-03', 1)).toBe('2026-08')
  })

  it('antes del corte pertenece al período anterior', () => {
    expect(periodKeyForDate('2026-09-24', 25)).toBe('2026-08')
    expect(periodKeyForDate('2026-09-25', 25)).toBe('2026-09')
  })

  it('cruza el cambio de año hacia atrás', () => {
    expect(periodKeyForDate('2026-01-10', 25)).toBe('2025-12')
  })
})

describe('shiftPeriod', () => {
  it('avanza y retrocede cruzando el año', () => {
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01')
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
    expect(shiftPeriod('2026-06', -6)).toBe('2025-12')
  })
})

describe('periodProgress', () => {
  it('cuenta los días del período ya cerrado como completos', () => {
    // Un período muy antiguo siempre está terminado.
    const r = periodRange('2000-01', 1)
    expect(periodProgress(r)).toEqual({ elapsed: 31, total: 31 })
  })

  it('no cuenta días en un período futuro', () => {
    const r = periodRange('2999-01', 1)
    expect(periodProgress(r).elapsed).toBe(0)
  })
})

describe('periodLabel', () => {
  it('muestra el mes cuando el corte es el día 1', () => {
    expect(periodLabel('2026-08', 1)).toBe('agosto 2026')
  })

  it('muestra el rango cuando hay día de corte', () => {
    expect(periodLabel('2026-08', 25)).toBe('25 ago – 24 sep')
  })
})
