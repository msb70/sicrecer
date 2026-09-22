import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, MessageSquare, Vote, Globe } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert, Input } from '../../components/ui'
import {
  SOLICITUDES, CLIENTES, PRODUCTOS, SOLICITANTES, COMITES, COMITE_MIEMBROS, COMITE_VOTOS, USUARIOS,
  ACTIVIDADES_ECONOMICAS, REQUISITOS, formatCOP, recargarTablas,
} from '../../mocks'
import { useApp } from '../../context/AppContext'
import { neon } from '../../lib/neon'
import { obtenerFoto } from '../../lib/portal'
import { generarPlan, resumenPlan } from '../../lib/finanzas'
import { PAIS_LABELS, type Pais } from '../../types'
import { clsx } from 'clsx'

type Decision = 'aprobado' | 'rechazado'

export default function DetalleComite() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { usuario, rol } = useApp()
  const [, setTick] = useState(0)

  const solicitud  = SOLICITUDES.find(s => s.id === id)
  const cliente    = CLIENTES.find(c => c.id === solicitud?.cliente_id)
  const producto   = PRODUCTOS.find(p => p.id === solicitud?.producto_id)
  const solicitante = SOLICITANTES.find(x => x.id === solicitud?.solicitante_id)
  const comite     = COMITES.find(c => c.id === solicitud?.comite_id)
  const miembros   = COMITE_MIEMBROS.filter(m => m.comite_id === solicitud?.comite_id)
  const votos      = COMITE_VOTOS.filter(v => v.solicitud_id === solicitud?.id)
  const miVoto     = votos.find(v => v.usuario_id === usuario.id)
  const soyMiembro = miembros.some(m => m.usuario_id === usuario.id) || rol === 'administrador'

  const [decision, setDecision] = useState<Decision | null>(miVoto?.decision ?? null)
  const [comentario, setComentario] = useState(miVoto?.comentario ?? '')
  const [monto, setMonto] = useState(String(miVoto?.monto_propuesto ?? solicitud?.monto_solicitado ?? ''))
  const [plazo, setPlazo] = useState(String(miVoto?.plazo_propuesto ?? solicitud?.plazo ?? ''))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [fotos, setFotos] = useState<{ documento?: string | null; selfie?: string | null }>({})

  useEffect(() => {
    if (!solicitante) return
    Promise.all([obtenerFoto(solicitante.id, 'documento'), obtenerFoto(solicitante.id, 'selfie')])
      .then(([documento, selfie]) => setFotos({ documento, selfie })).catch(() => {})
  }, [solicitante?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const montoN = Number(monto) || 0
  const plazoN = Number(plazo) || 0
  const plan = useMemo(() => {
    if (!producto || montoN <= 0 || plazoN <= 0) return []
    return generarPlan({ monto: montoN, tasaNominalAnual: producto.tasa_nominal_anual, plazo: plazoN, metodo: producto.metodo_interes, frecuencia: producto.frecuencia })
  }, [producto, montoN, plazoN])
  const resumen = useMemo(() => resumenPlan(plan), [plan])

  if (!solicitud) {
    return (
      <Shell><PageContainer>
        <Alert type="error">Solicitud no encontrada.</Alert>
        <Button variant="ghost" className="mt-4" onClick={() => navigate('/comite')}><ArrowLeft size={16} />Volver</Button>
      </PageContainer></Shell>
    )
  }

  const enComite = solicitud.estado === 'revision_comite'
  const total = miembros.length
  const necesarios = Math.floor(total / 2) + 1
  const aprobados = votos.filter(v => v.decision === 'aprobado').length
  const rechazados = votos.filter(v => v.decision === 'rechazado').length

  const emitirVoto = async () => {
    setError(''); setOk('')
    if (!decision) { setError('Selecciona una decisión.'); return }
    if (decision === 'rechazado' && !comentario.trim()) { setError('Indica el motivo del rechazo: el solicitante lo verá.'); return }
    if (decision === 'aprobado' && producto && (montoN < producto.monto_min || montoN > producto.monto_max || plazoN < producto.plazo_min || plazoN > producto.plazo_max)) {
      setError('Monto o plazo fuera del rango del producto.'); return
    }
    setEnviando(true)
    try {
      const { data, error } = await neon.rpc('votar_solicitud', {
        p_solicitud_id: solicitud.id, p_decision: decision, p_comentario: comentario.trim() || null,
        p_monto: decision === 'aprobado' ? montoN : null, p_plazo: decision === 'aprobado' ? plazoN : null,
      })
      if (error) throw new Error(error.message)
      const r = data as { resultado: string; aprobados: number; rechazados: number; miembros: number }
      await recargarTablas('solicitudes', 'comite_votos', 'clientes', 'solicitantes')
      setTick(t => t + 1)
      setOk(r.resultado === 'pendiente'
        ? `Voto registrado (${r.aprobados} a favor, ${r.rechazados} en contra de ${r.miembros}). Falta mayoría.`
        : r.resultado === 'aprobada' ? 'Solicitud APROBADA por mayoría. El solicitante fue notificado.' : 'Solicitud RECHAZADA por mayoría. El solicitante fue notificado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el voto')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={`Comité: ${solicitud.cliente_nombre}`}
          subtitle={`${solicitud.producto_nombre} · ${formatCOP(solicitud.monto_solicitado)} · ${solicitud.plazo} cuotas · ${comite?.nombre ?? ''}`}
          actions={<Button variant="ghost" onClick={() => navigate('/comite')}><ArrowLeft size={16} />Volver</Button>}
        />

        {ok && <Alert type="success" className="mb-4">{ok}</Alert>}
        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        {!enComite && (
          <div className={clsx('flex items-center gap-3 px-5 py-4 rounded-xl border mb-6',
            solicitud.estado === 'aprobada' ? 'bg-green-50 border-green-200 text-green-800' : solicitud.estado === 'rechazada' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-700')}>
            {solicitud.estado === 'aprobada' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <div>
              <p className="font-semibold">{solicitud.estado === 'aprobada' ? 'Aprobada' : solicitud.estado === 'rechazada' ? 'Rechazada' : solicitud.estado}</p>
              <p className="text-sm opacity-80">
                {solicitud.estado === 'aprobada' && `${formatCOP(Number(solicitud.monto_aprobado))} en ${solicitud.plazo_aprobado} cuotas · ${solicitud.fecha_decision ? new Date(solicitud.fecha_decision).toLocaleString('es-CO') : ''}`}
                {solicitud.estado === 'rechazada' && `Motivo: ${solicitud.motivo_rechazo ?? '—'}`}
              </p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Condiciones */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones solicitadas</h2></CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {[
                    ['Producto', solicitud.producto_nombre],
                    ['Monto', formatCOP(solicitud.monto_solicitado)],
                    ['Plazo', `${solicitud.plazo} cuotas (${producto?.frecuencia ?? ''})`],
                    ['Tasa nominal', producto ? `${producto.tasa_nominal_anual}%` : '—'],
                    ['Método', producto?.metodo_interes === 'flat' ? 'Flat' : 'Saldo decreciente'],
                    ['Propósito', solicitud.proposito ?? '—'],
                    ['Fecha', new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CO')],
                    ['Enviada al comité', solicitud.enviada_comite_en ? new Date(solicitud.enviada_comite_en).toLocaleString('es-CO') : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Datos del solicitante externo */}
            {solicitante && (
              <Card>
                <CardHeader><div className="flex items-center gap-2"><Globe size={15} className="text-purple-600" /><h2 className="text-sm font-semibold text-gray-800">Solicitante (portal)</h2></div></CardHeader>
                <CardBody>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {[
                      ['Nombre', solicitante.nombre],
                      ['Documento', `${solicitante.tipo_documento} ${solicitante.documento}`],
                      ['País', PAIS_LABELS[solicitante.pais as Pais] ?? solicitante.pais],
                      ['Teléfono', solicitante.telefono ?? '—'],
                      ['Email', solicitante.email],
                      ['Nacimiento', solicitante.fecha_nacimiento ?? '—'],
                      ['Ciudad', solicitante.ciudad ?? '—'],
                      ['Actividad', ACTIVIDADES_ECONOMICAS.find(a => a.id === solicitante.actividad_economica_id)?.nombre ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(producto?.requisito_ids ?? []).map(rid => {
                      const r = REQUISITOS.find(x => x.id === rid)
                      const okReq = (solicitud.requisitos_confirmados ?? []).includes(rid)
                      return <Badge key={rid} color={okReq ? 'green' : r?.obligatorio ? 'red' : 'gray'}>{okReq ? '✓ ' : '✗ '}{r?.nombre ?? rid}</Badge>
                    })}
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <div><p className="text-xs font-medium text-gray-500 mb-1">Documento</p>{fotos.documento ? <img src={fotos.documento} alt="Documento" className="w-full rounded-lg border object-contain max-h-56 bg-gray-50" /> : <p className="text-xs text-gray-400">Sin foto</p>}</div>
                    <div><p className="text-xs font-medium text-gray-500 mb-1">Selfie</p>{fotos.selfie ? <img src={fotos.selfie} alt="Selfie" className="w-full rounded-lg border object-contain max-h-56 bg-gray-50" /> : <p className="text-xs text-gray-400">Sin foto</p>}</div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Cliente interno */}
            {!solicitante && cliente && (
              <Card>
                <CardHeader><div className="flex items-center gap-2"><User size={15} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-800">Cliente</h2></div></CardHeader>
                <CardBody className="text-sm text-gray-700 space-y-1">
                  <p className="font-medium text-gray-900">{cliente.nombre}</p>
                  <p>{cliente.actividad_economica} · {cliente.zona}</p>
                  <p>Créditos activos: {cliente.creditos_activos} · Total histórico: {formatCOP(cliente.total_prestado)}</p>
                </CardBody>
              </Card>
            )}

            {/* Votos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Vote size={15} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-800">Votación del comité</h2></div>
                  <span className="text-xs text-gray-500">{aprobados} a favor · {rechazados} en contra · mayoría {necesarios}/{total}</span>
                </div>
              </CardHeader>
              <CardBody className="space-y-2">
                {miembros.map(m => {
                  const u = USUARIOS.find(x => x.id === m.usuario_id)
                  const v = votos.find(x => x.usuario_id === m.usuario_id)
                  return (
                    <div key={m.usuario_id} className={clsx('flex items-start gap-3 p-3 rounded-lg border',
                      v?.decision === 'aprobado' ? 'border-green-200 bg-green-50' : v?.decision === 'rechazado' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50')}>
                      <div className="mt-0.5">{v?.decision === 'aprobado' ? <CheckCircle2 size={16} className="text-green-600" /> : v?.decision === 'rechazado' ? <XCircle size={16} className="text-red-600" /> : <Clock size={16} className="text-gray-400" />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{u?.nombre ?? m.usuario_id} {m.usuario_id === usuario.id && <span className="text-xs text-gray-500">(tú)</span>}</p>
                        {v ? (
                          <p className="text-xs text-gray-600 mt-0.5">
                            {v.decision === 'aprobado' ? `Aprueba ${v.monto_propuesto ? formatCOP(Number(v.monto_propuesto)) : ''} ${v.plazo_propuesto ? `en ${v.plazo_propuesto} cuotas` : ''}` : 'Rechaza'}
                            {v.comentario && <span className="flex items-start gap-1 mt-1 text-gray-500"><MessageSquare size={11} className="mt-0.5" />{v.comentario}</span>}
                          </p>
                        ) : <p className="text-xs text-gray-400">Pendiente</p>}
                      </div>
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          </div>

          {/* Mi voto */}
          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">{miVoto ? 'Cambiar mi voto' : 'Mi voto'}</h2></CardHeader>
              <CardBody className="space-y-3">
                {!enComite && <p className="text-sm text-gray-500">La solicitud ya está resuelta.</p>}
                {enComite && !soyMiembro && <p className="text-sm text-gray-500">No eres miembro de este comité.</p>}
                {enComite && soyMiembro && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {(['aprobado', 'rechazado'] as Decision[]).map(d => (
                        <button key={d} onClick={() => setDecision(d)}
                          className={clsx('flex items-center justify-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-colors',
                            decision === d
                              ? d === 'aprobado' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                          {d === 'aprobado' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          {d === 'aprobado' ? 'Aprobar' : 'Rechazar'}
                        </button>
                      ))}
                    </div>

                    {decision === 'aprobado' && producto && (
                      <div className="space-y-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="text-xs text-gray-500">Condiciones a aprobar (puedes ajustarlas)</p>
                        <Input label="Monto" type="number" value={monto} onChange={e => setMonto(e.target.value)} min={producto.monto_min} max={producto.monto_max} />
                        <Input label="Plazo (cuotas)" type="number" value={plazo} onChange={e => setPlazo(e.target.value)} min={producto.plazo_min} max={producto.plazo_max} />
                        {plan[0] && (
                          <p className="text-xs text-gray-600">Cuota {producto.frecuencia}: <b>{formatCOP(plan[0].cuota)}</b> · Total {formatCOP(resumen.totalPagar)}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {decision === 'rechazado' ? 'Motivo del rechazo (lo verá el solicitante)' : 'Comentario (opcional)'}
                      </label>
                      <textarea rows={3} value={comentario} onChange={e => setComentario(e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-500 resize-none"
                        placeholder={decision === 'rechazado' ? 'Ej. Ingresos insuficientes para la cuota solicitada' : 'Observaciones para el resto del comité'} />
                    </div>

                    <Button className={clsx('w-full', decision === 'rechazado' && 'bg-red-600 hover:bg-red-700 focus:ring-red-500')} loading={enviando} onClick={emitirVoto} disabled={!decision}>
                      <Vote size={16} /> {miVoto ? 'Actualizar voto' : 'Emitir voto'}
                    </Button>
                    <p className="text-[11px] text-gray-400">Con {necesarios} votos en el mismo sentido la solicitud queda resuelta y se notifica al solicitante por email.</p>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
