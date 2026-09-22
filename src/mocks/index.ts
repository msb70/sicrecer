// ─── ALMACÉN DE DATOS ─────────────────────────────────────────
// Este módulo conserva los mismos nombres exportados que la fase
// mock (ORGANIZACIONES, CLIENTES, …) para no tocar las páginas,
// pero ahora los arrays se llenan desde la base de datos Neon
// (Data API) al iniciar sesión con Google. En modo demo se cargan
// los datos de ./fallback.ts.

import type {
  Organizacion, Usuario, Convenio, ProductoCredito,
  Prospecto, Cliente, Solicitud, Credito,
  Requisito, ActividadEconomica, Cobranza, Banco, ActividadCRM,
  Comite, ComiteMiembro, ComiteVoto, Solicitante,
} from '../types'
import { neon } from '../lib/neon'
import * as demo from './fallback'
import { PAGOS, VISITAS, KPI_REPORTES, cargarExtrasDemo, type Pago, type Visita } from './extra'

// Arrays mutables: se inicializan con los datos demo para que la
// UI nunca encuentre datos vacíos antes del primer login.
export const ORGANIZACIONES: Organizacion[] = [...demo.ORGANIZACIONES_DEMO]
export const USUARIOS: Usuario[] = [...demo.USUARIOS_DEMO]
export const CONVENIOS: Convenio[] = [...demo.CONVENIOS_DEMO]
export const BANCOS: Banco[] = [...demo.BANCOS_DEMO]
export const REQUISITOS: Requisito[] = [...demo.REQUISITOS_DEMO]
export const ACTIVIDADES_ECONOMICAS: ActividadEconomica[] = [...demo.ACTIVIDADES_ECONOMICAS_DEMO]
export const PRODUCTOS: ProductoCredito[] = [...demo.PRODUCTOS_DEMO]
export const PROSPECTOS: Prospecto[] = [...demo.PROSPECTOS_DEMO]
export const ACTIVIDADES_CRM: ActividadCRM[] = [...demo.ACTIVIDADES_CRM_DEMO]
export const CLIENTES: Cliente[] = [...demo.CLIENTES_DEMO]
export const SOLICITUDES: Solicitud[] = [...demo.SOLICITUDES_DEMO]
export const CREDITOS: Credito[] = [...demo.CREDITOS_DEMO]
export const COBRANZAS: Cobranza[] = [...demo.COBRANZAS_DEMO]
// Portal / comités (sin datos demo: solo existen en Neon)
export const COMITES: Comite[] = []
export const COMITE_MIEMBROS: ComiteMiembro[] = []
export const COMITE_VOTOS: ComiteVoto[] = []
export const SOLICITANTES: Solicitante[] = []

function reemplazar<T>(destino: T[], filas: T[]) {
  destino.splice(0, destino.length, ...filas)
}

async function tabla<T>(nombre: string, orden = 'id'): Promise<T[]> {
  const { data, error } = await neon.from(nombre).select('*').order(orden)
  if (error) throw new Error(`Error cargando ${nombre}: ${error.message}`)
  return (data ?? []) as T[]
}

