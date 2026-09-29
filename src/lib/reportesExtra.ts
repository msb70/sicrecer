// ─── Reportes ampliados: calidad por facilitador, impacto por convenio,
// tiempos y semáforo de solicitudes, composición de la cartera ────────
import { neon } from './neon'
import { ACTIVIDADES_ECONOMICAS, CLIENTES, CONVENIOS, PRODUCTOS, USUARIOS, ZONAS } from '../mocks'
import { VISITAS } from '../mocks/extra'
import { filaDeCredito, filaDeSolicitud } from './filtros'
import { enRango, type Rango } from './reportes'
import type { FilaSerie } from './dashboard'
import type { Credito, Solicitud } from '../types'

export interface CuotaCron {
  credito_id: string; num: number; fecha_vencimiento: string; cuota: number
  monto_pagado: number; estado: string; pagada_en: string | null
}

/** Cronograma completo visible por RLS (para mora temprana). */
export async function cargarCronograma(): Promise<CuotaCron[]> {
  const { data, error } = await neon.from('cronograma_cuotas')
    .select('credito_id,num,fecha_vencimiento,cuota,monto_pagado,estado,pagada_en').lte('num', 3)
  if (error) throw new Error(`No se pudo cargar el cronograma: ${error.message}`)
  return (data ?? []).map(r => {
    const o = r as Record<string, unknown>
    return {
      credito_id: String(o.credito_id), num: Number(o.num), fecha_vencimiento: String(o.fecha_vencimiento).slice(0, 10),
      cuota: Number(o.cuota ?? 0), monto_pagado: Number(o.monto_pagado ?? 0), estado: String(o.estado),
      pagada_en: o.pagada_en ? String(o.pagada_en).slice(0, 10) : null,
    }
  })
}

const num = (v: unknown) => Number(v ?? 0) || 0
const dias = (a: string, b: string) => (new Date(b.slice(0, 10)).getTime() - new Date(a.slice(0, 10)).getTime()) / 86_400_000
const prom = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const hoyIso = () => new Date().toISOString().slice(0, 10)
const activo = (c: Credito) => c.estado !== 'cancelado' && c.estado !== 'castigado'
const APROBADAS = new Set(['aprobada', 'firma', 'desembolsada'])

/** Meses de la serie que caen dentro del rango. */
export function recaudoEnRango(serie: FilaSerie[], ids: Set<string> | null, r: Rango) {
  const filas = serie.filter(x => x.mes >= r.desde.slice(0, 7) + '-01' && x.mes <= r.hasta && (!ids || ids.has(x.credito_id)))
  const esperado = filas.reduce((s, x) => s + x.esperado, 0)
  const recaudado = filas.reduce((s, x) => s + x.recaudado, 0)
  return { esperado, recaudado, pct: esperado ? (recaudado / esperado) * 100 : null }
}

/**
 * Mora temprana: de los créditos que ya debían haber pagado sus 3 primeras
 * cuotas, cuántos pagaron alguna con más de 7 días de atraso o la deben.
 * Mide la calidad de la originación (visita, scoring) más que la cobranza.
 */
export function moraTemprana(creditos: Credito[], cron: CuotaCron[], hoy = hoyIso()) {
  const porCred = new Map<string, CuotaCron[]>()
  for (const q of cron) porCred.set(q.credito_id, [...(porCred.get(q.credito_id) ?? []), q])
  let base = 0, malos = 0
  for (const c of creditos) {
    const qs = (porCred.get(c.id) ?? []).filter(q => q.num <= 3)
    if (qs.length < 3 || qs.some(q => q.fecha_vencimiento > hoy)) continue
    base++
    if (qs.some(q => q.estado !== 'pagada' || (q.pagada_en && dias(q.fecha_vencimiento, q.pagada_en) > 7))) malos++
  }
  return { base, malos, pct: base ? (malos / base) * 100 : null }
}

/** Crédito de renovación = el cliente ya tenía un crédito desembolsado antes. */
export function esRenovacion(c: Credito, todos: Credito[]) {
  return todos.some(o => o.id !== c.id && o.cliente_id === c.cliente_id && (o.fecha_desembolso ?? '') < (c.fecha_desembolso ?? ''))
}

