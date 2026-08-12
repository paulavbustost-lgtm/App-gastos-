import { useMemo, useRef, useState } from 'react'
import type { Category, Settings, Transaction } from '../types'
import { formatMoney } from '../lib/format'
import { shortDate } from '../lib/date'
import { parseBancoChileStatement } from '../lib/import/bancochile'
import { markDuplicates } from '../lib/import/dedupe'
import { PdfPasswordError, readPdfRows } from '../lib/import/pdf'
import { learnRule, suggestCategory } from '../lib/import/rules'
import type { CandidateKind, ImportCandidate, StatementMeta } from '../lib/import/types'
import { Sheet } from './Sheet'
import { IconAlert, IconCheck, IconUpload } from './Icons'

interface Props {
  categories: Category[]
  settings: Settings
  existing: Transaction[]
  onImport: (rows: Omit<Transaction, 'id' | 'createdAt'>[], learned: Record<string, string>) => void
  onClose: () => void
}

type Stage = 'elegir' | 'clave' | 'leyendo' | 'revisar'

const KIND_LABEL: Record<CandidateKind, string> = {
  compra: 'Compra',
  cuota: 'Cuota',
  cargo: 'Cargo del banco',
  pago: 'Pago a la tarjeta',
}

export function ImportSheet({ categories, settings, existing, onImport, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('elegir')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [wrongPassword, setWrongPassword] = useState(false)
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [meta, setMeta] = useState<StatementMeta | null>(null)
  const [corrections, setCorrections] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)
  const bufferRef = useRef<ArrayBuffer | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'gasto' && !c.archived),
    [categories],
  )
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'ingreso' && !c.archived),
    [categories],
  )

  async function handleFile(file: File) {
    bufferRef.current = await file.arrayBuffer()
    void run('')
  }

  async function run(pass: string) {
    const buffer = bufferRef.current
    if (!buffer) return
    setStage('leyendo')
    setError(null)
    try {
      // pdf.js consume el ArrayBuffer, así que se le pasa una copia por intento.
      const rows = await readPdfRows(buffer.slice(0), pass)
      const result = parseBancoChileStatement(rows)

      if (result.candidates.length === 0) {
        setError(
          'Pude abrir el PDF, pero no reconocí movimientos. ¿Es un estado de cuenta de tarjeta de crédito de Banco de Chile?',
        )
        setStage('elegir')
        return
      }

      const withCategories = result.candidates.map((c) => ({
        ...c,
        // Un pago a la tarjeta es un abono, no un gasto: le corresponden las
        // categorías de ingreso.
        categoryId:
          c.type === 'ingreso'
            ? (categories.find((x) => x.id === 'reembolso')?.id ??
              categories.find((x) => x.type === 'ingreso')?.id ??
              '')
            : suggestCategory(c.description, categories, settings.merchantRules),
      }))
      setCandidates(markDuplicates(withCategories, existing))
      setMeta(result.meta)
      setStage('revisar')
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        setWrongPassword(err.wrong)
        setStage('clave')
        return
      }
      setError('No pude leer el archivo. ¿Es un PDF válido?')
      setStage('elegir')
    }
  }

  function toggle(key: string) {
    setCandidates((list) => list.map((c) => (c.key === key ? { ...c, selected: !c.selected } : c)))
  }

  function setCategory(key: string, categoryId: string) {
    setCandidates((list) => {
      const target = list.find((c) => c.key === key)
      if (target) {
        setCorrections((prev) => learnRule(prev, target.description, categoryId))
      }
      return list.map((c) => (c.key === key ? { ...c, categoryId } : c))
    })
  }

  function setAll(selected: boolean) {
    setCandidates((list) => list.map((c) => (c.duplicate && selected ? c : { ...c, selected })))
  }

  const selected = candidates.filter((c) => c.selected)
  const total = selected.reduce((s, c) => s + (c.type === 'gasto' ? c.amount : 0), 0)
  const duplicates = candidates.filter((c) => c.duplicate).length

  function confirm() {
    onImport(
      selected.map((c) => ({
        type: c.type,
        amount: c.amount,
        categoryId: c.categoryId,
        date: c.date,
        note: c.description,
        method: c.method,
      })),
      corrections,
    )
  }

  return (
    <Sheet title="Importar cartola" onClose={onClose}>
      {stage === 'elegir' && (
        <>
          <p className="card__sub">
            Sube el estado de cuenta de tu tarjeta de crédito de Banco de Chile en PDF. Se lee dentro de tu
            navegador: <strong>el archivo no se sube a ningún servidor</strong>.
          </p>
          {error && (
            <p className="badge badge--critical" role="alert">
              <IconAlert />
              {error}
            </p>
          )}
          <button className="btn btn--primary btn--block" onClick={() => fileRef.current?.click()}>
            <IconUpload />
            Elegir PDF
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
          <p className="row__hint">
            ¿Dónde encontrarlo? En el sitio del banco: Productos → Tarjeta de Crédito → Consultar →
            Movimientos Facturados.
          </p>
        </>
      )}

      {stage === 'clave' && (
        <>
          <p className="card__sub">
            {wrongPassword
              ? 'Esa clave no abrió el archivo. Prueba de nuevo.'
              : 'El PDF está protegido. En Banco de Chile suele ser tu RUT sin puntos, sin guion y sin el dígito verificador.'}
          </p>
          <div className="field">
            <label className="field__label" htmlFor="pdf-pass">
              Clave del PDF
            </label>
            <input
              id="pdf-pass"
              className="input"
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && password && void run(password)}
            />
          </div>
          <button
            className="btn btn--primary btn--block"
            disabled={!password}
            onClick={() => void run(password)}
          >
            Abrir cartola
          </button>
        </>
      )}

      {stage === 'leyendo' && <p className="card__sub">Leyendo la cartola…</p>}

      {stage === 'revisar' && (
        <>
          <div className="card">
            <div className="hero">
              <span className="hero__label">
                {meta?.periodFrom && meta?.periodTo
                  ? `Período ${shortDate(meta.periodFrom)} – ${shortDate(meta.periodTo)}`
                  : 'Movimientos encontrados'}
                {meta?.cardTail ? ` · tarjeta ••••${meta.cardTail}` : ''}
              </span>
              <span className="hero__value">{formatMoney(total, settings.locale, settings.currency)}</span>
              <span className="hero__meta">
                {selected.length} de {candidates.length} movimientos seleccionados
                {duplicates > 0 && ` · ${duplicates} ya estaban registrados`}
              </span>
            </div>
          </div>

          <div className="btn-row">
            <button className="btn btn--ghost btn--block" onClick={() => setAll(true)}>
              Marcar todos
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setAll(false)}>
              Desmarcar todos
            </button>
          </div>

          <p className="row__hint">
            Revisa las categorías antes de importar: lo que corrijas queda aprendido para la próxima vez. Los
            pagos a la tarjeta y lo que ya tenías registrado vienen desmarcados.
          </p>

          <ul className="tx-list">
            {candidates.map((c) => (
              <li key={c.key}>
                <div className="import-row">
                  <input
                    type="checkbox"
                    className="import-row__check"
                    checked={c.selected}
                    onChange={() => toggle(c.key)}
                    aria-label={`Importar ${c.description}`}
                  />
                  <div className="import-row__body">
                    <span className="tx__name">{c.description}</span>
                    <span className="tx__meta">
                      {shortDate(c.date)} · {KIND_LABEL[c.kind]}
                      {c.duplicate && ' · ya registrado'}
                    </span>
                    <select
                      className="select import-row__cat"
                      value={c.categoryId}
                      onChange={(e) => setCategory(c.key, e.target.value)}
                      aria-label={`Categoría de ${c.description}`}
                    >
                      {(c.type === 'ingreso' ? incomeCategories : expenseCategories).map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className={`tx__amount${c.type === 'ingreso' ? ' tx__amount--ingreso' : ''}`}>
                    {formatMoney(c.amount, settings.locale, settings.currency)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <button className="btn btn--primary btn--block" disabled={selected.length === 0} onClick={confirm}>
            <IconCheck />
            Importar {selected.length} movimientos
          </button>
        </>
      )}
    </Sheet>
  )
}
