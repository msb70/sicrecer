import { describe, it, expect } from 'vitest'
import { puedeAcceder, puedeAccederCon, matrizDesdeFilas, moduloDeRuta, accionDeRuta, tienePermiso } from '../permisos'
import type { Rol } from '../../types'

const ROLES: Rol[] = ['administrador', 'coordinador', 'facilitador', 'comite', 'auditor']

describe('puedeAcceder — matriz base por perfil', () => {
  it('dashboard es accesible para todos los roles', () => {
    for (const rol of ROLES) expect(puedeAcceder(rol, '/dashboard')).toBe(true)
  })

  it('usuarios, roles y configuración son exclusivos del administrador', () => {
    for (const ruta of ['/usuarios', '/usuarios/nuevo', '/roles', '/roles/nuevo', '/configuracion']) {
      expect(puedeAcceder('administrador', ruta)).toBe(true)
      for (const rol of ROLES.filter(r => r !== 'administrador')) expect(puedeAcceder(rol, ruta)).toBe(false)
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

  it('formularios de edición exigen permiso de editar', () => {
    // El coordinador ve convenios pero no los edita
    expect(puedeAcceder('coordinador', '/convenios/conv-01')).toBe(true)
    expect(puedeAcceder('coordinador', '/convenios/conv-01/editar')).toBe(false)
    expect(puedeAcceder('coordinador', '/convenios/nuevo')).toBe(false)
    expect(puedeAcceder('administrador', '/convenios/conv-01/editar')).toBe(true)
  })

  it('rutas sin regla se niegan por defecto', () => {
    for (const rol of ROLES) expect(puedeAcceder(rol, '/ruta-inexistente')).toBe(false)
  })

  it('no confunde prefijos parciales (/comite vs /comites, /clientes vs /clientes-x)', () => {
    expect(moduloDeRuta('/comites/nuevo')).toBe('comites')
    expect(moduloDeRuta('/comite/sol-1')).toBe('comite')
    expect(puedeAcceder('facilitador', '/clientes-secreta')).toBe(false)
    expect(puedeAcceder('facilitador', '/clientes/grupos')).toBe(true)
  })
})

describe('roles configurables', () => {
  it('un rol personalizado solo entra donde tiene ver', () => {
    const m = matrizDesdeFilas([
      { modulo: 'dashboard', ver: true, editar: false, borrar: false },
      { modulo: 'clientes', ver: true, editar: false, borrar: false },
    ])
    expect(puedeAccederCon(m, '/clientes')).toBe(true)
    expect(puedeAccederCon(m, '/clientes/nuevo')).toBe(false)
    expect(puedeAccederCon(m, '/solicitudes')).toBe(false)
    expect(tienePermiso(m, 'clientes', 'borrar')).toBe(false)
  })

  it('editar sin ver no da acceso', () => {
    const m = matrizDesdeFilas([{ modulo: 'zonas', ver: false, editar: true, borrar: false }])
    expect(tienePermiso(m, 'zonas', 'editar')).toBe(false)
  })

  it('acción de ruta', () => {
    expect(accionDeRuta('/prospectos/nuevo')).toBe('editar')
    expect(accionDeRuta('/cobranza/nueva')).toBe('editar')
    expect(accionDeRuta('/productos/p1/editar')).toBe('editar')
    expect(accionDeRuta('/productos/p1')).toBe('ver')
  })
})
