/**
 * Convierte el build de archivo único en una página lista para publicar como
 * Artifact: el envoltorio (`<!doctype>`, `<html>`, `<head>`, `<body>`) lo pone
 * la plataforma, así que aquí solo queda el contenido.
 *
 *   SINGLE_FILE=1 VITE_SINGLE_FILE=1 npx vite build
 *   node scripts/make-artifact.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'dist-single/index.html'), 'utf8')

const head = source.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? ''
const body = source.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''

// El manifest y los íconos son archivos aparte que no existen en el Artifact.
const cleanHead = head
  .replace(/<link\b[^>]*rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*/g, '')
  .replace(/<meta\b[^>]*name="viewport"[^>]*>\s*/g, '')
  .trim()

const out = `${cleanHead}\n${body.trim()}\n`

mkdirSync(resolve(root, 'dist-artifact'), { recursive: true })
const target = resolve(root, 'dist-artifact/mis-gastos.html')
writeFileSync(target, out)
console.log(`✓ ${target} (${(out.length / 1024 / 1024).toFixed(2)} MB)`)
