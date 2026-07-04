import type { Rol } from '../types'

// ─── MATRIZ DE PERMISOS POR RUTA ──────────────────────────────
// Única fuente de verdad para autorización de rutas en el frontend.
// Coherente con el menú del Shell. La autorización de datos real
// vive en RLS (ver db/migrations/0003_transaccional_rbac.sql):
// esta matriz es defensa en profundidad de UX, no la barrera final.

const TODOS: Rol[] = ['administrador', 'coordinador', 'facilitador', 'comite', 'auditor']
const GESTION: Rol[] = ['administrador', 'coordinador']
const OPERACION: Rol[] = ['administrador', 'coordinador', 'facilitador']

/** Prefijo de ruta → roles permitidos. El prefijo más largo gana. */
export const PERMISOS_RUTA: Record<string, Rol[]> = {
  '/dashboard':               TODOS,

  '/zonas':                   GESTION,
  '/convenios':               GESTION,
  '/requisitos':              GESTION,
  '/actividades-economicas':  GESTION,
  '/bancos':                  GESTION,
  '/productos':               GESTION,

  '/prospectos':              OPERACION,
  '/solicitudes':             OPERACION,
  '/clientes':                OPERACION,
  '/cobranza':                OPERACION,

  '/comite':                  ['comite', 'administrador'],
  '/cartera':                 ['administrador', 'coordinador', 'facilitador', 'auditor'],
  '/cierre-mensual':          ['administrador', 'coordinador', 'auditor'],
  '/calculadora':             OPERACION,
  '/reportes':                ['administrador', 'coordinador', 'auditor'],

  '/usuarios':                ['administrador'],
  '/configuracion':           ['administrador'],

  '/agenda':                  ['facilitador', 'coordinador'],
  '/asistente':               ['facilitador', 'coordinador'],
}

/** ¿Puede el rol acceder a la ruta? Prefijo más específico decide. */
export function puedeAcceder(rol: Rol, pathname: string): boolean {
  let mejor: Rol[] | null = null
  let mejorLen = -1
  for (const [prefijo, roles] of Object.entries(PERMISOS_RUTA)) {
    if ((pathname === prefijo || pathname.startsWith(prefijo + '/')) && prefijo.length > mejorLen) {
      mejor = roles
      mejorLen = prefijo.length
    }
  }
  // Ruta sin regla: negar por defecto salvo dashboard (ya cubierto).
  return mejor ? mejor.includes(rol) : false
}
