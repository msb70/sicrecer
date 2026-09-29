import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody, StatCard, Badge, Alert } from '../../components/ui'
import { BarraFiltros } from '../../components/filtros/BarraFiltros'
import { formatCOP } from '../../mocks'
import { FILTROS_VACIOS, type FiltrosCartera } from '../../lib/filtros'
import {
  rangoPeriodo, datosFiltrados, cartera, flujo, resumenSolicitudes, porFacilitador, porConvenio,
  solicitudesPorProducto, descargarCSV, type Granularidad,
} from '../../lib/reportes'
import { clsx } from 'clsx'
import { CREDITOS } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { cargarSerie, type FilaSerie } from '../../lib/dashboard'
import {
  cargarCronograma, recaudoEnRango, calidadFacilitadores, fichasConvenio, analisisSolicitudes, composicion, type CuotaCron,
} from '../../lib/reportesExtra'
import { ResumenExtra, FacilitadoresExtra, ConveniosExtra, SolicitudesExtra } from './SeccionesExtra'

type Tab = 'resumen' | 'facilitadores' | 'convenios' | 'solicitudes'

const pct = (n: number | null, d = 1) => n == null ? '—' : `${n.toFixed(d).replace('.', ',')} %`
const millones = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.', ',')} M` : n >= 1000 ? `${Math.round(n / 1000)} k` : String(Math.round(n))
function variacion(actual: number, anterior: number): string {
  if (!anterior) return actual ? 'sin dato del período anterior' : 'igual que el período anterior'
  const v = ((actual - anterior) / anterior) * 100
  return `${v >= 0 ? '+' : ''}${v.toFixed(0)} % vs período anterior`
}
const parColor = (p: number) => (p > 5 ? 'red' : p > 3 ? 'yellow' : 'green') as 'red' | 'yellow' | 'green'

const C_DES = '#16a34a'   // desembolsado
const C_REC = '#2563eb'   // recaudado

