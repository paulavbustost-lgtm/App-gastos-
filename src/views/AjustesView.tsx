import { useRef, useState } from 'react'
import type { AppState, Category, Settings, ThemePref, Transaction } from '../types'
import { CURRENCY_OPTIONS } from '../data/currencies'
import { formatMoney, parseAmount } from '../lib/format'
import { download, toCSV } from '../lib/csv'
import { normalizeState } from '../lib/storage'
import { todayISO } from '../lib/date'
import { CategoriesSheet } from '../components/CategoriesSheet'
import { ImportSheet } from '../components/ImportSheet'
import { Sheet } from '../components/Sheet'
import { IconDownload, IconUpload } from '../components/Icons'

interface Props {
  state: AppState
  isDark: boolean
  budgetFocus: boolean
  /** Abre directo el editor de topes por categoría (viene de una alerta). */
  categoryBudgetFocus: boolean
  onBudgetFocusHandled: () => void
  onCategoryBudgetFocusHandled: () => void
  onUpdateSettings: (patch: Partial<Settings>) => void
  onAddCategory: (cat: Omit<Category, 'id'>) => void
  onUpdateCategory: (id: string, patch: Partial<Category>) => void
  onRemoveCategory: (id: string) => void
  onReplaceState: (next: AppState) => void
  onClearTransactions: () => void
  onImportTransactions: (
    rows: Omit<Transaction, 'id' | 'createdAt'>[],
    learned: Record<string, string>,
  ) => void
  notify: (message: string) => void
}

