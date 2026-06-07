import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, HelpCircle,
  TrendingUp, User, AlertTriangle, MessageSquare, Vote
} from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { SOLICITUDES, CLIENTES, PRODUCTOS, formatCOP } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { clsx } from 'clsx'

// Mock de votos existentes
const VOTOS_INICIALES: Record<string, VotoMiembro[]> = {
  'sol-002': [
    { miembro: 'Ana Restrepo',    rol: 'Coordinadora',    decision: 'aprobado',  comentario: 'El cliente tiene historial interno positivo y buen comportamiento de pago en el grupo solidario.' },
    { miembro: 'Carlos Méndez',   rol: 'Administrador',   decision: 'pendiente', comentario: '' },
    { miembro: 'Elena Gutiérrez', rol: 'Comité externo',  decision: 'pendiente', comentario: '' },
  ],
}

// Scoring breakdown mock
const SCORE_VARS = [
  { variable: 'Antigüedad del negocio',  puntos: 95,  max: 150, descripcion: '< 1 año de operación' },
  { variable: 'Ratio cuota/ingreso DTI', puntos: 140, max: 200, descripcion: 'DTI estimado: 28%' },
  { variable: 'Historial interno',       puntos: 180, max: 200, descripcion: '2 créditos previos sin mora' },
  { variable: 'Actividad económica',     puntos: 100, max: 150, descripcion: 'Comercio minorista – riesgo medio' },
  { variable: 'Datos demográficos',      puntos: 90,  max: 150, descripcion: 'Zona rural periurbana' },
  { variable: 'Liquidez estimada',       puntos: 115, max: 150, descripcion: 'Margen neto estimado 35%' },
]

// Alertas de análisis que el sistema genera automáticamente
const ALERTAS_SISTEMA = [
  { tipo: 'warning', texto: 'El DTI supera el 25% con este monto. Considera reducir a $800.000.' },
  { tipo: 'info',    texto: 'Cliente activo en grupo solidario "Las Emprendedoras" — ningún integrante en mora.' },
]

type Decision = 'aprobado' | 'rechazado' | 'info_adicional' | 'pendiente'
interface VotoMiembro {
  miembro: string
  rol: string
  decision: Decision
  comentario: string
}

