import type { PaymentMethod, TxType } from '../../types'

/** Un fragmento de texto del PDF con su posición en la página. */
export interface PositionedItem {
  x: number
  y: number
  text: string
}

/** Fila reconstruida: los fragmentos que comparten línea, ordenados por x. */
export interface PositionedRow {
  y: number
  page: number
  items: PositionedItem[]
}

export type CandidateKind =
  | 'compra'
  /** Cuota de una compra anterior: el cargo es de este mes. */
  | 'cuota'
  /** Comisión, impuesto o interés del banco. */
  | 'cargo'
  /** Pago o abono a la tarjeta: no es un gasto nuevo. */
  | 'pago'

/** Un movimiento detectado, antes de que la persona lo confirme. */
export interface ImportCandidate {
  /** Identificador estable dentro de esta importación. */
  key: string
  kind: CandidateKind
  type: TxType
  /** Fecha del gasto en la app (`YYYY-MM-DD`). */
  date: string
  /** Fecha original de la operación, cuando difiere de `date`. */
  operationDate: string
  /** Descripción ya limpiada de códigos y prefijos de procesador. */
  description: string
  /** Texto tal como viene en la cartola, para poder auditarlo. */
  rawDescription: string
  place: string
  amount: number
  /** Monto original de la operación (distinto de `amount` en cuotas). */
  operationAmount: number
  installment: { n: number; of: number } | null
  categoryId: string
  /** `true` si ya existe un movimiento equivalente en la app. */
  duplicate: boolean
  /** Marcado para importar. */
  selected: boolean
  method: PaymentMethod
}

export interface StatementMeta {
  /** Fecha del estado de cuenta (`YYYY-MM-DD`), si se pudo leer. */
  statementDate: string | null
  periodFrom: string | null
  periodTo: string | null
  cardTail: string | null
}

export interface ParseResult {
  meta: StatementMeta
  candidates: ImportCandidate[]
  /** Filas con fecha y monto que no se pudieron interpretar. */
  skipped: number
}
