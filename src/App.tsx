import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from './types'
import { useStore } from './hooks/useStore'
import { useTheme } from './hooks/useTheme'
import { currencySymbol } from './data/currencies'
import { currentPeriodKey, periodKeyForDate, periodRange, type PeriodKey } from './lib/date'
import { filterByPeriod } from './lib/stats'
import { categoryBudgetStatuses, newlyTriggered } from './lib/alerts'
import { PeriodPicker } from './components/PeriodPicker'
import { draftFrom, emptyDraft, type TransactionDraft } from './lib/draft'
import { TransactionSheet } from './components/TransactionSheet'
import { IconChart, IconHome, IconList, IconPlus, IconSettings } from './components/Icons'
import { ResumenView } from './views/ResumenView'
import { MovimientosView } from './views/MovimientosView'
import { AnalisisView } from './views/AnalisisView'
import { AjustesView } from './views/AjustesView'

type Tab = 'resumen' | 'movimientos' | 'analisis' | 'ajustes'

const TABS: { id: Tab; label: string; Icon: typeof IconHome }[] = [
  { id: 'resumen', label: 'Resumen', Icon: IconHome },
  { id: 'movimientos', label: 'Movimientos', Icon: IconList },
  { id: 'analisis', label: 'Análisis', Icon: IconChart },
  { id: 'ajustes', label: 'Ajustes', Icon: IconSettings },
]