export default function DetalleComite() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { usuario } = useApp()

  const solicitud = SOLICITUDES.find(s => s.id === id)
  const cliente   = CLIENTES.find(c => c.id === solicitud?.cliente_id)
  const producto  = PRODUCTOS.find(p => p.id === solicitud?.producto_id)

  const [votos, setVotos] = useState<VotoMiembro[]>(
    VOTOS_INICIALES[id ?? ''] ?? [
      { miembro: usuario?.nombre ?? 'Tú',  rol: 'Comité', decision: 'pendiente', comentario: '' },
      { miembro: 'Ana Restrepo',           rol: 'Coordinadora', decision: 'pendiente', comentario: '' },
      { miembro: 'Carlos Méndez',          rol: 'Administrador', decision: 'pendiente', comentario: '' },
    ]
  )

  const [miDecision, setMiDecision] = useState<Decision>('pendiente')
  const [comentario, setComentario] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  if (!solicitud) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Solicitud no encontrada.</Alert>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/comite')}><ArrowLeft size={16}/>Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  const scoreTotal = SCORE_VARS.reduce((s, v) => s + v.puntos, 0)
  const scoreMax   = SCORE_VARS.reduce((s, v) => s + v.max, 0)
  const votosResueltos = votos.filter(v => v.decision !== 'pendiente').length
  const quorumOk = votosResueltos >= 2

  const emitirVoto = () => {
    if (miDecision === 'pendiente') {
      setError('Selecciona una decisión.')
      return
    }
    if (!comentario.trim()) {
      setError('El comentario es obligatorio para todas las decisiones.')
      return
    }
    setError('')
    // Actualiza el primer voto pendiente como "el mío"
    setVotos(prev => {
      const idx = prev.findIndex(v => v.decision === 'pendiente')
      if (idx === -1) return prev
      const copia = [...prev]
      copia[idx] = { ...copia[idx], decision: miDecision, comentario }
      return copia
    })
    setEnviado(true)
  }

  const DECISION_CONFIG: Record<Decision, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
    aprobado:      { label: 'Aprobar',            color: 'text-green-700', icon: <CheckCircle2 size={16}/>, bg: 'border-green-300 bg-green-50' },
    rechazado:     { label: 'Rechazar',           color: 'text-red-700',   icon: <XCircle size={16}/>,      bg: 'border-red-300 bg-red-50' },
    info_adicional:{ label: 'Solicitar más info', color: 'text-yellow-700',icon: <HelpCircle size={16}/>,   bg: 'border-yellow-300 bg-yellow-50' },
    pendiente:     { label: 'Pendiente',          color: 'text-gray-500',  icon: <Clock size={16}/>,        bg: 'border-gray-200 bg-gray-50' },
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={`Comité: ${solicitud.cliente_nombre}`}
          subtitle={`${solicitud.producto_nombre} · ${formatCOP(solicitud.monto_solicitado)} · ${solicitud.plazo} meses`}
          actions={
            <Button variant="ghost" onClick={() => navigate('/comite')}><ArrowLeft size={16}/>Volver</Button>
          }
        />

        {/* Alertas automáticas del sistema */}
        <div className="space-y-2 mb-5">
          {ALERTAS_SISTEMA.map((a, i) => (
            <Alert key={i} type={a.tipo as 'warning' | 'info'}>
              <AlertTriangle size={13} className="inline mr-1.5"/>
              {a.texto}
            </Alert>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-5">

            {/* Scoring */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-brand-500"/>
                    <h2 className="text-sm font-semibold text-gray-800">Resultado de scoring</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-2xl font-bold text-gray-900">{solicitud.score ?? scoreTotal}</span>
                      <span className="text-xs text-gray-400 ml-1">/{scoreMax}</span>
                    </div>
                    {solicitud.banda_riesgo && (
                      <Badge color={
                        solicitud.banda_riesgo === 'A' ? 'green' :
                        solicitud.banda_riesgo === 'B' ? 'blue' :
                        solicitud.banda_riesgo === 'C' ? 'yellow' : 'red'
                      }>
                        Banda {solicitud.banda_riesgo}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {SCORE_VARS.map(item => {
                    const pct = (item.puntos / item.max) * 100
                    return (
                      <div key={item.variable}>
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{item.variable}</p>
                            <p className="text-xs text-gray-400">{item.descripcion}</p>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 ml-4 flex-shrink-0">{item.puntos}<span className="text-gray-400 font-normal">/{item.max}</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-400 flex justify-between">
                  <span>Scorecard v1.0.0-reglas-expertas</span>
                  <span>{solicitud.fecha_solicitud}</span>
                </div>
              </CardBody>
            </Card>

            {/* Condiciones del crédito */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-800">Condiciones solicitadas</h2>
              </CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  {[
                    ['Producto',          solicitud.producto_nombre],
                    ['Monto solicitado',  formatCOP(solicitud.monto_solicitado)],
                    ['Plazo',             `${solicitud.plazo} meses`],
                    ['Tasa nominal',      producto ? `${producto.tasa_nominal_anual}% anual` : '—'],
                    ['Método interés',    producto?.metodo_interes === 'flat' ? 'Flat' : 'Saldo decreciente'],
                    ['Frecuencia',        producto?.frecuencia ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Panel de votación */}
            {!enviado ? (
              <Card className="border-brand-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Vote size={16} className="text-brand-500"/>
                    <h2 className="text-sm font-semibold text-gray-800">Tu voto</h2>
                  </div>
                </CardHeader>
                <CardBody className="space-y-4">
                  <p className="text-xs text-gray-500">Selecciona tu decisión. El comentario es <strong>obligatorio</strong> para todas las opciones.</p>

                  {/* Opciones de voto */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    {(['aprobado', 'rechazado', 'info_adicional'] as const).map(d => {
                      const cfg = DECISION_CONFIG[d]
                      return (
                        <label
                          key={d}
                          className={clsx(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all',
                            miDecision === d ? cfg.bg + ' ' + cfg.color.replace('text-', 'border-').replace('-700', '-400') : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <input
                            type="radio"
                            name="decision"
                            value={d}
                            className="sr-only"
                            checked={miDecision === d}
                            onChange={() => setMiDecision(d)}
                          />
                          <span className={miDecision === d ? cfg.color : 'text-gray-400'}>{cfg.icon}</span>
                          <span className={`text-xs font-semibold ${miDecision === d ? cfg.color : 'text-gray-600'}`}>{cfg.label}</span>
                        </label>
                      )
                    })}
                  </div>

                  {/* Comentario */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">
                      <MessageSquare size={13} className="inline mr-1"/>Comentario <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      placeholder="Justifica tu decisión. Este comentario quedará en el expediente de la solicitud."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none resize-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all"
                    />
                  </div>

                  {error && <Alert type="error">{error}</Alert>}

                  <div className="flex justify-end">
                    <Button
                      onClick={emitirVoto}
                      disabled={miDecision === 'pendiente' || !comentario.trim()}
                      className={clsx(
                        miDecision === 'aprobado'   && 'bg-green-600 hover:bg-green-700',
                        miDecision === 'rechazado'  && 'bg-red-600 hover:bg-red-700',
                      )}
                    >
                      {DECISION_CONFIG[miDecision]?.icon ?? <CheckCircle2 size={16}/>}
                      Emitir voto
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <Alert type="success">
                <CheckCircle2 size={14} className="inline mr-1.5"/>
                Voto emitido correctamente. La decisión queda registrada en el expediente.
              </Alert>
            )}
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User size={15} className="text-gray-400"/>
                  <h2 className="text-sm font-semibold text-gray-800">Cliente</h2>
                </div>
              </CardHeader>
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
                    <div className="space-y-1.5 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <p>Documento: {cliente.documento}</p>
                      <p>Zona: {cliente.zona}</p>
                      <p>Teléfono: {cliente.telefono}</p>
                      <p>Créditos activos: {cliente.creditos_activos}</p>
                      <p>Total historial: {formatCOP(cliente.total_prestado)}</p>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                      Ver ficha completa
                    </Button>
                  </div>
                ) : <p className="text-sm text-gray-400">No encontrado.</p>}
              </CardBody>
            </Card>

            {/* Estado de votos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Estado del quórum</h2>
                  <Badge color={quorumOk ? 'green' : 'yellow'}>{quorumOk ? 'Completo' : 'Pendiente'}</Badge>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {votos.map((v, i) => {
                  const cfg = DECISION_CONFIG[v.decision]
                  return (
                    <div key={i} className={clsx('p-3 rounded-lg border', cfg.bg)}>
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{v.miembro}</p>
                          <p className="text-xs text-gray-400">{v.rol}</p>
                        </div>
                        <span className={clsx('flex items-center gap-1 text-xs font-medium', cfg.color)}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      {v.comentario && (
                        <p className="text-xs text-gray-600 italic mt-1.5">"{v.comentario}"</p>
                      )}
                    </div>
                  )
                })}

                {quorumOk && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12}/>Quórum alcanzado — se puede emitir resolución.
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}

