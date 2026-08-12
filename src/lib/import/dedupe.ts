import type { Transaction } from '../../types'
import type { ImportCandidate } from './types'
import { normalizeKey } from './text'

/**
 * Firma de un movimiento. Dos movimientos con la misma fecha, monto y comercio
 * se consideran el mismo: es lo que ocurre al importar dos veces la misma
 * cartola, o al importar un mes que ya se anotó a mano.
 */
export function signature(date: string, amount: number, description: string): string {
  return `${date}|${Math.round(amount)}|${normalizeKey(description).slice(0, 18)}`
}

export function transactionSignature(t: Transaction): string {
  return signature(t.date, t.amount, t.note)
}

/**
 * Marca los candidatos que ya existen y los deja sin seleccionar.
 * También detecta repetidos dentro del mismo archivo.
 */
export function markDuplicates(
  candidates: ImportCandidate[],
  existing: Transaction[],
): ImportCandidate[] {
  const seen = new Set(existing.map(transactionSignature))

  return candidates.map((c) => {
    const sig = signature(c.date, c.amount, c.description)
    const duplicate = seen.has(sig)
    seen.add(sig)
    return duplicate ? { ...c, duplicate: true, selected: false } : c
  })
}
