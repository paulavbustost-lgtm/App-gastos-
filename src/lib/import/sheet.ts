/**
 * Lectura de planillas en el navegador, sin subir el archivo a ninguna parte.
 *
 * Los bancos chilenos exportan tres cosas distintas bajo el mismo botón de
 * "Excel": un .xlsx real, un .xls que en realidad es una tabla HTML, o un CSV.
 * Aquí se detecta cuál es por el contenido, no por la extensión, porque la
 * extensión miente seguido.
 */

/** Filas de la planilla, ya como texto. */
export type SheetRows = string[][]

export class UnsupportedFileError extends Error {
  constructor() {
    super('Formato de archivo no reconocido')
    this.name = 'UnsupportedFileError'
  }
}

export async function readSheet(file: File): Promise<SheetRows> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  if (isZip(bytes)) return readXlsx(buffer)

  const text = decodeText(bytes)
  if (looksLikeHtml(text)) return readHtmlTable(text)
  if (text.trim()) return readDelimited(text)

  throw new UnsupportedFileError()
}

/** Los .xlsx son archivos ZIP: empiezan con "PK\x03\x04". */
function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

/**
 * Los bancos exportan en Latin-1 tan seguido como en UTF-8. Se prueba UTF-8
 * estricto y, si el archivo no lo cumple, se relee como Latin-1: así "Depósito"
 * no queda como "Depósito".
 */
function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function looksLikeHtml(text: string): boolean {
  return /<\s*(table|html|body)\b/i.test(text.slice(0, 4000))
}

/** Un .xls que en realidad es HTML: se lee la tabla más grande del documento. */
function readHtmlTable(html: string): SheetRows {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const tables = [...doc.querySelectorAll('table')]
  if (tables.length === 0) throw new UnsupportedFileError()

  const biggest = tables.reduce((a, b) => (b.querySelectorAll('tr').length > a.querySelectorAll('tr').length ? b : a))

  return [...biggest.querySelectorAll('tr')].map((tr) =>
    [...tr.querySelectorAll('th, td')].map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
}

/** CSV o TSV. Detecta el separador y respeta las comillas. */
export function readDelimited(text: string): SheetRows {
  const clean = text.replace(/^﻿/, '')
  const delimiter = detectDelimiter(clean)
  const rows: SheetRows = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]

    if (quoted) {
      if (char === '"') {
        // Dos comillas seguidas dentro de un campo son una comilla literal.
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field.trim())
      field = ''
    } else if (char === '\n') {
      row.push(field.trim())
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length > 0) {
    row.push(field.trim())
    rows.push(row)
  }

  return rows.filter((r) => r.some((c) => c !== ''))
}

function detectDelimiter(text: string): string {
  const sample = text.slice(0, 5000)
  const counts = [';', ',', '\t', '|'].map((d) => [d, sample.split(d).length] as const)
  const [best] = counts.sort((a, b) => b[1] - a[1])
  return best[1] > 1 ? best[0] : ';'
}

/* ============================================================
   XLSX: es un ZIP con XML adentro. Se leen la tabla de textos
   compartidos y la primera hoja; suficiente para una cartola.
   ============================================================ */

async function readXlsx(buffer: ArrayBuffer): Promise<SheetRows> {
  const { unzipSync, strFromU8 } = await import('fflate')

  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new UnsupportedFileError()
  }

  const sheetPath = pickFirstSheet(files)
  if (!sheetPath) throw new UnsupportedFileError()

  const shared = files['xl/sharedStrings.xml'] ? parseSharedStrings(strFromU8(files['xl/sharedStrings.xml'])) : []
  return parseSheet(strFromU8(files[sheetPath]), shared)
}

function pickFirstSheet(files: Record<string, Uint8Array>): string | null {
  const sheets = Object.keys(files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => sheetNumber(a) - sheetNumber(b))
  return sheets[0] ?? null
}

function sheetNumber(path: string): number {
  return Number(path.match(/sheet(\d+)\.xml$/)?.[1] ?? 0)
}

/**
 * `sharedStrings.xml` guarda los textos una sola vez y las celdas los
 * referencian por índice. Un `<si>` puede venir partido en varios `<t>`
 * cuando el texto trae distinto formato, así que se concatenan.
 */
function parseSharedStrings(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  return [...doc.getElementsByTagName('si')].map((si) =>
    [...si.getElementsByTagName('t')].map((t) => t.textContent ?? '').join(''),
  )
}

function parseSheet(xml: string, shared: string[]): SheetRows {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const rows: SheetRows = []

  for (const row of [...doc.getElementsByTagName('row')]) {
    const cells: string[] = []
    for (const cell of [...row.getElementsByTagName('c')]) {
      const index = columnIndex(cell.getAttribute('r'))
      // Las celdas vacías no aparecen en el XML: se rellenan por posición.
      while (cells.length < index) cells.push('')
      cells.push(cellValue(cell, shared))
    }
    rows.push(cells)
  }

  return rows.filter((r) => r.some((c) => c !== ''))
}

function cellValue(cell: Element, shared: string[]): string {
  const type = cell.getAttribute('t')

  if (type === 'inlineStr') {
    return [...cell.getElementsByTagName('t')].map((t) => t.textContent ?? '').join('')
  }

  const raw = cell.getElementsByTagName('v')[0]?.textContent ?? ''
  if (type === 's') {
    const i = Number(raw)
    return Number.isInteger(i) && shared[i] !== undefined ? shared[i] : ''
  }
  return raw
}

/** "C7" → 2. Convierte la letra de columna a índice base cero. */
function columnIndex(ref: string | null): number {
  if (!ref) return 0
  const letters = ref.match(/^[A-Z]+/)?.[0]
  if (!letters) return 0
  let n = 0
  for (const char of letters) n = n * 26 + (char.charCodeAt(0) - 64)
  return n - 1
}
