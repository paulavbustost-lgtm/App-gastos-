import type { BudgetLevel, CategoryBudgetStatus } from '../lib/alerts'
import { formatMoney, formatPercent } from '../lib/format'
import { IconAlert, IconCheck } from './Icons'

interface Props {
  statuses: CategoryBudgetStatus[]
  locale: string
  currency: string
  onEditBudgets: () => void
}

const LEVEL_TEXT: Record<Exclude<BudgetLevel, 'ok'>, string> = {
  excedido: 'Pasaste el tope',
  cerca: 'Te queda poco',
  rapido: 'Vas rápido',
}

/**
 * Aviso por categoría con tope. El estado se lee por el texto y el ícono, no
 * solo por el color, y cada barra va etiquetada con su monto.
 */
export function BudgetAlerts({ statuses, locale, currency, onEditBudgets }: Props) {
  const alerts = statuses.filter((s) => s.level !== 'ok')

  if (statuses.length === 0) {
    return (
      <div className="card">
        <div className="card__head">
          <span className="card__title">Alertas por categoría</span>
        </div>
        <p className="card__sub" style={{ marginTop: 0 }}>
          Ponle un tope a las categorías que se te arrancan y te aviso cuando estés llegando al límite.
        </p>
        <button className="btn btn--ghost btn--block" style={{ marginTop: 12 }} onClick={onEditBudgets}>
          Definir topes por categoría
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card__head">
        <span className="card__title">Alertas por categoría</span>
        <button className="card__sub" onClick={onEditBudgets} style={{ color: 'var(--accent)' }}>
          Editar topes
        </button>
      </div>

      {alerts.length === 0 ? (
        <p className="badge badge--good">
          <IconCheck />
          Las {statuses.length} categorías con tope van al día
        </p>
      ) : (
        <ul className="alert-list">
          {alerts.map((s) => (
            <li key={s.category.id} className="alert">
              <div className="alert__head">
                <span className="alert__name">
                  <span aria-hidden>{s.category.emoji}</span> {s.category.name}
                </span>
                <span className={`badge badge--${badgeTone(s.level)}`}>
                  <IconAlert />
                  {LEVEL_TEXT[s.level as Exclude<BudgetLevel, 'ok'>]}
                </span>
              </div>

              <div className="meter__track alert__track">
                <div
                  className={`meter__fill${fillModifier(s.level)}`}
                  style={{ width: `${Math.min(100, s.ratio * 100)}%` }}
                />
              </div>

              <span className="alert__detail">
                {formatMoney(s.spent, locale, currency)} de {formatMoney(s.budget, locale, currency)} ·{' '}
                {formatPercent(s.ratio, locale)}
                {s.remaining >= 0
                  ? ` · quedan ${formatMoney(s.remaining, locale, currency)}`
                  : ` · te pasaste por ${formatMoney(-s.remaining, locale, currency)}`}
              </span>

              {s.level === 'rapido' && s.projected !== null && (
                <span className="alert__detail">
                  A este ritmo cerrarías en {formatMoney(s.projected, locale, currency)}.
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {alerts.length > 0 && statuses.length > alerts.length && (
        <p className="row__hint" style={{ marginTop: 12 }}>
          Las otras {statuses.length - alerts.length} categorías con tope van bien.
        </p>
      )}
    </div>
  )
}

function badgeTone(level: BudgetLevel): string {
  return level === 'excedido' ? 'critical' : 'warning'
}

function fillModifier(level: BudgetLevel): string {
  if (level === 'excedido') return ' meter__fill--critical'
  if (level === 'cerca' || level === 'rapido') return ' meter__fill--warning'
  return ''
}