/** Retención: de los créditos pagados, cuántos clientes volvieron a tomar otro. */
export function retencion(creditos: Credito[], todos: Credito[]) {
  const pagados = creditos.filter(c => c.estado === 'cancelado')
  const volvieron = pagados.filter(c => todos.some(o => o.cliente_id === c.cliente_id && o.id !== c.id && (o.fecha_desembolso ?? '') > (c.fecha_desembolso ?? '')))
  return { base: pagados.length, volvieron: volvieron.length, pct: pagados.length ? (volvieron.length / pagados.length) * 100 : null }
}

// ─── Facilitadores: tablero de calidad ───────────────────────
export interface CalidadFacilitador {
  id: string; nombre: string
  saldo: number; par30: number
  recaudo: { esperado: number; recaudado: number; pct: number | null }
  moraTemprana: { base: number; malos: number; pct: number | null }
  retencion: { base: number; volvieron: number; pct: number | null }
  visitas: { programadas: number; realizadas: number }
  diasADesembolso: number | null
  nuevos: number; renovaciones: number
  clientesPorFacilitador: number
}

export function calidadFacilitadores(creditos: Credito[], todos: Credito[], sols: Solicitud[], serie: FilaSerie[], cron: CuotaCron[], r: Rango): CalidadFacilitador[] {
  const fac = (c: Credito) => filaDeCredito(c).facilitador_id ?? ''
  const ids = new Set<string>([...USUARIOS.filter(u => u.rol === 'facilitador').map(u => u.id), ...creditos.map(fac)])
  return [...ids].map(id => {
    const cs = creditos.filter(c => fac(c) === id)
    const act = cs.filter(activo)
    const saldo = act.reduce((s, c) => s + num(c.saldo_capital), 0)
    const s30 = act.filter(c => c.dias_mora > 30).reduce((s, c) => s + num(c.saldo_capital), 0)
    const vs = VISITAS.filter(v => (v.facilitador_id ?? '') === id && enRango(v.fecha, r))
    const desRango = cs.filter(c => enRango(c.fecha_desembolso, r))
    const tiempos = desRango.map(c => {
      const s = sols.find(x => x.id === c.solicitud_id)
      return s && c.fecha_desembolso ? dias(s.fecha_solicitud, c.fecha_desembolso) : null
    }).filter((x): x is number => x != null && x >= 0)
    return {
      id, nombre: USUARIOS.find(u => u.id === id)?.nombre ?? 'Sin facilitador',
      saldo, par30: saldo ? (s30 / saldo) * 100 : 0,
      recaudo: recaudoEnRango(serie, new Set(cs.map(c => c.id)), r),
      moraTemprana: moraTemprana(cs, cron),
      retencion: retencion(cs, todos),
      visitas: { programadas: vs.length, realizadas: vs.filter(v => v.estado === 'realizada').length },
      diasADesembolso: prom(tiempos),
      nuevos: desRango.filter(c => !esRenovacion(c, todos)).length,
      renovaciones: desRango.filter(c => esRenovacion(c, todos)).length,
      clientesPorFacilitador: new Set(act.map(c => c.cliente_id)).size,
    }
  }).filter(f => f.id || f.saldo).sort((a, b) => b.saldo - a.saldo)
}

// ─── Convenios: ficha de impacto para el cooperante ──────────
export interface FichaConvenio {
  id: string; cooperante: string; moneda: string; estado: string; fechaFin: string
  fondo: number; disponible: number
  colocadoHistorico: number; saldoVigente: number; recuperado: number; rotacion: number
  creditos: number; clientes: number; mujeresPct: number | null; jovenesPct: number | null; ticket: number | null
  renovacionesPct: number | null
  par30: number
  recaudo: { esperado: number; recaudado: number; pct: number | null }
  actividades: { nombre: string; n: number }[]
  zonas: { nombre: string; n: number }[]
  ritmoMensual: number; mesesParaAgotar: number | null
}

const edad = (fn?: string | null) => fn ? Math.floor(dias(fn, hoyIso()) / 365.25) : null

