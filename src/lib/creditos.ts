// ─── Operaciones de crédito contra la base de datos ───────────
// Wrappers de las funciones SQL de db/migrations/0006_reglas_credito.sql.
// Toda la lógica de dinero vive en la base (SECURITY DEFINER,
// transaccional); aquí solo se invocan y se tipan los resultados.

import { neon } from './neon'
import type { EstadoCuenta, ResultadoPagoServidor } from '../types'

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

/** Normaliza numéricos (el Data API devuelve numeric como string en jsonb anidado a veces). */
function normalizarEstado(raw: EstadoCuenta): EstadoCuenta {
  return {
    ...raw,
    cuotas: raw.cuotas.map(q => ({
      ...q, cuota: num(q.cuota), capital: num(q.capital), interes: num(q.interes),
      saldo_posterior: num(q.saldo_posterior), monto_pagado: num(q.monto_pagado),
      interes_pagado: num(q.interes_pagado), capital_pagado: num(q.capital_pagado),
    })),
    cargos: raw.cargos.map(c => ({
      ...c, base_capital: num(c.base_capital), porcentaje: num(c.porcentaje),
      monto: num(c.monto), monto_pagado: num(c.monto_pagado),
    })),
    pagos: raw.pagos.map(p => ({
      ...p, monto_capital: num(p.monto_capital), monto_interes: num(p.monto_interes),
      monto_gastos: num(p.monto_gastos), monto_mora: num(p.monto_mora), monto_total: num(p.monto_total),
    })),
  }
}

/** Estado de cuenta al día: genera cargos por atraso pendientes y devuelve cronograma, cargos, pagos y resumen. */
export async function obtenerEstadoCuenta(creditoId: string, fecha?: string): Promise<EstadoCuenta> {
  const { data, error } = await neon.rpc('estado_cuenta', { p_credito_id: creditoId, ...(fecha ? { p_fecha: fecha } : {}) })
  if (error) throw new Error(error.message)
  return normalizarEstado(data as EstadoCuenta)
}

/** Simula cómo se aplicaría un pago (misma lógica que aplicar_pago, sin persistir). */
export async function simularPago(creditoId: string, monto: number, fecha: string): Promise<ResultadoPagoServidor> {
  const { data, error } = await neon.rpc('simular_pago', { p_credito_id: creditoId, p_monto: monto, p_fecha: fecha })
  if (error) throw new Error(error.message)
  return data as ResultadoPagoServidor
}

export interface DatosPago {
  creditoId: string
  monto: number
  fecha: string
  banco: string
  referencia: string
  metodo: 'efectivo' | 'transferencia' | 'pse'
  claveIdempotencia: string
}

/** Aplica un pago: gastos → mora → interés → capital; excedente = anticipo a capital. */
export async function aplicarPago(d: DatosPago): Promise<ResultadoPagoServidor> {
  const { data, error } = await neon.rpc('aplicar_pago', {
    p_credito_id: d.creditoId,
    p_monto: d.monto,
    p_banco: d.banco,
    p_numero_deposito: d.referencia,
    p_fecha: d.fecha,
    p_clave_idempotencia: d.claveIdempotencia,
    p_metodo: d.metodo,
  })
  if (error) throw new Error(error.message)
  return data as ResultadoPagoServidor
}
