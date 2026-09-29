import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle, Send, Globe } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { SOLICITUDES, CLIENTES, PRODUCTOS, SOLICITANTES, COMITES, REQUISITOS, ACTIVIDADES_ECONOMICAS, CREDITOS, formatCOP, recargarTablas, cargarDatosDesdeNeon } from '../../mocks'
import { DesembolsoModal } from '../../components/credito/DesembolsoModal'
import { DesgloseCredito } from '../../components/credito/DesgloseCredito'
import { describirPlazos } from '../../lib/finanzas'
import { useApp } from '../../context/AppContext'
import { neon } from '../../lib/neon'
import { obtenerFoto } from '../../lib/portal'
import { AdjuntosSolicitante } from '../../components/portal/AdjuntosSolicitante'
import { PAIS_LABELS, type Pais } from '../../types'
import { FormEvaluacion } from '../../components/scoring/FormEvaluacion'
import { Preanalisis } from '../../components/scoring/Preanalisis'
import type { ScoringFEM } from '../../lib/scoring'

const ESTADO_CONFIG = {
  borrador:        { label: 'Borrador',     color: 'gray'   as const, icon: <Clock size={16} /> },
  enviada:         { label: 'Enviada',      color: 'blue'   as const, icon: <Clock size={16} /> },
  scoring:         { label: 'En scoring',   color: 'blue'   as const, icon: <Clock size={16} /> },
  revision_comite: { label: 'En comité',   color: 'yellow' as const, icon: <AlertTriangle size={16} /> },
  aprobada:        { label: 'Aprobada',    color: 'green'  as const, icon: <CheckCircle2 size={16} /> },
  rechazada:       { label: 'Rechazada',   color: 'red'    as const, icon: <XCircle size={16} /> },
  firma:           { label: 'Firma',       color: 'blue'   as const, icon: <Clock size={16} /> },
  desembolsada:    { label: 'Desembolsada',color: 'gray'   as const, icon: <CheckCircle2 size={16} /> },
}

