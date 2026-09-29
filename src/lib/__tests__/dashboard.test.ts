import { describe, it, expect } from 'vitest'
import { tramosPorMes, cumplimientoPorMes, rankingFacilitadores, cifraCorta, type FilaSerie } from '../dashboard'

const f = (mes: string, id: string, saldo: number, dias_mora: number, esperado = 0, recaudado = 0, facilitador_id: string | null = 'u1'): FilaSerie => ({
  mes, credito_id: id, convenio_id: 'c1', producto_id: 'p1', zona_id: 'z1', zona: 'Z', facilitador_id,
  actividad_economica_id: null, saldo, dias_mora, esperado, recaudado, desembolsado: 0,
})

describe('dashboard', () => {
  const serie = [
    f('2026-08-01', 'a', 1000, 0, 100, 100),
    f('2026-08-01', 'b', 500, 45, 50, 0, 'u2'),
    f('2026-09-01', 'a', 900, 0, 100, 80),
    f('2026-09-01', 'b', 500, 75, 50, 0, 'u2'),
  ]
  it('reparte el saldo por tramos y calcula PAR30', () => {
    const t = tramosPorMes(serie)
    expect(t.map(x => x.mes)).toEqual(['2026-08-01', '2026-09-01'])
    expect(t[0].valores).toEqual([1000, 0, 500, 0, 0])
    expect(t[1].valores).toEqual([900, 0, 0, 500, 0])
    expect(Math.round(t[1].par30Pct)).toBe(36)
  })
  it('cumplimiento esperado vs recaudado', () => {
    const c = cumplimientoPorMes(serie)
    expect(c[1].pct).toBeCloseTo((80 / 150) * 100)
  })
  it('ranking de facilitadores con el último mes', () => {
    const r = rankingFacilitadores(serie, id => id ?? '—')
    expect(r[0]).toMatchObject({ id: 'u1', saldo: 900, par30Pct: 0 })
    expect(r[1]).toMatchObject({ id: 'u2', saldo: 500, par30Pct: 100, recaudoPct: 0 })
  })
  it('cifras cortas', () => {
    expect(cifraCorta(12_500_000)).toBe('$12,5 M')
    expect(cifraCorta(850_000)).toBe('$850 mil')
  })
})
