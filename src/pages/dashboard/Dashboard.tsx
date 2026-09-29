import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart2, TrendingUp, Target, Building2, Trophy, Gavel, Calendar } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { StatCard, Card, CardHeader, CardBody, Badge, Alert, Button, Spinner } from '../../components/ui'
import { BarraFiltros } from '../../components/filtros/BarraFiltros'
import { BarrasApiladas, BarrasAgrupadas, BarrasHorizontales } from '../../components/graficos/Graficos'
import { useApp } from '../../context/AppContext'
import {
  CREDITOS, CONVENIOS, SOLICITUDES, CLIENTES, USUARIOS, COMITES, COMITE_MIEMBROS, COMITE_VOTOS, formatCOP,
} from '../../mocks'
import { FILTROS_VACIOS, hayFiltros, type FiltrosCartera } from '../../lib/filtros'
import {
  cargarSerie, filtrarSerie, etiquetaMes, tramosPorMes, cumplimientoPorMes, semaforoVsResultado,
  colocacionPorConvenio, rankingFacilitadores, cifraCorta, ultimoMes, ultimo,
  TRAMOS, RESULTADOS, PARTES_CONVENIO, type FilaSerie,
} from '../../lib/dashboard'
import { SEMAFORO } from '../../lib/scoring'

const SOLICITUD_COLOR: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'gray'> = {
  enviada: 'blue', revision_comite: 'yellow', aprobada: 'green', rechazada: 'red',
  desembolsada: 'gray', borrador: 'gray', scoring: 'blue',
}
const PENDIENTES = ['enviada', 'scoring', 'revision_comite']
const pct = (n: number | null, dec = 1) => n == null ? '—' : `${n.toLocaleString('es-CO', { maximumFractionDigits: dec })}%`
const colorCumpl = (p: number | null) => p == null ? '#6b7280' : p >= 95 ? '#16a34a' : p >= 80 ? '#ca8a04' : '#dc2626'

