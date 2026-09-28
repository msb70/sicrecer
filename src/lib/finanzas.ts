// ─── MOTOR FINANCIERO ÚNICO ───────────────────────────────────
// Única fuente de verdad para cálculos en el frontend. Refleja la
// lógica SQL de db/migrations/0006_reglas_credito.sql:
//   generar_cronograma · fn_generar_cargos · aplicar_pago ·
//   fn_reprogramar_tras_anticipo · desembolsar_solicitud
// Los montos se manejan como enteros (sin decimales).
//
// Reglas de crédito acordadas con SiCrecer (2026-09-28):
//  - Cuota fija (sistema francés).
//  - Servicios de desarrollo empresarial: % del producto, descontado del
//    monto al desembolsar (el cliente debe el total, recibe monto − servicios).
//  - Periodicidad mensual/quincenal/semanal; tasa por período anual/12, /24, /52.
//  - Convención 30/360: el período dura 30, 15 o 7 días.
//  - Primera cuota: un período después de la fecha de desembolso.
//  - Mora y gastos administrativos: % por período, sobre capital vencido,
//    después de los días de gracia, siempre por período completo.
//  - Orden de pago: gastos administrativos → mora → interés → capital.
//  - Pago mayor a lo exigible = anticipo a capital, recalcula la cuota
//    manteniendo el número de cuotas restantes.
//
// IMPORTANTE: la aplicación real de pagos ocurre server-side vía
// `aplicar_pago` (transaccional e idempotente). Lo de aquí es para
// simulaciones y previsualización.

export type MetodoInteres = 'flat' | 'declining_balance'
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual'

export const PERIODOS_ANUALES: Record<Frecuencia, number> = {
  semanal: 52,
  quincenal: 24,
  mensual: 12,
}

/** Días por período según convención 30/360. */
export const DIAS_PERIODO: Record<Frecuencia, number> = {
  semanal: 7,
  quincenal: 15,
  mensual: 30,
}

export const FRECUENCIA_LABEL: Record<Frecuencia, string> = {
  semanal: 'semanal',
  quincenal: 'quincenal',
  mensual: 'mensual',
}

export interface CondicionesCredito {
  monto: number                 // monto del crédito (lo que el cliente debe)
  tasaNominalAnual: number      // % (ej. 12)
  plazo: number                 // número de cuotas
  metodo?: MetodoInteres        // por defecto francés; 'flat' solo créditos heredados
  frecuencia: Frecuencia
  fechaDesembolso?: string      // YYYY-MM-DD
}

export interface CuotaPlan {
  num: number
  fecha?: string                // presente si hay fechaDesembolso
  cuota: number
  capital: number
  interes: number
  saldo: number
}

/** Tasa por periodo según frecuencia (fracción, no %). */
export function tasaPeriodo(tasaNominalAnual: number, frecuencia: Frecuencia): number {
  return tasaNominalAnual / 100 / PERIODOS_ANUALES[frecuencia]
}

