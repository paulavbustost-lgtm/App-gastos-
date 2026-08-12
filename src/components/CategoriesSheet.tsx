import { useState } from 'react'
import type { Category, TxType } from '../types'
import { categoryColor } from '../hooks/useTheme'
import { Sheet } from './Sheet'
import { IconPlus, IconTrash } from './Icons'

interface Props {
  categories: Category[]
  isDark: boolean
  onAdd: (cat: Omit<Category, 'id'>) => void
  onUpdate: (id: string, patch: Partial<Category>) => void
  onRemove: (id: string) => void
  onClose: () => void
}

const EMOJI_CHOICES = ['🛒', '🍔', '🚌', '🏠', '💊', '🎬', '📱', '👕', '📚', '🐾', '📦', '✈️', '🎁', '💇', '⛽', '💼', '✨', '↩️']

export function CategoriesSheet({ categories, isDark, onAdd, onUpdate, onRemove, onClose }: Props) {
  const [type, setType] = useState<TxType>('gasto')
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📦')

  const list = categories.filter((c) => c.type === type)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, emoji, colorSlot: categories.length % 8, type })
    setName('')
    setEmoji('📦')
  }

  return (
    <Sheet title="Categorías" onClose={onClose}>
      <div className="segmented" role="group" aria-label="Tipo">
        <button className="segmented__opt" aria-pressed={type === 'gasto'} onClick={() => setType('gasto')}>
          Gastos
        </button>
        <button className="segmented__opt" aria-pressed={type === 'ingreso'} onClick={() => setType('ingreso')}>
          Ingresos
        </button>
      </div>

      <div className="rows">
        {list.map((c) => (
          <div className="row" key={c.id} style={{ opacity: c.archived ? 0.5 : 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span className="dot" style={{ background: categoryColor(c.colorSlot, isDark) }} aria-hidden />
              <span aria-hidden>{c.emoji}</span>
              <span className="row__label">
                {c.name}
                {c.archived && <span className="row__hint"> · archivada</span>}
              </span>
            </span>
            {c.archived ? (
              <button className="badge" onClick={() => onUpdate(c.id, { archived: false })}>
                Restaurar
              </button>
            ) : (
              <button
                className="icon-btn"
                onClick={() => onRemove(c.id)}
                aria-label={`Quitar ${c.name}`}
                title="Quitar (se archiva si tiene movimientos)"
              >
                <IconTrash />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card__head">
          <span className="card__title">Nueva categoría</span>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="cat-name">
            Nombre
          </label>
          <input
            id="cat-name"
            className="input"
            value={name}
            placeholder="Ej: Gimnasio"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <span className="field__label">Ícono</span>
          <div className="chips">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} className="chip" aria-pressed={emoji === e} onClick={() => setEmoji(e)}>
                <span aria-hidden>{e}</span>
                <span className="visually-hidden">{e}</span>
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn--primary btn--block"
          style={{ marginTop: 14 }}
          disabled={!name.trim()}
          onClick={submit}
        >
          <IconPlus />
          Agregar categoría
        </button>
      </div>
    </Sheet>
  )
}
