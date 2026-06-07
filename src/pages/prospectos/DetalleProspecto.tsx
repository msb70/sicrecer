import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, UserPlus, MapPin, Phone, FileText, Calendar } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { PROSPECTOS } from '../../mocks'

const ESTADO_COLOR = { nuevo: 'blue', contactado: 'yellow', convertido: 'green', descartado: 'gray' } as const
const ESTADO_LABEL = { nuevo: 'Nuevo', contactado: 'Contactado', convertido: 'Convertido', descartado: 'Descartado' }

export default function DetalleProspecto() {
  const navigate = useNavigate()
  const { id } = useParams()
  const prospecto = PROSPECTOS.find(p => p.id === id)

  if (!prospecto) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Prospecto no encontrado.</Alert>
          <Button variant="ghost" onClick={() => navigate('/prospectos')} className="mt-4"><ArrowLeft size={16} />Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={prospecto.nombre}
          subtitle="Ficha de prospecto"
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/prospectos')}><ArrowLeft size={16} />Volver</Button>
              <Button variant="secondary" onClick={() => navigate(`/prospectos/${id}/editar`)}><Pencil size={16} />Editar</Button>
              {prospecto.estado !== 'convertido' && (
                <Button onClick={() => navigate(`/clientes/nuevo?prospecto=${id}`)}>
                  <UserPlus size={16} />Convertir a cliente
                </Button>
              )}
            </div>
          }
        />

        {prospecto.estado === 'convertido' && (
          <Alert type="success">Este prospecto ya fue convertido a cliente.</Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-5 mt-4">
          {/* Info principal */}
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Datos personales</h2>
                  <Badge color={ESTADO_COLOR[prospecto.estado]}>{ESTADO_LABEL[prospecto.estado]}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Documento</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{prospecto.documento}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="text-sm font-medium text-gray-900">{prospecto.telefono}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Zona</p>
                      <p className="text-sm font-medium text-gray-900">{prospecto.zona}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha de registro</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(prospecto.fecha_registro).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                      </p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Mapa placeholder */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Ubicación GPS</h2></CardHeader>
              <CardBody>
                <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <MapPin size={28} />
                  <p className="text-xs">Mapa Leaflet — próximo sprint</p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Historial de contacto</h2></CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-2 shrink-0" />
                    <div>
                      <p className="text-gray-900 font-medium">Primer contacto</p>
                      <p className="text-gray-400 text-xs">{new Date(prospecto.fecha_registro).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>
                  {prospecto.estado === 'contactado' && (
                    <div className="flex gap-3 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0" />
                      <div>
                        <p className="text-gray-900 font-medium">Seguimiento realizado</p>
                        <p className="text-gray-400 text-xs">Pendiente visita de campo</p>
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="secondary" className="w-full mt-4" size="sm">
                  + Registrar nota de contacto
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Acciones rápidas</h2></CardHeader>
              <CardBody className="space-y-2">
                <Button variant="secondary" className="w-full" size="sm" onClick={() => navigate(`/prospectos/${id}/editar`)}>
                  <Pencil size={14} /> Editar datos
                </Button>
                {prospecto.estado !== 'convertido' && (
                  <Button className="w-full" size="sm" onClick={() => navigate(`/clientes/nuevo?prospecto=${id}`)}>
                    <UserPlus size={14} /> Convertir a cliente
                  </Button>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
