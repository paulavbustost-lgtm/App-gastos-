/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

/**
 * `SINGLE_FILE=1` produce un único .html con todo adentro, para poder abrir la
 * app desde cualquier parte sin servidor. El build normal queda igual.
 */
const singleFile = process.env.SINGLE_FILE === '1'

// Rutas relativas para que el build sirva igual desde la raíz o desde un
// subdirectorio (GitHub Pages, Netlify, una carpeta compartida, etc.).
export default defineConfig({
  base: './',
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  build: {
    outDir: singleFile ? 'dist-single' : 'dist',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
