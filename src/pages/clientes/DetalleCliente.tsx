import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Phone, MapPin, Calendar, User, Briefcase, CreditCard, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert, StatCard } from '../../components/ui'
import { CLIENTES, CREDITOS, SOLICITUDES, formatCOP } from '../../mocks'
import type { Credito } from '../../types'

const ESTADO_LABEL = { activo: 'Activo', al_dia: 'Al día', moroso: 'En mora', inactivo: 'Inactivo' }

// ─── Genera tabla de cuotas a partir de datos del crédito ─────
interface Cuota {
  numero: number
  fecha: string
  monto: number
  capital: number
  interes: number
  estado: 'pagada' | 'proxima' | 'pendiente' | 'mora'
}

function generarCuotas(credito: Credito): Cuota[] {
  const { monto_desembolsado, cuotas_total, cuotas_pagadas, proxima_cuota, dias_mora } = credito
  // Tasa mensual aproximada del 1.5% (18% anual) para la demo
  const tasaMensual = 0.015
  const cuotaFija = monto_desembolsado * (tasaMensual * Math.pow(1 + tasaMensual, cuotas_total)) /
    (Math.pow(1 + tasaMensual, cuotas_total) - 1)

  const fechaProxima = new Date(proxima_cuota)

  return Array.from({ length: cuotas_total }, (_, i) => {
    const num = i + 1
    // Calcular fecha: proxima_cuota corresponde a cuotas_pagadas + 1
    const offsetMeses = num - (cuotas_pagadas + 1)
    const fecha = new Date(fechaProxima)
    fecha.setMonth(fecha.getMonth() + offsetMeses)

    const saldoAnterior = monto_desembolsado * Math.pow(1 + tasaMensual, i) -
      cuotaFija * (Math.pow(1 + tasaMensual, i) - 1) / tasaMensual
    const interes = Math.max(0, saldoAnterior * tasaMensual)
    const capital = cuotaFija - interes

    let estado: Cuota['estado']
    if (num <= cuotas_pagadas)        estado = 'pagada'
    else if (num === cuotas_pagadas + 1) estado = dias_mora > 0 ? 'mora' : 'proxima'
    else                               estado = 'pendiente'

    return {
      numero: num,
      fecha: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
      monto: Math.round(cuotaFija),
      capital: Math.round(capital),
      interes: Math.round(interes),
      estado,
    }
  })
}

function CuotasPanel({ credito }: { credito: Credito }) {
  const [abierto, setAbierto] = useState(false)
  const cuotas = generarCuotas(credito)

  const estadoIcon = {
    pagada:   <CheckCircle2 size={14} className="text-green-500" />,
    proxima:  <Clock size={14} className="text-blue-500" />,
    mora:     <AlertCircle size={14} className="text-red-500" />,
    pendiente:<Clock size={14} className="text-gray-300" />,
  }
  const estadoBadge = {
    pagada:   <Badge color="green">Pagada</Badge>,
    proxima:  <Badge color="blue">Próxima</Badge>,
    mora:     <Badge color="red">En mora</Badge>,
    pendiente:<Badge color="gray">Pendiente</Badge>,
  }

  const progreso = Math.round((credito.cuotas_pagadas / credito.cuotas_total) * 100)

  return (
    <Card>
      <CardHeader>
        <button
          className="w-full flex items-center justify-between"
          onClick={() => setAbierto(o => !o)}
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-800 text-left">
              Plan de pagos — {credito.producto_nombre}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 text-left">
              {credito.cuotas_pagadas}/{credito.cuotas_total} cuotas · {progreso}% completado
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Barra de progreso */}
            <div className="hidden sm:block w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${progreso}%` }} />
            </div>
            {abierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </button>
      </CardHeader>

      {abierto && (
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-100">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Cuota</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Capital</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Interés</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cuotas.map(c => (
                  <tr
                    key={c.numero}
                    className={
                      c.estado === 'proxima' ? 'bg-blue-50' :
                      c.estado === 'mora'    ? 'bg-red-50' :
                      c.estado === 'pagada'  ? 'opacity-60' : ''
                    }
                  >
                    <td className="px-4 py-2.5 text-gray-500">
                      <div className="flex items-center gap-1.5">
                        {estadoIcon[c.estado]}
                        {c.numero}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{c.fecha}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCOP(c.monto)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatCOP(c.capital)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatCOP(c.interes)}</td>
                    <td className="px-4 py-2.5 text-center">{estadoBadge[c.estado]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                  <td colSpan={2} className="px-4 py-2.5 text-xs text-gray-700">Total</td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-900">
                    {formatCOP(cuotas.reduce((s, c) => s + c.monto, 0))}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                    {formatCOP(credito.monto_desembolsado)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                    {formatCOP(cuotas.reduce((s, c) => s + c.interes, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardBody>
      )}
    </Card>
  )
}

// ─── DETALLE CLIENTE ─────────────────────────────────────────
export default function DetalleCliente() {
  const navigate = useNavigate()
  const { id } = useParams()
  const cliente = CLIENTES.find(c => c.id === id)
  const creditos = CREDITOS.filter(c => c.cliente_id === id)
  const solicitudes = SOLICITUDES.filter(s => s.cliente_id === id)
  const creditosActivos = creditos.filter(c => c.estado !== 'cancelado' && c.estado !== 'castigado')

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
          <StatCard label="Total prestado"    value={formatCOP(cliente.total_prestado)}         color="blue" />
          <StatCard label="Créditos activos"  value={String(cliente.creditos_activos)}          color={cliente.creditos_activos > 0 ? 'blue' : 'gray'} />
          <StatCard label="Estado"            value={ESTADO_LABEL[cliente.estado]}              color={cliente.estado === 'moroso' ? 'red' : 'green'} />
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

            {/* Plan de pagos por crédito activo */}
            {creditosActivos.length > 0 && (
              <div className="space-y-3">
                {creditosActivos.map(c => <CuotasPanel key={c.id} credito={c} />)}
              </div>
            )}

            {/* Historial de créditos (resumen) */}
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