export default function Dashboard() {
  const { rol, usuario, modo, puede } = useApp()
  const navigate = useNavigate()
  const esGestion = ['administrador', 'coordinador', 'auditor'].includes(rol)
  const verGraficos = rol !== 'comite' && (puede('cartera') || puede('reportes'))

  const [serie, setSerie] = useState<FilaSerie[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [filtros, setFiltros] = useState<FiltrosCartera>(FILTROS_VACIOS)

  useEffect(() => {
    if (!verGraficos || modo !== 'google') return
    setCargando(true)
    cargarSerie()
      .then(setSerie)
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudieron cargar los gráficos'))
      .finally(() => setCargando(false))
  }, [verGraficos, modo])

  const datos = useMemo(() => {
    const s = filtrarSerie(serie, filtros)
    const ids = new Set(s.map(r => r.credito_id))
    const mes = ultimoMes(s)
    const tramos = tramosPorMes(s)
    const cumpl = cumplimientoPorMes(s)
    const nombreFac = (id: string | null) => USUARIOS.find(u => u.id === id)?.nombre ?? 'Sin facilitador'
    return {
      mes, ids,
      tramos, cumpl,
      actual: ultimo(tramos),
      cumplActual: ultimo(cumpl),
      cumplAnterior: cumpl.length > 1 ? cumpl[cumpl.length - 2] : null,
      semaforo: semaforoVsResultado(SOLICITUDES, CREDITOS, serie.length ? ids : undefined),
      convenios: colocacionPorConvenio(s, CREDITOS, CONVENIOS, !hayFiltros(filtros) || Boolean(filtros.convenio_id)),
      ranking: rankingFacilitadores(s, nombreFac),
    }
  }, [serie, filtros])

  const primerNombre = (usuario?.nombre ?? '').split(' ')[0]

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={`Bienvenido, ${primerNombre}`}
          subtitle={`Panel principal · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
          actions={rol === 'facilitador' && puede('agenda') ? <Button onClick={() => navigate('/agenda')}><Calendar size={16} />Mi agenda de hoy</Button> : undefined}
        />

        {esGestion && <TilesGestion datos={datos} cargando={cargando} />}
        {rol === 'facilitador' && <TilesFacilitador datos={datos} />}
        {rol === 'comite' && <PanelComite />}

        {verGraficos && (
          <>
            <BarraFiltros value={filtros} onChange={setFiltros} sinBusqueda
              campos={esGestion ? ['convenio', 'zona', 'facilitador', 'actividad', 'producto'] : ['convenio', 'actividad', 'producto']} />
            {error && <Alert type="error" className="mb-4">{error}</Alert>}
            {modo !== 'google' && <Alert type="info" className="mb-4">Los gráficos usan la base de datos real; en modo demo no hay serie histórica.</Alert>}
            {cargando ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : serie.length > 0 && (
              <div className="grid lg:grid-cols-2 gap-6 mb-6">
                <Grafico icono={<TrendingUp size={16} className="text-brand-600" />} titulo="Evolución de la cartera por tramos de mora"
                  nota="Saldo de capital al cierre de cada mes. Encima de cada barra, el PAR30 (saldo con más de 30 días de mora).">
                  <BarrasApiladas
                    series={TRAMOS}
                    puntos={datos.tramos.map(t => ({ etiqueta: etiquetaMes(t.mes), valores: t.valores }))}
                    anotacion={i => datos.tramos[i].total ? pct(datos.tramos[i].par30Pct, 0) : null}
                    detalle={i => {
                      const t = datos.tramos[i]
                      return <>{etiquetaMes(t.mes)}: cartera <strong>{formatCOP(t.total)}</strong> · PAR30 <strong>{pct(t.par30Pct)}</strong> · {TRAMOS.map((x, k) => `${x.etiqueta} ${cifraCorta(t.valores[k])}`).join(' · ')}</>
                    }}
                  />
                </Grafico>

                <Grafico icono={<Target size={16} className="text-blue-600" />} titulo="Recaudo: esperado vs. recaudado"
                  nota="Esperado = cuotas que vencían en el mes. Encima, el % de cumplimiento. El mes en curso aún no ha cerrado.">
                  <BarrasAgrupadas
                    series={[{ etiqueta: 'Esperado', color: '#94a3b8' }, { etiqueta: 'Recaudado', color: '#2563eb' }]}
                    puntos={datos.cumpl.map(c => ({ etiqueta: etiquetaMes(c.mes), valores: [c.esperado, c.recaudado] }))}
                    anotacion={i => datos.cumpl[i].pct == null ? null : { texto: pct(datos.cumpl[i].pct, 0), color: colorCumpl(datos.cumpl[i].pct) }}
                    detalle={i => {
                      const c = datos.cumpl[i]
                      return <>{etiquetaMes(c.mes)}: esperado <strong>{formatCOP(c.esperado)}</strong> · recaudado <strong>{formatCOP(c.recaudado)}</strong> · cumplimiento <strong>{pct(c.pct)}</strong></>
                    }}
                  />
                </Grafico>

                <Grafico icono={<AlertTriangle size={16} className="text-amber-600" />} titulo="¿Acierta el scoring? Semáforo vs. resultado real"
                  nota="Créditos desembolsados según el color con que se aprobaron y cómo van hoy. Con pocos créditos no es evidencia: sirve para calibrar el scoring a medida que haya historia.">
                  {datos.semaforo.some(s => s.total > 0) ? (
                    <BarrasHorizontales
                      porcentaje
                      series={RESULTADOS}
                      filas={datos.semaforo.map(s => ({ etiqueta: s.etiqueta, sub: `${s.total} créditos`, valores: s.valores }))}
                      derecha={i => {
                        const s = datos.semaforo[i]
                        const malos = s.valores[3]
                        return s.total ? <span style={{ color: malos ? '#dc2626' : '#16a34a' }}>{pct((malos / s.total) * 100, 0)} en mora &gt; 30</span> : 'sin créditos'
                      }}
                    />
                  ) : <p className="text-sm text-gray-400 py-6 text-center">Aún no hay créditos desembolsados con semáforo FEM.</p>}
                </Grafico>

                {esGestion && (
                  <Grafico icono={<Building2 size={16} className="text-green-600" />} titulo="Colocación por convenio"
                    nota="Cartera vigente (al día / en mora), capital ya recuperado y fondos disponibles de cada convenio.">
                    {datos.convenios.length ? (
                      <BarrasHorizontales
                        series={PARTES_CONVENIO}
                        filas={datos.convenios.map(c => ({ etiqueta: c.etiqueta, valores: c.valores }))}
                        derecha={i => <>colocado {cifraCorta(datos.convenios[i].colocado)}</>}
                      />
                    ) : <p className="text-sm text-gray-400 py-6 text-center">Sin colocación con estos filtros.</p>}
                  </Grafico>
                )}

                {esGestion && datos.ranking.length > 0 && (
                  <Grafico icono={<Trophy size={16} className="text-amber-500" />} titulo="Ranking de facilitadores" className="lg:col-span-2"
                    nota={`Cartera a ${datos.mes ? etiquetaMes(datos.mes) : 'hoy'}, ordenada por saldo. PAR30 alto = revisar la zona; recaudo = cumplimiento del mes.`}>
                    <BarrasHorizontales
                      series={[{ etiqueta: 'Al día o mora ≤ 30', color: '#16a34a' }, { etiqueta: 'Mora > 30 (PAR30)', color: '#dc2626' }]}
                      filas={datos.ranking.map(r => ({
                        etiqueta: r.nombre, sub: `${r.creditos} créditos`,
                        valores: [r.saldo * (1 - r.par30Pct / 100), r.saldo * (r.par30Pct / 100)],
                      }))}
                      derecha={i => {
                        const r = datos.ranking[i]
                        return <>{cifraCorta(r.saldo)} · <span className={r.par30Pct > 10 ? 'text-red-600 font-semibold' : r.par30Pct > 5 ? 'text-amber-600' : 'text-green-700'}>PAR30 {pct(r.par30Pct, 0)}</span>{r.recaudoPct != null && <> · recaudo {pct(r.recaudoPct, 0)}</>}</>
                      }}
                    />
                  </Grafico>
                )}
              </div>
            )}
          </>
        )}

        {rol !== 'comite' && <Listas mostrarMora={rol !== 'auditor'} mostrarSolicitudes={puede('solicitudes')} />}
      </PageContainer>
    </Shell>
  )
}

type Datos = {
  actual: { total: number; par30Pct: number } | null
  cumplActual: { pct: number | null; recaudado: number; esperado: number } | null
  cumplAnterior: { pct: number | null } | null
}

function TilesGestion({ datos, cargando }: { datos: Datos; cargando: boolean }) {
  const pendientes = SOLICITUDES.filter(s => PENDIENTES.includes(s.estado)).length
  const cartera = datos.actual?.total ?? CREDITOS.filter(c => c.estado !== 'cancelado').reduce((s, c) => s + c.saldo_capital, 0)
  const par = datos.actual?.par30Pct ?? null
  const c = datos.cumplActual
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Cartera activa" value={cargando ? '…' : cifraCorta(cartera)} sub="saldo de capital" color="blue" />
      <StatCard label="PAR > 30 días" value={cargando || par == null ? '…' : pct(par)} sub="del saldo" color={par != null && par > 5 ? 'red' : 'green'} />
      <StatCard label="Recaudo del mes" value={cargando || !c ? '…' : pct(c.pct, 0)}
        sub={c ? `${cifraCorta(c.recaudado)} de ${cifraCorta(c.esperado)}${datos.cumplAnterior?.pct != null ? ` · mes ant. ${pct(datos.cumplAnterior.pct, 0)}` : ''}` : 'cuotas del mes'}
        color={c?.pct != null && c.pct >= 95 ? 'green' : 'yellow'} />
      <StatCard label="Solicitudes pendientes" value={String(pendientes)} sub="enviadas o en comité" color="yellow" />
    </div>
  )
}

function TilesFacilitador({ datos }: { datos: Datos }) {
  const activos = CREDITOS.filter(c => c.estado !== 'cancelado')
  const enMora = activos.filter(c => c.dias_mora > 0)
  const enCurso = SOLICITUDES.filter(s => PENDIENTES.includes(s.estado) || s.estado === 'aprobada').length
  const cartera = datos.actual?.total ?? activos.reduce((s, c) => s + c.saldo_capital, 0)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Mis clientes" value={String(CLIENTES.length)} sub="en mis zonas" color="blue" />
      <StatCard label="Mi cartera" value={cifraCorta(cartera)} sub={`${activos.length} créditos vigentes`} color="green" />
      <StatCard label="Créditos en mora" value={String(enMora.length)} sub={enMora.length ? formatCOP(enMora.reduce((s, c) => s + c.saldo_capital, 0)) : 'todo al día'} color={enMora.length ? 'red' : 'green'} />
      <StatCard label="Solicitudes en curso" value={String(enCurso)} sub={datos.cumplActual?.pct != null ? `recaudo del mes ${pct(datos.cumplActual.pct, 0)}` : 'enviadas, en comité o aprobadas'} color="yellow" />
    </div>
  )
}

function PanelComite() {
  const { usuario, rol } = useApp()
  const navigate = useNavigate()
  const misComites = rol === 'administrador' ? COMITES.map(c => c.id) : COMITE_MIEMBROS.filter(m => m.usuario_id === usuario.id).map(m => m.comite_id)
  const enComite = SOLICITUDES.filter(s => s.estado === 'revision_comite' && (!s.comite_id || misComites.includes(s.comite_id)))
  const porVotar = enComite.filter(s => !COMITE_VOTOS.some(v => v.solicitud_id === s.id && v.usuario_id === usuario.id))
  const mes = new Date().toISOString().slice(0, 7)
  const decididas = SOLICITUDES.filter(s => s.fecha_decision?.startsWith(mes))
  const aprobadas = decididas.filter(s => ['aprobada', 'desembolsada'].includes(s.estado)).length
  const colores = (['verde', 'ambar', 'naranja', 'rojo'] as const).map(k => ({ k, n: enComite.filter(s => s.semaforo === k).length }))
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Por votar" value={String(porVotar.length)} sub="esperan mi voto" color={porVotar.length ? 'yellow' : 'green'} />
        <StatCard label="En comité" value={String(enComite.length)} sub="solicitudes en revisión" color="blue" />
        <StatCard label="Aprobadas este mes" value={String(aprobadas)} sub={`de ${decididas.length} decididas`} color="green" />
        <StatCard label="Rechazadas este mes" value={String(decididas.filter(s => s.estado === 'rechazada').length)} sub="con decisión este mes" color="gray" />
      </div>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2"><Gavel size={16} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-900">Solicitudes por votar</h2></div>
            <div className="flex gap-1.5">
              {colores.filter(c => c.n).map(c => <Badge key={c.k} color={SEMAFORO[c.k].color}>{SEMAFORO[c.k].texto}: {c.n}</Badge>)}
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {porVotar.length === 0 ? <p className="px-6 py-8 text-center text-sm text-gray-400">No tienes solicitudes pendientes de voto.</p> : (
            <div className="divide-y divide-gray-50">
              {porVotar.map(s => (
                <button key={s.id} onClick={() => navigate(`/comite/${s.id}`)} className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.cliente_nombre}</p>
                    <p className="text-xs text-gray-500">{s.producto_nombre} · {formatCOP(s.monto_solicitado)}</p>
                  </div>
                  {s.semaforo ? <Badge color={SEMAFORO[s.semaforo].color}>{SEMAFORO[s.semaforo].texto}{s.scoring && typeof s.scoring.score === 'number' ? ` · ${s.scoring.score}` : ''}</Badge> : <Badge color="gray">sin scoring</Badge>}
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

function Listas({ mostrarMora, mostrarSolicitudes }: { mostrarMora: boolean; mostrarSolicitudes: boolean }) {
  const navigate = useNavigate()
  const enMora = CREDITOS.filter(c => c.dias_mora > 0 && c.estado !== 'cancelado').sort((a, b) => b.dias_mora - a.dias_mora).slice(0, 8)
  const recientes = [...SOLICITUDES].sort((a, b) => (b.fecha_solicitud ?? '').localeCompare(a.fecha_solicitud ?? '')).slice(0, 6)
  if (!mostrarMora && !mostrarSolicitudes) return null
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {mostrarMora && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /><h2 className="text-sm font-semibold text-gray-900">Créditos con más mora</h2></div>
          </CardHeader>
          <CardBody className="p-0">
            {enMora.length === 0 ? <div className="px-6 py-8 text-center text-sm text-gray-400">Sin mora activa</div> : (
              <div className="divide-y divide-gray-50">
                {enMora.map(c => (
                  <button key={c.id} onClick={() => navigate(`/cartera/${c.id}`)} className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 text-left">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.cliente_nombre}</p>
                      <p className="text-xs text-gray-500">{c.producto_nombre}</p>
                    </div>
                    <div className="text-right">
                      <Badge color={c.dias_mora > 30 ? 'red' : 'yellow'}>{c.dias_mora} días</Badge>
                      <p className="text-xs text-gray-500 mt-1">{formatCOP(c.saldo_capital)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
      {mostrarSolicitudes && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><BarChart2 size={16} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-900">Solicitudes recientes</h2></div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="divide-y divide-gray-50">
              {recientes.map(s => (
                <button key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)} className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.cliente_nombre}</p>
                    <p className="text-xs text-gray-500">{s.producto_nombre} · {formatCOP(s.monto_solicitado)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.semaforo && <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEMAFORO[s.semaforo].hex }} title={`Semáforo ${SEMAFORO[s.semaforo].texto}`} />}
                    <Badge color={SOLICITUD_COLOR[s.estado] ?? 'gray'}>{s.estado.replace('_', ' ')}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Grafico({ icono, titulo, nota, children, className }: { icono: ReactNode; titulo: string; nota?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">{icono}<h2 className="text-sm font-semibold text-gray-900">{titulo}</h2></div>
        {nota && <p className="text-xs text-gray-400 mt-1">{nota}</p>}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  )
}
