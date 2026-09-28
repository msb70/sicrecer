import { describe, it, expect } from 'vitest'
import {
  calcularCuota, generarPlan, resumenPlan, tasaPeriodo, desgloseDesembolso,
  plazosPermitidos, plazoValido, periodosAtraso, cargoPeriodo, distribuirPago,
  type CuotaEstado,
} from '../finanzas'

describe('tasaPeriodo', () => {
  it('anual/12, anual/24, anual/52', () => {
    expect(tasaPeriodo(12, 'mensual')).toBeCloseTo(0.01)
    expect(tasaPeriodo(24, 'quincenal')).toBeCloseTo(0.01)
    expect(tasaPeriodo(52, 'semanal')).toBeCloseTo(0.01)
  })
})

describe('calcularCuota — cuota fija (francés)', () => {
  it('replica cred-01 (2.5M al 18% a 12 meses → 229.200)', () => {
    expect(calcularCuota({ monto: 2_500_000, tasaNominalAnual: 18, plazo: 12, frecuencia: 'mensual' })).toBe(229_200)
  })
  it('1M al 12% a 12 meses → 88.849 (verificado contra generar_cronograma en Neon)', () => {
    expect(calcularCuota({ monto: 1_000_000, tasaNominalAnual: 12, plazo: 12, frecuencia: 'mensual' })).toBe(88_849)
  })
  it('con tasa 0 divide el capital en partes iguales', () => {
    expect(calcularCuota({ monto: 1_200_000, tasaNominalAnual: 0, plazo: 12, frecuencia: 'mensual' })).toBe(100_000)
  })
  it('flat se mantiene solo para créditos heredados', () => {
    expect(calcularCuota({ monto: 1_500_000, tasaNominalAnual: 15, plazo: 8, metodo: 'flat', frecuencia: 'quincenal' })).toBe(196_875)
  })
})

describe('generarPlan', () => {
  const plan = generarPlan({ monto: 1_000_000, tasaNominalAnual: 12, plazo: 12, frecuencia: 'mensual', fechaDesembolso: '2026-05-21' })

  it('cierra en 0 y la última cuota absorbe el redondeo', () => {
    expect(plan).toHaveLength(12)
    expect(plan[11].saldo).toBe(0)
    expect(plan[11].cuota).toBe(88_847)
    expect(plan.reduce((s, f) => s + f.capital, 0)).toBe(1_000_000)
  })
  it('primera cuota un período después del desembolso', () => {
    expect(plan[0].fecha).toBe('2026-06-21')
    expect(plan[0].interes).toBe(10_000)
    expect(plan[11].fecha).toBe('2027-05-21')
  })
  it('quincenal avanza 15 días y semanal 7 días', () => {
    const q = generarPlan({ monto: 500_000, tasaNominalAnual: 24, plazo: 4, frecuencia: 'quincenal', fechaDesembolso: '2026-03-20' })
    expect(q[0].fecha).toBe('2026-04-04')
    expect(q[1].fecha).toBe('2026-04-19')
    const s = generarPlan({ monto: 500_000, tasaNominalAnual: 52, plazo: 4, frecuencia: 'semanal', fechaDesembolso: '2026-03-20' })
    expect(s[0].fecha).toBe('2026-03-27')
    expect(s[0].interes).toBe(5_000) // 500.000 × 52%/52
  })
  it('rechaza entradas inválidas', () => {
    expect(generarPlan({ monto: 0, tasaNominalAnual: 18, plazo: 12, frecuencia: 'mensual' })).toEqual([])
  })
  it('total a pagar = capital + intereses', () => {
    const { totalPagar, totalInteres } = resumenPlan(plan)
    expect(totalPagar).toBe(1_000_000 + totalInteres)
  })
})

describe('desgloseDesembolso', () => {
  it('descuenta el 7 % de servicios del monto entregado', () => {
    expect(desgloseDesembolso(1_000_000, 7)).toEqual({ montoCredito: 1_000_000, pctServicios: 7, servicios: 70_000, entregado: 930_000 })
  })
  it('sin servicios entrega el monto completo', () => {
    expect(desgloseDesembolso(500_000, 0).entregado).toBe(500_000)
  })
})

describe('plazos permitidos', () => {
  it('lista explícita', () => {
    const p = { plazo_min: 6, plazo_max: 12, plazos_permitidos: [12, 6] }
    expect(plazosPermitidos(p)).toBeNull()
    expect(plazoValido(p, 1)).toBe(true)
    expect(plazoValido(p, 1)).toBe(true)
    expect(plazoValido(p, 0)).toBe(false)
    expect(plazoValido(p, 7)).toBe(true)
    expect(plazoValido(p, 13)).toBe(false)
  })
  it('sin lista usa el rango', () => {
    const p = { plazo_min: 3, plazo_max: 12, plazos_permitidos: [] }
    expect(plazosPermitidos(p)).toBeNull()
    expect(plazoValido(p, 7)).toBe(true)
    expect(plazoValido(p, 13)).toBe(false)
  })
})

describe('cargos por atraso', () => {
  it('período completo tras los días de gracia (30/360)', () => {
    expect(periodosAtraso(99, 'mensual', 0)).toBe(4)
    expect(periodosAtraso(7, 'mensual', 0)).toBe(1)
    expect(periodosAtraso(7, 'mensual', 10)).toBe(0)
    expect(periodosAtraso(11, 'mensual', 10)).toBe(1)
    expect(periodosAtraso(10, 'semanal', 0)).toBe(2)
  })
  it('% sobre capital vencido', () => {
    expect(cargoPeriodo(78_849, 5)).toBe(3_942)
    expect(cargoPeriodo(78_849, 2)).toBe(1_577)
  })
})

describe('distribuirPago — espejo de aplicar_pago (escenario verificado en Neon)', () => {
  const plan = generarPlan({ monto: 1_000_000, tasaNominalAnual: 12, plazo: 12, frecuencia: 'mensual', fechaDesembolso: '2026-05-21' })
  const cuotas: CuotaEstado[] = plan.map(f => ({ num: f.num, fecha: f.fecha!, cuota: f.cuota, interes: f.interes, capital: f.capital, interesPagado: 0, capitalPagado: 0 }))
  const cargos = [{ tipo: 'gastos_admin' as const, pendiente: 39_820 }, { tipo: 'mora' as const, pendiente: 15_930 }]
  const r = tasaPeriodo(12, 'mensual')

  it('un abono pequeño va primero a gastos y luego a mora', () => {
    const res = distribuirPago(cuotas, cargos, 50_000, '2026-09-28', r)
    expect(res.gastos).toBe(39_820)
    expect(res.mora).toBe(10_180)
    expect(res.interes + res.capital + res.anticipo).toBe(0)
  })

  it('cubre vencidas + corriente y el excedente es anticipo con nueva cuota', () => {
    const res = distribuirPago(cuotas, cargos, 699_995, '2026-09-28', r)
    expect(res.cuotasCompletadas).toEqual([1, 2, 3, 4, 5])
    expect(res.interes).toBe(42_036)
    expect(res.capital).toBe(402_209)
    expect(res.anticipo).toBe(200_000)
    expect(res.cuotaNueva).toBe(59_123)
    expect(res.excedente).toBe(0)
  })

  it('un pago mayor a la deuda total deja excedente', () => {
    const res = distribuirPago(cuotas, [], 5_000_000, '2026-09-28', r)
    expect(res.excedente).toBeGreaterThan(0)
    expect(res.cuotaNueva).toBe(0)
  })
})
