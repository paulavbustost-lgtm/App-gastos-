import { describe, expect, it } from 'vitest'
import { DEFAULT_CATEGORIES } from '../../data/categories'
import { learnRule, suggestCategory } from './rules'

const cats = DEFAULT_CATEGORIES

describe('suggestCategory', () => {
  it('reconoce comercios chilenos comunes', () => {
    expect(suggestCategory('Jumbo Oneclick', cats)).toBe('supermercado')
    expect(suggestCategory('Cruz Verde', cats)).toBe('salud')
    expect(suggestCategory('Uber Trip', cats)).toBe('transporte')
    expect(suggestCategory('Prime Video', cats)).toBe('suscripciones')
    expect(suggestCategory('Cine Hoyts', cats)).toBe('ocio')
  })

  it('manda la regla más específica', () => {
    // "UBER EATS" gana sobre "UBER" aunque ambas coincidan.
    expect(suggestCategory('Uber Eats', cats)).toBe('comida')
  })

  it('manda comisiones e impuestos a la categoría del banco', () => {
    expect(suggestCategory('Comision Mensual Por Mantencion', cats)).toBe('banco')
    expect(suggestCategory('Impuesto Decreto Ley 3475', cats)).toBe('banco')
  })

  it('cae en Otros cuando no reconoce el comercio', () => {
    expect(suggestCategory('Zxqw Spa Ltda', cats)).toBe('otros')
  })

  it('las reglas aprendidas ganan sobre las de fábrica', () => {
    const learned = { 'JUMBO ONECLICK': 'hogar' }
    expect(suggestCategory('Jumbo Oneclick', cats, learned)).toBe('hogar')
  })

  it('una regla aprendida aplica a comercios que la contienen', () => {
    const learned = { MAIHUE: 'comida' }
    expect(suggestCategory('Toku Maihue Local 3', cats, learned)).toBe('comida')
  })

  it('ignora reglas aprendidas hacia categorías que ya no existen', () => {
    const learned = { 'JUMBO ONECLICK': 'categoria-borrada' }
    expect(suggestCategory('Jumbo Oneclick', cats, learned)).toBe('supermercado')
  })
})

describe('learnRule', () => {
  it('guarda la corrección normalizada', () => {
    expect(learnRule({}, 'Café Del Barrio', 'comida')).toEqual({ 'CAFE DEL BARRIO': 'comida' })
  })

  it('la corrección más nueva reemplaza a la anterior', () => {
    const first = learnRule({}, 'Lavamax', 'otros')
    expect(learnRule(first, 'Lavamax', 'hogar')).toEqual({ LAVAMAX: 'hogar' })
  })

  it('no guarda nombres vacíos', () => {
    expect(learnRule({}, '   ', 'comida')).toEqual({})
  })
})
