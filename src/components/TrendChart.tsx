import { formatMoney, formatMoneyCompact } from '../lib/format'
import { MONTH_NAMES, parsePeriodKey, type PeriodKey } from '../lib/date'
import type { PeriodPoint } from '../lib/stats'

interface Props {
  points: PeriodPoint[]
  currentKey: PeriodKey
  locale: string
  currency: string
  onSelect?: (key: PeriodKey) => void
}

/**
 * Una sola serie (gasto por período) en columnas: sin leyenda — el título dice
 * qué se grafica — y con etiqueta directa solo en el período actual.
 */
export function TrendChart({ points, currentKey, locale, currency, onSelect }: Props) {
  const max = Math.max(...points.map((p) => p.gastos), 1)

  return (
    <>
      <div className="trend">
        {points.map((p) => {
          const isCurrent = p.key === currentKey
          const height = `${Math.max(1.5, (p.gastos / max) * 100)}%`
          const label = `${monthTick(p.key)}: ${formatMoney(p.gastos, locale, currency)}`
          return (
            <button
              key={p.key}
              type="button"
              className={`trend__col${isCurrent ? ' trend__col--current' : ''}`}
              onClick={() => onSelect?.(p.key)}
              title={label}
              aria-label={label}
            >
              {isCurrent && <span className="trend__cap">{formatMoneyCompact(p.gastos, locale, currency)}</span>}
              <span className="trend__bar" style={{ height }} />
            </button>
          )
        })}
      </div>

      <div className="trend__axis" aria-hidden>
        {points.map((p) => (
          <span key={p.key} className={`trend__tick${p.key === currentKey ? ' trend__tick--current' : ''}`}>
            {monthTick(p.key)}
          </span>
        ))}
      </div>
    </>
  )
}

function monthTick(key: PeriodKey): string {
  const { month } = parsePeriodKey(key)
  return MONTH_NAMES[month].slice(0, 3)
}
