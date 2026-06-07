import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Info } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { PRODUCTOS, CONVENIOS, formatCOP } from '../../mocks'

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
  const { id } = useParams()
  const producto = id ? PRODUCTOS.find(p => p.id === id) : null
  const esEdicion = Boolean(producto)

  const [form, setForm] = useState({
    convenio_id:        producto?.convenio_id        ?? (CONVENIOS[0]?.id ?? ''),
    nombre:             producto?.nombre             ?? '',
    tasa_nominal_anual: String(producto?.tasa_nominal_anual ?? ''),
    metodo_interes:     producto?.metodo_interes     ?? 'declining_balance',
    plazo_min:          String(producto?.plazo_min   ?? ''),
    plazo_max:          String(producto?.plazo_max   ?? ''),
    monto_min:          String(producto?.monto_min   ?? ''),
    monto_max:          String(producto?.monto_max   ?? ''),
    frecuencia:         producto?.frecuencia         ?? 'mensual',
    periodo_gracia_dias: String(producto?.periodo_gracia_dias ?? '0'),
  })
  const [guardado, setGuardado] = useState(false)

  const campo = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

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
                  <Input label="Plazo mínimo (meses)" type="number" value={form.plazo_min} onChange={e => campo('plazo_min', e.target.value)} placeholder="3"/>
                  <Input label="Plazo máximo (meses)" type="number" value={form.plazo_max} onChange={e => campo('plazo_max', e.target.value)} placeholder="24"/>
                </div>
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
                    ['Plazo',  `${plazoEjemplo} meses`],
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
