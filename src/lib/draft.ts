import type { Category, PaymentMethod, Transaction, TxType } from '../types'
import { todayISO } from './date'

/** Estado editable del formulario: el monto vive como texto hasta guardar. */
export interface TransactionDraft {
  id?: string
  type: TxType
  amount: string
  categoryId: string
  date: string
  note: string
  method: PaymentMethod
}

export function draftFrom(tx: Transaction): TransactionDraft {
  return {
    id: tx.id,
    type: tx.type,
    amount: String(tx.amount),
    categoryId: tx.categoryId,
    date: tx.date,
    note: tx.note,
    method: tx.method,
  }
}

export function emptyDraft(categories: Category[]): TransactionDraft {
  const first = categories.find((c) => c.type === 'gasto' && !c.archived)
  return {
    type: 'gasto',
    amount: '',
    categoryId: first?.id ?? '',
    date: todayISO(),
    note: '',
    method: 'debito',
  }
}
