// ─── Dashboard: serie mensual de cartera y agregaciones ──────────
// Fuente: vista v_serie_mensual (migración 0015). Un registro por mes y
// crédito con saldo, días de mora al corte, cuota esperada, recaudo y
// desembolso. La vista respeta la RLS: el facilitador recibe solo su zona.

import { neon } from './neon'
import type { Convenio, Credito, Solicitud } from '../types'
import { coincide, type FiltrosCartera } from './filtros'

export interface FilaSerie {
  mes: string            // 'YYYY-MM-01'
  credito_id: string
  convenio_id: string | null
  producto_id: string | null
  zona_id: string | null
  zona: string | null
  facilitador_id: string | null
  actividad_economica_id: string | null
  saldo: number
  dias_mora: number
  esperado: number
  recaudado: number
  desembolsado: number
}

const NUM = ['saldo', 'dias_mora', 'esperado', 'recaudado', 'desembolsado'] as const
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function cargarSerie(): Promise<FilaSerie[]> {
  let ultimo = ''
  for (let intento = 0; intento < 3; intento++) {
    const { data, error } = await neon.from('v_serie_mensual').select('*').order('mes')
    if (!error) {
      if ((data && data.length) || intento >= 1) {
        return (data ?? []).map(f => {
          const o = { ...(f as Record<string, unknown>) }
          for (const k of NUM) o[k] = Number(o[k] ?? 0)
          o.mes = String(o.mes).slice(0, 10)
          return o as unknown as FilaSerie
        })
      }
    } else {
      ultimo = error.message
      if (/PGRST205|schema cache|Could not find/i.test(error.message)) {
        throw new Error('La base aún no publica la vista v_serie_mensual: hay que refrescar la caché del Data API en Neon.')
      }
    }
    await esperar(350 * (intento + 1))
  }
  throw new Error(`No se pudo cargar la serie mensual: ${ultimo}`)
}

