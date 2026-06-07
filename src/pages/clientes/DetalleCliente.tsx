import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Phone, MapPin, Calendar, User, Briefcase, CreditCard } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert, StatCard } from '../../components/ui'
import { CLIENTES, CREDITOS, SOLICITUDES, formatCOP } from '../../mocks'

const ESTADO_COLOR = { activo: 'blue', al_dia: 'green', moroso: 'red', inactivo: 'gray' } as const
const ESTADO_LABEL = { activo: 'Activo', al_dia: 'Al día', moroso: 'En mora', inactivo: 'Inactivo' }

export default function DetalleCliente() {
  const navigate = useNavigate()
  const { id } = useParams()
  const cliente = CLIENTES.find(c => c.id === id)
  const creditos = CREDITOS.filter(c => c.cliente_id === id)
  const solicitudes = SOLICITUDES.filter(s => s.cliente_id === id)

  if (!cliente) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Cliente no encontrado.</Alert>
          <Button variant="ghost" onClick={() => navigate('/clientes')} className="mt-4"><ArrowLeft size={16} />Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  const creditoEnMora = creditos.find(c => c.dias_mora > 0)

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={cliente.nombre}
          subtitle="Ficha de cliente"
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/clientes')}><ArrowLeft size={16} />Volver</Button>
              <Button onClick={() => navigate(`/solicitudes/nueva?cliente=${id}`)}>
                <FileText size={16} />Nueva solicitud
              </Button>
            </div>
          }
        />

        {creditoEnMora && (
          <Alert type="warning">
            ⚠️ Este cliente tiene {creditoEnMora.dias_mora} días de mora en el crédito {creditoEnMora.id.toUpperCase()}.
          </Alert>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-5">
          <StatCard label="Total prestado" value={formatCOP(cliente.total_prestado)} color="blue" />
          <StatCard label="Créditos activos" value={String(cliente.creditos_activos)} color={cliente.creditos_activos > 0 ? 'blue' : 'gray'} />
          <StatCard label="Estado" value={ESTADO_LABEL[cliente.estado]} color={cliente.estado === 'moroso' ? 'red' : 'green'} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Datos personales */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos personales</h2></CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { icon: <User size={15} />,     label: 'Género',              value: cliente.genero === 'F' ? 'Femenino' : 'Masculino' },
                    { icon: <Calendar size={15} />,  label: 'Fecha de nacimiento', value: new Date(cliente.fecha_nacimiento).toLocaleDateString('es-CO', { dateStyle: 'long' }) },
                    { icon: <FileText size={15} />,  label: 'Documento',           value: cliente.documento },
                    { icon: <Phone size={15} />,     label: 'Teléfono',            value: cliente.telefono },
                    { icon: <MapPin size={15} />,    label: 'Zona',                value: cliente.zona },
                    { icon: <Briefcase size={15} />, label: 'Actividad económica', value: cliente.actividad_economica },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-gray-400 mt-0.5 shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-sm font-medium text-gray-900">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Historial de créditos */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Historial de créditos</h2>
                  <span className="text-xs text-gray-400">{creditos.length} crédito(s)</span>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {creditos.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">Sin créditos registrados</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {creditos.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.producto_nombre}</p>
                          <p className="text-xs text-gray-500">
                            {c.cuotas_pagadas}/{c.cuotas_total} cuotas · Prox. {new Date(c.proxima_cuota).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatCOP(c.saldo_capital)}</p>
                          <p className="text-xs text-gray-500">saldo capital</p>
                          {c.dias_mora > 0 && <Badge color="red">{c.dias_mora} días mora</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Solicitudes */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Solicitudes</h2></CardHeader>
              <CardBody className="p-0">
                {solicitudes.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">Sin solicitudes</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {solicitudes.map(s => (
                      <div key={s.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatCOP(s.monto_solicitado)}</p>
                          <p className="text-xs text-gray-500">{s.producto_nombre} · {new Date(s.fecha_solicitud).toLocaleDateString('es-CO')}</p>
                        </div>
                        <div className="text-right">
                          <Badge color={{ aprobada:'green', rechazada:'red', enviada:'blue', revision_comite:'yellow', desembolsada:'gray', borrador:'gray', scoring:'blue' }[s.estado] as any}>
                            {s.estado.replace('_', ' ')}
                          </Badge>
                          {s.score && <p className="text-xs text-gray-400 mt-1">Score: {s.score}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Documentos KYC</h2></CardHeader>
              <CardBody className="space-y-3">
                {['Cédula (frente)', 'Cédula (reverso)', 'Foto de perfil'].map(doc => (
                  <div key={doc} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-xs text-gray-600">{doc}</span>
                    <Badge color="green">Verificado</Badge>
                  </div>
                ))}
                <Button variant="secondary" className="w-full" size="sm">
                  <FileText size={14} /> Ver documentos
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Acciones</h2></CardHeader>
              <CardBody className="space-y-2">
                <Button className="w-full" size="sm" onClick={() => navigate(`/solicitudes/nueva?cliente=${id}`)}>
                  <CreditCard size={14} /> Nueva solicitud
                </Button>
                <Button variant="secondary" className="w-full" size="sm">
                  <Calendar size={14} /> Agendar visita
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