export function AjustesView({
  state,
  isDark,
  budgetFocus,
  categoryBudgetFocus,
  onBudgetFocusHandled,
  onCategoryBudgetFocusHandled,
  onUpdateSettings,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onReplaceState,
  onClearTransactions,
  onImportTransactions,
  notify,
}: Props) {
  const { settings, transactions, categories } = state
  const [showCategories, setShowCategories] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showBudgets, setShowBudgets] = useState(categoryBudgetFocus)
  const [budgetInput, setBudgetInput] = useState(settings.monthlyBudget ? String(settings.monthlyBudget) : '')
  const fileRef = useRef<HTMLInputElement>(null)

  function commitBudget() {
    const n = parseAmount(budgetInput)
    onUpdateSettings({ monthlyBudget: Number.isFinite(n) && n > 0 ? n : 0 })
  }

  function exportJSON() {
    download(`gastos-${todayISO()}.json`, JSON.stringify(state, null, 2), 'application/json')
    notify('Respaldo descargado')
  }

  function exportCSV() {
    download(`gastos-${todayISO()}.csv`, toCSV(transactions, categories), 'text/csv')
    notify('CSV descargado')
  }

  async function importJSON(file: File) {
    try {
      const parsed = normalizeState(JSON.parse(await file.text()))
      if (parsed.transactions.length === 0 && !confirm('El archivo no trae movimientos. ¿Importar igual?')) return
      if (
        transactions.length > 0 &&
        !confirm(
          `Vas a reemplazar tus ${transactions.length} movimientos actuales por los ${parsed.transactions.length} del archivo. ¿Seguimos?`,
        )
      )
        return
      onReplaceState(parsed)
      notify(`Importados ${parsed.transactions.length} movimientos`)
    } catch {
      notify('No pude leer ese archivo')
    }
  }

  return (
    <>
      <span className="section-label">Presupuesto</span>
      <div className="rows">
        <div className="row">
          <span>
            <span className="row__label">Tope por período</span>
            <span className="row__hint">Deja vacío para no usar presupuesto</span>
          </span>
          <span className="row__control">
            <input
              className="input"
              inputMode="decimal"
              placeholder="Sin tope"
              autoFocus={budgetFocus}
              value={budgetInput}
              onFocus={onBudgetFocusHandled}
              onChange={(e) => setBudgetInput(e.target.value)}
              onBlur={commitBudget}
              aria-label="Tope de gasto por período"
            />
          </span>
        </div>
        <button className="row" onClick={() => setShowBudgets(true)}>
          <span>
            <span className="row__label">Topes por categoría</span>
            <span className="row__hint">
              {Object.keys(settings.categoryBudgets).length || 'Ninguno'} definidos
            </span>
          </span>
          <span className="row__hint">Editar</span>
        </button>
        <div className="row">
          <span>
            <span className="row__label">Día de corte</span>
            <span className="row__hint">Útil si te pagan a mitad de mes</span>
          </span>
          <span className="row__control">
            <select
              className="select"
              value={settings.cutDay}
              onChange={(e) => onUpdateSettings({ cutDay: Number(e.target.value) })}
              aria-label="Día de corte del período"
            >
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? 'Mes calendario' : `Día ${d}`}
                </option>
              ))}
            </select>
          </span>
        </div>
      </div>

      <span className="section-label">Preferencias</span>
      <div className="rows">
        <div className="row">
          <span className="row__label">Moneda</span>
          <span className="row__control">
            <select
              className="select"
              value={settings.currency}
              onChange={(e) => {
                const opt = CURRENCY_OPTIONS.find((o) => o.currency === e.target.value)
                if (opt) onUpdateSettings({ currency: opt.currency, locale: opt.locale })
              }}
              aria-label="Moneda"
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.currency} value={o.currency}>
                  {o.label}
                </option>
              ))}
            </select>
          </span>
        </div>
        <div className="row">
          <span className="row__label">Tema</span>
          <span className="row__control">
            <select
              className="select"
              value={settings.theme}
              onChange={(e) => onUpdateSettings({ theme: e.target.value as ThemePref })}
              aria-label="Tema"
            >
              <option value="system">Automático</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </span>
        </div>
        <button className="row" onClick={() => setShowCategories(true)}>
          <span>
            <span className="row__label">Categorías</span>
            <span className="row__hint">{categories.filter((c) => !c.archived).length} activas</span>
          </span>
          <span className="row__hint">Editar</span>
        </button>
      </div>

      <span className="section-label">Importar</span>
      <div className="card">
        <div className="card__head">
          <span className="card__title">Cartola de tarjeta de crédito</span>
        </div>
        <p className="card__sub" style={{ marginTop: 0 }}>
          Sube el estado de cuenta en PDF de tu tarjeta de Banco de Chile y la app carga los movimientos
          sola, ya categorizados. El archivo se lee en tu teléfono; no se sube a ningún servidor.
        </p>
        <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={() => setShowImport(true)}>
          <IconUpload />
          Importar cartola
        </button>
      </div>

      <span className="section-label">Tus datos</span>
      <div className="card">
        <p className="card__sub" style={{ marginTop: 0 }}>
          Todo se guarda solo en este dispositivo, en el navegador. No hay cuenta ni servidor: si borras los
          datos del sitio o cambias de teléfono, se van. Descarga un respaldo de vez en cuando.
        </p>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className="btn btn--ghost btn--block" onClick={exportJSON}>
            <IconDownload />
            Respaldo
          </button>
          <button className="btn btn--ghost btn--block" onClick={exportCSV}>
            <IconDownload />
            CSV
          </button>
        </div>
        <button
          className="btn btn--ghost btn--block"
          style={{ marginTop: 10 }}
          onClick={() => fileRef.current?.click()}
        >
          <IconUpload />
          Restaurar respaldo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importJSON(f)
            e.target.value = ''
          }}
        />
        <button
          className="btn btn--danger btn--block"
          style={{ marginTop: 10 }}
          disabled={transactions.length === 0}
          onClick={() => {
            if (confirm(`¿Borrar los ${transactions.length} movimientos? Esto no se puede deshacer.`)) {
              onClearTransactions()
              notify('Movimientos borrados')
            }
          }}
        >
          Borrar todos los movimientos
        </button>
      </div>

      {showImport && (
        <ImportSheet
          categories={categories}
          settings={settings}
          existing={transactions}
          onImport={(rows, learned) => {
            // El aviso lo da App: puede tener que reemplazarlo por una alerta
            // de presupuesto si la importación hizo saltar algún tope.
            onImportTransactions(rows, learned)
            setShowImport(false)
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {showCategories && (
        <CategoriesSheet
          categories={categories}
          isDark={isDark}
          onAdd={onAddCategory}
          onUpdate={onUpdateCategory}
          onRemove={onRemoveCategory}
          onClose={() => setShowCategories(false)}
        />
      )}

      {showBudgets && (
        <Sheet
          title="Topes por categoría"
          onClose={() => {
            setShowBudgets(false)
            onCategoryBudgetFocusHandled()
          }}
        >
          <p className="card__sub">
            Define cuánto quieres gastar como máximo en cada categoría. En el resumen te aviso cuando
            llegues al 80% del tope, y otra vez si te pasas.
          </p>
          <div className="rows">
            {categories
              .filter((c) => c.type === 'gasto' && !c.archived)
              .map((c) => (
                <div className="row" key={c.id}>
                  <span className="row__label">
                    <span aria-hidden>{c.emoji}</span> {c.name}
                  </span>
                  <span className="row__control">
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="Sin tope"
                      aria-label={`Tope para ${c.name}`}
                      defaultValue={settings.categoryBudgets[c.id] ?? ''}
                      onBlur={(e) => {
                        const n = parseAmount(e.target.value)
                        const next = { ...settings.categoryBudgets }
                        if (Number.isFinite(n) && n > 0) next[c.id] = n
                        else delete next[c.id]
                        onUpdateSettings({ categoryBudgets: next })
                      }}
                    />
                  </span>
                </div>
              ))}
          </div>
          <p className="card__sub">
            Suma de topes:{' '}
            {formatMoney(
              Object.values(settings.categoryBudgets).reduce((s, v) => s + v, 0),
              settings.locale,
              settings.currency,
            )}
          </p>
        </Sheet>
      )}
    </>
  )
}
