import type { Rol, AccionPermiso, Modulo } from '../types'

// ─── ROLES Y PERMISOS ─────────────────────────────────────────
// Los permisos viven en la BD (tablas roles / rol_permisos, migración 0015)
// y la RLS los hace cumplir con fn_permiso_actual(). En el frontend esta
// matriz decide qué pantallas se muestran y qué botones aparecen; es UX,
// no la barrera final.

export type ModuloId =
  | 'dashboard' | 'agenda' | 'calculadora'
  | 'prospectos' | 'clientes' | 'solicitudes' | 'comite'
  | 'desembolsos' | 'cartera' | 'cobranza' | 'cierre' | 'reportes'
  | 'convenios' | 'productos' | 'zonas' | 'requisitos' | 'actividades' | 'bancos'
  | 'comites' | 'usuarios' | 'roles' | 'configuracion'

export interface Permiso { ver: boolean; editar: boolean; borrar: boolean }
export type MatrizPermisos = Partial<Record<string, Permiso>>

/** Catálogo de módulos (igual al sembrado en public.modulos). Se usa si la tabla aún no carga. */
export const MODULOS_BASE: Modulo[] = [
  { id: 'dashboard',     nombre: 'Dashboard',                  grupo: 'General',       orden: 10,  acciones: ['ver'] },
  { id: 'agenda',        nombre: 'Agenda y visitas',           grupo: 'General',       orden: 20,  acciones: ['ver', 'editar', 'borrar'] },
  { id: 'calculadora',   nombre: 'Calculadora',                grupo: 'General',       orden: 30,  acciones: ['ver'] },
  { id: 'prospectos',    nombre: 'Prospectos',                 grupo: 'Originación',   orden: 40,  acciones: ['ver', 'editar', 'borrar'] },
  { id: 'clientes',      nombre: 'Clientes',                   grupo: 'Originación',   orden: 50,  acciones: ['ver', 'editar', 'borrar'] },
  { id: 'solicitudes',   nombre: 'Solicitudes y evaluación',   grupo: 'Originación',   orden: 60,  acciones: ['ver', 'editar', 'borrar'] },
  { id: 'comite',        nombre: 'Comité (votación)',          grupo: 'Originación',   orden: 70,  acciones: ['ver', 'editar'] },
  { id: 'desembolsos',   nombre: 'Desembolsos',                grupo: 'Cartera',       orden: 80,  acciones: ['ver', 'editar'] },
  { id: 'cartera',       nombre: 'Cartera',                    grupo: 'Cartera',       orden: 90,  acciones: ['ver'] },
  { id: 'cobranza',      nombre: 'Cobranza (registrar pagos)', grupo: 'Cartera',       orden: 100, acciones: ['ver', 'editar'] },
  { id: 'cierre',        nombre: 'Cierre mensual',             grupo: 'Cartera',       orden: 110, acciones: ['ver', 'editar'] },
  { id: 'reportes',      nombre: 'Reportes',                   grupo: 'Cartera',       orden: 120, acciones: ['ver'] },
  { id: 'convenios',     nombre: 'Convenios',                  grupo: 'Datos',         orden: 130, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'productos',     nombre: 'Productos',                  grupo: 'Datos',         orden: 140, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'zonas',         nombre: 'Zonas',                      grupo: 'Datos',         orden: 150, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'requisitos',    nombre: 'Requisitos',                 grupo: 'Datos',         orden: 160, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'actividades',   nombre: 'Actividades económicas',     grupo: 'Datos',         orden: 170, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'bancos',        nombre: 'Bancos',                     grupo: 'Datos',         orden: 180, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'comites',       nombre: 'Comités (configuración)',    grupo: 'Configuración', orden: 190, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'usuarios',      nombre: 'Usuarios',                   grupo: 'Configuración', orden: 200, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'roles',         nombre: 'Roles y permisos',           grupo: 'Configuración', orden: 210, acciones: ['ver', 'editar', 'borrar'] },
  { id: 'configuracion', nombre: 'Configuración general',      grupo: 'Configuración', orden: 220, acciones: ['ver', 'editar'] },
]

const V: Permiso = { ver: true, editar: false, borrar: false }
const VE: Permiso = { ver: true, editar: true, borrar: false }
const VEB: Permiso = { ver: true, editar: true, borrar: true }

