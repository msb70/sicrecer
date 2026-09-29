// ─── Reportes: cálculo sobre los datos cargados (ya filtrados por RLS) ──
import { CLIENTES, CONVENIOS, COBRANZAS, CREDITOS, SOLICITUDES, USUARIOS, ZONAS, PRODUCTOS } from '../mocks'
import { coincide, filaDeCredito, filaDeSolicitud, type FiltrosCartera } from './filtros'
import type { Credito, Solicitud, Cobranza } from '../types'

export type Granularidad = 'mes' | 'trimestre' | 'año'

export interface Rango { desde: string; hasta: string; etiqueta: string }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Rango del período que contiene `ref` (desplazado `atras` períodos hacia atrás). */
export function rangoPeriodo(g: Granularidad, atras = 0, ref = new Date()): Rango {
  const y = ref.getFullYear(), m = ref.getMonth()
  if (g === 'mes') {
    const a = new Date(y, m - atras, 1), b = new Date(y, m - atras + 1, 0)
    return { desde: iso(a), hasta: iso(b), etiqueta: `${MESES[a.getMonth()]} ${a.getFullYear()}` }
  }
  if (g === 'trimestre') {
    const q = Math.floor(m / 3) - atras
    const a = new Date(y, q * 3, 1), b = new Date(y, q * 3 + 3, 0)
    return { desde: iso(a), hasta: iso(b), etiqueta: `T${Math.floor(a.getMonth() / 3) + 1} ${a.getFullYear()}` }
  }
  return { desde: `${y - atras}-01-01`, hasta: `${y - atras}-12-31`, etiqueta: String(y - atras) }
}

export const enRango = (f: string | null | undefined, r: Rango) => Boolean(f) && f!.slice(0, 10) >= r.desde && f!.slice(0, 10) <= r.hasta

/** Buckets de la serie histórica: 6 meses, 4 trimestres o 3 años (el último es el actual). */
export function buckets(g: Granularidad): Rango[] {
  const n = g === 'mes' ? 6 : g === 'trimestre' ? 4 : 3
  return Array.from({ length: n }, (_, i) => rangoPeriodo(g, n - 1 - i))
}

const num = (v: unknown) => Number(v ?? 0) || 0
const activo = (c: Credito) => c.estado !== 'cancelado' && c.estado !== 'castigado'
const APROBADAS = new Set(['aprobada', 'firma', 'desembolsada'])

// ─── Conjuntos filtrados ──────────────────────────────────────
export function datosFiltrados(filtros: FiltrosCartera) {
  const creditos = CREDITOS.filter(c => coincide(filaDeCredito(c), filtros, c.cliente_nombre))
  const ids = new Set(creditos.map(c => c.id))
  const cobranzas = COBRANZAS.filter(c => ids.has(c.credito_id))
  const solicitudes = SOLICITUDES.filter(s => coincide(filaDeSolicitud(s), filtros, s.cliente_nombre ?? ''))
  return { creditos, cobranzas, solicitudes }
}

export interface Cartera {
  saldo: number; activos: number; clientes: number; enMora: number
  par30: number; par90: number; saldoMora30: number
  tramos: { tramo: string; saldo: number; n: number }[]
}

export function cartera(creditos: Credito[]): Cartera {
  const act = creditos.filter(activo)
  const saldo = act.reduce((s, c) => s + num(c.saldo_capital), 0)
  const s30 = act.filter(c => c.dias_mora > 30).reduce((s, c) => s + num(c.saldo_capital), 0)
  const s90 = act.filter(c => c.dias_mora > 90).reduce((s, c) => s + num(c.saldo_capital), 0)
  const T: [string, (d: number) => boolean][] = [
    ['Al día', d => d === 0], ['1–30 días', d => d > 0 && d <= 30], ['31–60 días', d => d > 30 && d <= 60],
    ['61–90 días', d => d > 60 && d <= 90], ['Más de 90 días', d => d > 90],
  ]
  return {
    saldo, activos: act.length, clientes: new Set(act.map(c => c.cliente_id)).size,
    enMora: act.filter(c => c.dias_mora > 0).length,
    par30: saldo ? (s30 / saldo) * 100 : 0, par90: saldo ? (s90 / saldo) * 100 : 0, saldoMora30: s30,
    tramos: T.map(([tramo, f]) => {
      const cs = act.filter(c => f(c.dias_mora))
      return { tramo, n: cs.length, saldo: cs.reduce((s, c) => s + num(c.saldo_capital), 0) }
    }),
  }
}

