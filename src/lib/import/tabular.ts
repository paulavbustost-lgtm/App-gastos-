import type { ImportCandidate } from './types'
import type { SheetRows } from './sheet'
import { cleanMerchant, normalizeKey, parseChileanMoney, parseStatementDate, titleCase } from './text'

/** Qué columna cumple cada rol. `-1` = no hay. */
export interface ColumnMapping {
  /** Primera fila con datos (todo lo de arriba es encabezado o metadatos). */
  firstDataRow: number
  date: number
  description: number
  amount: number
  /** Columna aparte de abonos, cuando la planilla separa cargos de abonos. */
  credit: number
}

export interface TabularOptions {
  /** Qué significa un monto negativo en la columna de montos. */
  negativeMeans: 'ingreso' | 'gasto'
}

const HEADER_ALIASES: Record<Exclude<keyof ColumnMapping, 'firstDataRow'>, string[]> = {
  date: ['FECHA', 'FECHA OPERACION', 'FECHA TRANSACCION', 'FECHA CONTABLE', 'FECHA MOVIMIENTO', 'DIA'],
  description: [
    'DESCRIPCION',
    'DESCRIPCION OPERACION',
    'DETALLE',
    'GLOSA',
    'COMERCIO',
    'MOVIMIENTO',
    'TRANSACCION',
    'CONCEPTO',
    'LUGAR',
  ],
  amount: ['MONTO', 'MONTO OPERACION', 'CARGO', 'CARGOS', 'VALOR', 'DEBE', 'MONTO TOTAL', 'TOTAL', 'CARGOS DEL MES'],
  credit: ['ABONO', 'ABONOS', 'HABER', 'DEPOSITO', 'DEPOSITOS'],
}

/**
 * Adivina la estructura de la planilla. Primero busca encabezados conocidos;
 * si no los encuentra, se guía por el contenido: la columna con más fechas es
 * la fecha, la que tiene más montos es el monto, y la de texto más largo es la
 * descripción.
 */
export function detectMapping(rows: SheetRows): ColumnMapping {
  const firstDataRow = findFirstDataRow(rows)
  const headerRow = findHeaderRow(rows, firstDataRow)

  const mapping: ColumnMapping = { firstDataRow, date: -1, description: -1, amount: -1, credit: -1 }

  if (headerRow >= 0) {
    const headers = rows[headerRow].map(normalizeKey)
    for (const role of ['date', 'description', 'amount', 'credit'] as const) {
      mapping[role] = matchHeader(headers, HEADER_ALIASES[role])
    }
  }

  const data = rows.slice(firstDataRow)
  const width = Math.max(0, ...data.map((r) => r.length))

  if (mapping.date < 0) mapping.date = bestColumn(data, width, (v) => parseStatementDate(v) !== null)
  if (mapping.amount < 0) {
    mapping.amount = bestColumn(
      data,
      width,
      (v) => v !== '' && Number.isFinite(parseChileanMoney(v)),
      new Set([mapping.date]),
    )
  }
  if (mapping.description < 0) mapping.description = longestTextColumn(data, width, new Set([mapping.date, mapping.amount]))

  return mapping
}

/** La primera fila que trae fecha y monto a la vez ya es un movimiento. */
function findFirstDataRow(rows: SheetRows): number {
  for (let i = 0; i < rows.length; i++) {
    const hasDate = rows[i].some((c) => parseStatementDate(c) !== null)
    const hasAmount = rows[i].some((c) => c !== '' && Number.isFinite(parseChileanMoney(c)) && /\d/.test(c))
    if (hasDate && hasAmount) return i
  }
  return 0
}

/** Los encabezados están en la última fila sin fechas antes de los datos. */
function findHeaderRow(rows: SheetRows, firstDataRow: number): number {
  for (let i = firstDataRow - 1; i >= 0; i--) {
    const filled = rows[i].filter((c) => c !== '').length
    if (filled >= 2 && !rows[i].some((c) => parseStatementDate(c) !== null)) return i
  }
  return -1
}

