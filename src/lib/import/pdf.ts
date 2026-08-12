import type { PositionedItem, PositionedRow } from './types'

/** El PDF pide una clave que no se entregó o que no corresponde. */
export class PdfPasswordError extends Error {
  /** `true` si se entregó una clave y no sirvió. */
  readonly wrong: boolean

  constructor(wrong: boolean) {
    super(wrong ? 'Clave incorrecta' : 'El archivo pide clave')
    this.name = 'PdfPasswordError'
    this.wrong = wrong
  }
}

type PdfModule = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfModule> | null = null

/**
 * Carga pdf.js bajo demanda: son ~1 MB que no tienen por qué pesar en el
 * arranque de la app para quien nunca importa una cartola.
 */
async function loadPdfjs(): Promise<PdfModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      // El worker se arma desde su propio código como blob, en vez de apuntar a
      // un archivo aparte: así la app funciona igual servida desde un archivo
      // único, sin depender de rutas relativas.
      const source = (await import('pdfjs-dist/build/pdf.worker.min.mjs?raw')).default
      const blob = new Blob([source], { type: 'text/javascript' })
      pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob)
      return pdfjs
    })()
  }
  return pdfjsPromise
}

/** Dos fragmentos se consideran de la misma línea si su `y` difiere menos que esto. */
const ROW_TOLERANCE = 3

/**
 * Extrae el texto del PDF conservando las posiciones y agrupándolo en filas.
 * Todo ocurre en el navegador: el archivo nunca sale del dispositivo.
 */
export async function readPdfRows(data: ArrayBuffer, password?: string): Promise<PositionedRow[]> {
  const pdfjs = await loadPdfjs()

  let doc
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(data), password: password ?? '' }).promise
  } catch (err) {
    const name = (err as { name?: string }).name
    const code = (err as { code?: number }).code
    if (name === 'PasswordException') {
      // code 1 = falta la clave, code 2 = la clave no sirve.
      throw new PdfPasswordError(code === 2)
    }
    throw err
  }

  const rows: PositionedRow[] = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()

    const items: PositionedItem[] = []
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      items.push({ x: item.transform[4], y: item.transform[5], text: item.str })
    }

    // Agrupa por línea tolerando pequeñas diferencias de línea base.
    items.sort((a, b) => b.y - a.y || a.x - b.x)
    let current: PositionedRow | null = null
    for (const item of items) {
      if (!current || Math.abs(current.y - item.y) > ROW_TOLERANCE) {
        current = { y: item.y, page: p, items: [] }
        rows.push(current)
      }
      current.items.push(item)
    }
    page.cleanup()
  }

  for (const row of rows) row.items.sort((a, b) => a.x - b.x)
  await doc.cleanup()
  return rows
}

/** Texto de una fila limitado a un rango de columnas. */
export function sliceRow(row: PositionedRow, from: number, to: number): string {
  return row.items
    .filter((i) => i.x >= from && i.x < to)
    .map((i) => i.text)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function rowText(row: PositionedRow): string {
  return row.items
    .map((i) => i.text)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
