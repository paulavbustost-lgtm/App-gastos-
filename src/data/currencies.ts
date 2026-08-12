export interface CurrencyOption {
  currency: string
  locale: string
  label: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { currency: 'CLP', locale: 'es-CL', label: 'Chile — peso (CLP)' },
  { currency: 'ARS', locale: 'es-AR', label: 'Argentina — peso (ARS)' },
  { currency: 'BOB', locale: 'es-BO', label: 'Bolivia — boliviano (BOB)' },
  { currency: 'BRL', locale: 'pt-BR', label: 'Brasil — real (BRL)' },
  { currency: 'COP', locale: 'es-CO', label: 'Colombia — peso (COP)' },
  { currency: 'CRC', locale: 'es-CR', label: 'Costa Rica — colón (CRC)' },
  { currency: 'MXN', locale: 'es-MX', label: 'México — peso (MXN)' },
  { currency: 'PEN', locale: 'es-PE', label: 'Perú — sol (PEN)' },
  { currency: 'PYG', locale: 'es-PY', label: 'Paraguay — guaraní (PYG)' },
  { currency: 'UYU', locale: 'es-UY', label: 'Uruguay — peso (UYU)' },
  { currency: 'USD', locale: 'es-US', label: 'Dólar (USD)' },
  { currency: 'EUR', locale: 'es-ES', label: 'Euro (EUR)' },
]

/** Símbolo suelto para el campo de monto, sin el código de moneda. */
export function currencySymbol(locale: string, currency: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0)
    return parts.find((p) => p.type === 'currency')?.value ?? '$'
  } catch {
    return '$'
  }
}
