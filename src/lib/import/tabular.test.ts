import { describe, expect, it } from 'vitest'
import { buildCandidates, columnLabels, detectMapping, isMappingUsable } from './tabular'
import type { SheetRows } from './sheet'

/** Planilla típica de banco: metadatos arriba, encabezados, y luego los datos. */
const CARTOLA: SheetRows = [
  ['Estado de cuenta', '', '', ''],
  ['Tarjeta terminada en 0000', '', '', ''],
  [],
  ['Fecha', 'Descripción', 'Lugar', 'Monto'],
  ['22/12/2025', 'JUMBO ONECLICK', 'SANTIAGO', '254.576'],
  ['23/12/2025', 'MC DONALDS 4 04', 'SANTIAGO', '4.780'],
  ['25/12/2025', 'PAGO PESOS TEF', '', '-2.500.000'],
]

describe('detectMapping', () => {
  it('salta los metadatos y encuentra la primera fila con datos', () => {
    expect(detectMapping(CARTOLA).firstDataRow).toBe(4)
  })

  it('reconoce las columnas por sus encabezados', () => {
    const m = detectMapping(CARTOLA)
    expect(m.date).toBe(0)
    expect(m.description).toBe(1)
    expect(m.amount).toBe(3)
  })

  it('reconoce cargos y abonos en columnas separadas', () => {
    const m = detectMapping([
      ['Fecha', 'Glosa', 'Cargo', 'Abono'],
      ['01/08/2026', 'COMPRA', '10.000', ''],
      ['02/08/2026', 'DEPOSITO', '', '50.000'],
    ])
    expect(m.amount).toBe(2)
    expect(m.credit).toBe(3)
  })

  it('se guía por el contenido cuando no hay encabezados', () => {
    const m = detectMapping([
      ['01/08/2026', 'SUPERMERCADO LIDER', '12.500'],
      ['02/08/2026', 'FARMACIA CRUZ VERDE', '8.900'],
    ])
    expect(m.firstDataRow).toBe(0)
    expect(m.date).toBe(0)
    expect(m.description).toBe(1)
    expect(m.amount).toBe(2)
  })

  it('avisa cuando la planilla no sirve', () => {
    expect(isMappingUsable(detectMapping([['hola', 'chao'], ['sin', 'datos']]))).toBe(false)
  })
})

describe('columnLabels', () => {
  it('usa los encabezados del archivo', () => {
    const m = detectMapping(CARTOLA)
    expect(columnLabels(CARTOLA, m)).toEqual(['Fecha', 'Descripción', 'Lugar', 'Monto'])
  })

  it('usa letras cuando no hay encabezados', () => {
    const rows: SheetRows = [['01/08/2026', 'ALGO', '100']]
    expect(columnLabels(rows, detectMapping(rows))).toEqual(['Columna A', 'Columna B', 'Columna C'])
  })
})

describe('buildCandidates', () => {
  const mapping = detectMapping(CARTOLA)

  it('convierte las filas en movimientos', () => {
    const list = buildCandidates(CARTOLA, mapping, { negativeMeans: 'ingreso' })
    expect(list).toHaveLength(3)
    expect(list[0].date).toBe('2025-12-22')
    expect(list[0].amount).toBe(254576)
    expect(list[0].description).toBe('Jumbo Oneclick')
    expect(list[0].type).toBe('gasto')
  })

  it('trata los negativos como abonos por omisión', () => {
    const list = buildCandidates(CARTOLA, mapping, { negativeMeans: 'ingreso' })
    const pago = list[2]
    expect(pago.type).toBe('ingreso')
    expect(pago.amount).toBe(2500000)
  })

  it('permite invertir el signo cuando el banco usa el criterio contrario', () => {
    const list = buildCandidates(CARTOLA, mapping, { negativeMeans: 'gasto' })
    expect(list[2].type).toBe('gasto')
    expect(list[0].type).toBe('ingreso')
  })

  it('deja los abonos desmarcados y los gastos marcados', () => {
    const list = buildCandidates(CARTOLA, mapping, { negativeMeans: 'ingreso' })
    expect(list.map((c) => c.selected)).toEqual([true, true, false])
  })

  it('usa la columna de abonos cuando existe', () => {
    const rows: SheetRows = [
      ['Fecha', 'Glosa', 'Cargo', 'Abono'],
      ['01/08/2026', 'COMPRA', '10.000', ''],
      ['02/08/2026', 'SUELDO', '', '900.000'],
    ]
    const list = buildCandidates(rows, detectMapping(rows), { negativeMeans: 'ingreso' })
    expect(list.map((c) => [c.type, c.amount])).toEqual([
      ['gasto', 10000],
      ['ingreso', 900000],
    ])
  })

  it('ignora filas sin fecha o sin monto', () => {
    const rows: SheetRows = [
      ['Fecha', 'Glosa', 'Monto'],
      ['01/08/2026', 'COMPRA', '10.000'],
      ['', 'TOTAL', '10.000'],
      ['02/08/2026', 'SIN MONTO', ''],
    ]
    expect(buildCandidates(rows, detectMapping(rows), { negativeMeans: 'ingreso' })).toHaveLength(1)
  })

  it('no deja movimientos sin descripción', () => {
    const rows: SheetRows = [
      ['Fecha', 'Monto'],
      ['01/08/2026', '5.000'],
    ]
    const list = buildCandidates(rows, detectMapping(rows), { negativeMeans: 'ingreso' })
    expect(list[0].description).toBeTruthy()
  })
})