/** Cuota fija francesa (entero). Espejo de fn_cuota_frances. */
export function cuotaFrances(monto: number, r: number, n: number): number {
  if (n <= 0) return 0
  if (r === 0) return Math.round(monto / n)
  return Math.round(monto * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

/** Valor de la cuota (entero). */
export function calcularCuota(c: CondicionesCredito): number {
  const r = tasaPeriodo(c.tasaNominalAnual, c.frecuencia)
  if (c.metodo === 'flat') {
    return Math.round((c.monto + c.monto * r * c.plazo) / c.plazo)
  }
  return cuotaFrances(c.monto, r, c.plazo)
}

/** Fecha de la cuota n: desembolso + n períodos. */
export function fechaCuota(fechaDesembolso: string, frecuencia: Frecuencia, n: number): string {
  const f = new Date(`${fechaDesembolso}T00:00:00Z`)
  if (frecuencia === 'mensual') {
    f.setUTCMonth(f.getUTCMonth() + n)
  } else {
    f.setUTCDate(f.getUTCDate() + DIAS_PERIODO[frecuencia] * n)
  }
  return f.toISOString().slice(0, 10)
}

/**
 * Tabla de amortización completa. La última cuota se ajusta para
 * cerrar el saldo en exacto 0 (absorbe el redondeo acumulado).
 */
export function generarPlan(c: CondicionesCredito): CuotaPlan[] {
  if (c.monto <= 0 || c.plazo <= 0) return []
  const r = tasaPeriodo(c.tasaNominalAnual, c.frecuencia)
  const cuota = calcularCuota(c)
  let saldo = c.monto
  const plan: CuotaPlan[] = []

  for (let n = 1; n <= c.plazo; n++) {
    const interes = c.metodo === 'flat'
      ? Math.round(c.monto * r)
      : Math.round(saldo * r)
    let capital = cuota - interes
    let cuotaFila = cuota
    if (n === c.plazo) {
      capital = saldo
      cuotaFila = capital + interes
    }
    saldo = Math.max(0, saldo - capital)
    plan.push({
      num: n,
      fecha: c.fechaDesembolso ? fechaCuota(c.fechaDesembolso, c.frecuencia, n) : undefined,
      cuota: cuotaFila,
      capital,
      interes,
      saldo,
    })
  }
  return plan
}

/** Total a pagar e interés total de un plan. */
export function resumenPlan(plan: CuotaPlan[]): { totalPagar: number; totalInteres: number } {
  const totalPagar = plan.reduce((s, f) => s + f.cuota, 0)
  const totalInteres = plan.reduce((s, f) => s + f.interes, 0)
  return { totalPagar, totalInteres }
}

// ─── Desembolso ──────────────────────────────────────────────
export interface DesgloseDesembolso {
  montoCredito: number   // lo que el cliente debe
  pctServicios: number   // % servicios de desarrollo empresarial
  servicios: number      // monto descontado
  entregado: number      // efectivo que recibe el cliente
}

/** Espejo de desembolsar_solicitud: servicios = round(monto × %), entregado = monto − servicios. */
export function desgloseDesembolso(montoCredito: number, pctServicios: number): DesgloseDesembolso {
  const servicios = Math.round(montoCredito * (pctServicios || 0) / 100)
  return { montoCredito, pctServicios: pctServicios || 0, servicios, entregado: montoCredito - servicios }
}

// ─── Producto: plazos permitidos ─────────────────────────────
export interface ReglasPlazo {
  plazo_min?: number | null
  plazo_max?: number | null
  plazos_permitidos?: number[] | null
}

/** Lista explícita de plazos permitidos, o null si el producto usa rango min–max. */
export function plazosPermitidos(p: ReglasPlazo): number[] | null {
  const lista = (p.plazos_permitidos ?? []).filter(n => n > 0)
  return lista.length > 0 ? [...new Set(lista)].sort((a, b) => a - b) : null
}

/** Espejo de fn_plazo_valido. */
export function plazoValido(p: ReglasPlazo, plazo: number): boolean {
  const lista = plazosPermitidos(p)
  if (lista) return lista.includes(plazo)
  return plazo >= (p.plazo_min ?? 1) && plazo <= (p.plazo_max ?? 100000)
}

export function describirPlazos(p: ReglasPlazo): string {
  const lista = plazosPermitidos(p)
  return lista ? lista.join(', ') : `${p.plazo_min ?? 1} – ${p.plazo_max ?? '∞'}`
}

// ─── Cargos por atraso ───────────────────────────────────────
/**
 * Períodos de atraso cobrables (espejo de fn_generar_cargos): 0 si está
 * dentro de los días de gracia; si no, ceil(días / días del período).
 */
export function periodosAtraso(diasAtraso: number, frecuencia: Frecuencia, diasGracia: number): number {
  if (diasAtraso <= diasGracia || diasAtraso <= 0) return 0
  return Math.ceil(diasAtraso / DIAS_PERIODO[frecuencia])
}

/** Cargo de un período sobre el capital vencido (entero). */
export function cargoPeriodo(capitalVencido: number, pctPeriodo: number): number {
  return Math.round(capitalVencido * (pctPeriodo || 0) / 100)
}

// ─── Aplicación de pagos (espejo de aplicar_pago) ────────────
export interface CuotaEstado {
  num: number
  fecha: string            // vencimiento YYYY-MM-DD
  cuota: number
  interes: number
  capital: number
  interesPagado: number
  capitalPagado: number
}

export interface CargoPendiente {
  tipo: 'gastos_admin' | 'mora'
  pendiente: number
}

export interface ResultadoPago {
  gastos: number
  mora: number
  interes: number
  capital: number
  anticipo: number
  excedente: number
  cuotasCompletadas: number[]
  cuotaNueva: number | null
}

/**
 * Orden: gastos administrativos → mora → por cuota (vencidas y la
 * corriente) interés → capital → anticipo a capital (recalcula cuota).
 */
export function distribuirPago(
  cuotas: CuotaEstado[],
  cargos: CargoPendiente[],
  monto: number,
  fechaPago: string,
  r: number,
): ResultadoPago {
  let restante = monto
  const res: ResultadoPago = { gastos: 0, mora: 0, interes: 0, capital: 0, anticipo: 0, excedente: 0, cuotasCompletadas: [], cuotaNueva: null }

  for (const tipo of ['gastos_admin', 'mora'] as const) {
    for (const c of cargos.filter(x => x.tipo === tipo)) {
      if (restante <= 0) break
      const ab = Math.min(restante, c.pendiente)
      if (tipo === 'gastos_admin') res.gastos += ab; else res.mora += ab
      restante -= ab
    }
  }

  const pendientes = [...cuotas].sort((a, b) => a.num - b.num)
    .filter(q => q.interesPagado + q.capitalPagado < q.cuota)
  let corrienteUsada = false
  for (const q of pendientes) {
    if (restante <= 0) break
    if (q.fecha >= fechaPago) {
      if (corrienteUsada) break
      corrienteUsada = true
    }
    const i = Math.min(restante, q.interes - q.interesPagado); restante -= i
    const k = Math.min(restante, q.capital - q.capitalPagado); restante -= k
    res.interes += i; res.capital += k
    if (q.interesPagado + q.capitalPagado + i + k >= q.cuota) res.cuotasCompletadas.push(q.num)
  }

  const restantes = pendientes.filter(q => !res.cuotasCompletadas.includes(q.num))
  // Capital pendiente tras aplicar lo anterior
  const saldoReal = pendientes.reduce((s, q) => s + q.capital - q.capitalPagado, 0) - res.capital
  if (restante > 0 && saldoReal > 0) {
    res.anticipo = Math.min(restante, saldoReal)
    restante -= res.anticipo
    const nRest = restantes.length
    const nuevoSaldo = saldoReal - res.anticipo
    res.cuotaNueva = nuevoSaldo > 0 ? cuotaFrances(nuevoSaldo, r, nRest) : 0
  }
  res.excedente = restante
  return res
}
