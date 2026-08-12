/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Rutas relativas para que el build sirva igual desde la raíz o desde un
// subdirectorio (GitHub Pages, Netlify, una carpeta compartida, etc.).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
