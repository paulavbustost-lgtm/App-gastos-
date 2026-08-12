import type { Category } from '../types'

/**
 * Paleta categórica validada (ver skill dataviz): ocho tonos en orden fijo.
 * `colorSlot` indexa este arreglo — nunca se genera un tono nuevo.
 */
export const CATEGORY_COLORS_LIGHT = [
  '#2a78d6', // 1 azul
  '#eb6834', // 2 naranjo
  '#1baf7a', // 3 aqua
  '#eda100', // 4 amarillo
  '#e87ba4', // 5 magenta
  '#008300', // 6 verde
  '#4a3aa7', // 7 violeta
  '#e34948', // 8 rojo
]

export const CATEGORY_COLORS_DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'supermercado', name: 'Supermercado', emoji: '🛒', colorSlot: 0, type: 'gasto', builtin: true },
  { id: 'comida', name: 'Comida y salidas', emoji: '🍔', colorSlot: 1, type: 'gasto', builtin: true },
  { id: 'transporte', name: 'Transporte', emoji: '🚌', colorSlot: 2, type: 'gasto', builtin: true },
  { id: 'hogar', name: 'Hogar y cuentas', emoji: '🏠', colorSlot: 3, type: 'gasto', builtin: true },
  { id: 'salud', name: 'Salud', emoji: '💊', colorSlot: 4, type: 'gasto', builtin: true },
  { id: 'ocio', name: 'Ocio', emoji: '🎬', colorSlot: 5, type: 'gasto', builtin: true },
  { id: 'suscripciones', name: 'Suscripciones', emoji: '📱', colorSlot: 6, type: 'gasto', builtin: true },
  { id: 'ropa', name: 'Ropa', emoji: '👕', colorSlot: 7, type: 'gasto', builtin: true },
  { id: 'educacion', name: 'Educación', emoji: '📚', colorSlot: 0, type: 'gasto', builtin: true },
  { id: 'mascotas', name: 'Mascotas', emoji: '🐾', colorSlot: 2, type: 'gasto', builtin: true },
  { id: 'otros', name: 'Otros', emoji: '📦', colorSlot: 6, type: 'gasto', builtin: true },

  { id: 'sueldo', name: 'Sueldo', emoji: '💼', colorSlot: 5, type: 'ingreso', builtin: true },
  { id: 'extra', name: 'Ingreso extra', emoji: '✨', colorSlot: 2, type: 'ingreso', builtin: true },
  { id: 'reembolso', name: 'Reembolso', emoji: '↩️', colorSlot: 0, type: 'ingreso', builtin: true },
]

export const FALLBACK_CATEGORY: Category = {
  id: '__desconocida__',
  name: 'Sin categoría',
  emoji: '❔',
  colorSlot: 6,
  type: 'gasto',
  builtin: true,
}
