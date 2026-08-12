import { describe, expect, it } from 'vitest'
import { readDelimited } from './sheet'

describe('readDelimited', () => {
  it('detecta el punto y coma, que es lo que usan los bancos chilenos', () => {
    expect(readDelimited('Fecha;Detalle;Monto\n01/08/2026;Jumbo;12.500')).toEqual([
      ['Fecha', 'Detalle', 'Monto'],
      ['01/08/2026', 'Jumbo', '12.500'],
    ])
  })

  it('detecta la coma cuando es el separador', () => {
    expect(readDelimited('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('respeta el separador dentro de comillas', () => {
    expect(readDelimited('Detalle;Monto\n"Café, pan y leche";3.500')).toEqual([
      ['Detalle', 'Monto'],
      ['Café, pan y leche', '3.500'],
    ])
  })

  it('entiende las comillas escapadas', () => {
    expect(readDelimited('a\n"Dijo ""hola"""')).toEqual([['a'], ['Dijo "hola"']])
  })

  it('saca el BOM del inicio', () => {
    expect(readDelimited('﻿Fecha;Monto\n01/08/2026;100')[0]).toEqual(['Fecha', 'Monto'])
  })

  it('tolera saltos de línea de Windows', () => {
    expect(readDelimited('a;b\r\n1;2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('descarta filas totalmente vacías', () => {
    expect(readDelimited('a;b\n\n1;2\n;;\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})
