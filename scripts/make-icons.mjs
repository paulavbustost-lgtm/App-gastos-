/**
 * Genera los PNG del ícono a partir de la misma geometría que `public/icon.svg`
 * (cuadrado redondeado azul + tres barras blancas), sin dependencias externas.
 *
 *   node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public')
const SIZES = [180, 192, 512]

const BG = [42, 120, 214] // #2a78d6
const FG = [255, 255, 255]

/** Barras del gráfico en coordenadas 0..1 (x, ancho, alto desde la base). */
const BARS = [
  { x: 0.26, w: 0.13, h: 0.26 },
  { x: 0.435, w: 0.13, h: 0.46 },
  { x: 0.61, w: 0.13, h: 0.35 },
]

const BASE_Y = 0.76
const RADIUS_RATIO = 0.235
const BAR_RADIUS_RATIO = 0.065

/** Cobertura de un pixel dentro de un rectángulo redondeado, con 3x3 de antialias. */
function coverage(px, py, x0, y0, x1, y1, r, size) {
  let hits = 0
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const x = (px + (sx + 0.5) / 3) / size
      const y = (py + (sy + 0.5) / 3) / size
      if (insideRoundRect(x, y, x0, y0, x1, y1, r)) hits++
    }
  }
  return hits / 9
}

function insideRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function mix(base, over, alpha) {
  return base.map((c, i) => Math.round(c * (1 - alpha) + over[i] * alpha))
}

function renderIcon(size) {
  // Formato RGBA sin filtro (byte 0 al inicio de cada scanline).
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      const bg = coverage(x, y, 0, 0, 1, 1, RADIUS_RATIO, size)
      let color = BG
      for (const b of BARS) {
        const a = coverage(x, y, b.x, BASE_Y - b.h, b.x + b.w, BASE_Y, BAR_RADIUS_RATIO, size)
        if (a > 0) color = mix(color, FG, a)
      }
      const o = rowStart + 1 + x * 4
      raw[o] = color[0]
      raw[o + 1] = color[1]
      raw[o + 2] = color[2]
      raw[o + 3] = Math.round(bg * 255)
    }
  }
  return raw
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([len, body, crc])
}

let crcTable = null
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }
  let c = -1
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return c ^ -1
}

function toPNG(size, raw) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT_DIR, { recursive: true })
for (const size of SIZES) {
  const file = resolve(OUT_DIR, `icon-${size}.png`)
  writeFileSync(file, toPNG(size, renderIcon(size)))
  console.log(`✓ ${file}`)
}
