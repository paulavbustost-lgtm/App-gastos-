import { describe, expect, it } from 'vitest'
import {
  cleanMerchant,
  extractAmounts,
  normalizeKey,
  parseChileanMoney,
  parseStatementDate,
  stripTrailingNoise,
  titleCase,
} from './text'

describe('parseStatementDate', () => {
  it('lee dd/mm/yy y dd/mm/yyyy', () => {
    expect(parseStatementDate('31/12/25')).toBe('2025-12-31')
    expect(parseStatementDate('21/01/2026')).toBe('2026-01-21')
  })

  it('encuentra la fecha dentro de un texto', () => {
    expect(parseStatementDate('FECHA ESTADO DE CUENTA 21/01/2026')).toBe('2026-01-21')
  })

  it('rechaza fechas imposibles', () => {
    expect(parseStatementDate('31/02/25')).toBeNull()
    expect(parseStatementDate('45/13/25')).toBeNull()
  })

  it('devuelve null si no hay fecha', () => {
    expect(parseStatementDate('TOTAL OPERACIONES')).toBeNull()
  })
})

describe('parseChileanMoney', () => {
  it('lee montos con puntos de miles', () => {
    expect(parseChileanMoney('1.053')).toBe(1053)
    expect(parseChileanMoney('254.576')).toBe(254576)
  })

  it('conserva el signo negativo', () => {
    expect(parseChileanMoney('-2.500.000')).toBe(-2500000)
  })

  it('ignora el símbolo de moneda', () => {
    expect(parseChileanMoney('$ 26.620')).toBe(26620)
  })

  it('lee decimales con coma', () => {
    expect(parseChileanMoney('2,15')).toBe(2.15)
  })
})

describe('extractAmounts', () => {
  it('saca los montos en orden de aparición', () => {
    expect(extractAmounts('$ 319.230 $ 319.230 $ 26.608')).toEqual([319230, 319230, 26608])
  })

  it('funciona con montos de menos de mil', () => {
    expect(extractAmounts('$ 915 $ 915 $ 915')).toEqual([915, 915, 915])
  })
})

describe('cleanMerchant', () => {
  it('saca el código de referencia del inicio', () => {
    expect(cleanMerchant('020111444437 RAPPI CHILE')).toBe('RAPPI CHILE')
  })

  it('saca prefijos de pasarela de pago', () => {
    expect(cleanMerchant('MERCADOPAGO*ALMACEN')).toBe('ALMACEN')
    expect(cleanMerchant('MP*PETVET')).toBe('PETVET')
    expect(cleanMerchant('PAYU *UBER TRIP')).toBe('UBER TRIP')
    expect(cleanMerchant('DLOCAL *PRIME VIDEO')).toBe('PRIME VIDEO')
    expect(cleanMerchant('DL RAPPI CHILE')).toBe('RAPPI CHILE')
  })

  it('saca códigos de local del final', () => {
    expect(cleanMerchant('CRUZ VERDE L9210')).toBe('CRUZ VERDE')
    expect(cleanMerchant('MC DONALDS 4 04')).toBe('MC DONALDS')
  })

  it('no deja el texto vacío', () => {
    expect(cleanMerchant('020111444437')).toBe('020111444437')
  })
})

describe('stripTrailingNoise', () => {
  it('saca la tasa de interés de las compras en cuotas', () => {
    expect(stripTrailingNoise('ZARA PARQUE ARAUCO TASA INT. 2,15%')).toBe('ZARA PARQUE ARAUCO')
    expect(stripTrailingNoise('WEB TRAVEL SKY TASA INT. 0,00%')).toBe('WEB TRAVEL SKY')
  })

  it('deja intacto lo que no es ruido', () => {
    expect(stripTrailingNoise('JUMBO ONECLICK')).toBe('JUMBO ONECLICK')
  })
})

describe('normalizeKey', () => {
  it('saca tildes y puntuación', () => {
    expect(normalizeKey('Farmacia Ahumada Ñuñoa')).toBe('FARMACIA AHUMADA NUNOA')
    expect(normalizeKey('MP*PET-VET')).toBe('MP PET VET')
  })
})

describe('titleCase', () => {
  it('convierte mayúsculas sostenidas', () => {
    expect(titleCase('JUMBO ONECLICK')).toBe('Jumbo Oneclick')
  })

  it('deja los conectores en minúscula', () => {
    expect(titleCase('SOCIEDAD DE ALIMENTOS')).toBe('Sociedad de Alimentos')
  })

  it('no toca lo que ya viene con mayúsculas y minúsculas', () => {
    expect(titleCase('Pago Pesos TEF')).toBe('Pago Pesos TEF')
  })
})
