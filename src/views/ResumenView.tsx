import type { Category, Settings, Transaction } from '../types'
import { formatMoney } from '../lib/format'
import { periodProgress, type PeriodRange } from '../lib/date'
import { averagePerDay, byCategory, projectedSpend, totals } from '../lib/stats'
import { BudgetMeter } from '../components/BudgetMeter'
import { BudgetAlerts } from '../components/BudgetAlerts'
import { CategoryBars } from '../components/CategoryBars'
import { TransactionList } from '../components/TransactionList'
import type { CategoryBudgetStatus } from '../lib/alerts'

interface Props {
  periodTx: Transaction[]
  categories: Category[]
  settings: Settings
  range: PeriodRange
  isDark: boolean
  budgetStatuses: CategoryBudgetStatus[]
  onSelectTx: (tx: Transaction) => void
  onGoToBudget: () => void
  onEditCategoryBudgets: () => void
  onGoToMovimientos: () => void
}

export function ResumenView({
  periodTx,
  categories,
  settings,
  range,
  isDark,
  budgetStatuses,
  onSelectTx,
  onGoToBudget,
  onEditCategoryBudgets,
  onGoToMovimientos,
}: Props) {
  const { locale, currency } = settings
  const t = totals(periodTx)
  const cats = byCategory(periodTx, categories)
  const { elapsed, total } = periodProgress(range)
  const projected = projectedSpend(t.gastos, elapsed, total)
  const recent = [...periodTx]
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1))
    .slice(0, 4)

  return (
    <>
      <div className="card">
        <div className="hero">
          <span className="hero__label">Gastado en el período</span>
          <span className="hero__value">{formatMoney(t.gastos, locale, currency)}</span>
          <span className="hero__meta">
            {t.count === 0
              ? 'Sin movimientos todavía.'
              : `${t.count} ${t.count === 1 ? 'movimiento' : 'movimientos'} · ${formatMoney(
                  averagePerDay(t.gastos, elapsed),
                  locale,
                  currency,
                )} al día`}
            {projected !== null && t.gastos > 0 && (
              <> · cerrarías en ~{formatMoney(projected, locale, currency)}</>
            )}
          </span>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__label">Ingresos</span>
          <span className="stat__value">{formatMoney(t.ingresos, locale, currency)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Balance</span>
          <span className={`stat__value ${t.balance >= 0 ? 'stat__value--good' : 'stat__value--bad'}`}>
            {formatMoney(t.balance, locale, currency)}
          </span>
        </div>
      </div>

      {settings.monthlyBudget > 0 ? (
        <BudgetMeter
          spent={t.gastos}
          budget={settings.monthlyBudget}
          locale={locale}
          currency={currency}
          progress={total > 0 ? elapsed / total : 0}
        />
      ) : (
        <div className="card">
          <div className="card__head">
            <span className="card__title">Ponte un presupuesto</span>
          </div>
          <p className="card__sub" style={{ marginTop: 0 }}>
            Define cuánto quieres gastar por período y la app te avisa si vas muy rápido.
          </p>
          <button className="btn btn--primary btn--block" style={{ marginTop: 12 }} onClick={onGoToBudget}>
            Definir presupuesto
          </button>
        </div>
      )}

      <BudgetAlerts
        statuses={budgetStatuses}
        locale={locale}
        currency={currency}
        onEditBudgets={onEditCategoryBudgets}
      />

      <div className="card">
        <div className="card__head">
          <span className="card__title">En qué se te va</span>
          <span className="card__sub">{cats.length} categorías</span>
        </div>
        <CategoryBars
          data={cats.slice(0, 5)}
          locale={locale}
          currency={currency}
          isDark={isDark}
          budgets={settings.categoryBudgets}
        />
      </div>

      {recent.length > 0 && (
        <section>
          <div className="card__head">
            <span className="section-label">Últimos movimientos</span>
            <button className="card__sub" onClick={onGoToMovimientos} style={{ color: 'var(--accent)' }}>
              Ver todos
            </button>
          </div>
          <TransactionList
            transactions={recent}
            categories={categories}
            locale={locale}
            currency={currency}
            isDark={isDark}
            onSelect={onSelectTx}
          />
        </section>
      )}
    </>
  )
}
