import { describe, expect, it } from 'vitest'
import { parseAmount } from './format'

describe('parseAmount', () => {
  it('lee números simples', () => {
    expect(parseAmount('1200')).toBe(1200)
  })

  it('trata el punto de miles como miles', () => {
    expect(parseAmount('12.500')).toBe(12500)
    expect(parseAmount('1.200.000')).toBe(1200000)
  })

  it('trata la coma como decimal', () => {
    expect(parseAmount('12,5')).toBe(12.5)
    expect(parseAmount('1.234,56')).toBe(1234.56)
  })

  it('acepta el formato con coma de miles y punto decimal', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56)
  })

  it('ignora el símbolo de moneda y los espacios', () => {
    expect(parseAmount('$ 9.990')).toBe(9990)
  })

  it('devuelve NaN cuando no hay número', () => {
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('abc')).toBeNaN()
  })
})