export function fichasConvenio(creditos: Credito[], todos: Credito[], serie: FilaSerie[], r: Rango): FichaConvenio[] {
  const hace3m = new Date(); hace3m.setMonth(hace3m.getMonth() - 3)
  const desde3m = hace3m.toISOString().slice(0, 10)
  return CONVENIOS.map(cv => {
    const cs = creditos.filter(c => c.convenio_id === cv.id)
    const act = cs.filter(activo)
    const colocado = cs.reduce((s, c) => s + num(c.monto_desembolsado), 0)
    const saldo = act.reduce((s, c) => s + num(c.saldo_capital), 0)
    const s30 = act.filter(c => c.dias_mora > 30).reduce((s, c) => s + num(c.saldo_capital), 0)
    const clis = [...new Set(cs.map(c => c.cliente_id))].map(id => CLIENTES.find(x => x.id === id)).filter(Boolean) as typeof CLIENTES
    const conGenero = clis.filter(c => c.genero)
    const conEdad = clis.map(c => edad(c.fecha_nacimiento)).filter((x): x is number => x != null && x > 0)
    const contar = (claves: (string | null | undefined)[], nombre: (k: string) => string) => {
      const m = new Map<string, number>()
      for (const k of claves) if (k) m.set(k, (m.get(k) ?? 0) + 1)
      return [...m.entries()].map(([k, n]) => ({ nombre: nombre(k), n })).sort((a, b) => b.n - a.n).slice(0, 4)
    }
    const ult3 = cs.filter(c => (c.fecha_desembolso ?? '') >= desde3m).reduce((s, c) => s + num(c.monto_desembolsado), 0) / 3
    const disp = num(cv.saldo_disponible), fondo = num(cv.monto_total)
    return {
      id: cv.id, cooperante: cv.cooperante, moneda: cv.moneda, estado: cv.estado, fechaFin: cv.fecha_fin,
      fondo, disponible: disp,
      colocadoHistorico: colocado, saldoVigente: saldo, recuperado: Math.max(0, colocado - saldo),
      rotacion: fondo ? colocado / fondo : 0,
      creditos: cs.length, clientes: clis.length,
      mujeresPct: conGenero.length ? (conGenero.filter(c => c.genero === 'F').length / conGenero.length) * 100 : null,
      jovenesPct: conEdad.length ? (conEdad.filter(e => e <= 28).length / conEdad.length) * 100 : null,
      ticket: cs.length ? colocado / cs.length : null,
      renovacionesPct: cs.length ? (cs.filter(c => esRenovacion(c, todos)).length / cs.length) * 100 : null,
      par30: saldo ? (s30 / saldo) * 100 : 0,
      recaudo: recaudoEnRango(serie, new Set(cs.map(c => c.id)), r),
      actividades: contar(clis.map(c => c.actividad_economica_id), k => ACTIVIDADES_ECONOMICAS.find(a => a.id === k)?.nombre ?? k),
      zonas: contar(clis.map(c => c.zona_id ?? c.zona), k => ZONAS.find(z => z.id === k)?.nombre ?? k),
      ritmoMensual: ult3,
      mesesParaAgotar: ult3 > 0 ? disp / ult3 : null,
    }
  }).filter(f => f.creditos || f.fondo).sort((a, b) => b.colocadoHistorico - a.colocadoHistorico)
}