export default function App() {
  const store = useStore()
  const { state } = store
  const { settings, categories, transactions } = state
  const isDark = useTheme(settings.theme)

  const [tab, setTab] = useState<Tab>('resumen')
  const [period, setPeriod] = useState<PeriodKey>(() => currentPeriodKey(settings.cutDay))
  const [draft, setDraft] = useState<TransactionDraft | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [budgetFocus, setBudgetFocus] = useState(false)
  const [categoryBudgetFocus, setCategoryBudgetFocus] = useState(false)

  // Cambiar el día de corte redefine los períodos: hay que reanclar el actual.
  useEffect(() => {
    setPeriod(currentPeriodKey(settings.cutDay))
  }, [settings.cutDay])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  const range = useMemo(() => periodRange(period, settings.cutDay), [period, settings.cutDay])
  const periodTx = useMemo(() => filterByPeriod(transactions, range), [transactions, range])
  const budgetStatuses = useMemo(
    () => categoryBudgetStatuses(periodTx, categories, settings, range),
    [periodTx, categories, settings, range],
  )
  const symbol = useMemo(
    () => currencySymbol(settings.locale, settings.currency),
    [settings.locale, settings.currency],
  )

  function openNew() {
    setDraft(emptyDraft(categories))
  }

  function openEdit(tx: Transaction) {
    setDraft(draftFrom(tx))
  }

  /**
   * Avisa si lo recién anotado hizo que alguna categoría llegara a su tope.
   * Se evalúa contra el período al que pertenece cada movimiento nuevo, no
   * contra el que se está mirando: si anotas un gasto de hoy mientras revisas
   * un mes viejo, el aviso igual corresponde.
   * Devuelve `true` si hubo aviso, para no pisarlo con el mensaje normal.
   */
  function warnIfBudgetTripped(nextTransactions: Transaction[], touchedDates: string[]): boolean {
    const keys = [...new Set(touchedDates.map((d) => periodKeyForDate(d, settings.cutDay)))]
    const fired = keys.flatMap((key) => {
      const r = periodRange(key, settings.cutDay)
      return newlyTriggered(
        categoryBudgetStatuses(transactions, categories, settings, r),
        categoryBudgetStatuses(nextTransactions, categories, settings, r),
      )
    })
    if (fired.length === 0) return false

    if (fired.length === 1) {
      const s = fired[0]
      setToast(
        s.level === 'excedido'
          ? `${s.category.emoji} ${s.category.name}: pasaste el tope`
          : `${s.category.emoji} ${s.category.name}: te queda poco del tope`,
      )
    } else {
      setToast(`${fired.length} categorías llegaron a su tope`)
    }
    return true
  }

  function save(d: TransactionDraft, amount: number) {
    const payload = {
      type: d.type,
      amount,
      categoryId: d.categoryId,
      date: d.date,
      note: d.note.trim(),
      method: d.method,
    }

    let next: Transaction[]
    if (d.id) {
      const id = d.id
      next = transactions.map((t) => (t.id === id ? { ...t, ...payload } : t))
      store.updateTransaction(id, payload)
    } else {
      next = [{ ...payload, id: 'nuevo', createdAt: Date.now() }, ...transactions]
      store.addTransaction(payload)
    }

    if (!warnIfBudgetTripped(next, [payload.date])) {
      setToast(d.id ? 'Movimiento actualizado' : 'Movimiento agregado')
    }
    setDraft(null)
  }

  function remove(id: string) {
    store.removeTransaction(id)
    setDraft(null)
    setToast('Movimiento eliminado')
  }

  const showPeriod = tab !== 'ajustes'

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__row">
          <h1 className="app-title">
            <span aria-hidden>🧮</span> Mis gastos
          </h1>
          {showPeriod && (
            <div style={{ flex: 1, maxWidth: 260 }}>
              <PeriodPicker value={period} cutDay={settings.cutDay} onChange={setPeriod} />
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {tab === 'resumen' && (
          <ResumenView
            periodTx={periodTx}
            categories={categories}
            settings={settings}
            range={range}
            isDark={isDark}
            budgetStatuses={budgetStatuses}
            onSelectTx={openEdit}
            onGoToBudget={() => {
              setBudgetFocus(true)
              setTab('ajustes')
            }}
            onEditCategoryBudgets={() => {
              setCategoryBudgetFocus(true)
              setTab('ajustes')
            }}
            onGoToMovimientos={() => setTab('movimientos')}
          />
        )}

        {tab === 'movimientos' && (
          <MovimientosView
            periodTx={periodTx}
            allTx={transactions}
            categories={categories}
            settings={settings}
            isDark={isDark}
            onSelectTx={openEdit}
          />
        )}

        {tab === 'analisis' && (
          <AnalisisView
            allTx={transactions}
            periodTx={periodTx}
            categories={categories}
            settings={settings}
            periodKeyValue={period}
            range={range}
            isDark={isDark}
            onSelectPeriod={setPeriod}
          />
        )}

        {tab === 'ajustes' && (
          <AjustesView
            state={state}
            isDark={isDark}
            budgetFocus={budgetFocus}
            categoryBudgetFocus={categoryBudgetFocus}
            onBudgetFocusHandled={() => setBudgetFocus(false)}
            onCategoryBudgetFocusHandled={() => setCategoryBudgetFocus(false)}
            onUpdateSettings={store.updateSettings}
            onAddCategory={store.addCategory}
            onUpdateCategory={store.updateCategory}
            onRemoveCategory={store.removeCategory}
            onReplaceState={store.replaceState}
            onClearTransactions={store.clearTransactions}
            onImportTransactions={(rows, learned) => {
              store.addTransactions(rows, learned)
              const next = [
                ...rows.map((r, i) => ({ ...r, id: `import-${i}`, createdAt: Date.now() })),
                ...transactions,
              ]
              if (!warnIfBudgetTripped(next, rows.map((r) => r.date)))
                setToast(`Importados ${rows.length} movimientos`)
            }}
            notify={setToast}
          />
        )}
      </main>

      <button className="fab" onClick={openNew} aria-label="Agregar movimiento">
        <IconPlus />
      </button>

      <nav className="tabbar" aria-label="Secciones">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className="tabbar__item"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      {draft && (
        <TransactionSheet
          draft={draft}
          categories={categories}
          currencySymbol={symbol}
          isDark={isDark}
          onSave={save}
          onDelete={draft.id ? () => remove(draft.id!) : undefined}
          onClose={() => setDraft(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
