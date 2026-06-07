import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { SOLICITUDES, CLIENTES, PRODUCTOS, formatCOP } from '../../mocks'

const ESTADO_CONFIG = {
  borrador:        { label: 'Borrador',     color: 'gray'   as const, icon: <Clock size={16} /> },
  enviada:         { label: 'Enviada',      color: 'blue'   as const, icon: <Clock size={16} /> },
  scoring:         { label: 'En scoring',   color: 'blue'   as const, icon: <Clock size={16} /> },
  revision_comite: { label: 'En comité',   color: 'yellow' as const, icon: <AlertTriangle size={16} /> },
  aprobada:        { label: 'Aprobada',    color: 'green'  as const, icon: <CheckCircle2 size={16} /> },
  rechazada:       { label: 'Rechazada',   color: 'red'    as const, icon: <XCircle size={16} /> },
  desembolsada:    { label: 'Desembolsada',color: 'gray'   as const, icon: <CheckCircle2 size={16} /> },
}

const BANDA_COLOR = { A: 'green', B: 'blue', C: 'yellow', D: 'orange', E: 'red' } as const

// Score breakdown mock
const SCORE_BREAKDOWN = [
  { variable: 'Antigüedad del negocio',  puntos: 120, max: 150 },
  { variable: 'Ratio cuota/ingreso DTI', puntos: 140, max: 200 },
  { variable: 'Historial interno',       puntos: 180, max: 200 },
  { variable: 'Actividad económica',     puntos: 100, max: 150 },
  { variable: 'Datos demográficos',      puntos: 90,  max: 150 },
  { variable: 'Liquidez estimada',       puntos: 90,  max: 150 },
]

export default function DetalleSolicitud() {
  const navigate = useNavigate()
  const { id } = useParams()
  const solicitud = SOLICITUDES.find(s => s.id === id)
  const cliente  = CLIENTES.find(c => c.id === solicitud?.cliente_id)
  const producto = PRODUCTOS.find(p => p.id === solicitud?.producto_id)

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
              {solicitud.estado === 'aprobada' && (
                <Button onClick={() => navigate('/cartera')}>Ir a desembolso</Button>
              )}
            </div>
          }
        />

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
              {solicitud.estado === 'rechazada'       && 'La solicitud fue rechazada por el scoring o el comité.'}
              {solicitud.estado === 'revision_comite' && 'El scoring marcó esta solicitud para revisión manual del comité.'}
              {solicitud.estado === 'enviada'         && 'La solicitud fue enviada y está pendiente de evaluación.'}
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
                    ['Plazo',          `${solicitud.plazo} meses`],
                    ['Tasa nominal',   producto ? `${producto.tasa_nominal_anual}%` : '—'],
                    ['Método interés', producto?.metodo_interes === 'flat' ? 'Flat' : 'Saldo decreciente'],
                    ['Frecuencia',     producto?.frecuencia ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Scoring */}
            {solicitud.score && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">Resultado de scoring</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{solicitud.score}</span>
                      {solicitud.banda_riesgo && (
                        <Badge color={BANDA_COLOR[solicitud.banda_riesgo]}>Banda {solicitud.banda_riesgo}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="space-y-3">
                    {SCORE_BREAKDOWN.map(item => {
                      const pct = (item.puntos / item.max) * 100
                      return (
                        <div key={item.variable}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-600">{item.variable}</span>
                            <span className="font-medium text-gray-900">{item.puntos}/{item.max}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">Scorecard versión</p>
                    <p className="text-xs text-gray-400">v1.0.0-reglas-expertas · {solicitud.fecha_solicitud}</p>
                  </div>
                </CardBody>
              </Card>
            )}
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
                {solicitud.estado === 'aprobada' && (
                  <Button className="w-full" size="sm">Confirmar desembolso</Button>
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
