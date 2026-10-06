import { describe, it, expect } from 'vitest'
import { normalizarRed, urlRed, etiquetaRed } from '../redes'

describe('redes sociales', () => {
  it('normaliza Instagram', () => {
    expect(normalizarRed('instagram', '@maria.lopez')).toBe('maria.lopez')
    expect(normalizarRed('instagram', 'https://www.instagram.com/maria.lopez/?hl=es')).toBe('maria.lopez')
    expect(normalizarRed('instagram', 'instagram.com/maria')).toBe('maria')
    expect(normalizarRed('instagram', '   ')).toBeNull()
  })
  it('normaliza Facebook', () => {
    expect(normalizarRed('facebook', 'https://m.facebook.com/tienda.ana')).toBe('tienda.ana')
    expect(normalizarRed('facebook', 'https://www.facebook.com/profile.php?id=1000123')).toBe('https://www.facebook.com/profile.php?id=1000123')
  })
  it('construye URL y etiqueta', () => {
    expect(urlRed('instagram', 'maria')).toBe('https://www.instagram.com/maria')
    expect(urlRed('facebook', 'tienda.ana')).toBe('https://www.facebook.com/tienda.ana')
    expect(etiquetaRed('instagram', 'maria')).toBe('@maria')
    expect(etiquetaRed('facebook', 'https://www.facebook.com/profile.php?id=1')).toBe('Perfil de Facebook')
  })
})
