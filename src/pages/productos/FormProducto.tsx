import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Info } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { PRODUCTOS, CONVENIOS, REQUISITOS, ACTIVIDADES_ECONOMICAS, formatCOP } from '../../mocks'

// Simulación del cálculo de cuota para preview en tiempo real
function calcularCuotaFlat(monto: number, tasa: number, plazo: number): number {
  const tasaMensual = tasa / 100 / 12
  return monto / plazo + monto * tasaMensual
}

function calcularCuotaFrench(monto: number, tasa: number, plazo: number): number {
  const i = tasa / 100 / 12
  if (i === 0) return monto / plazo
  return (monto * i * Math.pow(1 + i, plazo)) / (Math.pow(1 + i, plazo) - 1)
}

export default function FormProducto() {
  const navigate = useNavigate()
  const { id }   = useParams()
  const producto = id ? PRODUCTOS.find(p => p.id === id) : null
  const esEdicion = Boolean(producto)

  const [form, setForm] = useState({
    convenio_id:         producto?.convenio_id        ?? (CONVENIOS[0]?.id ?? ''),
    nombre:              producto?.nombre             ?? '',
    descripcion:         producto?.descripcion        ?? '',
    tasa_nominal_anual:  String(producto?.tasa_nominal_anual ?? ''),
    metodo_interes:      producto?.metodo_interes     ?? 'declining_balance' as 'declining_balance' | 'flat',
    plazo_min:           String(producto?.plazo_min   ?? ''),
    plazo_max:           String(producto?.plazo_max   ?? ''),
    monto_min:           String(producto?.monto_min   ?? ''),
    monto_max:           String(producto?.monto_max   ?? ''),
    frecuencia:          producto?.frecuencia         ?? 'mensual' as 'semanal' | 'quincenal' | 'mensual',
    periodo_gracia_dias: String(producto?.periodo_gracia_dias ?? '0'),
    requisito_ids:       producto?.requisito_ids      ?? [] as string[],
    actividad_economica_ids: producto?.actividad_economica_ids ?? [] as string[],
  })
  const [guardado, setGuardado] = useState(false)

  const campo = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const toggleRequisito = (id: string) => {
    setForm(prev => ({
      ...prev,
      requisito_ids: prev.requisito_ids.includes(id)
        ? prev.requisito_ids.filter(r => r !== id)
        : [...prev.requisito_ids, id],
    }))
  }

  const toggleActividad = (id: string) => {
    setForm(prev => ({
      ...prev,
      actividad_economica_ids: prev.actividad_economica_ids.includes(id)
        ? prev.actividad_economica_ids.filter(a => a !== id)
        : [...prev.actividad_economica_ids, id],
    }))
  }

  // Preview de cuota con valores de ejemplo (monto_min, plazo_max)
  const montoEjemplo = Number(form.monto_min) || 1000000
  const plazoEjemplo = Number(form.plazo_max) || 12
  const tasaEjemplo  = Number(form.tasa_nominal_anual) || 0
  const cuotaEjemplo = form.metodo_interes === 'flat'
    ? calcularCuotaFlat(montoEjemplo, tasaEjemplo, plazoEjemplo)
    : calcularCuotaFrench(montoEjemplo, tasaEjemplo, plazoEjemplo)

  const guardar = () => {
    setGuardado(true)
    setTimeout(() => navigate('/productos'), 1200)
  }

  const conveniosActivos = CONVENIOS.filter(c => c.estado === 'activo')

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={esEdicion ? 'Editar producto' : 'Nuevo producto'}
          subtitle={esEdicion ? producto!.nombre : 'Define las condiciones del producto crediticio'}
          actions={<Button variant="ghost" onClick={() => navigate('/productos')}><ArrowLeft size={16}/>Volver</Button>}
        />

        {guardado && <Alert type="success" className="mb-4">Producto guardado. Redirigiendo…</Alert>}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Datos básicos */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos básicos</h2></CardHeader>
              <CardBody className="space-y-4">
                <Select
                  label="Convenio vinculado"
                  value={form.convenio_id}
                  onChange={e => campo('convenio_id', e.target.value)}
                  options={conveniosActivos.map(c => ({ value: c.id, label: `${c.cooperante} (${c.moneda})` }))}
                />
                <Input
                  label="Nombre del producto"
                  placeholder="Ej: Microcrédito Solidario 2025"
                  value={form.nombre}
                  onChange={e => campo('nombre', e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Descripción
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe brevemente el producto, su público objetivo y condiciones generales…"
                    value={form.descripcion}
                    onChange={e => campo('descripcion', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  />
                </div>
                <Select
                  label="Frecuencia de pago"
                  value={form.frecuencia}
                  onChange={e => campo('frecuencia', e.target.value)}
                  options={[
                    { value: 'semanal',   label: 'Semanal' },
                    { value: 'quincenal', label: 'Quincenal' },
                    { value: 'mensual',   label: 'Mensual' },
                  ]}
                />
              </CardBody>
            </Card>

            {/* Tasa e interés */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Tasa e interés</h2></CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Tasa nominal anual (%)"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 36"
                  value={form.tasa_nominal_anual}
                  onChange={e => campo('tasa_nominal_anual', e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de cálculo de interés</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { v: 'declining_balance', label: 'Saldo decreciente (francés)', desc: 'Cuota fija, interés decrece sobre capital.' },
                      { v: 'flat',              label: 'Flat',                        desc: 'Interés calculado siempre sobre monto original.' },
                    ].map(opt => (
                      <label key={opt.v} className={`flex gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${form.metodo_interes === opt.v ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" className="mt-0.5" name="metodo" value={opt.v} checked={form.metodo_interes === opt.v} onChange={e => campo('metodo_interes', e.target.value)}/>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                          <p className="text-xs text-gray-500">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <Input
                  label="Período de gracia (días)"
                  type="number"
                  value={form.periodo_gracia_dias}
                  onChange={e => campo('periodo_gracia_dias', e.target.value)}
                  helperText="Días desde el desembolso hasta la primera cuota"
                />
              </CardBody>
            </Card>

            {/* Montos y plazos */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Montos y plazos</h2></CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Monto mínimo (COP)"  type="number" value={form.monto_min} onChange={e => campo('monto_min', e.target.value)} placeholder="500000"/>
                  <Input label="Monto máximo (COP)"  type="number" value={form.monto_max} onChange={e => campo('monto_max', e.target.value)} placeholder="5000000"/>
                  <Input label="Plazo mínimo (cuotas)" type="number" value={form.plazo_min} onChange={e => campo('plazo_min', e.target.value)} placeholder="3"/>
                  <Input label="Plazo máximo (cuotas)" type="number" value={form.plazo_max} onChange={e => campo('plazo_max', e.target.value)} placeholder="24"/>
                </div>
              </CardBody>
            </Card>

            {/* Requisitos */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Requisitos del producto</h2></CardHeader>
              <CardBody>
                <p className="text-xs text-gray-500 mb-3">Selecciona los documentos que el cliente debe presentar para este producto.</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {REQUISITOS.map(r => (
                    <label key={r.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      form.requisito_ids.includes(r.id)
                        ? 'bg-brand-50 border-brand-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.requisito_ids.includes(r.id)}
                        onChange={() => toggleRequisito(r.id)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.nombre}</p>
                        {r.obligatorio && <span className="text-xs text-green-600">Obligatorio</span>}
                        {r.descripcion && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.descripcion}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                {form.requisito_ids.length > 0 && (
                  <p className="mt-2 text-xs text-brand-600 font-medium">{form.requisito_ids.length} requisito(s) seleccionado(s)</p>
                )}
              </CardBody>
            </Card>

            {/* Actividades económicas */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Actividades económicas elegibles</h2></CardHeader>
              <CardBody>
                <p className="text-xs text-gray-500 mb-3">Define para qué rubros productivos aplica este producto.</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {ACTIVIDADES_ECONOMICAS.map(a => (
                    <label key={a.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      form.actividad_economica_ids.includes(a.id)
                        ? 'bg-brand-50 border-brand-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.actividad_economica_ids.includes(a.id)}
                        onChange={() => toggleActividad(a.id)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-400">{a.sector}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {form.actividad_economica_ids.length > 0 && (
                  <p className="mt-2 text-xs text-brand-600 font-medium">{form.actividad_economica_ids.length} actividad(es) seleccionada(s)</p>
                )}
              </CardBody>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => navigate('/productos')}>Cancelar</Button>
              <Button onClick={guardar} disabled={!form.nombre || !form.tasa_nominal_anual}>
                <Save size={16}/>{esEdicion ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </div>

          {/* Preview de cuota */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info size={15} className="text-brand-500"/>
                  <h2 className="text-sm font-semibold text-gray-800">Cuota de ejemplo</h2>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-xs text-gray-500 mb-4">
                  Calculado con monto mínimo y plazo máximo ingresados.
                </p>
                <div className="space-y-3 text-sm">
                  {[
                    ['Monto',  formatCOP(montoEjemplo)],
                    ['Plazo',  `${plazoEjemplo} cuotas`],
                    ['Tasa',   `${tasaEjemplo}%/año`],
                    ['Método', form.metodo_interes === 'flat' ? 'Flat' : 'Saldo decreciente'],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-800">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-brand-50 rounded-xl text-center border border-brand-100">
                  <p className="text-xs text-brand-600 font-medium mb-1">Cuota estimada</p>
                  <p className="text-2xl font-bold text-brand-700">{formatCOP(cuotaEjemplo)}</p>
                  <p className="text-xs text-brand-500 mt-1">por {form.frecuencia}</p>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  * Calculadora referencial. La cuota real puede variar con el período de gracia y redondeos.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
