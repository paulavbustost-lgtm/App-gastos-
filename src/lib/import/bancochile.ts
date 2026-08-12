import type { CandidateKind, ImportCandidate, ParseResult, PositionedRow, StatementMeta } from './types'
import { rowText, sliceRow } from './pdf'
import {
  cleanMerchant,
  extractAmounts,
  normalizeKey,
  parseStatementDate,
  stripTrailingNoise,
  titleCase,
} from './text'

/**
 * Columnas del estado de cuenta de tarjeta de crédito de Banco de Chile,
 * en unidades de PDF. Los límites son holgados a propósito: el ancho de cada
 * celda varía con el largo del texto, pero los inicios de columna son estables.
 */
const COL = {
  placeEnd: 90,
  dateStart: 90,
  dateEnd: 140,
  descStart: 140,
  descEnd: 370,
  amountStart: 370,
}

const CARGO_RE = /COMISION|IMPUESTO|INTERES|MANTENCION|SEGURO DE DESGRAVAMEN|DECRETO LEY/i
const PAGO_RE = /\bPAGO\b|ABONO|TEF\b/i

/** Filas de subtotal que nunca son movimientos, aunque traigan monto. */
const TOTAL_RE = /^(SUB)?TOTAL\b|^\d+\.\s*TOTAL/i

export function parseBancoChileStatement(rows: PositionedRow[]): ParseResult {
  const meta = readMeta(rows)
  const candidates: ImportCandidate[] = []
  let skipped = 0

  rows.forEach((row, index) => {
    const dateCell = sliceRow(row, COL.dateStart, COL.dateEnd)
    const operationDate = parseStatementDate(dateCell)
    if (!operationDate) return

    const amountCell = sliceRow(row, COL.amountStart, Number.POSITIVE_INFINITY)
    if (!amountCell) return

    // Las cuotas ("05/06") comparten forma con las fechas; se sacan las fechas
    // primero para no confundirlas.
    const withoutDates = amountCell.replace(/\b\d{2}\/\d{2}\/\d{2,4}\b/g, ' ')
    const installmentMatch = withoutDates.match(/\b(\d{2})\/(\d{2})\b/)
    const installment = installmentMatch
      ? { n: Number(installmentMatch[1]), of: Number(installmentMatch[2]) }
      : null

    const amounts = extractAmounts(withoutDates.replace(/\b\d{2}\/\d{2}\b/, ' '))
    if (amounts.length === 0) return

    const place = sliceRow(row, 0, COL.placeEnd)
    // En la sección de cuotas esta columna termina en "TASA INT. 0,00%"; en el
    // resto, repite el lugar de la operación. Ninguno es parte del comercio.
    const rawDescription = stripTrailingPlace(
      stripTrailingNoise(sliceRow(row, COL.descStart, COL.descEnd)),
      place,
    )
    if (!rawDescription || TOTAL_RE.test(rawDescription)) return

    const operationAmount = amounts[0]
    const monthlyCharge = amounts[amounts.length - 1]

    const kind = classify(rawDescription, operationAmount, installment)
    if (kind === null) {
      skipped++
      return
    }

    // En una compra en cuotas, lo que salió del bolsillo este mes es la cuota,
    // y corresponde a la fecha del estado de cuenta, no a la de la compra.
    const isInstallment = kind === 'cuota'
    const amount = Math.abs(isInstallment ? monthlyCharge : operationAmount)
    if (amount === 0) {
      skipped++
      return
    }
    const date = isInstallment ? (meta.statementDate ?? operationDate) : operationDate

    const merchant = titleCase(cleanMerchant(rawDescription))
    candidates.push({
      key: `${row.page}-${index}-${operationDate}-${amount}`,
      kind,
      type: kind === 'pago' ? 'ingreso' : 'gasto',
      date,
      operationDate,
      description: isInstallment && installment ? `${merchant} (cuota ${installment.n}/${installment.of})` : merchant,
      rawDescription,
      place: titleCase(place),
      amount,
      operationAmount: Math.abs(operationAmount),
      installment,
      categoryId: '',
      duplicate: false,
      // Los pagos a la tarjeta se muestran, pero no se importan por omisión:
      // no son un gasto nuevo, ya se contó la compra original.
      selected: kind !== 'pago',
      method: 'credito',
    })
  })

  return { meta, candidates, skipped }
}

function classify(
  description: string,
  operationAmount: number,
  installment: { n: number; of: number } | null,
): CandidateKind | null {
  if (CARGO_RE.test(description)) return 'cargo'
  if (operationAmount < 0 || PAGO_RE.test(description)) return 'pago'
  if (installment && installment.of > 1) return 'cuota'
  return 'compra'
}

/**
 * La columna de descripción termina repitiendo el lugar de la operación
 * ("… DL RAPPI CHILE RA  LAS CONDES"). Se saca para no ensuciar el comercio.
 */
function stripTrailingPlace(description: string, place: string): string {
  const p = normalizeKey(place)
  if (!p) return description.trim()
  const d = normalizeKey(description)
  if (d.endsWith(p) && d.length > p.length) {
    return description.slice(0, description.length - place.length).trim()
  }
  return description.trim()
}

function readMeta(rows: PositionedRow[]): StatementMeta {
  const meta: StatementMeta = { statementDate: null, periodFrom: null, periodTo: null, cardTail: null }

  for (const row of rows) {
    const text = rowText(row)

    if (!meta.statementDate && /FECHA ESTADO DE CUENTA/i.test(text)) {
      meta.statementDate = parseStatementDate(text.replace(/FECHA ESTADO DE CUENTA/i, ''))
    }

    if (!meta.periodFrom && /PER[ÍI]ODO FACTURADO/i.test(text)) {
      const dates = text.match(/\b\d{2}\/\d{2}\/\d{2,4}\b/g) ?? []
      meta.periodFrom = dates[0] ? parseStatementDate(dates[0]) : null
      meta.periodTo = dates[1] ? parseStatementDate(dates[1]) : null
    }

    if (!meta.cardTail && /N.\s*DE TARJETA DE CR[ÉE]DITO/i.test(text)) {
      const tail = text.match(/(\d{4})\s*$/)
      meta.cardTail = tail ? tail[1] : null
    }
  }

  return meta
}
