import { describe, expect, it } from 'vitest'
import { parseBancoChileStatement } from './bancochile'
import type { PositionedRow } from './types'

/**
 * Construye una fila con las columnas del estado de cuenta de Banco de Chile.
 * Los datos son inventados; solo se reproducen las posiciones de columna.
 */
function movementRow(opts: {
  place?: string
  date: string
  description: string
  /** Tercera columna de la sección de cuotas. */
  trailing?: string
  operationAmount: string
  totalAmount?: string
  installment?: string
  monthlyCharge?: string
  y?: number
}): PositionedRow {
  const items = []
  if (opts.place) items.push({ x: 45, y: 0, text: opts.place })
  items.push({ x: 105, y: 0, text: opts.date })
  items.push({ x: 143, y: 0, text: opts.description })
  if (opts.trailing) items.push({ x: 285, y: 0, text: opts.trailing })
  items.push({ x: 379, y: 0, text: '$' })
  items.push({ x: 414, y: 0, text: `${opts.operationAmount} $` })
  items.push({ x: 477, y: 0, text: opts.totalAmount ?? opts.operationAmount })
  items.push({ x: 508, y: 0, text: opts.installment ?? '01/01' })
  items.push({ x: 535, y: 0, text: '$' })
  items.push({ x: 570, y: 0, text: opts.monthlyCharge ?? opts.operationAmount })
  return { y: opts.y ?? 0, page: 1, items }
}

function textRow(text: string, x = 48): PositionedRow {
  return { y: 0, page: 1, items: [{ x, y: 0, text }] }
}

const META_ROWS: PositionedRow[] = [
  { y: 0, page: 1, items: [{ x: 48, y: 0, text: 'FECHA ESTADO DE CUENTA' }, { x: 176, y: 0, text: '21/01/2026' }] },
  { y: 0, page: 1, items: [{ x: 48, y: 0, text: 'N° DE TARJETA DE CRÉDITO' }, { x: 176, y: 0, text: 'XXXX XXXX XXXX 4416' }] },
  {
    y: 0,
    page: 1,
    items: [
      { x: 418, y: 0, text: 'PERÍODO FACTURADO' },
      { x: 515, y: 0, text: '23/12/2025' },
      { x: 557, y: 0, text: '21/01/2026' },
    ],
  },
]

describe('parseBancoChileStatement', () => {
  it('lee los datos de cabecera del estado de cuenta', () => {
    const res = parseBancoChileStatement(META_ROWS)
    expect(res.meta).toEqual({
      statementDate: '2026-01-21',
      periodFrom: '2025-12-23',
      periodTo: '2026-01-21',
      cardTail: '4416',
    })
  })

  it('lee una compra en una cuota', () => {
    const res = parseBancoChileStatement([
      movementRow({ place: 'SANTIAGO', date: '27/12/25', description: '291210437961 JUMBO ONECLICK', trailing: 'SANTIAGO', operationAmount: '254.576' }),
    ])
    expect(res.candidates).toHaveLength(1)
    const c = res.candidates[0]
    expect(c.kind).toBe('compra')
    expect(c.date).toBe('2025-12-27')
    expect(c.amount).toBe(254576)
    expect(c.description).toBe('Jumbo Oneclick')
    expect(c.selected).toBe(true)
  })

  it('saca el lugar repetido al final de la descripción', () => {
    const res = parseBancoChileStatement([
      movementRow({ place: 'LAS CONDES', date: '29/12/25', description: '301206800824 UBER', trailing: 'LAS CONDES', operationAmount: '3.990' }),
    ])
    expect(res.candidates[0].description).toBe('Uber')
  })

  it('en una compra en cuotas usa la cuota del mes y la fecha del estado de cuenta', () => {
    const res = parseBancoChileStatement([
      ...META_ROWS,
      movementRow({
        place: 'SANTIAGO',
        date: '22/06/25',
        description: '090100087690 TIENDA EJEMPLO',
        trailing: 'TASA INT. 2,15%',
        operationAmount: '303.100',
        totalAmount: '336.846',
        installment: '06/06',
        monthlyCharge: '56.141',
      }),
    ])
    const c = res.candidates[0]
    expect(c.kind).toBe('cuota')
    // El cargo del mes, no el total de la compra.
    expect(c.amount).toBe(56141)
    expect(c.operationAmount).toBe(303100)
    // Cae en el período que se está facturando, no en el de la compra original.
    expect(c.date).toBe('2026-01-21')
    expect(c.operationDate).toBe('2025-06-22')
    expect(c.description).toBe('Tienda Ejemplo (cuota 6/6)')
  })

  it('marca los pagos a la tarjeta y no los preselecciona', () => {
    const res = parseBancoChileStatement([
      movementRow({ date: '25/12/25', description: '261200000000 Pago Pesos TEF', operationAmount: '-2.500.000' }),
    ])
    const c = res.candidates[0]
    expect(c.kind).toBe('pago')
    expect(c.type).toBe('ingreso')
    expect(c.amount).toBe(2500000)
    expect(c.selected).toBe(false)
  })

  it('reconoce comisiones e impuestos como cargos del banco', () => {
    const res = parseBancoChileStatement([
      movementRow({ date: '21/01/26', description: '210100000000 COMISION MENSUAL POR MANTENCION', operationAmount: '2.781' }),
      movementRow({ date: '08/01/26', description: '090111108417 IMPUESTO DECRETO LEY 3475 TASA 0,396%', operationAmount: '634' }),
    ])
    expect(res.candidates.map((c) => c.kind)).toEqual(['cargo', 'cargo'])
    expect(res.candidates[1].amount).toBe(634)
  })

  it('ignora encabezados, subtotales y filas sin fecha', () => {
    const res = parseBancoChileStatement([
      textRow('2. PERÍODO ACTUAL'),
      { y: 0, page: 1, items: [{ x: 279, y: 0, text: 'TOTAL PAGOS A LA CUENTA' }, { x: 535, y: 0, text: '$' }, { x: 558, y: 0, text: '-2.500.000' }] },
      { y: 0, page: 1, items: [{ x: 45, y: 0, text: 'LUGAR DE' }, { x: 97, y: 0, text: 'FECHA' }, { x: 379, y: 0, text: 'MONTO' }] },
    ])
    expect(res.candidates).toHaveLength(0)
  })

  it('no confunde la fecha del período con un movimiento', () => {
    // Las fechas del encabezado viven fuera de la columna de fecha.
    const res = parseBancoChileStatement(META_ROWS)
    expect(res.candidates).toHaveLength(0)
  })

  it('descarta movimientos de monto cero', () => {
    const res = parseBancoChileStatement([
      movementRow({ date: '10/01/26', description: '111100000000 ALGO', operationAmount: '0' }),
    ])
    expect(res.candidates).toHaveLength(0)
    expect(res.skipped).toBe(1)
  })
})