export const filtrarSerie = (serie: FilaSerie[], f: FiltrosCartera) => serie.filter(r => coincide(r, { ...f, texto: '' }))

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const etiquetaMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`

export function meses(serie: FilaSerie[]): string[] {
  return [...new Set(serie.map(r => r.mes))].sort()
}
export const ultimo = <T,>(a: T[]): T | null => (a.length ? a[a.length - 1] : null)
export const ultimoMes = (serie: FilaSerie[]) => ultimo(meses(serie))

// ─── 1. Cartera por tramos de mora ───────────────────────────
export const TRAMOS = [
  { id: 'al_dia', etiqueta: 'Al día',      color: '#16a34a', desde: 0,  hasta: 0 },
  { id: 't1_30',  etiqueta: '1–30 días',   color: '#eab308', desde: 1,  hasta: 30 },
  { id: 't31_60', etiqueta: '31–60 días',  color: '#f97316', desde: 31, hasta: 60 },
  { id: 't61_90', etiqueta: '61–90 días',  color: '#dc2626', desde: 61, hasta: 90 },
  { id: 't90',    etiqueta: 'Más de 90',   color: '#7f1d1d', desde: 91, hasta: Infinity },
] as const

export function tramosPorMes(serie: FilaSerie[]) {
  return meses(serie).map(mes => {
    const filas = serie.filter(r => r.mes === mes && r.saldo > 0)
    const valores = TRAMOS.map(t => filas.filter(r => r.dias_mora >= t.desde && r.dias_mora <= t.hasta).reduce((s, r) => s + r.saldo, 0))
    const total = valores.reduce((a, b) => a + b, 0)
    const par30 = filas.filter(r => r.dias_mora > 30).reduce((s, r) => s + r.saldo, 0)
    return { mes, valores, total, par30Pct: total ? (par30 / total) * 100 : 0 }
  })
}

// ─── 2. Esperado vs recaudado ────────────────────────────────
export function cumplimientoPorMes(serie: FilaSerie[]) {
  return meses(serie).map(mes => {
    const filas = serie.filter(r => r.mes === mes)
    const esperado = filas.reduce((s, r) => s + r.esperado, 0)
    const recaudado = filas.reduce((s, r) => s + r.recaudado, 0)
    return { mes, esperado, recaudado, pct: esperado ? (recaudado / esperado) * 100 : null }
  })
}

// ─── 3. Semáforo del scoring vs resultado real ───────────────
export const RESULTADOS = [
  { id: 'al_dia',    etiqueta: 'Al día',          color: '#16a34a' },
  { id: 'cancelado', etiqueta: 'Pagado',          color: '#2563eb' },
  { id: 'mora_30',   etiqueta: 'Mora 1–30',       color: '#eab308' },
  { id: 'mora_mas',  etiqueta: 'Mora > 30',       color: '#dc2626' },
] as const
export const SEMAFOROS = [
  { id: 'verde', etiqueta: 'Verde' }, { id: 'ambar', etiqueta: 'Ámbar' },
  { id: 'naranja', etiqueta: 'Naranja' }, { id: 'rojo', etiqueta: 'Rojo' },
] as const

export function semaforoVsResultado(solicitudes: Solicitud[], creditos: Credito[], creditosVisibles?: Set<string>) {
  return SEMAFOROS.map(s => {
    const creds = solicitudes
      .filter(x => x.semaforo === s.id)
      .map(x => creditos.find(c => c.solicitud_id === x.id))
      .filter((c): c is Credito => Boolean(c) && (!creditosVisibles || creditosVisibles.has(c!.id)))
    const cuenta = (id: string) => creds.filter(c => resultado(c) === id).length
    return { ...s, total: creds.length, valores: RESULTADOS.map(r => cuenta(r.id)) }
  })
}
function resultado(c: Credito): string {
  if (c.estado === 'cancelado') return 'cancelado'
  if (c.dias_mora > 30 || c.estado === 'castigado') return 'mora_mas'
  if (c.dias_mora > 0) return 'mora_30'
  return 'al_dia'
}

// ─── 4. Colocación por convenio ──────────────────────────────
export const PARTES_CONVENIO = [
  { id: 'al_dia',      etiqueta: 'Cartera al día',   color: '#16a34a' },
  { id: 'mora',        etiqueta: 'Cartera en mora',  color: '#dc2626' },
  { id: 'recuperado',  etiqueta: 'Recuperado',       color: '#2563eb' },
  { id: 'disponible',  etiqueta: 'Disponible',       color: '#d1d5db' },
] as const

export function colocacionPorConvenio(serie: FilaSerie[], creditos: Credito[], convenios: Convenio[], mostrarDisponible: boolean) {
  const mes = ultimoMes(serie)
  const ult = serie.filter(r => r.mes === mes)
  const ids = new Set(serie.map(r => r.credito_id))
  return convenios
    .map(cv => {
      const filas = ult.filter(r => r.convenio_id === cv.id)
      const alDia = filas.filter(r => r.dias_mora === 0).reduce((s, r) => s + r.saldo, 0)
      const mora = filas.filter(r => r.dias_mora > 0).reduce((s, r) => s + r.saldo, 0)
      const desembolsado = creditos.filter(c => c.convenio_id === cv.id && ids.has(c.id)).reduce((s, c) => s + c.monto_desembolsado, 0)
      const recuperado = Math.max(0, desembolsado - alDia - mora)
      const disponible = mostrarDisponible ? Math.max(0, cv.saldo_disponible) : 0
      return { id: cv.id, etiqueta: cv.cooperante, valores: [alDia, mora, recuperado, disponible], total: alDia + mora + recuperado + disponible, colocado: desembolsado }
    })
    .filter(x => x.colocado > 0 || x.valores[3] > 0)
    .sort((a, b) => b.total - a.total)
}

// ─── 5. Ranking de facilitadores ─────────────────────────────
export function rankingFacilitadores(serie: FilaSerie[], nombre: (id: string | null) => string) {
  const mes = ultimoMes(serie)
  const ult = serie.filter(r => r.mes === mes && r.saldo > 0)
  const grupos = new Map<string, FilaSerie[]>()
  for (const r of ult) {
    const k = r.facilitador_id ?? ''
    grupos.set(k, [...(grupos.get(k) ?? []), r])
  }
  const cumpl = new Map<string, { e: number; r: number }>()
  for (const r of serie.filter(x => x.mes === mes)) {
    const k = r.facilitador_id ?? ''
    const c = cumpl.get(k) ?? { e: 0, r: 0 }
    c.e += r.esperado; c.r += r.recaudado
    cumpl.set(k, c)
  }
  return [...grupos.entries()].map(([id, filas]) => {
    const saldo = filas.reduce((s, r) => s + r.saldo, 0)
    const par30 = filas.filter(r => r.dias_mora > 30).reduce((s, r) => s + r.saldo, 0)
    const c = cumpl.get(id)
    return {
      id, nombre: nombre(id || null), creditos: filas.length, saldo,
      par30Pct: saldo ? (par30 / saldo) * 100 : 0,
      recaudoPct: c && c.e ? (c.r / c.e) * 100 : null,
    }
  }).sort((a, b) => b.saldo - a.saldo)
}

/** $ 12,5 M · $ 850 mil */
export function cifraCorta(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return `$${(n / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil M`
  if (a >= 1e6) return `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (a >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('es-CO')} mil`
  return `$${Math.round(n).toLocaleString('es-CO')}`
}
