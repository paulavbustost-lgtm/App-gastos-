import { useEffect, useState } from 'react'
import { CATEGORY_COLORS_DARK, CATEGORY_COLORS_LIGHT } from '../data/categories'
import type { ThemePref } from '../types'

/**
 * Aplica la preferencia al elemento raíz y devuelve si el modo oscuro está
 * efectivamente activo (lo necesitan los gráficos para elegir sus pasos de color).
 */
export function useTheme(pref: ThemePref): boolean {
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = pref === 'dark' || (pref === 'system' && systemDark)

  useEffect(() => {
    const root = document.documentElement
    if (pref === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', pref)

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#0d0d0d' : '#f9f9f7')
  }, [pref, isDark])

  return isDark
}

export function categoryColor(slot: number, isDark: boolean): string {
  const palette = isDark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS_LIGHT
  return palette[((slot % palette.length) + palette.length) % palette.length]
}
