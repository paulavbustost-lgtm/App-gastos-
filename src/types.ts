export type TxType = 'gasto' | 'ingreso'

export type PaymentMethod = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'otro'

export interface Transaction {
  id: string
  type: TxType
  /** Siempre positivo. El signo lo determina `type`. */
  amount: number
  categoryId: string
  /** Fecha local en formato YYYY-MM-DD. */
  date: string
  note: string
  method: PaymentMethod
  createdAt: number
}

export interface Category {
  id: string
  name: string
  emoji: string
  /** Índice 0-7 dentro de la paleta categórica. */
  colorSlot: number
  type: TxType
  /** Las categorías base no se pueden eliminar, solo ocultar. */
  builtin?: boolean
  archived?: boolean
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface Settings {
  currency: string
  locale: string
  /** 0 = sin presupuesto definido. */
  monthlyBudget: number
  /** Presupuesto por categoría de gasto. 0 o ausente = sin tope. */
  categoryBudgets: Record<string, number>
  theme: ThemePref
  /** Día de corte del período (1-28). 1 = mes calendario. */
  cutDay: number
  /**
   * Comercio normalizado → categoría, aprendido de las correcciones hechas al
   * importar cartolas. Hace que la siguiente importación llegue mejor.
   */
  merchantRules: Record<string, string>
}

export interface AppState {
  version: number
  transactions: Transaction[]
  categories: Category[]
  settings: Settings
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
]
