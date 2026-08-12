import { useMemo, useState } from 'react'
import type { Category, Settings, Transaction, TxType } from '../types'
import { formatMoney } from '../lib/format'
import { totals } from '../lib/stats'
import { TransactionList } from '../components/TransactionList'
import { IconSearch } from '../components/Icons'

interface Props {
  periodTx: Transaction[]
  allTx: Transaction[]
  categories: Category[]
  settings: Settings
  isDark: boolean
  onSelectTx: (tx: Transaction) => void
}

type TypeFilter = 'todos' | TxType

export function MovimientosView({ periodTx, allTx, categories, settings, isDark, onSelectTx }: Props) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [categoryId, setCategoryId] = useState<string>('')
  const [allHistory, setAllHistory] = useState(false)

  const catName = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name.toLowerCase()])),
    [categories],
  )

  const source = allHistory ? allTx : periodTx

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return source.filter((t) => {
      if (typeFilter !== 'todos' && t.type !== typeFilter) return false
      if (categoryId && t.categoryId !== categoryId) return false
      if (!q) return true
      return (
        t.note.toLowerCase().includes(q) ||
        (catName.get(t.categoryId) ?? '').includes(q) ||
        String(t.amount).includes(q)
      )
    })
  }, [source, query, typeFilter, categoryId, catName])

  const t = totals(filtered)
  const usedCategories = useMemo(() => {
    const ids = new Set(source.map((x) => x.categoryId))
    return categories.filter((c) => ids.has(c.id))
  }, [source, categories])

  return (
    <>
      <div className="search">
        <IconSearch />
        <input
          className="input"
          type="search"
          placeholder="Buscar por detalle, categoría o monto"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar movimientos"
        />
      </div>

      <div className="filter-bar" role="group" aria-label="Filtros">
        <button className="chip" aria-pressed={allHistory} onClick={() => setAllHistory((v) => !v)}>
          Todo el historial
        </button>
        <button
          className="chip"
          aria-pressed={typeFilter === 'gasto'}
          onClick={() => setTypeFilter((v) => (v === 'gasto' ? 'todos' : 'gasto'))}
        >
          Solo gastos
        </button>
        <button
          className="chip"
          aria-pressed={typeFilter === 'ingreso'}
          onClick={() => setTypeFilter((v) => (v === 'ingreso' ? 'todos' : 'ingreso'))}
        >
          Solo ingresos
        </button>
        {usedCategories.map((c) => (
          <button
            key={c.id}
            className="chip"
            aria-pressed={categoryId === c.id}
            onClick={() => setCategoryId((v) => (v === c.id ? '' : c.id))}
          >
            <span aria-hidden>{c.emoji}</span>
            {c.name}
          </button>
        ))}
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__label">Gastos</span>
          <span className="stat__value">{formatMoney(t.gastos, settings.locale, settings.currency)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Ingresos</span>
          <span className="stat__value">{formatMoney(t.ingresos, settings.locale, settings.currency)}</span>
        </div>
      </div>

      <TransactionList
        transactions={filtered}
        categories={categories}
        locale={settings.locale}
        currency={settings.currency}
        isDark={isDark}
        onSelect={onSelectTx}
      />
    </>
  )
}
