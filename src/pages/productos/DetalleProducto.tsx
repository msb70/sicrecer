import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, CheckCircle2, XCircle, Users, FileText } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, StatCard, Alert } from '../../components/ui'
import {
  PRODUCTOS, CONVENIOS, REQUISITOS, ACTIVIDADES_ECONOMICAS, COMITES, COMITE_MIEMBROS,
  SOLICITUDES, CREDITOS, formatCOP,
} from '../../mocks'
import { describirCobertura } from '../../lib/ubicaciones'
import { describirPlazos } from '../../lib/finanzas'
import { usePermiso } from '../../context/AppContext'
import { PAIS_LABELS, TIPO_REQUISITO_LABELS, type Requisito } from '../../types'

const FREQ_LABEL = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' } as const
const COLOR_TIPO: Record<string, string> = {
  archivo: 'bg-blue-50 text-blue-700', monto: 'bg-amber-50 text-amber-700', texto: 'bg-purple-50 text-purple-700',
  documento_identidad: 'bg-gray-100 text-gray-600', selfie: 'bg-gray-100 text-gray-600',
}
const ESTADOS_ABIERTOS = ['borrador', 'enviada', 'scoring', 'revision_comite', 'aprobada', 'firma']

function Fila({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{k}</span>
      <span className="font-medium text-gray-900 text-right">{v}</span>
    </div>
  )
}

export default function DetalleProducto() {
  const permiso = usePermiso('productos')
  const navigate = useNavigate()
  const { id } = useParams()
  const prod = PRODUCTOS.find(p => p.id === id)

  if (!prod) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Producto no encontrado.</Alert>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/productos')}><ArrowLeft size={16} />Volver</Button>
        </PageContainer>
      </Shell>
    )
  }

  const conv = CONVENIOS.find(c => c.id === prod.convenio_id)
  const requisitos = (prod.requisito_ids ?? []).map(rid => REQUISITOS.find(r => r.id === rid)).filter(Boolean) as Requisito[]
  const actividades = (prod.actividad_economica_ids ?? []).map(aid => ACTIVIDADES_ECONOMICAS.find(a => a.id === aid)).filter(Boolean)
  const comite = COMITES.find(c => c.producto_id === prod.id && c.activo)
  const miembros = comite ? COMITE_MIEMBROS.filter(m => m.comite_id === comite.id).length : 0
  const solicitudes = SOLICITUDES.filter(s => s.producto_id === prod.id)
  const abiertas = solicitudes.filter(s => ESTADOS_ABIERTOS.includes(s.estado)).length
  const creditos = CREDITOS.filter(c => c.producto_id === prod.id)
  const activo = prod.activo !== false

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={prod.nombre}
          subtitle={`Producto crediticio · ${conv?.cooperante ?? 'Sin convenio'}`}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/productos')}><ArrowLeft size={16} />Volver</Button>
              {permiso.editar && (<Button variant="secondary" onClick={() => navigate(`/productos/${prod.id}/editar`)}><Edit size={16} />Editar</Button>)}
            </div>
          }
        />

        <div className="flex flex-wrap gap-2 mb-5">
          <Badge color={activo ? 'green' : 'gray'}>{activo ? 'Activo' : 'Inactivo'}</Badge>
          <Badge color={prod.publico ? 'blue' : 'gray'}>{prod.publico ? 'Visible en el portal' : 'Solo uso interno'}</Badge>
          <Badge color="gray">{FREQ_LABEL[prod.frecuencia]}</Badge>
        </div>

        {prod.descripcion && <p className="text-sm text-gray-600 mb-5">{prod.descripcion}</p>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Tasa nominal anual" value={`${prod.tasa_nominal_anual}%`} color="blue" />
          <StatCard label="Monto" value={`${formatCOP(prod.monto_min)} – ${formatCOP(prod.monto_max)}`} />
          <StatCard label="Solicitudes abiertas" value={String(abiertas)} sub={`${solicitudes.length} en total`} color="yellow" />
          <StatCard label="Créditos" value={String(creditos.length)} color="green" />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones</h2></CardHeader>
              <CardBody>
                <Fila k="Método de interés" v="Cuota fija (francés)" />
                <Fila k="Frecuencia de pago" v={FREQ_LABEL[prod.frecuencia]} />
                <Fila k="Plazos permitidos" v={`${describirPlazos(prod)} cuotas`} />
                <Fila k="Monto mínimo" v={formatCOP(prod.monto_min)} />
                <Fila k="Monto máximo" v={formatCOP(prod.monto_max)} />
                <Fila k="Servicios de desarrollo empresarial" v={`${prod.pct_servicios ?? 0}% (se descuenta al desembolsar)`} />
                <Fila k="Mora por período" v={`${prod.pct_mora_periodo ?? 0}%`} />
                <Fila k="Gastos administrativos por período" v={`${prod.pct_gastos_admin_periodo ?? 0}%`} />
                <Fila k="Días de gracia de mora" v={`${prod.dias_gracia_mora ?? 0} días`} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><FileText size={15} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-800">Requisitos ({requisitos.length})</h2></div>
                  <button className="text-xs text-brand-700 hover:underline" onClick={() => navigate('/requisitos')}>Gestionar requisitos</button>
                </div>
              </CardHeader>
              <CardBody>
                {requisitos.length === 0 ? (
                  <p className="text-sm text-gray-400">Este producto no pide requisitos.</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {requisitos.map(r => (
                      <div key={r.id} className="py-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{r.nombre}</p>
                          {r.descripcion && <p className="text-xs text-gray-500">{r.descripcion}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR_TIPO[r.tipo ?? 'archivo']}`}>{TIPO_REQUISITO_LABELS[r.tipo ?? 'archivo']}</span>
                          {r.obligatorio
                            ? <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle2 size={12} />Obligatorio</span>
                            : <span className="inline-flex items-center gap-1 text-xs text-gray-400"><XCircle size={12} />Opcional</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Disponibilidad</h2></CardHeader>
              <CardBody>
                <Fila k="Convenio" v={conv
                  ? <button className="text-brand-700 hover:underline" onClick={() => navigate(`/convenios/${conv.id}`)}>{conv.cooperante}</button>
                  : '—'} />
                <Fila k="Países" v={(prod.paises ?? []).map(p => PAIS_LABELS[p]).join(', ') || '—'} />
                <Fila k="Dónde se ofrece" v={describirCobertura(prod.cobertura)} />
                <Fila k="Portal de solicitantes" v={prod.publico ? 'Sí' : 'No'} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Actividades económicas elegibles</h2></CardHeader>
              <CardBody>
                {actividades.length === 0
                  ? <p className="text-sm text-gray-500">Cualquier actividad.</p>
                  : <div className="flex flex-wrap gap-1.5">{actividades.map(a => <Badge key={a!.id} color="gray">{a!.nombre}</Badge>)}</div>}
              </CardBody>
            </Card>

            <Card>
              <CardHeader><div className="flex items-center gap-2"><Users size={15} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-800">Comité</h2></div></CardHeader>
              <CardBody>
                {comite
                  ? <p className="text-sm text-gray-700">{comite.nombre} · {miembros} miembro{miembros === 1 ? '' : 's'}</p>
                  : <Alert type="warning">Sin comité activo: las solicitudes de este producto no se pueden enviar a decisión.</Alert>}
                <button className="mt-2 text-xs text-brand-700 hover:underline" onClick={() => navigate('/comites')}>Ver comités</button>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