/** Carga todos los datos desde Neon (requiere sesión activa por RLS). */
export async function cargarDatosDesdeNeon(): Promise<void> {
  const [
    organizaciones, usuarios, convenios, bancos, requisitos,
    actividades, productos, prospectos, crm, clientes,
    solicitudes, creditos, cobranzas, pagos, visitas, kpis,
    comites, comiteMiembros, comiteVotos, solicitantes,
  ] = await Promise.all([
    tabla<Organizacion>('organizaciones'),
    tabla<Usuario>('usuarios'),
    tabla<Convenio>('convenios'),
    tabla<Banco>('bancos'),
    tabla<Requisito>('requisitos'),
    tabla<ActividadEconomica>('actividades_economicas'),
    tabla<ProductoCredito>('productos_credito'),
    tabla<Prospecto>('prospectos'),
    tabla<ActividadCRM>('actividades_crm'),
    tabla<Cliente>('clientes'),
    tabla<Solicitud>('solicitudes'),
    tabla<Credito>('creditos'),
    tabla<Cobranza>('cobranzas'),
    tabla<Pago>('pagos'),
    tabla<Visita>('visitas'),
    neon.from('kpi_reportes').select('datos').eq('id', 'actual').then(r => {
      if (r.error) throw new Error(`Error cargando kpi_reportes: ${r.error.message}`)
      return r.data as { datos: typeof KPI_REPORTES }[]
    }),
    tabla<Comite>('comites'),
    tabla<ComiteMiembro>('comite_miembros', 'comite_id'),
    tabla<ComiteVoto>('comite_votos'),
    tabla<Solicitante>('solicitantes'),
  ])

  reemplazar(ORGANIZACIONES, organizaciones)
  reemplazar(USUARIOS, usuarios)
  reemplazar(CONVENIOS, convenios)
  reemplazar(BANCOS, bancos)
  reemplazar(REQUISITOS, requisitos)
  reemplazar(ACTIVIDADES_ECONOMICAS, actividades)
  reemplazar(PRODUCTOS, productos)
  reemplazar(PROSPECTOS, prospectos)
  reemplazar(ACTIVIDADES_CRM, crm)
  reemplazar(CLIENTES, clientes)
  reemplazar(SOLICITUDES, solicitudes)
  reemplazar(CREDITOS, creditos)
  reemplazar(COBRANZAS, cobranzas)
  reemplazar(PAGOS, pagos)
  reemplazar(VISITAS, visitas)
  reemplazar(COMITES, comites)
  reemplazar(COMITE_MIEMBROS, comiteMiembros)
  reemplazar(COMITE_VOTOS, comiteVotos)
  reemplazar(SOLICITANTES, solicitantes)
  if (kpis[0]) Object.assign(KPI_REPORTES, kpis[0].datos)
}

/** Recarga selectiva tras una escritura (solicitudes, votos, comités…). */
export async function recargarTablas(...nombres: ('solicitudes' | 'comite_votos' | 'comites' | 'comite_miembros' | 'clientes' | 'solicitantes' | 'productos_credito')[]): Promise<void> {
  await Promise.all(nombres.map(async n => {
    switch (n) {
      case 'solicitudes':      reemplazar(SOLICITUDES, await tabla<Solicitud>('solicitudes')); break
      case 'comite_votos':     reemplazar(COMITE_VOTOS, await tabla<ComiteVoto>('comite_votos')); break
      case 'comites':          reemplazar(COMITES, await tabla<Comite>('comites')); break
      case 'comite_miembros':  reemplazar(COMITE_MIEMBROS, await tabla<ComiteMiembro>('comite_miembros', 'comite_id')); break
      case 'clientes':         reemplazar(CLIENTES, await tabla<Cliente>('clientes')); break
      case 'solicitantes':     reemplazar(SOLICITANTES, await tabla<Solicitante>('solicitantes')); break
      case 'productos_credito': reemplazar(PRODUCTOS, await tabla<ProductoCredito>('productos_credito')); break
    }
  }))
}

/** Restaura los datos demo (modo demo sin conexión a Neon). */
export function restaurarDatosDemo(): void {
  reemplazar(ORGANIZACIONES, [...demo.ORGANIZACIONES_DEMO])
  reemplazar(USUARIOS, [...demo.USUARIOS_DEMO])
  reemplazar(CONVENIOS, [...demo.CONVENIOS_DEMO])
  reemplazar(BANCOS, [...demo.BANCOS_DEMO])
  reemplazar(REQUISITOS, [...demo.REQUISITOS_DEMO])
  reemplazar(ACTIVIDADES_ECONOMICAS, [...demo.ACTIVIDADES_ECONOMICAS_DEMO])
  reemplazar(PRODUCTOS, [...demo.PRODUCTOS_DEMO])
  reemplazar(PROSPECTOS, [...demo.PROSPECTOS_DEMO])
  reemplazar(ACTIVIDADES_CRM, [...demo.ACTIVIDADES_CRM_DEMO])
  reemplazar(CLIENTES, [...demo.CLIENTES_DEMO])
  reemplazar(SOLICITUDES, [...demo.SOLICITUDES_DEMO])
  reemplazar(CREDITOS, [...demo.CREDITOS_DEMO])
  reemplazar(COBRANZAS, [...demo.COBRANZAS_DEMO])
  reemplazar(COMITES, []); reemplazar(COMITE_MIEMBROS, []); reemplazar(COMITE_VOTOS, []); reemplazar(SOLICITANTES, [])
  cargarExtrasDemo()
}

// ─── HELPERS ──────────────────────────────────────────────────
export const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export const formatUVC = (n: number) =>
  `${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(n)} UVC`