/** Matriz inicial de los roles del sistema (espejo del seed SQL). Modo demo / respaldo. */
export const MATRIZ_BASE: Record<Rol, MatrizPermisos> = {
  administrador: {
    dashboard: V, agenda: VEB, calculadora: V, prospectos: VEB, clientes: VEB, solicitudes: VEB,
    comite: VE, desembolsos: VE, cartera: V, cobranza: VE, cierre: VE, reportes: V,
    convenios: VEB, productos: VEB, zonas: VEB, requisitos: VEB, actividades: VEB, bancos: VEB,
    comites: VEB, usuarios: VEB, roles: VEB, configuracion: VE,
  },
  coordinador: {
    dashboard: V, agenda: VEB, calculadora: V, prospectos: VEB, clientes: VEB, solicitudes: VEB,
    desembolsos: VE, cartera: V, cobranza: VE, cierre: VE, reportes: V,
    convenios: V, productos: V, zonas: VE, requisitos: V, actividades: V, bancos: V,
  },
  facilitador: {
    dashboard: V, agenda: VE, calculadora: V, prospectos: VE, clientes: VE, solicitudes: VE,
    cartera: V, cobranza: VE,
  },
  comite: { dashboard: V, comite: VE },
  auditor: { dashboard: V, cartera: V, cierre: V, reportes: V },
}

/** Prefijo de ruta → módulo. El prefijo más largo gana. */
export const RUTA_MODULO: Record<string, ModuloId> = {
  '/dashboard':              'dashboard',
  '/agenda':                 'agenda',
  '/calculadora':            'calculadora',
  '/prospectos':             'prospectos',
  '/clientes':               'clientes',
  '/solicitudes':            'solicitudes',
  '/comite':                 'comite',
  '/cartera':                'cartera',
  '/cobranza':               'cobranza',
  '/cierre-mensual':         'cierre',
  '/reportes':               'reportes',
  '/convenios':              'convenios',
  '/productos':              'productos',
  '/zonas':                  'zonas',
  '/requisitos':             'requisitos',
  '/actividades-economicas': 'actividades',
  '/bancos':                 'bancos',
  '/comites':                'comites',
  '/usuarios':               'usuarios',
  '/roles':                  'roles',
  '/configuracion':          'configuracion',
}

/** Módulo al que pertenece una ruta (null si no tiene regla). */
export function moduloDeRuta(pathname: string): ModuloId | null {
  let mejor: ModuloId | null = null
  let mejorLen = -1
  for (const [prefijo, modulo] of Object.entries(RUTA_MODULO)) {
    if ((pathname === prefijo || pathname.startsWith(prefijo + '/')) && prefijo.length > mejorLen) {
      mejor = modulo
      mejorLen = prefijo.length
    }
  }
  return mejor
}

/** Acción que exige la ruta: formularios de alta/edición piden `editar`, lo demás `ver`. */
export function accionDeRuta(pathname: string): AccionPermiso {
  return /\/(nuevo|nueva|editar)$/.test(pathname) ? 'editar' : 'ver'
}

export function tienePermiso(matriz: MatrizPermisos, modulo: string, accion: AccionPermiso = 'ver'): boolean {
  const p = matriz[modulo]
  return Boolean(p && p.ver && p[accion])
}

/** ¿La matriz permite entrar a la ruta? Rutas sin regla se niegan. */
export function puedeAccederCon(matriz: MatrizPermisos, pathname: string): boolean {
  const modulo = moduloDeRuta(pathname)
  if (!modulo) return false
  return tienePermiso(matriz, modulo, accionDeRuta(pathname))
}

/** Atajo con la matriz base de un perfil (tests, modo demo). */
export function puedeAcceder(rol: Rol, pathname: string): boolean {
  return puedeAccederCon(MATRIZ_BASE[rol], pathname)
}

/** Construye la matriz de un rol a partir de las filas de rol_permisos. */
export function matrizDesdeFilas(filas: { modulo: string; ver: boolean; editar: boolean; borrar: boolean }[]): MatrizPermisos {
  const m: MatrizPermisos = {}
  for (const f of filas) m[f.modulo] = { ver: f.ver, editar: f.editar, borrar: f.borrar }
  return m
}
