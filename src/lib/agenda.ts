// ─── Agenda del facilitador ───────────────────────────────────
// Lee las vistas de la base (migración 0013). Las vistas respetan la RLS:
// un facilitador solo recibe la cartera de sus zonas; coordinador,
// administrador, auditor y comité reciben todo.

import { neon } from './neon'

export type Preaprobacion = 'preaprobado' | 'revision' | 'no_preaprobado' | 'sin_historial'

export interface Scoring {
  score: number | null
  banda: 'A' | 'B' | 'C' | 'D' | 'E' | null
  preaprobacion: Preaprobacion
  monto_sugerido: number | null
  ultimo_monto?: number | null
  cuotas_evaluadas?: number
  cuotas_a_tiempo?: number
  peor_atraso_dias?: number
  atraso_promedio_dias?: number
  cuotas_vencidas_hoy?: number
  creditos_cancelados?: number
  componentes?: Record<'puntualidad' | 'peor_atraso' | 'situacion_actual' | 'experiencia' | 'incremento', number>
  razones: string[]
}

interface Comunes {
  cliente_id: string
  cliente_nombre: string
  telefono: string | null
  zona_id: string | null
  zona: string | null
  facilitador_id: string | null
  facilitador_nombre: string | null
  convenio_id: string | null
  convenio: string | null
  producto_id: string | null
  producto_nombre: string | null
  actividad_economica_id: string | null
  actividad_economica: string | null
}

export interface FilaCartera extends Comunes {
  credito_id: string
  documento: string | null
  estado: string
  frecuencia: string
  fecha_desembolso: string | null
  monto_desembolsado: number
  saldo_capital: number
  cuota_actual: number | null
  cuotas_total: number
  cuotas_pagadas: number
  cuotas_restantes: number
  proxima_cuota: string | null
  dias_mora: number
  cuotas_vencidas: number
  monto_vencido: number
  capital_vencido: number
  cargos_pendientes: number
  total_vencido: number
  tramo_mora: 'vigente' | '1-30' | '31-60' | '61-90' | '>90'
}

export interface FilaCobranza extends FilaCartera {
  proxima_cuota_num: number | null
  proxima_fecha: string | null
  proxima_monto: number
  dias_para_vencer: number | null
  prioridad: 'vencido' | 'por_vencer' | 'al_dia'
  orden: number
}

export interface FilaRenovacion extends Comunes {
  credito_id: string
  estado: string
  motivo: 'por_terminar' | 'cancelado_reciente'
  monto_desembolsado: number
  cuotas_total: number
  cuotas_pagadas: number
  cuotas_restantes: number
  saldo_capital: number
  dias_mora: number
  fecha_fin: string | null
  tiene_solicitud_abierta: boolean
  scoring: Scoring
}

export interface FilaSolicitudPendiente {
  solicitud_id: string
  cliente_id: string | null
  solicitante_id: string | null
  origen: 'interno' | 'externo'
  estado: string
  fecha_solicitud: string
  nombre: string
  telefono: string | null
  producto_id: string | null
  producto_nombre: string | null
  convenio_id: string | null
  convenio: string | null
  monto_solicitado: number
  plazo: number
  zona_id: string | null
  zona: string | null
  facilitador_id: string | null
  facilitador_nombre: string | null
  actividad_economica_id: string | null
  actividad_economica: string | null
  dias_esperando: number
  scoring: Scoring
}

const NUMERICOS = [
  'monto_desembolsado', 'saldo_capital', 'cuota_actual', 'cuotas_vencidas', 'monto_vencido', 'capital_vencido',
  'cargos_pendientes', 'total_vencido', 'proxima_monto', 'monto_solicitado', 'dias_mora', 'cuotas_restantes',
]

/** PostgREST devuelve numeric como texto: se normaliza a number. */
function normalizar<T>(filas: Record<string, unknown>[]): T[] {
  return filas.map(f => {
    const o: Record<string, unknown> = { ...f }
    for (const k of NUMERICOS) if (o[k] != null) o[k] = Number(o[k])
    return o as T
  })
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))

async function vista<T>(nombre: string): Promise<T[]> {
  let ultimoError = ''
  for (let intento = 0; intento < 3; intento++) {
    const { data, error } = await neon.from(nombre).select('*')
    if (!error) {
      // Vacío puede ser real (sin cartera) o la consulta sin identidad del Data API: un reintento.
      if ((data && data.length > 0) || intento >= 1) return normalizar<T>((data ?? []) as Record<string, unknown>[])
    } else {
      ultimoError = error.message
      if (/PGRST205|schema cache|Could not find/i.test(error.message)) {
        throw new Error('La base de datos todavía no publica las consultas de la agenda. Hay que refrescar la caché del Data API en Neon.')
      }
    }
    await esperar(350 * (intento + 1))
  }
  throw new Error(`No se pudo cargar ${nombre}: ${ultimoError}`)
}

export interface DatosAgenda {
  cobranza: FilaCobranza[]
  renovacion: FilaRenovacion[]
  solicitudes: FilaSolicitudPendiente[]
}

export async function cargarAgenda(): Promise<DatosAgenda> {
  const [cobranza, renovacion, solicitudes] = await Promise.all([
    vista<FilaCobranza>('v_cola_cobranza'),
    vista<FilaRenovacion>('v_renovacion'),
    vista<FilaSolicitudPendiente>('v_solicitudes_pendientes'),
  ])
  cobranza.sort((a, b) =>
    a.orden - b.orden
    || b.dias_mora - a.dias_mora
    || (a.dias_para_vencer ?? 9999) - (b.dias_para_vencer ?? 9999))
  renovacion.sort((a, b) => ORDEN_PRE[a.scoring.preaprobacion] - ORDEN_PRE[b.scoring.preaprobacion] || a.cuotas_restantes - b.cuotas_restantes)
  solicitudes.sort((a, b) => ORDEN_PRE[a.scoring.preaprobacion] - ORDEN_PRE[b.scoring.preaprobacion] || b.dias_esperando - a.dias_esperando)
  return { cobranza, renovacion, solicitudes }
}

export const ORDEN_PRE: Record<Preaprobacion, number> = { preaprobado: 0, revision: 1, sin_historial: 2, no_preaprobado: 3 }

export const ETIQUETA_PRE: Record<Preaprobacion, { texto: string; color: 'green' | 'yellow' | 'gray' | 'red' }> = {
  preaprobado:    { texto: 'Preaprobado',     color: 'green'  },
  revision:       { texto: 'Revisar',         color: 'yellow' },
  sin_historial:  { texto: 'Sin historial',   color: 'gray'   },
  no_preaprobado: { texto: 'No preaprobado',  color: 'red'    },
}
