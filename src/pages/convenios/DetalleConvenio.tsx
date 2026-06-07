import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, AlertTriangle, Package } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, StatCard, Alert } from '../../components/ui'
import { CONVENIOS, PRODUCTOS, formatCOP, formatUVC } from '../../mocks'

const PAIS_FLAG: Record<string, string> = { CO: '🇨🇴', VE: '🇻🇪' }

export default function DetalleConvenio() {
  const navigate = useNavigate()
  const { id } = useParams()
  const conv = CONVENIOS.find(c => c.id === id)
  const productos = PRODUCTOS.filter(p => p.convenio_id === id)

  if (!conv) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Convenio no encontrado.</Alert>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/convenios')}><ArrowLeft size={16}/>Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  const fmt    = conv.moneda === 'UVC' ? formatUVC : formatCOP
  const usado  = conv.monto_total - conv.saldo_disponible
  const pct    = (usado / conv.monto_total) * 100
  const alerta = pct >= 95 ? 'red' : pct >= 80 ? 'yellow' : null

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={`${PAIS_FLAG[conv.pais]} ${conv.cooperante}`}
          subtitle={`Convenio · ${conv.moneda} · ${conv.estado}`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/convenios')}><ArrowLeft size={16}/>Volver</Button>
              <Button variant="secondary" onClick={() => navigate(`/convenios/${conv.id}/editar`)}><Edit size={16}/>Editar</Button>
            </div>
          }
        />

        {alerta === 'red' && (
          <Alert type="error" className="mb-4">
            <AlertTriangle size={16} className="inline mr-1"/>
            Fondo al {pct.toFixed(0)}% de capacidad — solicita extensión o nuevo aporte al cooperante.
          </Alert>
        )}
        {alerta === 'yellow' && (
          <Alert type="warning" className="mb-4">
            Fondo al {pct.toFixed(0)}% — considera alertar al coordinador.
          </Alert>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Fondo total"    value={fmt(conv.monto_total)}      color="blue"  />
          <StatCard label="Disponible"     value={fmt(conv.saldo_disponible)} color="green" />
          <StatCard label="Colocado"       value={fmt(usado)}                 color="yellow"/>
          <StatCard label="Uso"            value={`${pct.toFixed(1)}%`}       color={alerta === 'red' ? 'red' : alerta === 'yellow' ? 'yellow' : 'green'} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Datos del convenio */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del convenio</h2></CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  {[
                    ['Cooperante',     conv.cooperante],
                    ['País',           conv.pais === 'CO' ? '🇨🇴 Colombia' : '🇻🇪 Venezuela'],
                    ['Moneda',         conv.moneda],
                    ['Estado',         conv.estado],
                    ['Fecha inicio',   new Date(conv.fecha_inicio).toLocaleDateString('es-CO', { dateStyle: 'long' })],
                    ['Fecha fin',      new Date(conv.fecha_fin).toLocaleDateString('es-CO', { dateStyle: 'long' })],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Barra de progreso */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Utilización del fondo</h2></CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Colocado</span>
                    <span className="font-medium">{fmt(usado)} <span className="text-gray-400 text-xs">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-brand-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>0</span>
                    <span>{fmt(conv.monto_total)}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Productos vinculados */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Productos crediticios</h2>
                  <Badge color="gray">{productos.length}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                {productos.length === 0 ? (
                  <div className="text-center py-4">
                    <Package size={28} className="mx-auto text-gray-300 mb-2"/>
                    <p className="text-xs text-gray-400">Sin productos</p>
                    <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => navigate('/productos/nuevo')}>
                      Crear producto
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productos.map(p => (
                      <div key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <p>Tasa: {p.tasa_nominal_anual}% nominal anual</p>
                          <p>Método: {p.metodo_interes === 'flat' ? 'Flat' : 'Saldo decreciente'}</p>
                          <p>Plazo: {p.plazo_min}–{p.plazo_max} meses · {p.frecuencia}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="mt-2 w-full text-xs" onClick={() => navigate(`/productos/${p.id}`)}>
                          Ver producto
                        </Button>
                      </div>
                    ))}
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
