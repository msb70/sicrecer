import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Phone, RefreshCw, ChevronRight, Info, CalendarClock, Repeat, FileCheck, Wallet, MapPin } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Badge, Button, Card, StatCard, Alert, Spinner, EmptyState } from '../../components/ui'
import { BarraFiltros } from '../../components/filtros/BarraFiltros'
import { useApp, usePermiso } from '../../context/AppContext'
import { formatCOP } from '../../mocks'
import { FILTROS_VACIOS, coincide, type FiltrosCartera } from '../../lib/filtros'
import {
  cargarAgenda, ETIQUETA_PRE, type DatosAgenda, type FilaCobranza, type FilaRenovacion,
  type FilaSolicitudPendiente, type Scoring,
} from '../../lib/agenda'
import TabVisitas from './TabVisitas'
import { SEMAFORO } from '../../lib/scoring'
import { clsx } from 'clsx'

type Tab = 'cobranza' | 'cartera' | 'renovacion' | 'solicitudes' | 'visitas'

const fecha = (f?: string | null) => f ? new Date(`${f.slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—'
const hoyLargo = () => new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const TRAMO_COLOR: Record<string, 'green' | 'yellow' | 'orange' | 'red'> = {
  vigente: 'green', '1-30': 'yellow', '31-60': 'orange', '61-90': 'red', '>90': 'red',
}

export default function AgendaFacilitador() {
  const { modo, usuario, rol } = useApp()
  const [datos, setDatos] = useState<DatosAgenda | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('cobranza')
  const [filtros, setFiltros] = useState<FiltrosCartera>(FILTROS_VACIOS)
  const [horizonte, setHorizonte] = useState(7)

  const cargar = async () => {
    if (modo !== 'google') { setError('La agenda consulta la base de datos: inicia sesión con Google.'); return }
    setCargando(true); setError('')
    try { setDatos(await cargarAgenda()) }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la agenda') }
    finally { setCargando(false) }
  }
  useEffect(() => { void cargar() }, [modo])  // eslint-disable-line react-hooks/exhaustive-deps

  const cobranza = useMemo(() => (datos?.cobranza ?? []).filter(f => coincide(f, filtros, `${f.cliente_nombre} ${f.documento ?? ''}`)), [datos, filtros])
  const renovacion = useMemo(() => (datos?.renovacion ?? []).filter(f => coincide(f, filtros, f.cliente_nombre)), [datos, filtros])
  const solicitudes = useMemo(() => (datos?.solicitudes ?? []).filter(f => coincide(f, filtros, f.nombre)), [datos, filtros])

  const vencidos = cobranza.filter(f => f.prioridad === 'vencido')
  const porVencer = cobranza.filter(f => f.prioridad !== 'vencido' && f.dias_para_vencer != null && f.dias_para_vencer <= horizonte)
  const kpi = {
    saldo: cobranza.reduce((s, f) => s + f.saldo_capital, 0),
    vencido: vencidos.reduce((s, f) => s + f.total_vencido, 0),
    porVencer: porVencer.reduce((s, f) => s + f.proxima_monto, 0),
    preaprobados: renovacion.filter(r => r.scoring?.preaprobacion === 'preaprobado' && !r.tiene_solicitud_abierta).length,
  }

  const TABS: { id: Tab; label: string; n?: number; icon: React.ReactNode }[] = [
    { id: 'cobranza', label: 'Cobranza', n: vencidos.length + porVencer.length, icon: <Wallet size={14} /> },
    { id: 'cartera', label: 'Cartera', n: cobranza.length, icon: <CalendarClock size={14} /> },
    { id: 'renovacion', label: 'Renovación', n: renovacion.length, icon: <Repeat size={14} /> },
    { id: 'solicitudes', label: 'Por aprobar', n: solicitudes.length, icon: <FileCheck size={14} /> },
    { id: 'visitas', label: 'Visitas', icon: <MapPin size={14} /> },
  ]

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={rol === 'facilitador' ? `Agenda de ${usuario?.nombre?.split(' ')[0] ?? 'hoy'}` : 'Agenda de facilitadores'}
          subtitle={hoyLargo()}
          actions={<Button variant="secondary" onClick={cargar} loading={cargando}><RefreshCw size={15} />Actualizar</Button>}
        />

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <BarraFiltros value={filtros} onChange={setFiltros} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Cartera vigente" value={formatCOP(kpi.saldo)} sub={`${cobranza.length} créditos`} color="blue" />
          <StatCard label="Vencido a cobrar" value={formatCOP(kpi.vencido)} sub={`${vencidos.length} créditos en mora`} color="red" />
          <StatCard label={`Vence en ${horizonte} días`} value={formatCOP(kpi.porVencer)} sub={`${porVencer.length} cuotas`} color="yellow" />
          <StatCard label="Renovaciones preaprobadas" value={String(kpi.preaprobados)} sub={`${solicitudes.length} solicitudes por aprobar`} color="green" />
        </div>

        <div className="flex gap-1 mb-5 overflow-x-auto border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx('flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700')}
            >
              {t.icon}{t.label}
              {t.n != null && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-1.5">{t.n}</span>}
            </button>
          ))}
        </div>

        {cargando && !datos && <div className="flex justify-center py-12"><Spinner /></div>}

        {tab === 'cobranza' && datos && (
          <TabCobranza vencidos={vencidos} porVencer={porVencer} horizonte={horizonte} setHorizonte={setHorizonte} />
        )}
        {tab === 'cartera' && datos && <TabCartera filas={cobranza} />}
        {tab === 'renovacion' && datos && <TabRenovacion filas={renovacion} />}
        {tab === 'solicitudes' && datos && <TabSolicitudes filas={solicitudes} />}
        {tab === 'visitas' && <TabVisitas />}
      </PageContainer>
    </Shell>
  )
}

// ─── Cobranza: vencido primero, luego lo que vence pronto ─────
function TabCobranza({ vencidos, porVencer, horizonte, setHorizonte }: {
  vencidos: FilaCobranza[]; porVencer: FilaCobranza[]; horizonte: number; setHorizonte: (n: number) => void
}) {
  const navigate = useNavigate()
  const puedeCobrar = usePermiso('cobranza').editar
  const fila = (f: FilaCobranza) => {
    const vencido = f.prioridad === 'vencido'
    const monto = vencido ? f.total_vencido : f.proxima_monto
    return (
      <Card key={f.credito_id} className={clsx(vencido && 'border-red-200')}>
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">{f.cliente_nombre}</p>
              {vencido
                ? <Badge color="red">{f.dias_mora} días de mora · {f.cuotas_vencidas} cuota{f.cuotas_vencidas === 1 ? '' : 's'}</Badge>
                : <Badge color="yellow">{f.dias_para_vencer === 0 ? 'Vence hoy' : `Vence en ${f.dias_para_vencer} días`} · {fecha(f.proxima_fecha)}</Badge>}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {[f.zona, f.convenio, f.producto_nombre, f.actividad_economica].filter(Boolean).join(' · ')}
              {f.facilitador_nombre && <> · <span className="text-gray-400">{f.facilitador_nombre}</span></>}
            </p>
            {vencido && f.cargos_pendientes > 0 && (
              <p className="text-xs text-red-600 mt-0.5">Incluye {formatCOP(f.cargos_pendientes)} de mora y gastos</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right mr-1">
              <p className={clsx('text-base font-bold', vencido ? 'text-red-600' : 'text-gray-900')}>{formatCOP(monto)}</p>
              <p className="text-xs text-gray-400">{vencido ? 'para ponerse al día' : `cuota ${f.proxima_cuota_num ?? ''}`}</p>
            </div>
            {f.telefono && (
              <a href={`tel:${f.telefono}`} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" title={f.telefono}>
                <Phone size={15} />
              </a>
            )}
            {puedeCobrar && (<Button size="sm" onClick={() => navigate(`/cobranza/nueva?credito=${encodeURIComponent(f.credito_id)}`)}>Registrar pago</Button>)}
            <button onClick={() => navigate(`/cartera/${f.credito_id}`)} className="p-2 text-gray-400 hover:text-gray-600" title="Ver crédito">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1.5">
          <AlertTriangle size={15} /> Vencido ({vencidos.length}) — de más a menos días de mora
        </h3>
        {vencidos.length === 0
          ? <p className="text-sm text-gray-400">Sin créditos vencidos.</p>
          : <div className="space-y-2">{vencidos.map(fila)}</div>}
      </section>
      <section>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-800">Próximo a vencer ({porVencer.length})</h3>
          <div className="flex gap-1">
            {[7, 15, 30].map(d => (
              <button key={d} onClick={() => setHorizonte(d)}
                className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium', horizonte === d ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600')}>
                {d} días
              </button>
            ))}
          </div>
        </div>
        {porVencer.length === 0
          ? <p className="text-sm text-gray-400">Ninguna cuota vence en los próximos {horizonte} días.</p>
          : <div className="space-y-2">{porVencer.map(fila)}</div>}
      </section>
    </div>
  )
}

// ─── Cartera vigente y vencida ────────────────────────────────
function TabCartera({ filas }: { filas: FilaCobranza[] }) {
  const navigate = useNavigate()
  const tramos = ['vigente', '1-30', '31-60', '61-90', '>90'] as const
  const resumen = tramos.map(t => {
    const fs = filas.filter(f => f.tramo_mora === t)
    return { t, n: fs.length, saldo: fs.reduce((s, f) => s + f.saldo_capital, 0) }
  })
  const total = resumen.reduce((s, r) => s + r.saldo, 0) || 1

  if (filas.length === 0) return <EmptyState icon={<CalendarClock size={40} />} title="Sin cartera" description="No hay créditos activos con estos filtros." />

  return (
    <div className="space-y-4">
      <Card>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {resumen.map(r => (
            <div key={r.t}>
              <p className="text-xs text-gray-500">{r.t === 'vigente' ? 'Al día' : `Mora ${r.t} días`}</p>
              <p className="text-sm font-semibold text-gray-900">{formatCOP(r.saldo)}</p>
              <p className="text-xs text-gray-400">{r.n} créditos · {Math.round((r.saldo / total) * 100)}%</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Cliente', 'Zona', 'Convenio / producto', 'Saldo', 'Cuotas', 'Vencido', 'Estado', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...filas].sort((a, b) => b.dias_mora - a.dias_mora).map(f => (
                <tr key={f.credito_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/cartera/${f.credito_id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{f.cliente_nombre}</p>
                    <p className="text-xs text-gray-400">{f.actividad_economica ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{f.zona ?? '—'}<br /><span className="text-gray-400">{f.facilitador_nombre ?? 'Sin facilitador'}</span></td>
                  <td className="px-4 py-3 text-xs text-gray-600">{f.convenio ?? '—'}<br /><span className="text-gray-400">{f.producto_nombre}</span></td>
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatCOP(f.saldo_capital)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{f.cuotas_pagadas}/{f.cuotas_total}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{f.total_vencido > 0 ? <span className="text-red-600 font-semibold">{formatCOP(f.total_vencido)}</span> : '—'}</td>
                  <td className="px-4 py-3"><Badge color={TRAMO_COLOR[f.tramo_mora]}>{f.tramo_mora === 'vigente' ? 'Al día' : `${f.dias_mora} d`}</Badge></td>
                  <td className="px-4 py-3"><ChevronRight size={15} className="text-gray-300" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Scoring (común a renovación y solicitudes) ───────────────
function ResumenScoring({ s, montoPedido }: { s: Scoring | null; montoPedido?: number }) {
  if (!s) return null
  const sem = s.semaforo ? SEMAFORO[s.semaforo] : null
  const et = ETIQUETA_PRE[s.preaprobacion] ?? ETIQUETA_PRE.pendiente_visita
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        {sem ? <Badge color={sem.color}>{sem.texto}</Badge> : <Badge color={et.color}>{et.texto}</Badge>}
        {s.score != null && <span className="text-xs text-gray-600">Puntaje <strong>{s.score}</strong>/100{sem && <> · {sem.accion.toLowerCase()}</>}</span>}
        {s.monto_sugerido != null && (
          <span className="text-xs text-green-700">
            Monto sugerido <strong>{formatCOP(s.monto_sugerido)}</strong>
            {montoPedido != null && montoPedido > s.monto_sugerido && <span className="text-orange-600"> (pide {formatCOP(montoPedido)})</span>}
          </span>
        )}
      </div>
      <ul className="text-xs text-gray-500 list-disc pl-4 space-y-0.5">
        {s.razones.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  )
}

function ComoSeCalcula() {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="mb-4">
      <button onClick={() => setAbierto(!abierto)} className="flex items-center gap-1.5 text-xs text-brand-700 hover:underline">
        <Info size={13} /> ¿Cómo se calcula el semáforo?
      </button>
      {abierto && (
        <Alert type="info" className="mt-2">
          <p className="text-xs mb-1"><strong>Scoring FEM (100 puntos)</strong> con la visita del asesor y el historial en SiCrecer:</p>
          <ul className="text-xs list-disc pl-4 space-y-0.5">
            <li>Capacidad de pago (50): cobertura de la cuota sobre el flujo libre (30) y estabilidad del negocio (20).</li>
            <li>Experiencia crediticia (30): pagos en SiCrecer; sin historial, base 15 más referencias y consulta externa.</li>
            <li>Voluntad de pago (20): veracidad comprobada (12) y compromisos cumplidos (8), solo con evidencia.</li>
          </ul>
          <p className="text-xs mt-1">Verde 80–100 · ámbar 65–79 · naranja 50–64 · rojo &lt;50 o filtro. La cuota total no puede superar el 40 % del flujo libre. El primer crédito siempre va a comité, y el comité decide todas las aprobaciones.</p>
        </Alert>
      )}
    </div>
  )
}

// ─── Renovación ───────────────────────────────────────────────
function TabRenovacion({ filas }: { filas: FilaRenovacion[] }) {
  const puedeSolicitar = usePermiso('solicitudes').editar
  const navigate = useNavigate()
  return (
    <div>
      <ComoSeCalcula />
      <p className="text-xs text-gray-500 mb-3">Alerta a 30 días: créditos que terminan en el próximo mes (sin mora mayor a 30 días) y créditos cancelados en los últimos 90 días sin crédito nuevo. La propuesta es hasta 1,5 veces el crédito anterior, ajustada a la capacidad de la última visita.</p>
      {filas.length === 0
        ? <EmptyState icon={<Repeat size={40} />} title="Sin candidatos a renovación" description="Ningún crédito está por terminar con estos filtros." />
        : (
          <div className="space-y-2">
            {filas.map(f => (
              <Card key={f.credito_id}>
                <div className="p-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-900">{f.cliente_nombre}</p>
                      <span className="text-xs text-gray-500">
                        {f.motivo === 'cancelado_reciente' ? 'Crédito cancelado' : `Le quedan ${f.cuotas_restantes} de ${f.cuotas_total} cuotas`}
                        {f.fecha_fin && ` · termina ${fecha(f.fecha_fin)}`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Último crédito {formatCOP(f.monto_desembolsado)} · {[f.zona, f.convenio, f.actividad_economica].filter(Boolean).join(' · ')}
                    </p>
                    <ResumenScoring s={f.scoring} montoPedido={f.scoring?.monto_pedido} />
                  </div>
                  <div className="flex sm:flex-col gap-2 sm:items-end">
                    {f.tiene_solicitud_abierta
                      ? <Badge color="blue">Ya tiene solicitud en curso</Badge>
                      : puedeSolicitar && <Button size="sm" disabled={f.scoring?.preaprobacion === 'no_preaprobado'}
                          onClick={() => navigate(`/solicitudes/nueva?cliente=${encodeURIComponent(f.cliente_id)}`)}>Crear solicitud</Button>}
                    {f.telefono && <a href={`tel:${f.telefono}`} className="text-xs text-brand-700 flex items-center gap-1"><Phone size={12} />{f.telefono}</a>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}

// ─── Solicitudes por aprobar ──────────────────────────────────
const ESTADO_SOL: Record<string, string> = { enviada: 'Enviada', scoring: 'En análisis', revision_comite: 'En comité' }

function TabSolicitudes({ filas }: { filas: FilaSolicitudPendiente[] }) {
  const navigate = useNavigate()
  return (
    <div>
      <ComoSeCalcula />
      {filas.length === 0
        ? <EmptyState icon={<FileCheck size={40} />} title="Sin solicitudes por aprobar" description="No hay solicitudes pendientes con estos filtros." />
        : (
          <div className="space-y-2">
            {filas.map(f => (
              <Card key={f.solicitud_id} className="cursor-pointer hover:border-gray-300" onClick={() => navigate(`/solicitudes/${f.solicitud_id}`)}>
                <div className="p-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-900">{f.nombre}</p>
                      <Badge color="gray">{ESTADO_SOL[f.estado] ?? f.estado}</Badge>
                      {f.origen === 'externo' && <Badge color="purple">Portal</Badge>}
                      <span className="text-xs text-gray-400">hace {f.dias_esperando} días</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Pide {formatCOP(f.monto_solicitado)} a {f.plazo} cuotas · {[f.producto_nombre, f.zona ?? 'Sin zona', f.convenio, f.actividad_economica].filter(Boolean).join(' · ')}
                    </p>
                    <ResumenScoring s={f.scoring} montoPedido={f.monto_solicitado} />
                  </div>
                  <ChevronRight size={16} className="text-gray-300 self-center hidden sm:block" />
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  )
}
