import { formatMoney, formatPercent } from '../lib/format'
import { categoryColor } from '../hooks/useTheme'
import type { CategoryTotal } from '../lib/stats'

interface Props {
  data: CategoryTotal[]
  locale: string
  currency: string
  isDark: boolean
  budgets?: Record<string, number>
  onSelect?: (categoryId: string) => void
}

/**
 * Comparación de magnitud entre categorías: barras horizontales ordenadas de
 * mayor a menor. Cada barra va directamente etiquetada con nombre y monto, así
 * el color nunca es el único canal de identidad.
 */
export function CategoryBars({ data, locale, currency, isDark, budgets, onSelect }: Props) {
  if (data.length === 0) {
    return <p className="card__sub">Todavía no hay gastos en este período.</p>
  }

  const max = Math.max(...data.map((d) => d.total))

  return (
    <>
      <div className="bars">
        {data.map(({ category, total, share, count }) => {
          const budget = budgets?.[category.id] ?? 0
          const over = budget > 0 && total > budget
          const Row = onSelect ? 'button' : 'div'
          return (
            <Row
              key={category.id}
              className="bar-row"
              {...(onSelect ? { onClick: () => onSelect(category.id), type: 'button' as const } : {})}
            >
              <span className="bar-row__name">
                <span aria-hidden>{category.emoji}</span>
                <span>{category.name}</span>
              </span>
              <span className="bar-row__value">{formatMoney(total, locale, currency)}</span>
              <span className="bar-row__track">
                <span
                  className="bar-row__fill"
                  style={{
                    width: `${Math.max(1.5, (total / max) * 100)}%`,
                    background: categoryColor(category.colorSlot, isDark),
                  }}
                />
              </span>
              <span className="bar-row__share">
                {formatPercent(share, locale)} · {count} {count === 1 ? 'movimiento' : 'movimientos'}
                {budget > 0 &&
                  ` · tope ${formatMoney(budget, locale, currency)}${over ? ' — sobrepasado' : ''}`}
              </span>
            </Row>
          )
        })}
      </div>

      <details className="disclosure">
        <summary>Ver como tabla</summary>
        <table className="table-view">
          <thead>
            <tr>
              <th scope="col">Categoría</th>
              <th scope="col">Movs.</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ category, total, count }) => (
              <tr key={category.id}>
                <td>
                  {category.emoji} {category.name}
                </td>
                <td>{count}</td>
                <td>{formatMoney(total, locale, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}
