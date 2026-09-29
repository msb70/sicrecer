// ─── Calendario de la agenda ─────────────────────────────────
// Reúne en fechas los compromisos del facilitador: cuotas (cronograma_cuotas),
// visitas y créditos que terminan (renovación). La RLS limita las cuotas a la
// cartera visible para el usuario.

import { neon } from './neon'

export type Vista = 'dia' | 'semana' | 'mes'

/** YYYY-MM-DD en hora local. */
export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const deIso = (s: string) => new Date(`${s.slice(0, 10)}T00:00:00`)
export const sumarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
/** Lunes de la semana de `d`. */
export const inicioSemana = (d: Date) => sumarDias(d, -((d.getDay() + 6) % 7))

/** Días visibles según la vista (el mes se completa a semanas lunes–domingo). */
export function diasVisibles(ancla: Date, vista: Vista): Date[] {
  if (vista === 'dia') return [new Date(ancla.getFullYear(), ancla.getMonth(), ancla.getDate())]
  if (vista === 'semana') { const l = inicioSemana(ancla); return Array.from({ length: 7 }, (_, i) => sumarDias(l, i)) }
  const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1)
  const ultimo = new Date(ancla.getFullYear(), ancla.getMonth() + 1, 0)
  const desde = inicioSemana(primero)
  const hasta = sumarDias(inicioSemana(ultimo), 6)
  const n = Math.round((hasta.getTime() - desde.getTime()) / 86400000) + 1
  return Array.from({ length: n }, (_, i) => sumarDias(desde, i))
}

/** Mueve el ancla un período hacia adelante (+1) o atrás (-1). */
export function mover(ancla: Date, vista: Vista, paso: number): Date {
  if (vista === 'dia') return sumarDias(ancla, paso)
  if (vista === 'semana') return sumarDias(ancla, 7 * paso)
  return new Date(ancla.getFullYear(), ancla.getMonth() + paso, 1)
}

const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

export function titulo(ancla: Date, vista: Vista): string {
  if (vista === 'mes') return mayus(ancla.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }))
  if (vista === 'dia') return mayus(ancla.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  const l = inicioSemana(ancla), d = sumarDias(l, 6)
  const f = (x: Date) => x.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  return `${f(l)} – ${f(d)} ${d.getFullYear()}`
}

export interface CuotaCal {
  credito_id: string
  num: number
  fecha_vencimiento: string
  cuota: number
  monto_pagado: number
  estado: 'pendiente' | 'vencida' | 'pagada' | string
  pagada_en: string | null
}

export async function cargarCuotas(desde: string, hasta: string): Promise<CuotaCal[]> {
  const { data, error } = await neon
    .from('cronograma_cuotas')
    .select('credito_id,num,fecha_vencimiento,cuota,monto_pagado,estado,pagada_en')
    .gte('fecha_vencimiento', desde)
    .lte('fecha_vencimiento', hasta)
    .order('fecha_vencimiento')
  if (error) throw new Error(`No se pudieron cargar las cuotas: ${error.message}`)
  return (data ?? []).map(r => {
    const o = r as Record<string, unknown>
    return {
      ...(o as unknown as CuotaCal),
      fecha_vencimiento: String(o.fecha_vencimiento).slice(0, 10),
      cuota: Number(o.cuota ?? 0),
      monto_pagado: Number(o.monto_pagado ?? 0),
      pagada_en: o.pagada_en ? String(o.pagada_en).slice(0, 10) : null,
    }
  })
}

/** Estado de una cuota a la vista del cobrador. */
export function tipoCuota(c: CuotaCal, hoy: string): 'pagada' | 'vencida' | 'por_cobrar' {
  if (c.estado === 'pagada') return 'pagada'
  return c.fecha_vencimiento < hoy ? 'vencida' : 'por_cobrar'
}

export const COLORES = {
  vencida:    { etiqueta: 'Cuota vencida',     punto: 'bg-red-500',    chip: 'bg-red-50 text-red-700 border-red-100' },
  por_cobrar: { etiqueta: 'Cuota por cobrar',  punto: 'bg-amber-500',  chip: 'bg-amber-50 text-amber-800 border-amber-100' },
  pagada:     { etiqueta: 'Cuota pagada',      punto: 'bg-green-500',  chip: 'bg-green-50 text-green-700 border-green-100' },
  visita:     { etiqueta: 'Visita',            punto: 'bg-blue-500',   chip: 'bg-blue-50 text-blue-700 border-blue-100' },
  renovacion: { etiqueta: 'Termina / renovar', punto: 'bg-purple-500', chip: 'bg-purple-50 text-purple-700 border-purple-100' },
} as const
