import { useMemo, useState } from 'react'
import type { Category, PaymentMethod, TxType } from '../types'
import { PAYMENT_METHODS } from '../types'
import { parseAmount } from '../lib/format'
import { todayISO } from '../lib/date'
import type { TransactionDraft } from '../lib/draft'
import { categoryColor } from '../hooks/useTheme'
import { Sheet } from './Sheet'
import { IconTrash } from './Icons'

interface Props {
  draft: TransactionDraft
  categories: Category[]
  currencySymbol: string
  isDark: boolean
  onSave: (draft: TransactionDraft, amount: number) => void
  onDelete?: () => void
  onClose: () => void
}

export function TransactionSheet({
  draft: initial,
  categories,
  currencySymbol,
  isDark,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<TransactionDraft>(initial)
  const isEdit = Boolean(initial.id)

  const visible = useMemo(
    () => categories.filter((c) => c.type === draft.type && (!c.archived || c.id === draft.categoryId)),
    [categories, draft.type, draft.categoryId],
  )

  const amount = parseAmount(draft.amount)
  const valid = Number.isFinite(amount) && amount > 0 && Boolean(draft.categoryId)

  function setType(type: TxType) {
    const stillValid = categories.some((c) => c.id === draft.categoryId && c.type === type)
    const fallback = categories.find((c) => c.type === type && !c.archived)
    setDraft((d) => ({ ...d, type, categoryId: stillValid ? d.categoryId : (fallback?.id ?? '') }))
  }

  return (
    <Sheet title={isEdit ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={onClose}>
      <div className="segmented" role="group" aria-label="Tipo de movimiento">
        <button
          className="segmented__opt"
          aria-pressed={draft.type === 'gasto'}
          onClick={() => setType('gasto')}
        >
          Gasto
        </button>
        <button
          className="segmented__opt"
          aria-pressed={draft.type === 'ingreso'}
          onClick={() => setType('ingreso')}
        >
          Ingreso
        </button>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="tx-amount">
          Monto
        </label>
        <div className="amount-input">
          <span className="amount-input__prefix" aria-hidden>
            {currencySymbol}
          </span>
          <input
            id="tx-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={draft.amount}
            onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          />
        </div>
      </div>

      <div className="field">
        <span className="field__label">Categoría</span>
        <div className="chips" role="group" aria-label="Categoría">
          {visible.map((c) => (
            <button
              key={c.id}
              className="chip"
              aria-pressed={draft.categoryId === c.id}
              onClick={() => setDraft((d) => ({ ...d, categoryId: c.id }))}
            >
              <span className="dot" style={{ background: categoryColor(c.colorSlot, isDark) }} aria-hidden />
              <span aria-hidden>{c.emoji}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="tx-note">
          Detalle <span style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <input
          id="tx-note"
          className="input"
          placeholder="Ej: feria de la esquina"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="field">
          <label className="field__label" htmlFor="tx-date">
            Fecha
          </label>
          <input
            id="tx-date"
            className="input"
            type="date"
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value || todayISO() }))}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="tx-method">
            Pago
          </label>
          <select
            id="tx-method"
            className="select"
            value={draft.method}
            onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value as PaymentMethod }))}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="btn-row">
        {isEdit && onDelete && (
          <button className="btn btn--danger" onClick={onDelete}>
            <IconTrash />
            Eliminar
          </button>
        )}
        <button
          className="btn btn--primary btn--block"
          disabled={!valid}
          onClick={() => valid && onSave(draft, amount)}
        >
          {isEdit ? 'Guardar cambios' : 'Agregar'}
        </button>
      </div>
    </Sheet>
  )
}
