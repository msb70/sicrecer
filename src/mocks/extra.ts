// ─── DATOS ADICIONALES (Sprints 5-6-7) ────────────────────────
// Igual que ./index.ts: los arrays se llenan desde Neon al iniciar
// sesión; los valores iniciales son los datos demo.

import { PAGOS_DEMO, VISITAS_DEMO, KPI_REPORTES_DEMO } from './fallback'

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

// Genera cronograma de amortización (saldo decreciente)
export function generarCronograma(
  monto: number,
  tasaAnual: number,
  plazoMeses: number,
  fechaDesembolso: string
): CuotaCronograma[] {
  const i = tasaAnual / 100 / 12
  const cuotaFija = i === 0
    ? monto / plazoMeses
    : (monto * i * Math.pow(1 + i, plazoMeses)) / (Math.pow(1 + i, plazoMeses) - 1)

  let saldo = monto
  const cronograma: CuotaCronograma[] = []
  const fecha = new Date(fechaDesembolso)

  for (let n = 1; n <= plazoMeses; n++) {
    fecha.setMonth(fecha.getMonth() + 1)
    const interes  = saldo * i
    const capital  = cuotaFija - interes
    saldo -= capital
    cronograma.push({
      num:       n,
      fecha:     fecha.toISOString().slice(0, 10),
      cuota:     Math.round(cuotaFija),
      capital:   Math.round(capital),
      interes:   Math.round(interes),
      saldo:     Math.max(0, Math.round(saldo)),
      pagada:    n <= 3,   // las primeras 3 cuotas están pagadas en el mock
    })
  }
  return cronograma
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