export interface Flujo { desembolsado: number; nDesembolsos: number; recaudado: number; nPagos: number }

export function flujo(creditos: Credito[], cobranzas: Cobranza[], r: Rango): Flujo {
  const des = creditos.filter(c => enRango(c.fecha_desembolso, r))
  const pag = cobranzas.filter(c => enRango(c.fecha, r))
  return {
    desembolsado: des.reduce((s, c) => s + num(c.monto_desembolsado), 0), nDesembolsos: des.length,
    recaudado: pag.reduce((s, c) => s + num(c.monto), 0), nPagos: pag.length,
  }
}

export interface ResumenSolicitudes {
  recibidas: number; montoSolicitado: number
  aprobadas: number; montoAprobado: number; rechazadas: number; enProceso: number
  tasaAprobacion: number | null; diasDecision: number | null
  embudo: { etapa: string; n: number }[]
}

export function resumenSolicitudes(sols: Solicitud[], r: Rango): ResumenSolicitudes {
  const rec = sols.filter(s => enRango(s.fecha_solicitud, r))
  const decididas = sols.filter(s => enRango(s.fecha_decision ?? (APROBADAS.has(s.estado) || s.estado === 'rechazada' ? s.fecha_solicitud : null), r))
  const apr = decididas.filter(s => APROBADAS.has(s.estado))
  const rch = decididas.filter(s => s.estado === 'rechazada')
  const tiempos = decididas.filter(s => s.fecha_decision).map(s =>
    (new Date(s.fecha_decision!.slice(0, 10)).getTime() - new Date(s.fecha_solicitud.slice(0, 10)).getTime()) / 86_400_000)
  return {
    recibidas: rec.length, montoSolicitado: rec.reduce((s, x) => s + num(x.monto_solicitado), 0),
    aprobadas: apr.length, montoAprobado: apr.reduce((s, x) => s + num(x.monto_aprobado ?? x.monto_solicitado), 0),
    rechazadas: rch.length,
    enProceso: rec.filter(s => ['borrador', 'enviada', 'scoring', 'revision_comite'].includes(s.estado)).length,
    tasaAprobacion: apr.length + rch.length ? (apr.length / (apr.length + rch.length)) * 100 : null,
    diasDecision: tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null,
    embudo: [
      { etapa: 'Recibidas', n: rec.length },
      { etapa: 'Llegaron a comité', n: rec.filter(s => s.enviada_comite_en || ['revision_comite', 'aprobada', 'firma', 'desembolsada', 'rechazada'].includes(s.estado)).length },
      { etapa: 'Aprobadas', n: rec.filter(s => APROBADAS.has(s.estado)).length },
      { etapa: 'Desembolsadas', n: rec.filter(s => s.estado === 'desembolsada').length },
    ],
  }
}

// ─── Por facilitador ──────────────────────────────────────────
export interface FilaFacilitador {
  id: string; nombre: string; zonas: string; clientes: number
  activos: number; saldo: number; enMora: number; par30: number
  desembolsado: number; recaudado: number; solicitudes: number; aprobadas: number
}

