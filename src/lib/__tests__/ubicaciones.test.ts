import { describe, it, expect } from 'vitest'
import { coberturaIncluye, describirCobertura, validarUbicacion, etiquetaLocalidad, OTRAS } from '../ubicaciones'

describe('cobertura de productos', () => {
  it('vacía = cualquier lugar', () => {
    expect(coberturaIncluye([], 'Medellín', null)).toBe(true)
    expect(coberturaIncluye(undefined, null, null)).toBe(true)
  })
  it('toda Bogotá incluye cualquier localidad', () => {
    expect(coberturaIncluye(['Bogotá'], 'Bogotá', 'Usme')).toBe(true)
    expect(coberturaIncluye(['Bogotá'], 'bogota', 'Suba')).toBe(true)
    expect(coberturaIncluye(['Bogotá'], 'Soacha', null)).toBe(false)
  })
  it('localidad concreta', () => {
    const cob = ['Bogotá|Usme', 'Bogotá|Bosa', 'Soacha']
    expect(coberturaIncluye(cob, 'Bogotá', 'Usme')).toBe(true)
    expect(coberturaIncluye(cob, 'Bogotá', 'Suba')).toBe(false)
    expect(coberturaIncluye(cob, 'Bogotá', null)).toBe(false)
    expect(coberturaIncluye(cob, 'Soacha', null)).toBe(true)
  })
  it('municipios sin tilde y otras ciudades', () => {
    expect(coberturaIncluye(['Chía'], 'Chia', null)).toBe(true)
    expect(coberturaIncluye(['Chía'], 'Medellín', null)).toBe(false)
    expect(coberturaIncluye([OTRAS], 'Medellín', null)).toBe(true)
    expect(coberturaIncluye([OTRAS], 'Soacha', null)).toBe(false)
  })
  it('sin ciudad no califica si hay restricción', () => {
    expect(coberturaIncluye(['Bogotá'], '', null)).toBe(false)
  })
  it('descripción', () => {
    expect(describirCobertura([])).toBe('Cualquier ciudad o localidad')
    expect(describirCobertura(['Bogotá|Usme', 'Soacha', OTRAS])).toBe('Bogotá: Usme · Soacha · Otras ciudades')
  })
})

describe('ubicación de personas', () => {
  it('Bogotá exige localidad', () => {
    expect(validarUbicacion({ pais: 'CO', ciudad: 'Bogotá' })).toMatch(/localidad/)
    expect(validarUbicacion({ pais: 'CO', ciudad: 'Bogotá', localidad: 'Kennedy' })).toBe('')
    expect(validarUbicacion({ pais: 'CO', ciudad: 'Madrid' })).toBe('')
    expect(validarUbicacion({ pais: 'CO', ciudad: '' })).toMatch(/ciudad/)
  })
  it('etiqueta con número y zona rural', () => {
    expect(etiquetaLocalidad('Usaquén')).toBe('Usaquén (Localidad 1)')
    expect(etiquetaLocalidad('Sumapaz')).toBe('Sumapaz (Localidad 20 · rural)')
  })
})
