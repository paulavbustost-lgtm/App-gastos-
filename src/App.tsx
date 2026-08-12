import { useEffect, useMemo, useState } from 'react'
import type { Transaction } from './types'
import { useStore } from './hooks/useStore'
import { useTheme } from './hooks/useTheme'
import { currencySymbol } from './data/currencies'
import { currentPeriodKey, periodRange, type PeriodKey } from './lib/date'
import { filterByPeriod } from './lib/stats'
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

  function save(d: TransactionDraft, amount: number) {
    const payload = {
      type: d.type,
      amount,
      categoryId: d.categoryId,
      date: d.date,
      note: d.note.trim(),
      method: d.method,
    }
    if (d.id) {
      store.updateTransaction(d.id, payload)
      setToast('Movimiento actualizado')
    } else {
      store.addTransaction(payload)
      setToast('Movimiento agregado')
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
            onSelectTx={openEdit}
            onGoToBudget={() => {
              setBudgetFocus(true)
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
            onBudgetFocusHandled={() => setBudgetFocus(false)}
            onUpdateSettings={store.updateSettings}
            onAddCategory={store.addCategory}
            onUpdateCategory={store.updateCategory}
            onRemoveCategory={store.removeCategory}
            onReplaceState={store.replaceState}
            onClearTransactions={store.clearTransactions}
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
