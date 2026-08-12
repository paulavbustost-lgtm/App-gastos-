import { useMemo, useRef, useState } from 'react'
import type { Category, Settings, Transaction } from '../types'
import { formatMoney } from '../lib/format'
import { shortDate } from '../lib/date'
import { parseBancoChileStatement } from '../lib/import/bancochile'
import { markDuplicates } from '../lib/import/dedupe'
import { PdfPasswordError, readPdfRows } from '../lib/import/pdf'
import { learnRule, suggestCategory } from '../lib/import/rules'
import { readSheet, UnsupportedFileError, type SheetRows } from '../lib/import/sheet'
import {
  buildCandidates,
  columnLabels,
  detectMapping,
  isMappingUsable,
  type ColumnMapping,
} from '../lib/import/tabular'
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

type Stage = 'elegir' | 'clave' | 'leyendo' | 'mapear' | 'revisar'

const KIND_LABEL: Record<CandidateKind, string> = {
  compra: 'Compra',
  cuota: 'Cuota',
  cargo: 'Cargo del banco',
  pago: 'Abono o pago',
}

export function ImportSheet({ categories, settings, existing, onImport, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('elegir')
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [wrongPassword, setWrongPassword] = useState(false)
  const [candidates, setCandidates] = useState<ImportCandidate[]>([])
  const [meta, setMeta] = useState<StatementMeta | null>(null)
  const [corrections, setCorrections] = useState<Record<string, string>>({})

  const [rows, setRows] = useState<SheetRows>([])
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [negativeMeans, setNegativeMeans] = useState<'ingreso' | 'gasto'>('ingreso')

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

  function categorize(list: ImportCandidate[]): ImportCandidate[] {
    return list.map((c) => ({
      ...c,
      categoryId:
        c.type === 'ingreso'
          ? (categories.find((x) => x.id === 'reembolso')?.id ??
            categories.find((x) => x.type === 'ingreso')?.id ??
            '')
          : suggestCategory(c.description, categories, settings.merchantRules),
    }))
  }

  async function handleFile(file: File) {
    setError(null)
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)

    if (isPdf) {
      bufferRef.current = await file.arrayBuffer()
      void runPdf('')
      return
    }

    setStage('leyendo')
    try {
      const parsed = await readSheet(file)
      if (parsed.length === 0) {
        setError('El archivo se abrió pero está vacío.')
        setStage('elegir')
        return
      }
      const detected = detectMapping(parsed)
      setRows(parsed)
      setMapping(detected)
      if (isMappingUsable(detected)) {
        applyMapping(parsed, detected, negativeMeans)
      } else {
        setStage('mapear')
      }
    } catch (err) {
      setError(
        err instanceof UnsupportedFileError
          ? 'No reconocí ese archivo. Sirven Excel (.xlsx o .xls), CSV, o el PDF del estado de cuenta.'
          : 'No pude leer el archivo.',
      )
      setStage('elegir')
    }
  }

  function applyMapping(source: SheetRows, map: ColumnMapping, negative: 'ingreso' | 'gasto') {
    const built = buildCandidates(source, map, { negativeMeans: negative })
    if (built.length === 0) {
      setError('Con esas columnas no salió ningún movimiento. Revisa cuál es la fecha y cuál el monto.')
      setStage('mapear')
      return
    }
    setCandidates(markDuplicates(categorize(built), existing))
    setMeta(null)
    setError(null)
    setStage('revisar')
  }

  async function runPdf(pass: string) {
    const buffer = bufferRef.current
    if (!buffer) return
    setStage('leyendo')
    setError(null)
    try {
      // pdf.js consume el ArrayBuffer, así que se le pasa una copia por intento.
      const pdfRows = await readPdfRows(buffer.slice(0), pass)
      const result = parseBancoChileStatement(pdfRows)

      if (result.candidates.length === 0) {
        setError(
          'Pude abrir el PDF pero no reconocí movimientos. Si lo generaste convirtiendo un Excel, sube el Excel original: se lee mucho mejor.',
        )
        setStage('elegir')
        return
      }

      setCandidates(markDuplicates(categorize(result.candidates), existing))
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
      if (target) setCorrections((prev) => learnRule(prev, target.description, categoryId))
      return list.map((c) => (c.key === key ? { ...c, categoryId } : c))
    })
  }

  function setAll(selected: boolean) {
    setCandidates((list) => list.map((c) => (c.duplicate && selected ? c : { ...c, selected })))
  }

  const selected = candidates.filter((c) => c.selected)
  const total = selected.reduce((s, c) => s + (c.type === 'gasto' ? c.amount : 0), 0)
  const duplicates = candidates.filter((c) => c.duplicate).length
  const labels = useMemo(() => (mapping ? columnLabels(rows, mapping) : []), [rows, mapping])

  function updateMapping(patch: Partial<ColumnMapping>) {
    setMapping((m) => (m ? { ...m, ...patch } : m))
  }

  return (
    <Sheet title="Importar movimientos" onClose={onClose}>
      {stage === 'elegir' && (
        <>
          <p className="card__sub">
            Sube el <strong>Excel o CSV</strong> que descargas del banco, o el <strong>PDF</strong> del
            estado de cuenta. Se lee dentro de tu navegador: el archivo no se sube a ningún servidor.
          </p>
          {error && (
            <p className="badge badge--critical" role="alert">
              <IconAlert />
              {error}
            </p>
          )}
          <button className="btn btn--primary btn--block" onClick={() => fileRef.current?.click()}>
            <IconUpload />
            Elegir archivo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.txt,application/pdf,text/csv"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
          <p className="row__hint">
            En el sitio del banco: Productos → Tarjeta de Crédito → Consultar → Movimientos. Si te ofrece
            descargar en Excel, prefiérelo antes que el PDF. <strong>No lo conviertas a PDF</strong>: al
            convertirlo se pierde la estructura de columnas y ya no se puede leer.
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
              onKeyDown={(e) => e.key === 'Enter' && password && void runPdf(password)}
            />
          </div>
          <button
            className="btn btn--primary btn--block"
            disabled={!password}
            onClick={() => void runPdf(password)}
          >
            Abrir archivo
          </button>
        </>
      )}

      {stage === 'leyendo' && <p className="card__sub">Leyendo el archivo…</p>}

      {stage === 'mapear' && mapping && (
        <>
          <p className="card__sub">
            Dime qué hay en cada columna y armo los movimientos. Encontré {rows.length} filas.
          </p>
          {error && (
            <p className="badge badge--critical" role="alert">
              <IconAlert />
              {error}
            </p>
          )}

          {(
            [
              ['date', 'Fecha', true],
              ['description', 'Descripción', false],
              ['amount', 'Monto', true],
              ['credit', 'Abonos (si están aparte)', false],
            ] as const
          ).map(([role, label, required]) => (
            <div className="field" key={role}>
              <label className="field__label" htmlFor={`col-${role}`}>
                {label}
                {required && ' *'}
              </label>
              <select
                id={`col-${role}`}
                className="select"
                value={mapping[role]}
                onChange={(e) => updateMapping({ [role]: Number(e.target.value) })}
              >
                <option value={-1}>— ninguna —</option>
                {labels.map((name, i) => (
                  <option key={i} value={i}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="field">
            <span className="field__label">Los montos negativos son…</span>
            <div className="segmented" role="group" aria-label="Significado de los montos negativos">
              <button
                className="segmented__opt"
                aria-pressed={negativeMeans === 'ingreso'}
                onClick={() => setNegativeMeans('ingreso')}
              >
                Abonos
              </button>
              <button
                className="segmented__opt"
                aria-pressed={negativeMeans === 'gasto'}
                onClick={() => setNegativeMeans('gasto')}
              >
                Gastos
              </button>
            </div>
          </div>

          <button
            className="btn btn--primary btn--block"
            disabled={!isMappingUsable(mapping)}
            onClick={() => applyMapping(rows, mapping, negativeMeans)}
          >
            Ver movimientos
          </button>
        </>
      )}

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

          {rows.length > 0 && mapping && (
            <button className="btn btn--ghost btn--block" onClick={() => setStage('mapear')}>
              Cambiar las columnas
            </button>
          )}

          <p className="row__hint">
            Revisa las categorías antes de importar: lo que corrijas queda aprendido para la próxima vez.
            Los abonos y lo que ya tenías registrado vienen desmarcados.
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

          <button
            className="btn btn--primary btn--block"
            disabled={selected.length === 0}
            onClick={() =>
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
          >
            <IconCheck />
            Importar {selected.length} movimientos
          </button>
        </>
      )}
    </Sheet>
  )
}