// ─── Solicitudes: tiempos, semáforo, rechazos, antigüedad ────
export function analisisSolicitudes(sols: Solicitud[], creditos: Credito[], r: Rango) {
  const rec = sols.filter(s => enRango(s.fecha_solicitud, r))
  const t1 = rec.filter(s => s.enviada_comite_en).map(s => dias(s.fecha_solicitud, s.enviada_comite_en!))
  const t2 = rec.filter(s => s.enviada_comite_en && s.fecha_decision).map(s => dias(s.enviada_comite_en!, s.fecha_decision!))
  const t3 = rec.map(s => {
    const c = creditos.find(x => x.solicitud_id === s.id)
    return c?.fecha_desembolso && s.fecha_decision ? dias(s.fecha_decision, c.fecha_desembolso) : null
  }).filter((x): x is number => x != null && x >= 0)
  const semaforo = (['verde', 'ambar', 'naranja', 'rojo', null] as const).map(k => {
    const ss = rec.filter(s => (s.semaforo ?? null) === k)
    const apr = ss.filter(s => APROBADAS.has(s.estado)).length, rch = ss.filter(s => s.estado === 'rechazada').length
    return { semaforo: k, n: ss.length, aprobadas: apr, rechazadas: rch, enProceso: ss.length - apr - rch, tasa: apr + rch ? (apr / (apr + rch)) * 100 : null }
  })
  const motivos = new Map<string, number>()
  for (const s of rec.filter(x => x.estado === 'rechazada')) {
    const m = (s.motivo_rechazo ?? 'Sin motivo registrado').trim()
    motivos.set(m, (motivos.get(m) ?? 0) + 1)
  }
  const hoy = hoyIso()
  const pendientes = sols.filter(s => ['enviada', 'scoring', 'revision_comite'].includes(s.estado))
  const antig = [
    { tramo: '0–7 días', f: (d: number) => d <= 7 }, { tramo: '8–15 días', f: (d: number) => d > 7 && d <= 15 },
    { tramo: '16–30 días', f: (d: number) => d > 15 && d <= 30 }, { tramo: 'Más de 30 días', f: (d: number) => d > 30 },
  ].map(t => ({ tramo: t.tramo, n: pendientes.filter(s => t.f(dias(s.fecha_solicitud, hoy))).length }))
  const aprobadasConMonto = rec.filter(s => APROBADAS.has(s.estado) && s.monto_aprobado)
  const solicitadoAp = aprobadasConMonto.reduce((a, s) => a + num(s.monto_solicitado), 0)
  const aprobadoAp = aprobadasConMonto.reduce((a, s) => a + num(s.monto_aprobado), 0)
  const porFac = new Map<string, number>()
  for (const s of pendientes) { const k = filaDeSolicitud(s).facilitador_id ?? ''; porFac.set(k, (porFac.get(k) ?? 0) + 1) }
  return {
    tiempos: [
      { etapa: 'Solicitud → comité', dias: prom(t1), n: t1.length },
      { etapa: 'Comité → decisión', dias: prom(t2), n: t2.length },
      { etapa: 'Decisión → desembolso', dias: prom(t3), n: t3.length },
    ],
    semaforo,
    motivos: [...motivos.entries()].map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n).slice(0, 6),
    antiguedad: antig, pendientes: pendientes.length,
    recorte: solicitadoAp ? (1 - aprobadoAp / solicitadoAp) * 100 : null,
    portal: { n: rec.filter(s => s.origen === 'externo').length, total: rec.length },
    pendientesPorFacilitador: [...porFac.entries()].map(([id, n]) => ({ nombre: USUARIOS.find(u => u.id === id)?.nombre ?? 'Sin facilitador', n })).sort((a, b) => b.n - a.n),
  }
}

// ─── Resumen: composición de la cartera ──────────────────────
export function composicion(creditos: Credito[], todos: Credito[], r: Rango) {
  const act = creditos.filter(activo)
  const agrupar = (clave: (c: Credito) => string, nombre: (k: string) => string) => {
    const m = new Map<string, Credito[]>()
    for (const c of act) { const k = clave(c); m.set(k, [...(m.get(k) ?? []), c]) }
    return [...m.entries()].map(([k, cs]) => {
      const saldo = cs.reduce((s, c) => s + num(c.saldo_capital), 0)
      const mora = cs.filter(c => c.dias_mora > 30).reduce((s, c) => s + num(c.saldo_capital), 0)
      return { nombre: nombre(k), n: cs.length, saldo, mora, par30: saldo ? (mora / saldo) * 100 : 0 }
    }).sort((a, b) => b.saldo - a.saldo)
  }
  const des = creditos.filter(c => enRango(c.fecha_desembolso, r))
  const renov = des.filter(c => esRenovacion(c, todos))
  const clis = [...new Set(act.map(c => c.cliente_id))].map(id => CLIENTES.find(x => x.id === id)).filter(Boolean) as typeof CLIENTES
  const conG = clis.filter(c => c.genero)
  return {
    porProducto: agrupar(c => c.producto_id ?? c.producto_nombre, k => PRODUCTOS.find(p => p.id === k)?.nombre ?? k),
    porZona: agrupar(c => filaDeCredito(c).zona_id ?? '', k => ZONAS.find(z => z.id === k)?.nombre ?? 'Sin zona'),
    porActividad: agrupar(c => filaDeCredito(c).actividad_economica_id ?? '', k => ACTIVIDADES_ECONOMICAS.find(a => a.id === k)?.nombre ?? 'Sin actividad').slice(0, 6),
    nuevos: des.length - renov.length, renovaciones: renov.length,
    ticket: des.length ? des.reduce((s, c) => s + num(c.monto_desembolsado), 0) / des.length : null,
    mujeresPct: conG.length ? (conG.filter(c => c.genero === 'F').length / conG.length) * 100 : null,
    topMora: act.filter(c => c.dias_mora > 0).sort((a, b) => b.dias_mora - a.dias_mora).slice(0, 5),
  }
}
