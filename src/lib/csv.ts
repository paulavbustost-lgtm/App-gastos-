import type { Category, Transaction } from '../types'

function escapeCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * CSV con `;` como separador y BOM, que es lo que Excel en español abre
 * sin pedir asistente de importación.
 */
export function toCSV(transactions: Transaction[], categories: Category[]): string {
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const header = ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Método', 'Nota']
  const rows = [...transactions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
    .map((t) => [
      t.date,
      t.type,
      names.get(t.categoryId) ?? t.categoryId,
      String(t.amount),
      t.method,
      t.note,
    ])

  return '﻿' + [header, ...rows].map((r) => r.map((c) => escapeCell(String(c))).join(';')).join('\r\n')
}

export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Se libera después del click para no invalidar la descarga en Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
