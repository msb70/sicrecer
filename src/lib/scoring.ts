// ─── Scoring FEM (migración 0014) ─────────────────────────────
// 100 puntos: Capacidad 50 (cobertura 30 + estabilidad 20) · Experiencia 30 ·
// Voluntad 20 (veracidad 12 + compromisos 8). El cálculo vive en la base
// (fn_scoring_fem); aquí solo se lee, se muestra y se captura la evaluación.

import { neon } from './neon'

export type Semaforo = 'verde' | 'ambar' | 'naranja' | 'rojo'

export interface ScoringFEM {
  estado: 'evaluada' | 'sin_evaluacion'
  ruta: 'nuevo' | 'renovacion'
  score: number | null
  semaforo: Semaforo | null
  banda: string | null
  preaprobacion: 'preaprobado' | 'revision' | 'no_preaprobado' | 'pendiente_visita'
  componentes?: {
    capacidad: number; cobertura: number; estabilidad: number; antiguedad: number; variabilidad: number
    experiencia: number; voluntad: number; veracidad: number; compromisos: number
  }
  fecha_visita?: string | null
  ventas?: number | null
  flujo_libre?: number
  cuota?: number
  cuota_mensual?: number
  proporcion_flujo?: number | null
  monto_pedido?: number
  plazo?: number
  monto_capacidad?: number | null
  monto_sugerido: number | null
  monto_anterior?: number | null
  meses_negocio?: number
  recurrente?: boolean
  filtros?: string[]
  alertas?: string[]
  razones: string[]
}

export const SEMAFORO: Record<Semaforo, { texto: string; color: 'green' | 'yellow' | 'orange' | 'red'; hex: string; accion: string }> = {
  verde:   { texto: 'Verde',   color: 'green',  hex: '#2e8b57', accion: 'Recomendar condiciones calculadas' },
  ambar:   { texto: 'Ámbar',   color: 'yellow', hex: '#b7791f', accion: 'Ajustar monto o plazo, o pedir soporte' },
  naranja: { texto: 'Naranja', color: 'orange', hex: '#c8632f', accion: 'Revisión reforzada y mitigantes' },
  rojo:    { texto: 'Rojo',    color: 'red',    hex: '#b83c3c', accion: 'Subsanar o ruta de mejora; sin propuesta' },
}

export interface Evaluacion {
  id?: string
  solicitud_id: string
  asesor_id?: string | null
  fecha_visita: string | null
  consentimiento_consulta: boolean
  requisitos_completos: boolean
  destino: string | null
  ventas_mensuales: number | null
  costo_ventas: number | null
  gastos_negocio: number | null
  gastos_hogar: number | null
  otras_cuotas: number
  fecha_inicio_negocio: string | null
  variabilidad_ventas: 'estable' | 'moderada' | 'alta' | null
  consulta_externa: 'no_consultada' | 'sin_historial' | 'al_dia' | 'reporte_rectificado' | 'reporte_negativo_vigente'
  referencias_verificadas: number
  ver_identidad: boolean
  ver_ventas_soportadas: boolean
  ver_referencias: boolean
  ver_sin_discrepancias: boolean
  comp_documentos: boolean
  comp_citas: boolean
  comp_servicios: boolean
  comp_ahorro_capacitacion: boolean
  evidencias: string[]
  discrepancias: string | null
  observaciones: string | null
}

export function evaluacionVacia(solicitudId: string): Evaluacion {
  return {
    solicitud_id: solicitudId, fecha_visita: new Date().toISOString().slice(0, 10),
    consentimiento_consulta: false, requisitos_completos: false, destino: null,
    ventas_mensuales: null, costo_ventas: null, gastos_negocio: null, gastos_hogar: null, otras_cuotas: 0,
    fecha_inicio_negocio: null, variabilidad_ventas: null, consulta_externa: 'no_consultada', referencias_verificadas: 0,
    ver_identidad: false, ver_ventas_soportadas: false, ver_referencias: false, ver_sin_discrepancias: false,
    comp_documentos: false, comp_citas: false, comp_servicios: false, comp_ahorro_capacitacion: false,
    evidencias: [], discrepancias: null, observaciones: null,
  }
}

const NUMS = ['ventas_mensuales', 'costo_ventas', 'gastos_negocio', 'gastos_hogar', 'otras_cuotas', 'referencias_verificadas'] as const

export async function obtenerEvaluacion(solicitudId: string): Promise<Evaluacion | null> {
  const { data, error } = await neon.from('evaluaciones').select('*').eq('solicitud_id', solicitudId).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const e = data as Record<string, unknown>
  for (const k of NUMS) if (e[k] != null) e[k] = Number(e[k])
  return e as unknown as Evaluacion
}

export async function guardarEvaluacion(ev: Evaluacion): Promise<void> {
  const { id, ...fila } = ev
  void id
  const { error } = await neon.from('evaluaciones').upsert(fila, { onConflict: 'solicitud_id' }).select('id')
  if (error) throw new Error(/row-level security/i.test(error.message) ? 'Tu rol no puede registrar la evaluación de esta solicitud.' : error.message)
}

export async function obtenerScoring(solicitudId: string): Promise<ScoringFEM | null> {
  const { data, error } = await neon.rpc('fn_scoring_fem', { p_solicitud_id: solicitudId })
  if (error) throw new Error(error.message)
  return (data as ScoringFEM) ?? null
}

export const flujoLibre = (e: Pick<Evaluacion, 'ventas_mensuales' | 'costo_ventas' | 'gastos_negocio' | 'gastos_hogar' | 'otras_cuotas'>) =>
  (e.ventas_mensuales ?? 0) - (e.costo_ventas ?? 0) - (e.gastos_negocio ?? 0) - (e.gastos_hogar ?? 0) - (e.otras_cuotas ?? 0)
