import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, DollarSign, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, StatCard, Alert, Spinner } from '../../components/ui'
import { CREDITOS, CLIENTES, PRODUCTOS, BANCOS, formatCOP, cargarDatosDesdeNeon } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { generarPlan } from '../../lib/finanzas'
import { obtenerEstadoCuenta, aplicarPago } from '../../lib/creditos'
import { DistribucionPago } from '../../components/credito/DistribucionPago'
import type { Credito, EstadoCuenta, CuotaCronograma } from '../../types'
import { clsx } from 'clsx'

const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', pse: 'PSE' }
const TIPO_PAGO = { cuota: 'Cuota', cargos: 'Gastos y mora', anticipo: 'Anticipo a capital' }
const TIPO_CARGO = { gastos_admin: 'Gastos administrativos', mora: 'Mora' }
const ESTADO_CUOTA: Record<CuotaCronograma['estado'], { label: string; color: 'green' | 'red' | 'yellow' | 'gray' }> = {
  pagada: { label: 'Pagada', color: 'green' },
  vencida: { label: 'Vencida', color: 'red' },
  parcial: { label: 'Parcial', color: 'yellow' },
  pendiente: { label: 'Pendiente', color: 'gray' },
}
const fmtFecha = (f?: string | null) => (f ? new Date(`${f.slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO') : '—')

/** Cronograma local para modo demo (sin base de datos). */
function estadoDemo(credito: Credito): EstadoCuenta {
  const producto = PRODUCTOS.find(p => p.id === credito.producto_id || p.nombre === credito.producto_nombre)
  const tasa = credito.tasa_nominal_anual ?? producto?.tasa_nominal_anual ?? 18
  const frecuencia = credito.frecuencia ?? producto?.frecuencia ?? 'mensual'
  const plan = generarPlan({
    monto: credito.monto_desembolsado,
    tasaNominalAnual: tasa,
    plazo: credito.cuotas_total,
    frecuencia,
    fechaDesembolso: credito.fecha_desembolso ?? new Date().toISOString().slice(0, 10),
  })
  const hoy = new Date().toISOString().slice(0, 10)
  const cuotas: CuotaCronograma[] = plan.map((f, i) => {
    const pagada = f.num <= credito.cuotas_pagadas
    return {
      id: i, credito_id: credito.id, num: f.num, fecha_vencimiento: f.fecha!, cuota: f.cuota, capital: f.capital,
      interes: f.interes, saldo_posterior: f.saldo, monto_pagado: pagada ? f.cuota : 0,
      interes_pagado: pagada ? f.interes : 0, capital_pagado: pagada ? f.capital : 0,
      estado: pagada ? 'pagada' : f.fecha! < hoy ? 'vencida' : 'pendiente', pagada_en: pagada ? f.fecha! : null,
    }
  })
  const venc = cuotas.filter(q => q.estado === 'vencida')
  const interes_vencido = venc.reduce((s, q) => s + q.interes, 0)
  const capital_vencido = venc.reduce((s, q) => s + q.capital, 0)
  return {
    credito: { ...credito, tasa_nominal_anual: tasa, frecuencia, cuota_actual: credito.cuota_actual ?? plan[0]?.cuota },
    cuotas, cargos: [], pagos: [],
    resumen: {
      fecha: hoy, gastos_pendientes: 0, mora_pendiente: 0, interes_vencido, capital_vencido,
      cuota_corriente_num: null, cuota_corriente_pendiente: 0, capital_posterior: 0,
      total_para_ponerse_al_dia: interes_vencido + capital_vencido, total_para_cancelar: credito.saldo_capital,
    },
  }
}

export default function DetalleCredito() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { modo, rol } = useApp()
  const creditoMem = CREDITOS.find(c => c.id === id)

  const [estado, setEstado] = useState<EstadoCuenta | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'cronograma' | 'cargos' | 'pagos'>('cronograma')
  const [mostrarRegistro, setMostrarRegistro] = useState(false)

  const cargar = useCallback(async () => {
    if (!id) return
    if (modo !== 'google') {
      if (creditoMem) setEstado(estadoDemo(creditoMem))
      return
    }
    setCargando(true); setError('')
    try {
      setEstado(await obtenerEstadoCuenta(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el estado de cuenta')
    } finally {
      setCargando(false)
    }
  }, [id, modo, creditoMem])

  useEffect(() => { void cargar() }, [cargar])

  const credito = estado?.credito ?? creditoMem
  const cliente = CLIENTES.find(c => c.id === credito?.cliente_id)
  const puedeCobrar = ['administrador', 'coordinador', 'facilitador'].includes(rol)
  const cargosPendientes = useMemo(() => (estado?.cargos ?? []).filter(c => c.estado === 'pendiente'), [estado])

  if (!credito) {
    return (
      <Shell>
        <PageContainer>
          {cargando ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : <Alert type="error">{error || 'Crédito no encontrado.'}</Alert>}
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/cartera')}><ArrowLeft size={16}/>Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  const r = estado?.resumen
  const cuotas = estado?.cuotas ?? []
  const pagadas = cuotas.filter(q => q.estado === 'pagada').length
  const pctAvance = cuotas.length ? (pagadas / cuotas.length) * 100 : 0
  const montoCredito = Number(credito.monto_desembolsado)
  const entregado = Number(credito.monto_entregado ?? credito.monto_desembolsado)
  const servicios = Number(credito.monto_servicios ?? 0)
  const activo = credito.estado !== 'cancelado' && credito.estado !== 'castigado'

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={credito.cliente_nombre}
          subtitle={`${credito.producto_nombre} · ${formatCOP(montoCredito)} · ${credito.cuotas_total} cuotas ${credito.frecuencia ?? ''}`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/cartera')}><ArrowLeft size={16}/>Volver</Button>
              <Button variant="secondary" onClick={() => void cargar()} disabled={cargando}><RefreshCw size={15}/>Actualizar</Button>
              {activo && puedeCobrar && (
                <Button onClick={() => setMostrarRegistro(true)}><DollarSign size={16}/>Registrar pago</Button>
              )}
            </div>
          }
        />

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        {credito.dias_mora > 0 && (
          <Alert type="error" className="mb-4">
            <AlertTriangle size={14} className="inline mr-1.5"/>
            Este crédito acumula <strong>{credito.dias_mora} días de atraso</strong>.
            {r && <> Para ponerse al día debe pagar <strong>{formatCOP(Number(r.total_para_ponerse_al_dia))}</strong>.</>}
          </Alert>
        )}
        {credito.estado === 'cancelado' && <Alert type="success" className="mb-4">Crédito cancelado.</Alert>}

        {mostrarRegistro && (
          <RegistroPagoModal
            credito={credito}
            demo={modo !== 'google'}
            onClose={() => setMostrarRegistro(false)}
            onDone={async () => { setMostrarRegistro(false); await Promise.all([cargar(), cargarDatosDesdeNeon()]) }}
          />
        )}

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <StatCard label="Monto del crédito" value={formatCOP(montoCredito)} sub={servicios > 0 ? `Entregado ${formatCOP(entregado)}` : undefined} color="blue" />
          <StatCard label={`Servicios (${Number(credito.pct_servicios ?? 0)}%)`} value={formatCOP(servicios)} color="gray" />
          <StatCard label="Saldo capital" value={formatCOP(Number(credito.saldo_capital))} color="yellow" />
          <StatCard label="Cuota actual" value={formatCOP(Number(credito.cuota_actual ?? cuotas.find(q => q.estado !== 'pagada')?.cuota ?? 0))} color="green" />
          <StatCard label="Días atraso" value={String(credito.dias_mora)} color={credito.dias_mora > 0 ? 'red' : 'green'} />
        </div>

        {r && activo && (
          <Card className="mb-5">
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Situación al {fmtFecha(r.fecha)}</h2></CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-3 gap-x-8 gap-y-2 text-sm">
                {([
                  ['Gastos administrativos pendientes', r.gastos_pendientes],
                  ['Mora pendiente', r.mora_pendiente],
                  ['Interés vencido', r.interes_vencido],
                  ['Capital vencido', r.capital_vencido],
                  [`Cuota corriente${r.cuota_corriente_num ? ` (#${r.cuota_corriente_num})` : ''}`, r.cuota_corriente_pendiente],
                  ['Capital de cuotas posteriores', r.capital_posterior],
                ] as [string, number][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span><span className="font-medium text-gray-900">{formatCOP(Number(v))}</span>
                  </div>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-xs text-red-700">Total para ponerse al día</p>
                  <p className="text-xl font-bold text-red-800">{formatCOP(Number(r.total_para_ponerse_al_dia))}</p>
                </div>
                <div className="p-3 rounded-xl bg-brand-50 border border-brand-100">
                  <p className="text-xs text-brand-700">Total para cancelar hoy</p>
                  <p className="text-xl font-bold text-brand-800">{formatCOP(Number(r.total_para_cancelar))}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="mb-5">
          <CardBody>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Avance del crédito</span>
              <span className="font-medium text-gray-900">{pagadas}/{cuotas.length} cuotas · {pctAvance.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
              <div className="h-3 bg-brand-500 rounded-full transition-all" style={{ width: `${pctAvance}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Desembolso: {fmtFecha(credito.fecha_desembolso)}</span>
              <span>Última cuota: {fmtFecha(cuotas[cuotas.length - 1]?.fecha_vencimiento)}</span>
            </div>
          </CardBody>
        </Card>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
              {([
                ['cronograma', `Cronograma (${cuotas.length})`],
                ['cargos', `Cargos por atraso (${cargosPendientes.length} pend.)`],
                ['pagos', `Pagos (${estado?.pagos.length ?? 0})`],
              ] as const).map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={clsx('px-4 py-2 text-sm font-medium rounded-lg transition-all', tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                  {label}
                </button>
              ))}
            </div>

            {cargando && !estado && <div className="flex justify-center py-10"><Spinner /></div>}

            {tab === 'cronograma' && estado && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['#', 'Vence', 'Cuota', 'Interés', 'Capital', 'Pagado', 'Saldo', 'Estado'].map(h => (
                          <th key={h} className="px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cuotas.map(c => (
                        <tr key={c.num} className={clsx(c.estado === 'pagada' && 'bg-green-50', c.estado === 'vencida' && 'bg-red-50')}>
                          <td className="px-3 py-2.5 font-medium text-gray-700">{c.num}</td>
                          <td className="px-3 py-2.5 text-gray-500">{fmtFecha(c.fecha_vencimiento)}</td>
                          <td className="px-3 py-2.5 font-semibold text-gray-900">{formatCOP(c.cuota)}</td>
                          <td className="px-3 py-2.5 text-gray-500">{formatCOP(c.interes)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{formatCOP(c.capital)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{formatCOP(c.monto_pagado)}</td>
                          <td className="px-3 py-2.5 text-gray-700">{formatCOP(c.saldo_posterior)}</td>
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-1">
                              {c.estado === 'pagada' ? <CheckCircle2 size={13} className="text-green-500"/> : c.estado === 'vencida' ? <AlertTriangle size={13} className="text-red-500"/> : <Clock size={13} className="text-gray-400"/>}
                              <Badge color={ESTADO_CUOTA[c.estado].color}>{ESTADO_CUOTA[c.estado].label}</Badge>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === 'cargos' && estado && (
              <Card>
                {estado.cargos.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Sin cargos por atraso</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Período desde', 'Cuota', 'Concepto', 'Base (capital vencido)', '%', 'Monto', 'Pagado', 'Estado'].map(h => (
                            <th key={h} className="px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {estado.cargos.map(g => (
                          <tr key={g.id}>
                            <td className="px-3 py-2.5 text-gray-500">{fmtFecha(g.fecha)} <span className="text-gray-300">(p{g.periodo})</span></td>
                            <td className="px-3 py-2.5 text-gray-700">#{g.cuota_num}</td>
                            <td className="px-3 py-2.5 text-gray-700">{TIPO_CARGO[g.tipo]}</td>
                            <td className="px-3 py-2.5 text-gray-600">{formatCOP(g.base_capital)}</td>
                            <td className="px-3 py-2.5 text-gray-600">{g.porcentaje}%</td>
                            <td className="px-3 py-2.5 font-semibold text-gray-900">{formatCOP(g.monto)}</td>
                            <td className="px-3 py-2.5 text-gray-600">{formatCOP(g.monto_pagado)}</td>
                            <td className="px-3 py-2.5"><Badge color={g.estado === 'pagado' ? 'green' : 'red'}>{g.estado === 'pagado' ? 'Pagado' : 'Pendiente'}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 px-4 py-3 border-t border-gray-50">
                  Gastos administrativos {Number(credito.pct_gastos_admin_periodo ?? 0)}% y mora {Number(credito.pct_mora_periodo ?? 0)}% por período sobre capital vencido,
                  después de {credito.dias_gracia_mora ?? 0} días de gracia. Se cobra el período completo.
                </p>
              </Card>
            )}

            {tab === 'pagos' && estado && (
              <Card>
                {estado.pagos.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Sin pagos registrados</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {estado.pagos.map(p => (
                      <div key={p.id} className="px-5 py-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {TIPO_PAGO[p.tipo ?? 'cuota']}{p.tipo === 'cuota' || !p.tipo ? ` #${p.cuota_num}` : ''} — {fmtFecha(p.fecha)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {METODO_LABEL[p.metodo] ?? p.metodo} · Ref: {p.referencia ?? '—'} · {p.registrado_por ?? ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCOP(p.monto_total)}</p>
                          <p className="text-xs text-gray-400">
                            {p.tipo === 'cargos'
                              ? `Gastos ${formatCOP(p.monto_gastos)} · Mora ${formatCOP(p.monto_mora)}`
                              : `K ${formatCOP(p.monto_capital)} · I ${formatCOP(p.monto_interes)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones del crédito</h2></CardHeader>
              <CardBody className="text-sm space-y-1.5">
                {([
                  ['Tasa nominal anual', `${Number(credito.tasa_nominal_anual ?? 0)}%`],
                  ['Método', credito.metodo_interes === 'flat' ? 'Flat (heredado)' : 'Cuota fija (francés)'],
                  ['Periodicidad', credito.frecuencia ?? '—'],
                  ['Monto del crédito', formatCOP(montoCredito)],
                  [`Servicios desarrollo empresarial (${Number(credito.pct_servicios ?? 0)}%)`, `− ${formatCOP(servicios)}`],
                  ['Entregado al cliente', formatCOP(entregado)],
                  ['Mora / período', `${Number(credito.pct_mora_periodo ?? 0)}%`],
                  ['Gastos admin. / período', `${Number(credito.pct_gastos_admin_periodo ?? 0)}%`],
                  ['Días de gracia', String(credito.dias_gracia_mora ?? 0)],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1 border-b border-gray-50">
                    <span className="text-gray-500">{k}</span><span className="text-gray-900 text-right">{v}</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Cliente</h2></CardHeader>
              <CardBody>
                {cliente ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cliente.nombre}</p>
                      <p className="text-xs text-gray-400">{cliente.actividad_economica} · {cliente.zona} · {cliente.telefono}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => navigate(`/clientes/${cliente.id}`)}>Ver ficha completa</Button>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => navigate('/agenda')}>Agendar visita</Button>
                  </div>
                ) : <p className="text-sm text-gray-400">Sin información</p>}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}

// ─── Modal de registro de pago ─────────────────────────────────
function RegistroPagoModal({ credito, demo, onClose, onDone }: {
  credito: Credito; demo: boolean; onClose: () => void; onDone: () => void | Promise<void>
}) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    monto: '',
    metodo: 'efectivo' as 'efectivo' | 'transferencia' | 'pse',
    banco: '',
    referencia: '',
  })
  const [clave] = useState(() => `ui-${crypto.randomUUID()}`)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const montoNum = Number(form.monto) || 0

  const guardar = async () => {
    if (!montoNum || !form.referencia) return
    if (demo) { setError('En modo demo no se registran pagos.'); return }
    setEnviando(true); setError('')
    try {
      await aplicarPago({
        creditoId: credito.id, monto: montoNum, fecha: form.fecha,
        banco: form.banco || form.metodo, referencia: form.referencia, metodo: form.metodo, claveIdempotencia: clave,
      })
      setOk(true)
      setTimeout(() => void onDone(), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el pago')
    } finally {
      setEnviando(false)
    }
  }

  const input = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Registrar pago</h2>
        <p className="text-xs text-gray-400 mb-5">{credito.cliente_nombre} · {credito.producto_nombre}</p>

        {ok ? (
          <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Pago aplicado correctamente.</Alert>
        ) : (
          <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Fecha del pago</label>
                <input type="date" max={new Date().toISOString().slice(0, 10)} value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} className={input}/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Monto recibido <span className="text-red-500">*</span></label>
                <input type="number" placeholder="Ej: 100000" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} className={input}/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Método</label>
                <select value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value as typeof form.metodo }))} className={`${input} bg-white`}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="pse">PSE</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Banco</label>
                <select value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} className={`${input} bg-white`}>
                  <option value="">—</option>
                  {BANCOS.filter(b => b.activo).map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Referencia / comprobante <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Ej: EFE-099" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} className={input}/>
              </div>
            </div>

            {!demo && (
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Así se aplicará</p>
                <DistribucionPago creditoId={credito.id} monto={montoNum} fecha={form.fecha} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar} loading={enviando} disabled={!montoNum || !form.referencia}>
                <DollarSign size={15}/>Aplicar pago
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
