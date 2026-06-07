import { BarChart2, AlertTriangle, TrendingUp, Users, CreditCard, DollarSign } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { StatCard, Card, CardHeader, CardBody, Badge } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { CREDITOS, CONVENIOS, SOLICITUDES, formatCOP } from '../../mocks'

// ─── KPIs mock ────────────────────────────────────────────────
const carteraTotal = CREDITOS.reduce((s, c) => s + c.saldo_capital, 0)
const creditosEnMora = CREDITOS.filter(c => c.dias_mora > 0)
const par30 = creditosEnMora.reduce((s, c) => s + c.saldo_capital, 0)
const par30pct = ((par30 / carteraTotal) * 100).toFixed(1)
const conveniosActivos = CONVENIOS.filter(c => c.estado === 'activo').length
const solicitudesPendientes = SOLICITUDES.filter(s => ['enviada', 'revision_comite'].includes(s.estado)).length

const ESTADO_COLOR: Record<string, 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'orange'> = {
  al_dia:   'green',
  activo:   'blue',
  en_mora:  'red',
  cancelado: 'gray',
  castigado: 'red',
}

const SOLICITUD_COLOR: Record<string, 'blue' | 'yellow' | 'green' | 'red' | 'gray'> = {
  enviada:         'blue',
  revision_comite: 'yellow',
  aprobada:        'green',
  rechazada:       'red',
  desembolsada:    'gray',
  borrador:        'gray',
  scoring:         'blue',
}

export default function Dashboard() {
  const { rol, usuario } = useApp()

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={`Bienvenido, ${usuario.nombre.split(' ')[0]}`}
          subtitle={`Panel principal · ${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        />

        {/* KPIs */}
        {(rol === 'administrador' || rol === 'coordinador') && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Cartera Activa" value={formatCOP(carteraTotal)} sub="saldo capital" color="blue" />
            <StatCard label="PAR > 30 días" value={`${par30pct}%`} sub={formatCOP(par30)} color={parseFloat(par30pct) > 5 ? 'red' : 'green'} />
            <StatCard label="Convenios Activos" value={String(conveniosActivos)} sub="con saldo disponible" color="green" />
            <StatCard label="Solicitudes Pendientes" value={String(solicitudesPendientes)} sub="en revisión" color="yellow" />
          </div>
        )}

        {rol === 'facilitador' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard label="Mis Clientes" value="4" sub="en mi zona" color="blue" />
            <StatCard label="Cuotas Vencidas" value="1" sub="requieren atención" color="red" />
          </div>
        )}

        {rol === 'comite' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard label="Para Revisar" value="1" sub="solicitudes pendientes" color="yellow" />
            <StatCard label="Revisadas Hoy" value="0" sub="aprobadas / rechazadas" color="gray" />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Créditos en mora */}
          {(rol === 'administrador' || rol === 'coordinador' || rol === 'facilitador') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  <h2 className="text-sm font-semibold text-gray-900">Créditos en mora</h2>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {creditosEnMora.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-gray-400">Sin mora activa 🎉</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {creditosEnMora.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.cliente_nombre}</p>
                          <p className="text-xs text-gray-500">{c.producto_nombre}</p>
                        </div>
                        <div className="text-right">
                          <Badge color="red">{c.dias_mora} días</Badge>
                          <p className="text-xs text-gray-500 mt-1">{formatCOP(c.saldo_capital)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Solicitudes recientes */}
          {rol !== 'auditor' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-brand-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Solicitudes recientes</h2>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-gray-50">
                  {SOLICITUDES.slice(0, 4).map(s => (
                    <div key={s.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.cliente_nombre}</p>
                        <p className="text-xs text-gray-500">{s.producto_nombre} · {formatCOP(s.monto_solicitado)}</p>
                      </div>
                      <Badge color={SOLICITUD_COLOR[s.estado]}>
                        {s.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Convenios - solo admin/coordinador/auditor */}
          {(rol === 'administrador' || rol === 'coordinador' || rol === 'auditor') && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-green-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Estado de convenios</h2>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="divide-y divide-gray-50">
                  {CONVENIOS.filter(c => c.estado === 'activo').map(conv => {
                    const pct = ((conv.monto_total - conv.saldo_disponible) / conv.monto_total) * 100
                    const color = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-brand-500'
                    return (
                      <div key={conv.id} className="px-6 py-3">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-gray-900">{conv.cooperante}</p>
                          <span className="text-xs text-gray-500">{pct.toFixed(0)}% usado</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Disponible: {formatCOP(conv.saldo_disponible)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </PageContainer>
    </Shell>
  )
}
