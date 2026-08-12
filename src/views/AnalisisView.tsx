import { useMemo } from 'react'
import type { Category, Settings, Transaction } from '../types'
import { PAYMENT_METHODS } from '../types'
import { formatMoney, formatPercent } from '../lib/format'
import { periodLabel, periodProgress, type PeriodKey, type PeriodRange } from '../lib/date'
import { averagePerDay, byCategory, periodSeries, projectedSpend, totals } from '../lib/stats'
import { CategoryBars } from '../components/CategoryBars'
import { TrendChart } from '../components/TrendChart'

interface Props {
  allTx: Transaction[]
  periodTx: Transaction[]
  categories: Category[]
  settings: Settings
  periodKeyValue: PeriodKey
  range: PeriodRange
  isDark: boolean
  onSelectPeriod: (key: PeriodKey) => void
}

export function AnalisisView({
  allTx,
  periodTx,
  categories,
  settings,
  periodKeyValue,
  range,
  isDark,
  onSelectPeriod,
}: Props) {
  const { locale, currency, cutDay } = settings
  const series = useMemo(
    () => periodSeries(allTx, periodKeyValue, 6, cutDay),
    [allTx, periodKeyValue, cutDay],
  )
  const gastoCats = byCategory(periodTx, categories, 'gasto')
  const ingresoCats = byCategory(periodTx, categories, 'ingreso')
  const t = totals(periodTx)
  const { elapsed, total } = periodProgress(range)
  const projected = projectedSpend(t.gastos, elapsed, total)

  const withData = series.filter((p) => p.gastos > 0)
  const promedio = withData.length > 0 ? withData.reduce((s, p) => s + p.gastos, 0) / withData.length : 0
  const vsPromedio = promedio > 0 ? t.gastos / promedio - 1 : 0

  const methods = useMemo(() => {
    const sums = new Map<string, number>()
    let grand = 0
    for (const tx of periodTx) {
      if (tx.type !== 'gasto') continue
      sums.set(tx.method, (sums.get(tx.method) ?? 0) + tx.amount)
      grand += tx.amount
    }
    return [...sums.entries()]
      .map(([method, value]) => ({
        label: PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method,
        value,
        share: grand > 0 ? value / grand : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [periodTx])

  return (
    <>
      <div className="card">
        <div className="card__head">
          <span className="card__title">Gasto por período</span>
          <span className="card__sub">Últimos 6</span>
        </div>
        <TrendChart
          points={series}
          currentKey={periodKeyValue}
          locale={locale}
          currency={currency}
          onSelect={onSelectPeriod}
        />
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__label">Promedio por período</span>
          <span className="stat__value">{formatMoney(promedio, locale, currency)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Este período</span>
          <span className={`stat__value ${vsPromedio > 0 ? 'stat__value--bad' : 'stat__value--good'}`}>
            {promedio > 0 ? `${vsPromedio > 0 ? '+' : ''}${formatPercent(vsPromedio, locale)}` : '—'}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Promedio diario</span>
          <span className="stat__value">
            {formatMoney(averagePerDay(t.gastos, elapsed), locale, currency)}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">Proyección al cierre</span>
          <span className="stat__value">
            {projected !== null ? formatMoney(projected, locale, currency) : formatMoney(t.gastos, locale, currency)}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <span className="card__title">Gastos por categoría</span>
          <span className="card__sub cap-first">{periodLabel(periodKeyValue, cutDay)}</span>
        </div>
        <CategoryBars
          data={gastoCats}
          locale={locale}
          currency={currency}
          isDark={isDark}
          budgets={settings.categoryBudgets}
        />
      </div>

      {ingresoCats.length > 0 && (
        <div className="card">
          <div className="card__head">
            <span className="card__title">Ingresos por categoría</span>
          </div>
          <CategoryBars data={ingresoCats} locale={locale} currency={currency} isDark={isDark} />
        </div>
      )}

      {methods.length > 0 && (
        <div className="card">
          <div className="card__head">
            <span className="card__title">Medios de pago</span>
          </div>
          <table className="table-view">
            <thead>
              <tr>
                <th scope="col">Medio</th>
                <th scope="col">Participación</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td>{formatPercent(m.share, locale)}</td>
                  <td>{formatMoney(m.value, locale, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