export function porFacilitador(creditos: Credito[], cobranzas: Cobranza[], sols: Solicitud[], r: Rango): FilaFacilitador[] {
  const facDeCred = (c: Credito) => filaDeCredito(c).facilitador_id ?? ''
  const claves = new Set<string>([
    ...USUARIOS.filter(u => u.rol === 'facilitador').map(u => u.id),
    ...creditos.map(facDeCred), ...sols.map(s => filaDeSolicitud(s).facilitador_id ?? ''),
  ])
  const credPorId = new Map(creditos.map(c => [c.id, c]))
  return [...claves].map(id => {
    const cs = creditos.filter(c => facDeCred(c) === id)
    const car = cartera(cs)
    const fl = flujo(cs, cobranzas.filter(p => { const c = credPorId.get(p.credito_id); return c && facDeCred(c) === id }), r)
    const ss = sols.filter(s => (filaDeSolicitud(s).facilitador_id ?? '') === id)
    const rs = resumenSolicitudes(ss, r)
    return {
      id, nombre: USUARIOS.find(u => u.id === id)?.nombre ?? 'Sin facilitador',
      zonas: ZONAS.filter(z => z.facilitador_id === id && id).map(z => z.nombre).join(', ') || '—',
      clientes: id ? CLIENTES.filter(c => c.facilitador_id === id).length : CLIENTES.filter(c => !c.facilitador_id).length,
      activos: car.activos, saldo: car.saldo, enMora: car.enMora, par30: car.par30,
      desembolsado: fl.desembolsado, recaudado: fl.recaudado, solicitudes: rs.recibidas, aprobadas: rs.aprobadas,
    }
  }).filter(f => f.id || f.activos || f.solicitudes).sort((a, b) => b.saldo - a.saldo)
}

// ─── Por convenio ─────────────────────────────────────────────
export interface FilaConvenio {
  id: string; cooperante: string; moneda: string; fondo: number; disponible: number; colocadoPct: number
  activos: number; saldo: number; par30: number; desembolsado: number; recaudado: number; solicitudes: number
}

export function porConvenio(creditos: Credito[], cobranzas: Cobranza[], sols: Solicitud[], r: Rango): FilaConvenio[] {
  const credPorId = new Map(creditos.map(c => [c.id, c]))
  return CONVENIOS.map(cv => {
    const cs = creditos.filter(c => c.convenio_id === cv.id)
    const car = cartera(cs)
    const fl = flujo(cs, cobranzas.filter(p => credPorId.get(p.credito_id)?.convenio_id === cv.id), r)
    const prods = new Set(PRODUCTOS.filter(p => p.convenio_id === cv.id).map(p => p.id))
    const fondo = num(cv.monto_total), disp = num(cv.saldo_disponible)
    return {
      id: cv.id, cooperante: cv.cooperante, moneda: cv.moneda, fondo, disponible: disp,
      colocadoPct: fondo ? ((fondo - disp) / fondo) * 100 : 0,
      activos: car.activos, saldo: car.saldo, par30: car.par30,
      desembolsado: fl.desembolsado, recaudado: fl.recaudado,
      solicitudes: sols.filter(s => prods.has(s.producto_id) && enRango(s.fecha_solicitud, r)).length,
    }
  }).sort((a, b) => b.saldo - a.saldo)
}

// ─── Solicitudes por producto ─────────────────────────────────
export function solicitudesPorProducto(sols: Solicitud[], r: Rango) {
  const rec = sols.filter(s => enRango(s.fecha_solicitud, r))
  const productos = [...new Set(rec.map(s => s.producto_id))]
  return productos.map(pid => {
    const ss = rec.filter(s => s.producto_id === pid)
    return {
      producto: ss[0]?.producto_nombre ?? pid,
      recibidas: ss.length,
      portal: ss.filter(s => s.origen === 'externo').length,
      aprobadas: ss.filter(s => APROBADAS.has(s.estado)).length,
      rechazadas: ss.filter(s => s.estado === 'rechazada').length,
      montoSolicitado: ss.reduce((a, s) => a + num(s.monto_solicitado), 0),
      montoAprobado: ss.filter(s => APROBADAS.has(s.estado)).reduce((a, s) => a + num(s.monto_aprobado ?? s.monto_solicitado), 0),
    }
  }).sort((a, b) => b.recibidas - a.recibidas)
}

// ─── Exportar CSV ─────────────────────────────────────────────
export function descargarCSV(nombre: string, filas: Record<string, string | number | null>[]) {
  if (!filas.length) return
  const cols = Object.keys(filas[0])
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = '﻿' + [cols.join(';'), ...filas.map(f => cols.map(c => esc(f[c])).join(';'))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${nombre}.csv`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
