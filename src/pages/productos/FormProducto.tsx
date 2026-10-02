import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Info } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { PRODUCTOS, CONVENIOS, REQUISITOS, ACTIVIDADES_ECONOMICAS, formatCOP, recargarTablas } from '../../mocks'
import { neon } from '../../lib/neon'
import { PAIS_LABELS, TIPO_REQUISITO_LABELS, type Pais } from '../../types'
import { calcularCuota, DIAS_PERIODO } from '../../lib/finanzas'
import { DesgloseCredito } from '../../components/credito/DesgloseCredito'
import { SelectorCobertura } from '../../components/ubicacion/SelectorCobertura'

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
    plazo_min:           String(producto?.plazo_min   ?? ''),
    plazo_max:           String(producto ? Math.max(producto.plazo_max ?? 0, ...(producto.plazos_permitidos ?? [])) : ''),
    monto_min:           String(producto?.monto_min   ?? ''),
    monto_max:           String(producto?.monto_max   ?? ''),
    frecuencia:          producto?.frecuencia         ?? 'mensual' as 'semanal' | 'quincenal' | 'mensual',
    pct_servicios:       String(producto?.pct_servicios ?? '7'),
    pct_mora_periodo:    String(producto?.pct_mora_periodo ?? '0'),
    pct_gastos_admin_periodo: String(producto?.pct_gastos_admin_periodo ?? '0'),
    dias_gracia_mora:    String(producto?.dias_gracia_mora ?? '0'),
    plazos_permitidos:   (producto?.plazos_permitidos ?? []).join(', '),
    requisito_ids:       producto?.requisito_ids      ?? [] as string[],
    actividad_economica_ids: producto?.actividad_economica_ids ?? [] as string[],
    paises:              (producto?.paises ?? (CONVENIOS[0]?.pais ? [CONVENIOS[0].pais] : [])) as Pais[],
    publico:             producto?.publico ?? false,
    activo:              producto?.activo ?? true,
  })
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const togglePais = (p: Pais) => setForm(prev => ({
    ...prev, paises: prev.paises.includes(p) ? prev.paises.filter(x => x !== p) : [...prev.paises, p],
  }))

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

  // Plazos: lista explícita (si se indica) o rango min–max
  // Plazo: solo se define el máximo de cuotas; el solicitante elige de 1 a ese máximo
  const plazoMin = 1
  const plazoMax = Math.trunc(Number(form.plazo_max)) || 0

  // Preview de cuota con valores de ejemplo (monto_min, plazo máximo)
  const montoEjemplo = Number(form.monto_min) || 1000000
  const plazoEjemplo = plazoMax || 12
  const tasaEjemplo  = Number(form.tasa_nominal_anual) || 0
  const cuotaEjemplo = calcularCuota({ monto: montoEjemplo, tasaNominalAnual: tasaEjemplo, plazo: plazoEjemplo, frecuencia: form.frecuencia })
  const pctNum = (v: string) => Number(v.replace(',', '.')) || 0
  const [cobertura, setCobertura] = useState<string[]>(producto?.cobertura ?? [])

  const guardar = async () => {
    setError('')
    if (form.paises.length === 0) { setError('Selecciona al menos un país'); return }
    if (plazoMax < 1) { setError('Define el número máximo de cuotas'); return }
    if (Number(form.monto_min) > Number(form.monto_max)) { setError('El monto mínimo no puede ser mayor que el máximo'); return }
    if (pctNum(form.pct_servicios) >= 100) { setError('El % de servicios debe ser menor a 100'); return }
    setGuardando(true)
    try {
      const fila = {
        convenio_id: form.convenio_id,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        tasa_nominal_anual: Number(form.tasa_nominal_anual),
        metodo_interes: 'declining_balance' as const,   // cuota fija (sistema francés)
        pct_servicios: pctNum(form.pct_servicios),
        pct_mora_periodo: pctNum(form.pct_mora_periodo),
        pct_gastos_admin_periodo: pctNum(form.pct_gastos_admin_periodo),
        dias_gracia_mora: Math.max(0, Math.trunc(Number(form.dias_gracia_mora) || 0)),
        plazos_permitidos: [] as number[],
        plazo_min: plazoMin, plazo_max: plazoMax,
        monto_min: Number(form.monto_min), monto_max: Number(form.monto_max),
        frecuencia: form.frecuencia,
        requisito_ids: form.requisito_ids,
        actividad_economica_ids: form.actividad_economica_ids,
        paises: form.paises, publico: form.publico, activo: form.activo,
        cobertura,
      }
      if (esEdicion && producto) {
        const { error } = await neon.from('productos_credito').update(fila).eq('id', producto.id)
        if (error) throw new Error(error.message)
      } else {
        const id = 'prod-' + Date.now().toString(36)
        const { error } = await neon.from('productos_credito').insert({ id, ...fila })
        if (error) throw new Error(error.message)
      }
      await recargarTablas('productos_credito')
      setGuardado(true)
      setTimeout(() => navigate('/productos'), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
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
        {error && <Alert type="error" className="mb-4">{error}</Alert>}

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

            {/* Disponibilidad */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Disponibilidad</h2></CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Países donde se ofrece (uno o más)</label>
                  <div className="flex gap-3">
                    {(Object.keys(PAIS_LABELS) as Pais[]).map(p => (
                      <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${form.paises.includes(p) ? 'bg-brand-50 border-brand-300' : 'border-gray-200'}`}>
                        <input type="checkbox" className="w-4 h-4" checked={form.paises.includes(p)} onChange={() => togglePais(p)} />
                        {PAIS_LABELS[p]}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-4 h-4" checked={form.publico} onChange={e => setForm(prev => ({ ...prev, publico: e.target.checked }))} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Visible en el portal de solicitantes</p>
                    <p className="text-xs text-gray-500">Las personas registradas podrán elegir este producto y crear solicitudes por sí mismas.</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="w-4 h-4" checked={form.activo} onChange={e => setForm(prev => ({ ...prev, activo: e.target.checked }))} />
                  Producto activo
                </label>
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
                <div className="p-3 rounded-xl border border-brand-200 bg-brand-50">
                  <p className="text-sm font-medium text-gray-900">Cuota fija (sistema francés)</p>
                  <p className="text-xs text-gray-500">La cuota es igual en todo el plazo; al inicio paga más interés y menos capital. Tasa por período: anual ÷ {form.frecuencia === 'mensual' ? 12 : form.frecuencia === 'quincenal' ? 24 : 52}. Convención 30/360.</p>
                </div>
              </CardBody>
            </Card>

            {/* Servicios y cargos por atraso */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Servicios y cargos por atraso</h2></CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Servicios de desarrollo empresarial (%)"
                  type="number" step="0.01" min="0"
                  value={form.pct_servicios}
                  onChange={e => campo('pct_servicios', e.target.value)}
                  helperText="Se descuenta automáticamente del monto prestado al desembolsar. El cliente debe el monto total."
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label={`Mora (% por período ${form.frecuencia})`}
                    type="number" step="0.01" min="0"
                    value={form.pct_mora_periodo}
                    onChange={e => campo('pct_mora_periodo', e.target.value)}
                    helperText="Sobre capital vencido. Se cobra el período completo."
                  />
                  <Input
                    label={`Gastos administrativos (% por período ${form.frecuencia})`}
                    type="number" step="0.01" min="0"
                    value={form.pct_gastos_admin_periodo}
                    onChange={e => campo('pct_gastos_admin_periodo', e.target.value)}
                    helperText="Sobre capital vencido, mientras existan cuotas vencidas."
                  />
                </div>
                <Input
                  label="Días de gracia"
                  type="number" min="0"
                  value={form.dias_gracia_mora}
                  onChange={e => campo('dias_gracia_mora', e.target.value)}
                  helperText={`Días después del vencimiento antes de cobrar mora y gastos administrativos (período = ${DIAS_PERIODO[form.frecuencia]} días).`}
                />
                <p className="text-xs text-gray-500">Orden de cobro de cada pago: gastos administrativos → mora → interés → capital. Un pago mayor a lo exigible se aplica como anticipo a capital y recalcula la cuota.</p>
              </CardBody>
            </Card>

            {/* Montos y plazos */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Montos y plazos</h2></CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Monto mínimo (COP)"  type="number" value={form.monto_min} onChange={e => campo('monto_min', e.target.value)} placeholder="500000"/>
                  <Input label="Monto máximo (COP)"  type="number" value={form.monto_max} onChange={e => campo('monto_max', e.target.value)} placeholder="5000000"/>
                </div>
                <div className="mt-4 sm:w-1/2">
                  <Input
                    label="Número máximo de cuotas"
                    type="number"
                    value={form.plazo_max}
                    onChange={e => campo('plazo_max', e.target.value)}
                    placeholder="12"
                    helperText={plazoMax ? `El solicitante podrá elegir de 1 a ${plazoMax} cuotas.` : 'El solicitante podrá elegir cualquier número de cuotas hasta este máximo.'}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Cobertura geográfica */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Dónde se ofrece</h2></CardHeader>
              <CardBody>
                <SelectorCobertura value={cobertura} onChange={setCobertura} />
              </CardBody>
            </Card>

            {/* Requisitos */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Requisitos del producto</h2></CardHeader>
              <CardBody>
                <p className="text-xs text-gray-500 mb-3">Selecciona los documentos y datos (montos o textos) que el solicitante debe aportar para este producto.</p>
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
                        <span className="text-xs text-gray-500">{TIPO_REQUISITO_LABELS[r.tipo ?? 'archivo']}</span>
                        {r.obligatorio && <span className="text-xs text-green-600"> · Obligatorio</span>}
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
                <p className="text-xs text-gray-500 mb-3">Define para qué rubros productivos aplica este producto. Un solicitante cuya actividad no esté en la lista no podrá elegirlo.</p>
                <label className={`flex items-center gap-2.5 p-2.5 mb-3 rounded-lg border cursor-pointer ${form.actividad_economica_ids.length === 0 ? 'bg-brand-50 border-brand-300' : 'bg-white border-gray-200'}`}>
                  <input type="checkbox" className="w-4 h-4" checked={form.actividad_economica_ids.length === 0}
                    onChange={e => setForm(prev => ({ ...prev, actividad_economica_ids: e.target.checked ? [] : ACTIVIDADES_ECONOMICAS.map(a => a.id) }))} />
                  <span className="text-sm font-medium text-gray-900">Cualquier actividad económica</span>
                </label>
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
                <p className="mt-2 text-xs text-brand-600 font-medium">
                  {form.actividad_economica_ids.length > 0 ? `${form.actividad_economica_ids.length} actividad(es) seleccionada(s)` : 'Sin restricción: cualquier actividad económica es elegible'}
                </p>
              </CardBody>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => navigate('/productos')}>Cancelar</Button>
              <Button onClick={guardar} loading={guardando} disabled={!form.nombre || !form.tasa_nominal_anual || !form.monto_min || !form.monto_max || !plazoMin || !plazoMax}>
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
                    ['Método', 'Cuota fija (francés)'],
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
                <div className="mt-4">
                  <DesgloseCredito monto={montoEjemplo} pctServicios={pctNum(form.pct_servicios)} compacto />
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  * Primera cuota un período después del desembolso. Montos redondeados al entero.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
