// ─── MOCKS ADICIONALES (Sprints 5-6-7) ───────────────────────

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

export const PAGOS: Pago[] = [
  {
    id: 'pag-001', credito_id: 'cred-001', cuota_num: 1,
    fecha: '2025-02-15', monto_capital: 77450, monto_interes: 22550, monto_total: 100000,
    metodo: 'efectivo', referencia: 'EFE-001', registrado_por: 'Ana López',
  },
  {
    id: 'pag-002', credito_id: 'cred-001', cuota_num: 2,
    fecha: '2025-03-15', monto_capital: 79047, monto_interes: 20953, monto_total: 100000,
    metodo: 'transferencia', referencia: 'TRF-8821', registrado_por: 'Ana López',
  },
  {
    id: 'pag-003', credito_id: 'cred-001', cuota_num: 3,
    fecha: '2025-04-15', monto_capital: 80678, monto_interes: 19322, monto_total: 100000,
    metodo: 'efectivo', referencia: 'EFE-003', registrado_por: 'Ana López',
  },
  {
    id: 'pag-004', credito_id: 'cred-002', cuota_num: 1,
    fecha: '2025-03-20', monto_capital: 153333, monto_interes: 46667, monto_total: 200000,
    metodo: 'pse', referencia: 'PSE-4412', registrado_por: 'Pedro Ramírez',
  },
]

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

export const VISITAS: Visita[] = [
  {
    id: 'vis-001', cliente_id: 'cli-003', cliente_nombre: 'Carmen Reyes',
    tipo: 'cobranza', fecha: '2026-06-06', hora: '09:00', zona: 'Zona Norte',
    estado: 'pendiente', motivo: 'Cuota vencida hace 17 días — cobro de mora',
  },
  {
    id: 'vis-002', cliente_id: 'cli-001', cliente_nombre: 'Rosa Martínez',
    tipo: 'seguimiento', fecha: '2026-06-06', hora: '10:30', zona: 'Zona Norte',
    estado: 'pendiente', motivo: 'Visita mensual de seguimiento — cuota 4 próxima',
  },
  {
    id: 'vis-003', cliente_nombre: 'María Pérez (prospecto)',
    tipo: 'prospecto', fecha: '2026-06-06', hora: '14:00', zona: 'Zona Centro',
    estado: 'pendiente', motivo: 'Evaluación inicial para solicitud de crédito',
  },
  {
    id: 'vis-004', cliente_id: 'cli-002', cliente_nombre: 'Tomás García',
    tipo: 'seguimiento', fecha: '2026-06-06', hora: '16:00', zona: 'Zona Norte',
    estado: 'realizada', motivo: 'Verificación de negocio', nota: 'Negocio operando con normalidad. Planea solicitar ampliación en agosto.',
  },
  {
    id: 'vis-005', cliente_nombre: 'Grupo Las Emprendedoras',
    tipo: 'grupo', fecha: '2026-06-07', hora: '08:00', zona: 'Zona Norte',
    estado: 'pendiente', motivo: 'Reunión quincenal del grupo solidario',
  },
  {
    id: 'vis-006', cliente_id: 'cli-004', cliente_nombre: 'Alberto Suárez',
    tipo: 'seguimiento', fecha: '2026-06-07', hora: '11:00', zona: 'Zona Sur',
    estado: 'pendiente', motivo: 'Verificación de crédito activo',
  },
]

// ─── KPIs para Reportes ───────────────────────────────────────
export const KPI_REPORTES = {
  cartera_total:     1_850_000,
  par_30:            5.8,     // % cartera con más de 30 días mora
  par_90:            1.2,     // % cartera con más de 90 días mora
  desembolsos_mes:   420_000,
  num_creditos:      3,
  num_clientes:      4,
  tasa_recuperacion: 94.2,
  creditos_activos:  2,
  creditos_mora:     1,
  creditos_cancelados: 0,

  // Tendencia mensual de desembolsos (últimos 6 meses)
  tendencia_desembolsos: [
    { mes: 'Ene', monto: 280_000 },
    { mes: 'Feb', monto: 350_000 },
    { mes: 'Mar', monto: 420_000 },
    { mes: 'Abr', monto: 310_000 },
    { mes: 'May', monto: 490_000 },
    { mes: 'Jun', monto: 420_000 },
  ],

  // Distribución de cartera por estado
  distribucion_cartera: [
    { estado: 'Al día',      monto: 1_200_000, color: '#10b981' },
    { estado: 'Activo',      monto:   540_000, color: '#6366f1' },
    { estado: 'En mora',     monto:   110_000, color: '#ef4444' },
  ],

  // PAR por zona
  par_zona: [
    { zona: 'Zona Norte',  par30: 4.1, cartera: 980_000  },
    { zona: 'Zona Centro', par30: 8.2, cartera: 540_000  },
    { zona: 'Zona Sur',    par30: 2.5, cartera: 330_000  },
  ],
}
