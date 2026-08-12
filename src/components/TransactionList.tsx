import { useMemo } from 'react'
import type { Category, Transaction } from '../types'
import { PAYMENT_METHODS } from '../types'
import { formatMoney } from '../lib/format'
import { friendlyDate } from '../lib/date'
import { categoryColor } from '../hooks/useTheme'

interface Props {
  transactions: Transaction[]
  categories: Category[]
  locale: string
  currency: string
  isDark: boolean
  onSelect: (tx: Transaction) => void
}

export function TransactionList({ transactions, categories, locale, currency, isDark, onSelect }: Props) {
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of [...transactions].sort((a, b) =>
      a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1,
    )) {
      const list = map.get(t.date) ?? []
      list.push(t)
      map.set(t.date, list)
    }
    return [...map.entries()]
  }, [transactions])

  if (groups.length === 0) {
    return (
      <div className="empty">
        <span className="empty__emoji" aria-hidden>
          🧾
        </span>
        <span className="empty__title">Sin movimientos</span>
        <span className="empty__text">
          Toca el botón + para anotar tu primer gasto. Toma dos segundos y es lo único que hace falta.
        </span>
      </div>
    )
  }

  return (
    <div>
      {groups.map(([date, items]) => {
        // Neto del día en clave de gasto: positivo = salió plata.
        const dayTotal = items.reduce((sum, t) => sum + (t.type === 'gasto' ? t.amount : -t.amount), 0)
        const daySign = dayTotal < 0 ? '+' : dayTotal > 0 ? '−' : ''
        return (
          <section className="day-group" key={date}>
            <header className="day-group__head">
              <span className="day-group__date">{friendlyDate(date)}</span>
              <span className="day-group__total">
                {daySign}
                {formatMoney(Math.abs(dayTotal), locale, currency)}
              </span>
            </header>
            <ul className="tx-list">
              {items.map((t) => {
                const cat = catById.get(t.categoryId)
                const method = PAYMENT_METHODS.find((m) => m.value === t.method)?.label ?? ''
                return (
                  <li key={t.id}>
                    <button className="tx" onClick={() => onSelect(t)}>
                      <span
                        className="tx__icon"
                        style={{
                          background: cat
                            ? `color-mix(in srgb, ${categoryColor(cat.colorSlot, isDark)} 16%, transparent)`
                            : undefined,
                        }}
                        aria-hidden
                      >
                        {cat?.emoji ?? '❔'}
                      </span>
                      <span className="tx__body">
                        <span className="tx__name">{t.note || cat?.name || 'Sin categoría'}</span>
                        <span className="tx__meta">
                          {t.note ? `${cat?.name ?? 'Sin categoría'} · ` : ''}
                          {method}
                        </span>
                      </span>
                      <span className={`tx__amount${t.type === 'ingreso' ? ' tx__amount--ingreso' : ''}`}>
                        {t.type === 'ingreso' ? '+' : '−'}
                        {formatMoney(t.amount, locale, currency)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