function matchHeader(headers: string[], aliases: string[]): number {
  // Primero coincidencia exacta; después que el encabezado contenga el alias.
  for (const alias of aliases) {
    const exact = headers.indexOf(alias)
    if (exact >= 0) return exact
  }
  for (const alias of aliases) {
    const partial = headers.findIndex((h) => h.includes(alias))
    if (partial >= 0) return partial
  }
  return -1
}

function bestColumn(
  data: SheetRows,
  width: number,
  predicate: (value: string) => boolean,
  exclude = new Set<number>(),
): number {
  let best = -1
  let bestScore = 0
  for (let col = 0; col < width; col++) {
    if (exclude.has(col)) continue
    const score = data.reduce((n, row) => n + (predicate(row[col] ?? '') ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = col
    }
  }
  return bestScore > 0 ? best : -1
}

function longestTextColumn(data: SheetRows, width: number, exclude: Set<number>): number {
  let best = -1
  let bestScore = 0
  for (let col = 0; col < width; col++) {
    if (exclude.has(col)) continue
    const score = data.reduce((total, row) => {
      const value = row[col] ?? ''
      // Solo cuenta texto de verdad, no números formateados.
      return total + (/[a-zá-úñ]/i.test(value) ? value.length : 0)
    }, 0)
    if (score > bestScore) {
      bestScore = score
      best = col
    }
  }
  return best
}

export function isMappingUsable(mapping: ColumnMapping): boolean {
  return mapping.date >= 0 && mapping.amount >= 0
}

/**
 * Nombre de cada columna para el selector: el encabezado del archivo si lo hay,
 * y si no una letra, como en la planilla.
 */
export function columnLabels(rows: SheetRows, mapping: ColumnMapping): string[] {
  const width = Math.max(0, ...rows.map((r) => r.length))
  const headerRow = findHeaderRow(rows, mapping.firstDataRow)
  const headers = headerRow >= 0 ? rows[headerRow] : []

  return Array.from({ length: width }, (_, i) => {
    const header = (headers[i] ?? '').trim()
    return header || `Columna ${letterFor(i)}`
  })
}

function letterFor(index: number): string {
  let n = index
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/** Convierte las filas en movimientos según el mapeo elegido. */
export function buildCandidates(
  rows: SheetRows,
  mapping: ColumnMapping,
  options: TabularOptions,
): ImportCandidate[] {
  const candidates: ImportCandidate[] = []

  for (let i = mapping.firstDataRow; i < rows.length; i++) {
    const row = rows[i]
    const date = parseStatementDate(row[mapping.date] ?? '')
    if (!date) continue

    const rawAmount = row[mapping.amount] ?? ''
    const charge = parseChileanMoney(rawAmount)
    const creditRaw = mapping.credit >= 0 ? (row[mapping.credit] ?? '') : ''
    const credit = creditRaw ? parseChileanMoney(creditRaw) : NaN

    // Con columnas separadas de cargo y abono, el signo lo da la columna.
    let amount: number
    let type: 'gasto' | 'ingreso'
    if (Number.isFinite(credit) && Math.abs(credit) > 0) {
      amount = Math.abs(credit)
      type = 'ingreso'
    } else if (Number.isFinite(charge) && Math.abs(charge) > 0) {
      amount = Math.abs(charge)
      const negative = charge < 0
      type = negative === (options.negativeMeans === 'ingreso') ? 'ingreso' : 'gasto'
    } else {
      continue
    }

    const rawDescription = (mapping.description >= 0 ? (row[mapping.description] ?? '') : '').trim()
    const merchant = titleCase(cleanMerchant(rawDescription)) || 'Movimiento'

    candidates.push({
      key: `fila-${i}-${date}-${amount}`,
      kind: type === 'ingreso' ? 'pago' : 'compra',
      type,
      date,
      operationDate: date,
      description: merchant,
      rawDescription,
      place: '',
      amount,
      operationAmount: amount,
      installment: null,
      categoryId: '',
      duplicate: false,
      // Los abonos llegan desmarcados: en una cartola de tarjeta son el pago de
      // la deuda, no un ingreso nuevo. Si es una cuenta corriente y sí lo son,
      // se marcan a mano.
      selected: type === 'gasto',
      method: 'credito',
    })
  }

  return candidates
}