export default function Reportes() {
  const [g, setG] = useState<Granularidad>('mes')
  const [atras, setAtras] = useState(0)
  const [tab, setTab] = useState<Tab>('resumen')
  const [filtros, setFiltros] = useState<FiltrosCartera>(FILTROS_VACIOS)

  const r = rangoPeriodo(g, atras)
  const rAnt = rangoPeriodo(g, atras + 1)
  const serie = useMemo(() => {
    const n = g === 'mes' ? 6 : g === 'trimestre' ? 4 : 3
    return Array.from({ length: n }, (_, i) => rangoPeriodo(g, atras + n - 1 - i))
  }, [g, atras])

  const d = useMemo(() => datosFiltrados(filtros), [filtros])
  const car = useMemo(() => cartera(d.creditos), [d])
  const fl = useMemo(() => flujo(d.creditos, d.cobranzas, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const flAnt = useMemo(() => flujo(d.creditos, d.cobranzas, rAnt), [d, rAnt.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const sol = useMemo(() => resumenSolicitudes(d.solicitudes, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const solAnt = useMemo(() => resumenSolicitudes(d.solicitudes, rAnt), [d, rAnt.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const puntos = useMemo(() => serie.map(b => ({ b, ...flujo(d.creditos, d.cobranzas, b) })), [d, serie])
  const facs = useMemo(() => porFacilitador(d.creditos, d.cobranzas, d.solicitudes, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const convs = useMemo(() => porConvenio(d.creditos, d.cobranzas, d.solicitudes, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const prods = useMemo(() => solicitudesPorProducto(d.solicitudes, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps

  // Serie mensual (esperado vs recaudado) y primeras cuotas (mora temprana)
  const { modo } = useApp()
  const [serieM, setSerieM] = useState<FilaSerie[]>([])
  const [cron, setCron] = useState<CuotaCron[]>([])
  const [cargandoExtra, setCargandoExtra] = useState(false)
  const [errorExtra, setErrorExtra] = useState('')
  useEffect(() => {
    if (modo !== 'google') return
    setCargandoExtra(true)
    Promise.all([cargarSerie(), cargarCronograma()])
      .then(([sm, cr]) => { setSerieM(sm); setCron(cr) })
      .catch(e => setErrorExtra(e instanceof Error ? e.message : 'No se pudieron cargar los datos históricos'))
      .finally(() => setCargandoExtra(false))
  }, [modo])
  const idsCred = useMemo(() => new Set(d.creditos.map(c => c.id)), [d])
  const recaudo = useMemo(() => recaudoEnRango(serieM, idsCred, r), [serieM, idsCred, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const comp = useMemo(() => composicion(d.creditos, CREDITOS, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const calidad = useMemo(() => calidadFacilitadores(d.creditos, CREDITOS, d.solicitudes, serieM, cron, r), [d, serieM, cron, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const fichas = useMemo(() => fichasConvenio(d.creditos, CREDITOS, serieM, r), [d, serieM, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps
  const analisis = useMemo(() => analisisSolicitudes(d.solicitudes, CREDITOS, r), [d, r.desde])  // eslint-disable-line react-hooks/exhaustive-deps

  const exportar = () => {
    const sufijo = `${tab}_${r.desde}_${r.hasta}`
    if (tab === 'resumen') descargarCSV(`sicrecer_resumen_${sufijo}`, puntos.map(p => ({
      periodo: p.b.etiqueta, desde: p.b.desde, hasta: p.b.hasta, desembolsado: p.desembolsado, desembolsos: p.nDesembolsos, recaudado: p.recaudado, pagos: p.nPagos })))
    if (tab === 'facilitadores') descargarCSV(`sicrecer_${sufijo}`, facs.map(f => {
      const q = calidad.find(x => x.id === f.id)
      return {
        facilitador: f.nombre, zonas: f.zonas, clientes: f.clientes, creditos_activos: f.activos, cartera: f.saldo,
        en_mora: f.enMora, par30_pct: Number(f.par30.toFixed(2)), desembolsado: f.desembolsado, recaudado: f.recaudado,
        solicitudes: f.solicitudes, aprobadas: f.aprobadas,
        recaudo_pct: q?.recaudo.pct == null ? null : Number(q.recaudo.pct.toFixed(1)),
        mora_temprana_pct: q?.moraTemprana.pct == null ? null : Number(q.moraTemprana.pct.toFixed(1)),
        retencion_pct: q?.retencion.pct == null ? null : Number(q.retencion.pct.toFixed(1)),
        visitas_realizadas: q?.visitas.realizadas ?? 0, visitas_programadas: q?.visitas.programadas ?? 0,
        dias_a_desembolso: q?.diasADesembolso == null ? null : Number(q.diasADesembolso.toFixed(1)),
        nuevos: q?.nuevos ?? 0, renovaciones: q?.renovaciones ?? 0,
      }
    }))
    if (tab === 'convenios') descargarCSV(`sicrecer_${sufijo}`, convs.map(c => ({
      convenio: c.cooperante, moneda: c.moneda, fondo: c.fondo, disponible: c.disponible, colocado_pct: Number(c.colocadoPct.toFixed(2)),
      creditos_activos: c.activos, cartera: c.saldo, par30_pct: Number(c.par30.toFixed(2)), desembolsado: c.desembolsado,
      recaudado: c.recaudado, solicitudes: c.solicitudes })))
    if (tab === 'solicitudes') descargarCSV(`sicrecer_${sufijo}`, prods.map(p => ({
      producto: p.producto, recibidas: p.recibidas, portal: p.portal, aprobadas: p.aprobadas, rechazadas: p.rechazadas,
      monto_solicitado: p.montoSolicitado, monto_aprobado: p.montoAprobado })))
  }

  const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Reportes"
          subtitle={`Cartera al ${hoy} · movimientos de ${r.etiqueta}`}
          actions={
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['mes', 'trimestre', 'año'] as Granularidad[]).map(p => (
                  <button key={p} onClick={() => { setG(p); setAtras(0) }}
                    className={clsx('px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                      g === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setAtras(a => a + 1)} className="p-1 text-gray-500 hover:text-gray-800" title="Período anterior"><ChevronLeft size={14} /></button>
                <span className="text-xs font-medium text-gray-700 min-w-[70px] text-center">{r.etiqueta}</span>
                <button onClick={() => setAtras(a => Math.max(0, a - 1))} disabled={atras === 0} className="p-1 text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Período siguiente"><ChevronRight size={14} /></button>
              </div>
              <Button variant="secondary" onClick={exportar}><Download size={14} />Exportar CSV</Button>
            </div>
          }
        />

        <BarraFiltros value={filtros} onChange={setFiltros} />
        {errorExtra && <Alert type="error" className="mb-4">{errorExtra}</Alert>}

        <div className="flex gap-1 mb-5 overflow-x-auto border-b border-gray-200">
          {([['resumen', 'Resumen'], ['facilitadores', 'Facilitadores'], ['convenios', 'Convenios'], ['solicitudes', 'Solicitudes']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={clsx('px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                tab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Cartera vigente" value={formatCOP(car.saldo)} sub={`${car.activos} créditos · ${car.clientes} clientes`} color="blue" />
              <StatCard label={`Desembolsado · ${r.etiqueta}`} value={formatCOP(fl.desembolsado)} sub={`${fl.nDesembolsos} créditos · ${variacion(fl.desembolsado, flAnt.desembolsado)}`} color="green" />
              <StatCard label={`Recaudado · ${r.etiqueta}`} value={formatCOP(fl.recaudado)} sub={`${fl.nPagos} pagos · ${variacion(fl.recaudado, flAnt.recaudado)}`} color="blue" />
              <StatCard label="PAR 30 / PAR 90" value={`${pct(car.par30)} / ${pct(car.par90)}`} sub={`${car.enMora} créditos con atraso`} color={parColor(car.par30)} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <h3 className="text-sm font-semibold text-gray-900">Desembolsado y recaudado por {g}</h3>
                  <p className="text-xs text-gray-500">Últimos {serie.length} períodos hasta {r.etiqueta}</p>
                </CardHeader>
                <CardBody><BarrasDobles puntos={puntos.map(p => ({ etiqueta: p.b.etiqueta, a: p.desembolsado, b: p.recaudado }))} /></CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <h3 className="text-sm font-semibold text-gray-900">Cartera por días de mora</h3>
                  <p className="text-xs text-gray-500">Foto al día de hoy</p>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    {car.tramos.map((t, i) => (
                      <div key={t.tramo}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-700">{t.tramo} <span className="text-gray-400">· {t.n}</span></span>
                          <span className="font-medium text-gray-900">{formatCOP(t.saldo)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                          <div className="h-2 rounded-full" style={{ width: `${car.saldo ? (t.saldo / car.saldo) * 100 : 0}%`, background: ['#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#991b1b'][i] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={`Solicitudes · ${r.etiqueta}`} value={String(sol.recibidas)} sub={variacion(sol.recibidas, solAnt.recibidas)} color="gray" />
              <StatCard label="Aprobadas" value={String(sol.aprobadas)} sub={`${formatCOP(sol.montoAprobado)}`} color="green" />
              <StatCard label="Tasa de aprobación" value={pct(sol.tasaAprobacion, 0)} sub={`${sol.rechazadas} rechazadas`} color="gray" />
              <StatCard label="Días hasta la decisión" value={sol.diasDecision == null ? '—' : sol.diasDecision.toFixed(1).replace('.', ',')} sub="promedio de las decididas" color="gray" />
            </div>
            <ResumenExtra comp={comp} recaudo={recaudo} etiqueta={r.etiqueta} cargandoSerie={cargandoExtra} />
          </div>
        )}

        {tab === 'facilitadores' && <div className="mb-6"><FacilitadoresExtra filas={calidad} etiqueta={r.etiqueta} cargando={cargandoExtra} /></div>}
        {tab === 'facilitadores' && (
          <Tabla
            nota={`Cartera = foto de hoy. Desembolsos, recaudo y solicitudes = ${r.etiqueta}. El crédito cuenta para el facilitador de la zona del cliente.`}
            cabeceras={['Facilitador', 'Zonas', 'Clientes', 'Créditos', 'Cartera', 'En mora', 'PAR 30', 'Desembolsado', 'Recaudado', 'Solicitudes', 'Aprobadas']}
            filas={facs.map(f => [
              <span className={f.id ? 'font-medium text-gray-900' : 'text-orange-600 font-medium'}>{f.nombre}</span>,
              f.zonas, f.clientes, f.activos, formatCOP(f.saldo), f.enMora,
              <Badge color={parColor(f.par30)}>{pct(f.par30)}</Badge>,
              formatCOP(f.desembolsado), formatCOP(f.recaudado), f.solicitudes, f.aprobadas,
            ])}
          />
        )}

        {tab === 'convenios' && <div className="mb-6"><ConveniosExtra fichas={fichas} etiqueta={r.etiqueta} /></div>}
        {tab === 'convenios' && (
          <Tabla
            nota={`Fondo y disponible = estado actual del convenio. Desembolsos, recaudo y solicitudes = ${r.etiqueta}.`}
            cabeceras={['Convenio', 'Fondo', 'Disponible', 'Colocado', 'Créditos', 'Cartera', 'PAR 30', 'Desembolsado', 'Recaudado', 'Solicitudes']}
            filas={convs.map(c => [
              <span className="font-medium text-gray-900">{c.cooperante}</span>,
              formatCOP(c.fondo), formatCOP(c.disponible),
              <div className="flex items-center gap-2 min-w-[90px]">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.min(100, c.colocadoPct)}%` }} /></div>
                <span className="text-xs text-gray-600">{c.colocadoPct.toFixed(0)} %</span>
              </div>,
              c.activos, formatCOP(c.saldo), <Badge color={parColor(c.par30)}>{pct(c.par30)}</Badge>,
              formatCOP(c.desembolsado), formatCOP(c.recaudado), c.solicitudes,
            ])}
          />
        )}

        {tab === 'solicitudes' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label={`Recibidas · ${r.etiqueta}`} value={String(sol.recibidas)} sub={formatCOP(sol.montoSolicitado)} color="gray" />
              <StatCard label="En proceso" value={String(sol.enProceso)} sub="enviadas o en comité" color="yellow" />
              <StatCard label="Aprobadas / rechazadas" value={`${sol.aprobadas} / ${sol.rechazadas}`} sub={`tasa ${pct(sol.tasaAprobacion, 0)}`} color="green" />
              <StatCard label="Días hasta la decisión" value={sol.diasDecision == null ? '—' : sol.diasDecision.toFixed(1).replace('.', ',')} sub="promedio" color="gray" />
            </div>
            <Card>
              <CardHeader><h3 className="text-sm font-semibold text-gray-900">Embudo de solicitudes recibidas en {r.etiqueta}</h3></CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {sol.embudo.map((e, i) => {
                    const base = sol.embudo[0].n || 1
                    const prev = i ? sol.embudo[i - 1].n : 0
                    return (
                      <div key={e.etapa} className="flex items-center gap-3">
                        <span className="w-36 text-xs text-gray-600 flex-shrink-0">{e.etapa}</span>
                        <div className="flex-1 h-6 bg-gray-50 rounded">
                          <div className="h-6 rounded bg-brand-500/80 flex items-center px-2" style={{ width: `${Math.max(4, (e.n / base) * 100)}%` }}>
                            <span className="text-xs font-semibold text-white">{e.n}</span>
                          </div>
                        </div>
                        <span className="w-24 text-xs text-gray-400 text-right">{i && prev ? `${Math.round((e.n / prev) * 100)} % pasa` : ''}</span>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
            <SolicitudesExtra a={analisis} etiqueta={r.etiqueta} />
            <Tabla
              nota="Por producto. Portal = solicitudes hechas por el propio emprendedor."
              cabeceras={['Producto', 'Recibidas', 'Del portal', 'Aprobadas', 'Rechazadas', 'Monto solicitado', 'Monto aprobado']}
              filas={prods.map(p => [<span className="font-medium text-gray-900">{p.producto}</span>, p.recibidas, p.portal, p.aprobadas, p.rechazadas, formatCOP(p.montoSolicitado), formatCOP(p.montoAprobado)])}
            />
          </div>
        )}
      </PageContainer>
    </Shell>
  )
}

function Tabla({ cabeceras, filas, nota }: { cabeceras: string[]; filas: React.ReactNode[][]; nota?: string }) {
  return (
    <div>
      {nota && <p className="text-xs text-gray-500 mb-2">{nota}</p>}
      {filas.length === 0
        ? <Alert type="info">Sin datos para este período y estos filtros.</Alert>
        : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {cabeceras.map((h, i) => (
                      <th key={h} className={clsx('px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap', i ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filas.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {f.map((c, j) => <td key={j} className={clsx('px-3 py-2.5 whitespace-nowrap text-gray-700', j ? 'text-right' : 'text-left')}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  )
}

/** Barras agrupadas (desembolsado vs recaudado) en un solo eje en pesos. */
function BarrasDobles({ puntos }: { puntos: { etiqueta: string; a: number; b: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const H = 150, PAD_L = 44, PAD_B = 22, ANCHO = 520
  const max = Math.max(1, ...puntos.flatMap(p => [p.a, p.b]))
  const paso = (ANCHO - PAD_L) / puntos.length
  const bw = Math.min(26, paso / 3)
  const y = (v: number) => H - (v / max) * H
  const ticks = [0, max / 2, max]
  return (
    <div>
      <div className="flex gap-4 mb-2 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_DES }} />Desembolsado</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C_REC }} />Recaudado</span>
      </div>
      <svg viewBox={`0 0 ${ANCHO} ${H + PAD_B + 6}`} className="w-full" role="img" aria-label="Desembolsado y recaudado por período">
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD_L} x2={ANCHO} y1={y(t) + 4} y2={y(t) + 4} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(t) + 7} textAnchor="end" fontSize={9} fill="#9ca3af">{millones(t)}</text>
          </g>
        ))}
        {puntos.map((p, i) => {
          const cx = PAD_L + paso * i + paso / 2
          return (
            <g key={p.etiqueta} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD_L + paso * i} y={0} width={paso} height={H + PAD_B} fill={hover === i ? '#f3f4f6' : 'transparent'} />
              <rect x={cx - bw - 1} y={y(p.a) + 4} width={bw} height={Math.max(0, H - y(p.a))} rx={3} fill={C_DES} />
              <rect x={cx + 1} y={y(p.b) + 4} width={bw} height={Math.max(0, H - y(p.b))} rx={3} fill={C_REC} />
              <text x={cx} y={H + PAD_B} textAnchor="middle" fontSize={10} fill="#6b7280">{p.etiqueta}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs text-gray-500 h-4 mt-1">
        {hover != null
          ? <>{puntos[hover].etiqueta}: desembolsado <strong>{formatCOP(puntos[hover].a)}</strong> · recaudado <strong>{formatCOP(puntos[hover].b)}</strong></>
          : 'Pasa el cursor sobre un período para ver los montos.'}
      </p>
    </div>
  )
}
