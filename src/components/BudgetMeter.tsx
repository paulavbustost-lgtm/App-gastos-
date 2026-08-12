import { formatMoney, formatPercent } from '../lib/format'
import { IconAlert, IconCheck } from './Icons'

interface Props {
  spent: number
  budget: number
  locale: string
  currency: string
  /** Fracción del período ya transcurrida, para la marca de "hoy". */
  progress: number
}

/**
 * Un ratio contra un límite: medidor, no gráfico de torta.
 * El relleno lleva la severidad; la pista es un paso más claro del mismo tono.
 */
export function BudgetMeter({ spent, budget, locale, currency, progress }: Props) {
  const ratio = budget > 0 ? spent / budget : 0
  const pct = Math.min(1, ratio)
  const remaining = budget - spent

  const level = ratio >= 1 ? 'critical' : ratio > progress + 0.1 ? 'warning' : 'good'
  const fillClass =
    level === 'critical' ? 'meter__fill meter__fill--critical' : level === 'warning' ? 'meter__fill meter__fill--warning' : 'meter__fill'

  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Presupuesto del período</span>
        <span className={`badge badge--${level}`}>
          {level === 'good' ? <IconCheck /> : <IconAlert />}
          {level === 'critical' ? 'Sobrepasado' : level === 'warning' ? 'Vas rápido' : 'Al día'}
        </span>
      </div>

      <div className="meter">
        <div
          className="meter__track"
          role="meter"
          aria-valuenow={Math.round(ratio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Gastado ${formatMoney(spent, locale, currency)} de ${formatMoney(budget, locale, currency)}`}
        >
          <div className={fillClass} style={{ width: `${pct * 100}%` }} />
          {progress > 0 && progress < 1 && (
            <div className="meter__today" style={{ left: `${progress * 100}%` }} title="Hoy" />
          )}
        </div>

        <div className="meter__legend">
          <span>
            {formatMoney(spent, locale, currency)} de {formatMoney(budget, locale, currency)}
          </span>
          <span>{formatPercent(ratio, locale)}</span>
        </div>
      </div>

      <p className="hero__meta" style={{ marginTop: 10 }}>
        {remaining >= 0
          ? `Te quedan ${formatMoney(remaining, locale, currency)} para cerrar el período.`
          : `Vas ${formatMoney(-remaining, locale, currency)} por sobre el presupuesto.`}
      </p>
    </div>
  )
}
