import { describe, it, expect } from 'vitest'
import { puedeAcceder } from '../permisos'
import type { Rol } from '../../types'

const ROLES: Rol[] = ['administrador', 'coordinador', 'facilitador', 'comite', 'auditor']

describe('puedeAcceder — matriz RBAC de rutas', () => {
  it('dashboard es accesible para todos los roles', () => {
    for (const rol of ROLES) {
      expect(puedeAcceder(rol, '/dashboard')).toBe(true)
    }
  })

  it('usuarios y configuración son exclusivos del administrador', () => {
    expect(puedeAcceder('administrador', '/usuarios')).toBe(true)
    expect(puedeAcceder('administrador', '/configuracion')).toBe(true)
    for (const rol of ROLES.filter(r => r !== 'administrador')) {
      expect(puedeAcceder(rol, '/usuarios')).toBe(false)
      expect(puedeAcceder(rol, '/usuarios/nuevo')).toBe(false)
      expect(puedeAcceder(rol, '/configuracion')).toBe(false)
    }
  })

  it('comité solo para comite y administrador', () => {
    expect(puedeAcceder('comite', '/comite')).toBe(true)
    expect(puedeAcceder('administrador', '/comite/sol-01')).toBe(true)
    expect(puedeAcceder('facilitador', '/comite')).toBe(false)
    expect(puedeAcceder('auditor', '/comite')).toBe(false)
  })

  it('el auditor es de solo lectura: sin cobranza ni solicitudes', () => {
    expect(puedeAcceder('auditor', '/cobranza')).toBe(false)
    expect(puedeAcceder('auditor', '/cobranza/nueva')).toBe(false)
    expect(puedeAcceder('auditor', '/solicitudes')).toBe(false)
    expect(puedeAcceder('auditor', '/cartera')).toBe(true)
    expect(puedeAcceder('auditor', '/reportes')).toBe(true)
  })

  it('el facilitador no accede a catálogos de gestión', () => {
    expect(puedeAcceder('facilitador', '/convenios')).toBe(false)
    expect(puedeAcceder('facilitador', '/productos')).toBe(false)
    expect(puedeAcceder('facilitador', '/bancos')).toBe(false)
    expect(puedeAcceder('facilitador', '/prospectos')).toBe(true)
    expect(puedeAcceder('facilitador', '/cobranza/nueva')).toBe(true)
  })

  it('las subrutas heredan el permiso del prefijo', () => {
    expect(puedeAcceder('coordinador', '/convenios/conv-01/editar')).toBe(true)
    expect(puedeAcceder('facilitador', '/convenios/conv-01/editar')).toBe(false)
  })

  it('rutas sin regla se niegan por defecto', () => {
    for (const rol of ROLES) {
      expect(puedeAcceder(rol, '/ruta-inexistente')).toBe(false)
    }
  })

  it('no confunde prefijos parciales (p. ej. /clientes vs /clientes-x)', () => {
    expect(puedeAcceder('facilitador', '/clientes-secreta')).toBe(false)
    expect(puedeAcceder('facilitador', '/clientes/grupos')).toBe(true)
  })
})