export default function DetalleSolicitud() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { rol, puede } = useApp()
  const [, setTick] = useState(0)
  const solicitud = SOLICITUDES.find(s => s.id === id)
  const cliente  = CLIENTES.find(c => c.id === solicitud?.cliente_id)
  const producto = PRODUCTOS.find(p => p.id === solicitud?.producto_id)
  const solicitante = SOLICITANTES.find(x => x.id === solicitud?.solicitante_id)
  const comiteActivo = COMITES.find(c => c.producto_id === solicitud?.producto_id && c.activo)
  const esExterna = solicitud?.origen === 'externo'

  const [fotos, setFotos] = useState<{ documento?: string | null; selfie?: string | null }>({})
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)
  const [mostrarDesembolso, setMostrarDesembolso] = useState(false)
  const [recarga, setRecarga] = useState(0)
  const creditoGenerado = CREDITOS.find(c => c.solicitud_id === solicitud?.id)
  const puedeDesembolsar = puede('desembolsos', 'editar')
    && solicitud && ['aprobada', 'firma'].includes(solicitud.estado) && !creditoGenerado && Boolean(producto)

  useEffect(() => {
    if (!solicitante) return
    Promise.all([obtenerFoto(solicitante.id, 'documento'), obtenerFoto(solicitante.id, 'selfie')])
      .then(([documento, selfie]) => setFotos({ documento, selfie }))
      .catch(() => {})
  }, [solicitante?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const puedeEnviar = puede('solicitudes', 'editar')
    && solicitud && ['enviada', 'scoring'].includes(solicitud.estado)

  const enviarAComite = async () => {
    if (!solicitud) return
    setEnviando(true); setMsg(null)
    try {
      const { data, error } = await neon.rpc('enviar_a_comite', { p_solicitud_id: solicitud.id })
      if (error) throw new Error(error.message)
      const r = data as { comite: string; notificados: number }
      await recargarTablas('solicitudes')
      setTick(t => t + 1)
      setMsg({ tipo: 'success', texto: `Enviada al comité "${r.comite}". ${r.notificados} miembro(s) notificado(s) por email.` })
    } catch (err) {
      setMsg({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo enviar al comité' })
    } finally {
      setEnviando(false)
    }
  }

  if (!solicitud) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Solicitud no encontrada.</Alert>
          <Button variant="ghost" onClick={() => navigate('/solicitudes')} className="mt-4"><ArrowLeft size={16} />Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  const cfg = ESTADO_CONFIG[solicitud.estado]

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={`Solicitud ${solicitud.id.toUpperCase()}`}
          subtitle={`${solicitud.cliente_nombre} · ${new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CO', { dateStyle: 'long' })}`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/solicitudes')}><ArrowLeft size={16} />Volver</Button>
              {puedeDesembolsar && (
                <Button onClick={() => setMostrarDesembolso(true)}>Registrar desembolso</Button>
              )}
              {creditoGenerado && (
                <Button onClick={() => navigate(`/cartera/${creditoGenerado.id}`)}>Ver crédito</Button>
              )}
            </div>
          }
        />

        {msg && <Alert type={msg.tipo} className="mb-4">{msg.texto}</Alert>}

        {mostrarDesembolso && producto && (
          <DesembolsoModal
            solicitud={solicitud}
            producto={producto}
            onClose={() => setMostrarDesembolso(false)}
            onDone={async (creditoId) => {
              await cargarDatosDesdeNeon()
              setMostrarDesembolso(false)
              navigate(`/cartera/${creditoId}`)
            }}
          />
        )}

        {/* Estado banner */}
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border mb-6 ${
          solicitud.estado === 'aprobada'   ? 'bg-green-50 border-green-200 text-green-800' :
          solicitud.estado === 'rechazada'  ? 'bg-red-50 border-red-200 text-red-800' :
          solicitud.estado === 'revision_comite' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {cfg.icon}
          <div>
            <p className="font-semibold">{cfg.label}</p>
            <p className="text-sm opacity-80">
              {solicitud.estado === 'aprobada'        && 'Esta solicitud fue aprobada y está lista para desembolso.'}
              {solicitud.estado === 'rechazada'       && `Rechazada${solicitud.decidido_por ? ` por ${solicitud.decidido_por}` : ''}${solicitud.motivo_rechazo ? `: ${solicitud.motivo_rechazo}` : '.'}`}
              {solicitud.estado === 'revision_comite' && `En evaluación del comité${solicitud.enviada_comite_en ? ` desde ${new Date(solicitud.enviada_comite_en).toLocaleDateString('es-CO')}` : ''}.`}
              {solicitud.estado === 'enviada'         && (esExterna ? 'Solicitud creada por el solicitante en el portal. Revisa sus datos y envíala al comité.' : 'La solicitud fue enviada y está pendiente de evaluación.')}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Condiciones */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones solicitadas</h2></CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {[
                    ['Producto',       solicitud.producto_nombre],
                    ['Monto',          formatCOP(solicitud.monto_solicitado)],
                    ['Plazo',          `${solicitud.plazo} cuotas`],
                    ['Tasa nominal',   producto ? `${producto.tasa_nominal_anual}%` : '—'],
                    ['Método interés', 'Cuota fija (francés)'],
                    ['Frecuencia',     producto?.frecuencia ?? '—'],
                    ['Plazos permitidos', producto ? describirPlazos(producto) : '—'],
                    ['Servicios desarrollo empresarial', producto ? `${producto.pct_servicios ?? 0}%` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {solicitud.estado === 'aprobada' && solicitud.monto_aprobado != null && (
              <Card className="border-green-200">
                <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones aprobadas por {solicitud.decidido_por}</h2></CardHeader>
                <CardBody>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
                    <div><p className="text-xs text-gray-500">Monto aprobado</p><p className="font-semibold">{formatCOP(Number(solicitud.monto_aprobado))}</p></div>
                    <div><p className="text-xs text-gray-500">Plazo</p><p className="font-semibold">{solicitud.plazo_aprobado} cuotas</p></div>
                    <div><p className="text-xs text-gray-500">Fecha</p><p className="font-semibold">{solicitud.fecha_decision ? new Date(solicitud.fecha_decision).toLocaleDateString('es-CO') : '—'}</p></div>
                  </div>
                  {producto && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <DesgloseCredito monto={Number(solicitud.monto_aprobado)} pctServicios={producto.pct_servicios ?? 0} />
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {esExterna && solicitante && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2"><Globe size={15} className="text-purple-600" /><h2 className="text-sm font-semibold text-gray-800">Datos del solicitante (portal)</h2></div>
                </CardHeader>
                <CardBody>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    {[
                      ['Nombre', solicitante.nombre],
                      ['Email', solicitante.email],
                      ['Documento', `${solicitante.tipo_documento} ${solicitante.documento}`],
                      ['País', PAIS_LABELS[solicitante.pais as Pais] ?? solicitante.pais],
                      ['Teléfono', solicitante.telefono ?? '—'],
                      ['Fecha de nacimiento', solicitante.fecha_nacimiento ?? '—'],
                      ['Ciudad', solicitante.ciudad ?? '—'],
                      ['Dirección', solicitante.direccion ?? '—'],
                      ['Actividad económica', ACTIVIDADES_ECONOMICAS.find(a => a.id === solicitante.actividad_economica_id)?.nombre ?? '—'],
                      ['Propósito', solicitud.proposito ?? '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Requisitos y adjuntos</p>
                    <AdjuntosSolicitante solicitanteId={solicitante.id} producto={producto} />
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Documento de identidad</p>
                      {fotos.documento ? <img src={fotos.documento} alt="Documento" className="w-full rounded-lg border border-gray-200 object-contain max-h-64 bg-gray-50" /> : <p className="text-xs text-gray-400">Sin foto</p>}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Foto de verificación</p>
                      {fotos.selfie ? <img src={fotos.selfie} alt="Selfie" className="w-full rounded-lg border border-gray-200 object-contain max-h-64 bg-gray-50" /> : <p className="text-xs text-gray-400">Sin foto</p>}
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Scoring FEM: visita del asesor + preanálisis */}
            <FormEvaluacion
              solicitudId={solicitud.id}
              editable={puede('solicitudes', 'editar') && !['desembolsada', 'rechazada'].includes(solicitud.estado)}
              onGuardado={() => { setRecarga(r => r + 1); void recargarTablas('solicitudes') }}
            />
            <Preanalisis solicitudId={solicitud.id} inicial={solicitud.scoring as ScoringFEM | null} recarga={recarga} />
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Cliente</h2></CardHeader>
              <CardBody>
                {cliente ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                        {cliente.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cliente.nombre}</p>
                        <p className="text-xs text-gray-500">{cliente.actividad_economica}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
                      <p>Doc: {cliente.documento}</p>
                      <p>Zona: {cliente.zona}</p>
                      <p>Créditos activos: {cliente.creditos_activos}</p>
                    </div>
                    <Button variant="secondary" className="w-full" size="sm" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                      Ver ficha completa
                    </Button>
                  </div>
                ) : <p className="text-sm text-gray-400">No encontrado</p>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Acciones</h2></CardHeader>
              <CardBody className="space-y-2">
                {puedeEnviar && (
                  <>
                    <Button className="w-full" size="sm" loading={enviando} onClick={enviarAComite} disabled={!comiteActivo}>
                      <Send size={14} /> Enviar al comité
                    </Button>
                    <p className="text-xs text-gray-500">
                      {comiteActivo ? `Comité activo: ${comiteActivo.nombre}` : 'No hay comité activo para este producto. Configúralo en Configuración → Comités.'}
                    </p>
                  </>
                )}
                {puedeDesembolsar && (
                  <Button className="w-full" size="sm" onClick={() => setMostrarDesembolso(true)}>Registrar desembolso</Button>
                )}
                {solicitud.estado === 'aprobada' && !creditoGenerado && !puedeDesembolsar && (
                  <p className="text-xs text-gray-500">El desembolso lo registra un administrador o coordinador.</p>
                )}
                {creditoGenerado && (
                  <Button className="w-full" size="sm" onClick={() => navigate(`/cartera/${creditoGenerado.id}`)}>Ver crédito {creditoGenerado.id}</Button>
                )}
                {solicitud.estado === 'revision_comite' && (
                  <Button className="w-full" size="sm" onClick={() => navigate('/comite')}>
                    Ir a comité
                  </Button>
                )}
                <Button variant="secondary" className="w-full" size="sm">
                  Descargar borrador contrato
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
