import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, DollarSign, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, StatCard, Alert } from '../../components/ui'
import { CREDITOS, CLIENTES, PRODUCTOS, formatCOP } from '../../mocks'
import { PAGOS, generarCronograma } from '../../mocks/extra'
import { clsx } from 'clsx'

const METODO_LABEL = { efectivo: 'Efectivo', transferencia: 'Transferencia', pse: 'PSE' }

export default function DetalleCredito() {
  const navigate = useNavigate()
  const { id } = useParams()
  const credito = CREDITOS.find(c => c.id === id)
  const cliente  = CLIENTES.find(c => c.id === credito?.cliente_id)
  const producto = PRODUCTOS.find(p => p.nombre === credito?.producto_nombre)
  const pagos    = PAGOS.filter(p => p.credito_id === id)

  const [tabActiva, setTabActiva] = useState<'cronograma' | 'pagos'>('cronograma')
  const [mostrarRegistro, setMostrarRegistro] = useState(false)

  if (!credito) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Crédito no encontrado.</Alert>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/cartera')}><ArrowLeft size={16}/>Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  // Generar cronograma con datos mock razonables
  const tasa    = producto?.tasa_nominal_anual ?? 36
  const plazo   = credito.cuotas_total
  const monto   = credito.monto_desembolsado
  const cronograma = generarCronograma(monto, tasa, plazo, '2025-01-15')
  const pctAvance  = (credito.cuotas_pagadas / credito.cuotas_total) * 100

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={credito.cliente_nombre}
          subtitle={`${credito.producto_nombre} · ${formatCOP(credito.monto_desembolsado)} · ${credito.cuotas_total} cuotas`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/cartera')}><ArrowLeft size={16}/>Volver</Button>
              {credito.estado !== 'cancelado' && (
                <Button onClick={() => setMostrarRegistro(true)}><DollarSign size={16}/>Registrar pago</Button>
              )}
            </div>
          }
        />

        {/* Alerta mora */}
        {credito.dias_mora > 0 && (
          <Alert type="error" className="mb-4">
            <AlertTriangle size={14} className="inline mr-1.5"/>
            Este crédito acumula <strong>{credito.dias_mora} días de mora</strong>.
            Próxima cuota vencida el {new Date(credito.proxima_cuota).toLocaleDateString('es-CO', { dateStyle: 'long' })}.
          </Alert>
        )}

        {/* Modal registro de pago */}
        {mostrarRegistro && (
          <RegistroPagoModal
            credito={credito}
            onClose={() => setMostrarRegistro(false)}
          />
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Monto desembolsado" value={formatCOP(credito.monto_desembolsado)} color="blue"  />
          <StatCard label="Saldo capital"       value={formatCOP(credito.saldo_capital)}      color="yellow"/>
          <StatCard label="Cuotas pagadas"      value={`${credito.cuotas_pagadas}/${credito.cuotas_total}`} color="green"/>
          <StatCard label="Días mora"           value={String(credito.dias_mora)}             color={credito.dias_mora > 0 ? 'red' : 'green'} />
        </div>

        {/* Progreso */}
        <Card className="mb-5">
          <CardBody>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Avance del crédito</span>
              <span className="font-medium text-gray-900">{pctAvance.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
              <div
                className="h-3 bg-brand-500 rounded-full transition-all"
                style={{ width: `${pctAvance}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>Desembolso: {new Date('2025-01-15').toLocaleDateString('es-CO')}</span>
              <span>Fin estimado: {cronograma[cronograma.length - 1]?.fecha && new Date(cronograma[cronograma.length - 1].fecha).toLocaleDateString('es-CO')}</span>
            </div>
          </CardBody>
        </Card>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Cronograma / Pagos */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
              {(['cronograma', 'pagos'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTabActiva(t)}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize',
                    tabActiva === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {t === 'cronograma' ? `Cronograma (${cronograma.length})` : `Pagos (${pagos.length})`}
                </button>
              ))}
            </div>

            {tabActiva === 'cronograma' && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['#', 'Fecha', 'Cuota', 'Capital', 'Interés', 'Saldo', ''].map(h => (
                          <th key={h} className="px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {cronograma.map(c => (
                        <tr key={c.num} className={clsx(c.pagada && 'bg-green-50', !c.pagada && c.num === credito.cuotas_pagadas + 1 && 'bg-yellow-50')}>
                          <td className="px-3 py-2.5 font-medium text-gray-700">{c.num}</td>
                          <td className="px-3 py-2.5 text-gray-500">{new Date(c.fecha).toLocaleDateString('es-CO')}</td>
                          <td className="px-3 py-2.5 font-semibold text-gray-900">{formatCOP(c.cuota)}</td>
                          <td className="px-3 py-2.5 text-gray-600">{formatCOP(c.capital)}</td>
                          <td className="px-3 py-2.5 text-gray-500">{formatCOP(c.interes)}</td>
                          <td className="px-3 py-2.5 text-gray-700">{formatCOP(c.saldo)}</td>
                          <td className="px-3 py-2.5">
                            {c.pagada
                              ? <CheckCircle2 size={14} className="text-green-500"/>
                              : c.num === credito.cuotas_pagadas + 1
                                ? <Clock size={14} className="text-yellow-500"/>
                                : <span className="w-3 h-3 rounded-full border-2 border-gray-200 inline-block"/>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tabActiva === 'pagos' && (
              <Card>
                {pagos.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Sin pagos registrados</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pagos.map(p => (
                      <div key={p.id} className="px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Cuota #{p.cuota_num} — {new Date(p.fecha).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {METODO_LABEL[p.metodo]} · Ref: {p.referencia} · Registrado por: {p.registrado_por}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatCOP(p.monto_total)}</p>
                            <p className="text-xs text-gray-400">K: {formatCOP(p.monto_capital)} · I: {formatCOP(p.monto_interes)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Panel lateral cliente */}
          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del cliente</h2></CardHeader>
              <CardBody>
                {cliente ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                        {cliente.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.nombre}</p>
                        <p className="text-xs text-gray-400">{cliente.actividad_economica}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
                      <p>Zona: {cliente.zona}</p>
                      <p>Tel: {cliente.telefono}</p>
                      <p>Créditos activos: {cliente.creditos_activos}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                      Ver ficha completa
                    </Button>
                  </div>
                ) : <p className="text-sm text-gray-400">Sin información</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Acciones</h2></CardHeader>
              <CardBody className="space-y-2">
                <Button className="w-full" size="sm" onClick={() => setMostrarRegistro(true)}>
                  <DollarSign size={14}/>Registrar pago
                </Button>
                <Button variant="secondary" className="w-full" size="sm">
                  Descargar cronograma
                </Button>
                <Button variant="secondary" className="w-full" size="sm" onClick={() => navigate('/agenda')}>
                  Agendar visita
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}

// ─── Modal de Registro de Pago ─────────────────────────────────
function RegistroPagoModal({ credito, onClose }: { credito: { id: string; cliente_nombre: string; cuotas_pagadas: number; cuotas_total: number }; onClose: () => void }) {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    monto: '',
    metodo: 'efectivo' as 'efectivo' | 'transferencia' | 'pse',
    referencia: '',
    nota: '',
  })
  const [guardado, setGuardado] = useState(false)

  const guardar = () => {
    if (!form.monto || !form.referencia) return
    setGuardado(true)
    setTimeout(onClose, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Registrar pago</h2>
        <p className="text-xs text-gray-400 mb-5">{credito.cliente_nombre} · Cuota {credito.cuotas_pagadas + 1} de {credito.cuotas_total}</p>

        {guardado ? (
          <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Pago registrado correctamente.</Alert>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Fecha del pago</label>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Monto recibido (COP) <span className="text-red-500">*</span></label>
              <input type="number" placeholder="Ej: 100000" value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Método</label>
                <select value={form.metodo} onChange={e => setForm(f => ({ ...f, metodo: e.target.value as typeof form.metodo }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none bg-white focus:border-brand-500">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="pse">PSE</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Referencia <span className="text-red-500">*</span></label>
                <input type="text" placeholder="Ej: EFE-099" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"/>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nota (opcional)</label>
              <textarea rows={2} value={form.nota} onChange={e => setForm(f => ({ ...f, nota: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none resize-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"/>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar} disabled={!form.monto || !form.referencia}>
                <DollarSign size={15}/>Registrar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
