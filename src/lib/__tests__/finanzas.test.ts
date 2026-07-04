import { describe, it, expect } from 'vitest'
import { calcularCuota, generarPlan, resumenPlan, simularAbono, tasaPeriodo } from '../finanzas'

describe('tasaPeriodo', () => {
  it('convierte tasa anual a tasa por periodo según frecuencia', () => {
    expect(tasaPeriodo(18, 'mensual')).toBeCloseTo(0.015)
    expect(tasaPeriodo(24, 'quincenal')).toBeCloseTo(0.01)
    expect(tasaPeriodo(52, 'semanal')).toBeCloseTo(0.01)
  })
})

describe('calcularCuota — saldo decreciente (francés)', () => {
  it('replica el crédito real cred-01 (2.5M al 18% a 12 meses → $229.200)', () => {
    // Debe coincidir con la función SQL generar_cronograma (verificado en Neon)
    expect(calcularCuota({
      monto: 2_500_000, tasaNominalAnual: 18, plazo: 12,
      metodo: 'declining_balance', frecuencia: 'mensual',
    })).toBe(229_200)
  })

  it('con tasa 0 divide el capital en partes iguales', () => {
    expect(calcularCuota({
      monto: 1_200_000, tasaNominalAnual: 0, plazo: 12,
      metodo: 'declining_balance', frecuencia: 'mensual',
    })).toBe(100_000)
  })
})

describe('calcularCuota — flat', () => {
  it('replica el crédito real cred-03 (1.5M al 15% flat, 8 quincenas → $196.875)', () => {
    expect(calcularCuota({
      monto: 1_500_000, tasaNominalAnual: 15, plazo: 8,
      metodo: 'flat', frecuencia: 'quincenal',
    })).toBe(196_875)
  })
})

describe('generarPlan', () => {
  const plan = generarPlan({
    monto: 2_500_000, tasaNominalAnual: 18, plazo: 12,
    metodo: 'declining_balance', frecuencia: 'mensual',
    fechaDesembolso: '2026-03-01',
  })

  it('genera exactamente el número de cuotas del plazo', () => {
    expect(plan).toHaveLength(12)
  })

  it('cierra el saldo en 0 en la última cuota (absorbe redondeo)', () => {
    expect(plan[11].saldo).toBe(0)
  })

  it('la suma de capital es exactamente el monto prestado', () => {
    const capitalTotal = plan.reduce((s, f) => s + f.capital, 0)
    expect(capitalTotal).toBe(2_500_000)
  })

  it('el interés decrece con el saldo (método francés)', () => {
    expect(plan[0].interes).toBeGreaterThan(plan[11].interes)
    expect(plan[0].interes).toBe(37_500) // 2.5M * 1.5%
  })

  it('las fechas avanzan por mes calendario', () => {
    expect(plan[0].fecha).toBe('2026-04-01')
    expect(plan[11].fecha).toBe('2027-03-01')
  })

  it('en flat el interés es constante por cuota', () => {
    const flat = generarPlan({
      monto: 1_500_000, tasaNominalAnual: 15, plazo: 8,
      metodo: 'flat', frecuencia: 'quincenal',
    })
    const intereses = new Set(flat.slice(0, -1).map(f => f.interes))
    expect(intereses.size).toBe(1)
    expect(flat[0].interes).toBe(9_375) // 1.5M * 15%/24
  })

  it('frecuencia quincenal avanza 15 días', () => {
    const flat = generarPlan({
      monto: 1_500_000, tasaNominalAnual: 15, plazo: 8,
      metodo: 'flat', frecuencia: 'quincenal', fechaDesembolso: '2026-03-20',
    })
    expect(flat[0].fecha).toBe('2026-04-04')
    expect(flat[1].fecha).toBe('2026-04-19')
  })

  it('aplica el periodo de gracia solo a la primera cuota', () => {
    const conGracia = generarPlan({
      monto: 1_000_000, tasaNominalAnual: 20, plazo: 6,
      metodo: 'declining_balance', frecuencia: 'mensual',
      fechaDesembolso: '2026-01-15', periodoGraciaDias: 15,
    })
    expect(conGracia[0].fecha).toBe('2026-03-02') // 15 feb + 15 días de gracia
    expect(conGracia[1].fecha).toBe('2026-03-15') // sin gracia
  })

  it('rechaza entradas inválidas devolviendo plan vacío', () => {
    expect(generarPlan({ monto: 0, tasaNominalAnual: 18, plazo: 12, metodo: 'flat', frecuencia: 'mensual' })).toEqual([])
    expect(generarPlan({ monto: 1000, tasaNominalAnual: 18, plazo: 0, metodo: 'flat', frecuencia: 'mensual' })).toEqual([])
  })
})

describe('resumenPlan', () => {
  it('total a pagar = capital + intereses', () => {
    const plan = generarPlan({
      monto: 2_500_000, tasaNominalAnual: 18, plazo: 12,
      metodo: 'declining_balance', frecuencia: 'mensual',
    })
    const { totalPagar, totalInteres } = resumenPlan(plan)
    expect(totalPagar).toBe(2_500_000 + totalInteres)
    expect(totalInteres).toBeGreaterThan(0)
  })
})

describe('simularAbono — espejo de aplicar_pago', () => {
  const plan = generarPlan({
    monto: 2_500_000, tasaNominalAnual: 18, plazo: 12,
    metodo: 'declining_balance', frecuencia: 'mensual',
  })
  // Cuotas 1-3 ya pagadas (como cred-01 tras el seed)
  const pagado = { 1: 229_200, 2: 229_200, 3: 229_200 }

  it('dos cuotas exactas completan las cuotas 4 y 5', () => {
    // Mismo escenario verificado contra aplicar_pago en Neon:
    // pago de 458.400 → completa cuotas 4 y 5, capital aplicado 403.920
    const r = simularAbono(plan, pagado, 458_400)
    expect(r.cuotasCompletadas).toEqual([4, 5])
    expect(r.capitalAplicado).toBe(403_920)
    expect(r.excedente).toBe(0)
  })

  it('un abono parcial no completa cuota y reparte interés/capital', () => {
    const r = simularAbono(plan, pagado, 100_000)
    expect(r.cuotasCompletadas).toEqual([])
    expect(r.capitalAplicado + r.interesAplicado).toBe(100_000)
    expect(r.excedente).toBe(0)
  })

  it('un pago mayor a la deuda total deja excedente', () => {
    const r = simularAbono(plan, pagado, 10_000_000)
    expect(r.cuotasCompletadas).toHaveLength(9) // cuotas 4..12
    expect(r.excedente).toBeGreaterThan(0)
  })
})
