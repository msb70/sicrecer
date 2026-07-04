// ─── MOTOR FINANCIERO ÚNICO ───────────────────────────────────
// Única fuente de verdad para cálculos de amortización en el
// frontend. Refleja la misma lógica que la función SQL
// `generar_cronograma` de db/migrations/0003_transaccional_rbac.sql.
// Los montos se manejan como enteros (pesos sin centavos).
//
// IMPORTANTE: los valores que aquí se calculan son informativos
// (simulaciones/calculadora). La aplicación de pagos real ocurre
// server-side vía `aplicar_pago` (transaccional e idempotente).

export type MetodoInteres = 'flat' | 'declining_balance'
export type Frecuencia = 'semanal' | 'quincenal' | 'mensual'

export const PERIODOS_ANUALES: Record<Frecuencia, number> = {
  semanal: 52,
  quincenal: 24,
  mensual: 12,
}

const DIAS_PASO: Record<Frecuencia, number> = {
  semanal: 7,
  quincenal: 15,
  mensual: 0, // mensual avanza por mes calendario, no por días
}

export interface CondicionesCredito {
  monto: number
  tasaNominalAnual: number      // % (ej. 18)
  plazo: number                 // número de cuotas
  metodo: MetodoInteres
  frecuencia: Frecuencia
  fechaDesembolso?: string      // YYYY-MM-DD
  periodoGraciaDias?: number
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

/** Valor de la cuota (entero). Flat o francés según método. */
export function calcularCuota(c: CondicionesCredito): number {
  const r = tasaPeriodo(c.tasaNominalAnual, c.frecuencia)
  if (c.metodo === 'flat') {
    return Math.round((c.monto + c.monto * r * c.plazo) / c.plazo)
  }
  if (r === 0) return Math.round(c.monto / c.plazo)
  return Math.round(c.monto * (r * Math.pow(1 + r, c.plazo)) / (Math.pow(1 + r, c.plazo) - 1))
}

function fechaCuota(fechaDesembolso: string, frecuencia: Frecuencia, n: number, graciaDias: number): string {
  const f = new Date(`${fechaDesembolso}T00:00:00Z`)
  if (frecuencia === 'mensual') {
    f.setUTCMonth(f.getUTCMonth() + n)
  } else {
    f.setUTCDate(f.getUTCDate() + DIAS_PASO[frecuencia] * n)
  }
  if (graciaDias > 0 && n === 1) f.setUTCDate(f.getUTCDate() + graciaDias)
  return f.toISOString().slice(0, 10)
}

/**
 * Tabla de amortización completa. La última cuota se ajusta para
 * cerrar el saldo en exacto 0 (absorbe el redondeo acumulado).
 */
export function generarPlan(c: CondicionesCredito): CuotaPlan[] {
  if (c.monto <= 0 || c.plazo <= 0) return []
  const r = tasaPeriodo(c.tasaNominalAnual, c.frecuencia)
  let cuota = calcularCuota(c)
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
      fecha: c.fechaDesembolso
        ? fechaCuota(c.fechaDesembolso, c.frecuencia, n, c.periodoGraciaDias ?? 0)
        : undefined,
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

/**
 * Simula la asignación de un abono contra un plan (mora → interés →
 * capital, proporcional por cuota). Espejo de `aplicar_pago` en SQL,
 * solo para previsualización en UI.
 */
export interface AsignacionAbono {
  cuotasCompletadas: number[]
  capitalAplicado: number
  interesAplicado: number
  excedente: number
}

export function simularAbono(
  plan: CuotaPlan[],
  pagadoPorCuota: Record<number, number>,
  monto: number
): AsignacionAbono {
  let restante = monto
  let capitalAplicado = 0
  let interesAplicado = 0
  const cuotasCompletadas: number[] = []

  for (const q of plan) {
    if (restante <= 0) break
    const yaPagado = pagadoPorCuota[q.num] ?? 0
    const pendiente = q.cuota - yaPagado
    if (pendiente <= 0) continue
    const abono = Math.min(restante, pendiente)
    const int = Math.round(abono * q.interes / q.cuota)
    interesAplicado += int
    capitalAplicado += abono - int
    if (yaPagado + abono >= q.cuota) cuotasCompletadas.push(q.num)
    restante -= abono
  }

  return { cuotasCompletadas, capitalAplicado, interesAplicado, excedente: Math.max(0, restante) }
}
