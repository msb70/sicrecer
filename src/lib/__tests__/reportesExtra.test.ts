import { describe, it, expect } from 'vitest'
import { moraTemprana, esRenovacion, retencion, type CuotaCron } from '../reportesExtra'
import { etapasSolicitud } from '../../components/solicitud/LineaTiempo'
import type { Credito, Solicitud } from '../../types'

const cr = (id: string, cliente: string, fecha: string, estado = 'activo', dias_mora = 0) =>
  ({ id, cliente_id: cliente, cliente_nombre: cliente, producto_nombre: 'P', monto_desembolsado: 1000, saldo_capital: 500,
     cuotas_total: 6, cuotas_pagadas: 3, proxima_cuota: '', dias_mora, estado, fecha_desembolso: fecha } as unknown as Credito)
const q = (credito_id: string, num: number, fv: string, estado: string, pagada_en: string | null): CuotaCron =>
  ({ credito_id, num, fecha_vencimiento: fv, cuota: 100, monto_pagado: estado === 'pagada' ? 100 : 0, estado, pagada_en })

describe('reportes ampliados', () => {
  it('mora temprana cuenta pagos >7 días tarde o cuotas impagas entre las 3 primeras', () => {
    const creds = [cr('a', 'x', '2026-01-01'), cr('b', 'y', '2026-01-01'), cr('c', 'z', '2026-09-01')]
    const cron = [
      q('a', 1, '2026-02-01', 'pagada', '2026-02-01'), q('a', 2, '2026-03-01', 'pagada', '2026-03-05'), q('a', 3, '2026-04-01', 'pagada', '2026-04-02'),
      q('b', 1, '2026-02-01', 'pagada', '2026-02-20'), q('b', 2, '2026-03-01', 'pagada', '2026-03-01'), q('b', 3, '2026-04-01', 'vencida', null),
      q('c', 1, '2026-10-01', 'pendiente', null), q('c', 2, '2026-11-01', 'pendiente', null), q('c', 3, '2026-12-01', 'pendiente', null),
    ]
    expect(moraTemprana(creds, cron, '2026-09-30')).toEqual({ base: 2, malos: 1, pct: 50 })
  })
  it('renovación y retención', () => {
    const todos = [cr('a', 'x', '2025-01-01', 'cancelado'), cr('b', 'x', '2026-01-01'), cr('c', 'y', '2025-06-01', 'cancelado')]
    expect(esRenovacion(todos[1], todos)).toBe(true)
    expect(esRenovacion(todos[0], todos)).toBe(false)
    expect(retencion(todos, todos)).toEqual({ base: 2, volvieron: 1, pct: 50 })
  })
})

describe('línea de tiempo de la solicitud', () => {
  const base = { id: 's', cliente_id: 'x', cliente_nombre: 'X', producto_id: 'p', producto_nombre: 'P', monto_solicitado: 1, plazo: 6, fecha_solicitud: '2026-09-01', facilitador_id: null } as Solicitud
  const estados = (s: Partial<Solicitud>, c?: Credito) => etapasSolicitud({ ...base, ...s } as Solicitud, c).map(e => e.estado)
  it('enviada sin visita: la visita es la etapa actual', () => {
    expect(estados({ estado: 'enviada' })).toEqual(['hecha', 'actual', 'pendiente', 'pendiente', 'pendiente', 'pendiente'])
  })
  it('enviada con visita: toca enviar al comité', () => {
    expect(estados({ estado: 'enviada', scoring: { estado: 'evaluada' } })).toEqual(['hecha', 'hecha', 'actual', 'pendiente', 'pendiente', 'pendiente'])
  })
  it('en comité', () => {
    expect(estados({ estado: 'revision_comite' })).toEqual(['hecha', 'hecha', 'actual', 'pendiente', 'pendiente', 'pendiente'])
  })
  it('aprobada: toca desembolsar', () => {
    expect(estados({ estado: 'aprobada' })).toEqual(['hecha', 'hecha', 'hecha', 'hecha', 'actual', 'pendiente'])
  })
  it('rechazada: el resto queda omitido', () => {
    expect(estados({ estado: 'rechazada' })).toEqual(['hecha', 'hecha', 'hecha', 'rechazada', 'omitida', 'omitida'])
  })
  it('desembolsada y pagando', () => {
    expect(estados({ estado: 'desembolsada' }, cr('k', 'x', '2026-09-10'))).toEqual(['hecha', 'hecha', 'hecha', 'hecha', 'hecha', 'actual'])
  })
})
