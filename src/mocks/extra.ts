// ─── DATOS ADICIONALES (Sprints 5-6-7) ────────────────────────
// Igual que ./index.ts: los arrays se llenan desde Neon al iniciar
// sesión; los valores iniciales son los datos demo.

import { PAGOS_DEMO, VISITAS_DEMO, KPI_REPORTES_DEMO } from './fallback'
import { generarPlan } from '../lib/finanzas'

// Historial de pagos realizados
export interface Pago {
  id: string
  credito_id: string
  cuota_num: number
  fecha: string
  monto_capital: number
  monto_interes: number
  monto_total: number
  metodo: 'efectivo' | 'transferencia' | 'pse'
  referencia: string
  registrado_por: string
}

export const PAGOS: Pago[] = [...PAGOS_DEMO]

// Genera cronograma de amortización (saldo decreciente, mensual).
// Delegado al motor financiero único de src/lib/finanzas.ts.
export function generarCronograma(
  monto: number,
  tasaAnual: number,
  plazoMeses: number,
  fechaDesembolso: string
): CuotaCronograma[] {
  return generarPlan({
    monto,
    tasaNominalAnual: tasaAnual,
    plazo: plazoMeses,
    metodo: 'declining_balance',
    frecuencia: 'mensual',
    fechaDesembolso,
  }).map(f => ({
    num:     f.num,
    fecha:   f.fecha ?? '',
    cuota:   f.cuota,
    capital: f.capital,
    interes: f.interes,
    saldo:   f.saldo,
    pagada:  f.num <= 3,   // las primeras 3 cuotas están pagadas en el mock
  }))
}

export interface CuotaCronograma {
  num: number
  fecha: string
  cuota: number
  capital: number
  interes: number
  saldo: number
  pagada: boolean
}

// Visitas de campo
export type TipoVisita = 'cobranza' | 'seguimiento' | 'prospecto' | 'grupo'
export type EstadoVisita = 'pendiente' | 'realizada' | 'reprogramada'

export interface Visita {
  id: string
  cliente_id?: string
  cliente_nombre: string
  tipo: TipoVisita
  fecha: string      // YYYY-MM-DD
  hora: string       // HH:MM
  zona: string
  estado: EstadoVisita
  motivo: string
  nota?: string
}

export const VISITAS: Visita[] = [...VISITAS_DEMO]

// ─── KPIs para Reportes ───────────────────────────────────────
// Objeto mutable: con sesión real se sobreescribe con la fila
// `kpi_reportes` de Neon (Object.assign conserva la referencia).
export const KPI_REPORTES = { ...KPI_REPORTES_DEMO }

/** Restaura los datos demo de este módulo. */
export function cargarExtrasDemo(): void {
  PAGOS.splice(0, PAGOS.length, ...PAGOS_DEMO)
  VISITAS.splice(0, VISITAS.length, ...VISITAS_DEMO)
  Object.assign(KPI_REPORTES, KPI_REPORTES_DEMO)
}
