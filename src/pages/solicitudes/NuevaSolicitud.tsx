import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Calculator, CheckCircle2, Save } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { CLIENTES, PRODUCTOS, formatCOP } from '../../mocks'
import { clsx } from 'clsx'

// ─── CÁLCULO DE CUOTAS ────────────────────────────────────────
function calcularCuota(monto: number, tasaAnual: number, plazo: number, metodo: string): number {
  const tasaMensual = tasaAnual / 100 / 12
  if (metodo === 'flat') {
    const interes = monto * tasaMensual * plazo
    return Math.round((monto + interes) / plazo)
  }
  // Declining balance (francés)
  if (tasaMensual === 0) return Math.round(monto / plazo)
  const cuota = monto * (tasaMensual * Math.pow(1 + tasaMensual, plazo)) / (Math.pow(1 + tasaMensual, plazo) - 1)
  return Math.round(cuota)
}

function generarAmortizacion(monto: number, tasaAnual: number, plazo: number, metodo: string) {
  const tasaMensual = tasaAnual / 100 / 12
  const cuota = calcularCuota(monto, tasaAnual, plazo, metodo)
  const filas = []
  let saldo = monto

  for (let i = 1; i <= plazo; i++) {
    const interes = metodo === 'flat'
      ? Math.round(monto * tasaMensual)
      : Math.round(saldo * tasaMensual)
    const capital = cuota - interes
    saldo = Math.max(0, saldo - capital)
    filas.push({ n: i, cuota, capital, interes, saldo })
  }
  return filas
}

// ─── PASOS ────────────────────────────────────────────────────
const PASOS = ['Datos básicos', 'Calculadora', 'Confirmar']

export default function NuevaSolicitud() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const clientePresel = params.get('cliente') ?? ''

  const [paso, setPaso] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)

  const [form, setForm] = useState({
    cliente_id:  clientePresel,
    producto_id: PRODUCTOS[0].id,
    monto:       '2000000',
    plazo:       '12',
    proposito:   '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const producto = PRODUCTOS.find(p => p.id === form.producto_id) ?? PRODUCTOS[0]
  const cliente  = CLIENTES.find(c => c.id === form.cliente_id)
  const monto    = parseInt(form.monto) || 0
  const plazo    = parseInt(form.plazo) || 12

  // Validaciones básicas
  const montoValido = monto >= producto.monto_min && monto <= producto.monto_max
  const plazoValido = plazo >= producto.plazo_min && plazo <= producto.plazo_max

  const amortizacion = useMemo(() => {
    if (!montoValido || !plazoValido || monto <= 0) return []
    return generarAmortizacion(monto, producto.tasa_nominal_anual, plazo, producto.metodo_interes)
  }, [monto, plazo, producto, montoValido, plazoValido])

  const cuota       = amortizacion[0]?.cuota ?? 0
  const totalPagar  = amortizacion.reduce((s, f) => s + f.cuota, 0)
  const totalInteres = totalPagar - monto

  const handleEnviar = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setExito(true)
    setLoading(false)
    setTimeout(() => navigate('/solicitudes'), 2000)
  }

  if (exito) {
    return (
      <Shell>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckCircle2 size={56} className="text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Solicitud enviada</h2>
            <p className="text-gray-500 mt-2">La solicitud fue registrada y pasará a evaluación de scoring.</p>
          </div>
        </PageContainer>
      </Shell>
    )
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Nueva solicitud de crédito"
          actions={<Button variant="ghost" onClick={() => navigate('/solicitudes')}><ArrowLeft size={16} />Volver</Button>}
        />

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8">
          {PASOS.map((p, i) => (
            <div key={p} className="flex items-center flex-1">
              <div className={clsx(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 transition-colors',
                i < paso  ? 'bg-brand-600 text-white' :
                i === paso ? 'bg-brand-600 text-white ring-2 ring-brand-200' :
                             'bg-gray-100 text-gray-400'
              )}>
                {i < paso ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={clsx('text-xs font-medium', i === paso ? 'text-brand-700' : 'text-gray-400')}>{p}</p>
              </div>
              {i < PASOS.length - 1 && (
                <div className={clsx('flex-1 h-px mx-3', i < paso ? 'bg-brand-400' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>

        {/* ── PASO 0: Datos básicos ────────────── */}
        {paso === 0 && (
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Cliente y producto</h2></CardHeader>
              <CardBody className="space-y-4">
                <Select label="Cliente *" value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)}>
                  <option value="">Seleccionar cliente…</option>
                  {CLIENTES.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>

                <Select label="Producto crediticio *" value={form.producto_id} onChange={e => set('producto_id', e.target.value)}>
                  {PRODUCTOS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </Select>

                <Input
                  label="Propósito del crédito"
                  value={form.proposito}
                  onChange={e => set('proposito', e.target.value)}
                  placeholder="Ej. Compra de inventario para negocio"
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones del producto seleccionado</h2></CardHeader>
              <CardBody>
                <div className="space-y-2 text-sm">
                  {[
                    ['Convenio',            producto.convenio_id],
                    ['Tasa nominal anual',  `${producto.tasa_nominal_anual}%`],
                    ['Método de interés',   producto.metodo_interes === 'flat' ? 'Flat (sobre capital inicial)' : 'Saldo decreciente'],
                    ['Frecuencia de pago',  producto.frecuencia],
                    ['Monto mínimo',        formatCOP(producto.monto_min)],
                    ['Monto máximo',        formatCOP(producto.monto_max)],
                    ['Plazo mínimo',        `${producto.plazo_min} meses`],
                    ['Plazo máximo',        `${producto.plazo_max} meses`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-medium text-gray-900">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <div className="lg:col-span-2 flex justify-end">
              <Button onClick={() => setPaso(1)} disabled={!form.cliente_id}>
                Siguiente <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 1: Calculadora ─────────────── */}
        {paso === 1 && (
          <div className="grid lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-brand-600" />
                  <h2 className="text-sm font-semibold text-gray-800">Calculadora de cuotas</h2>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Monto solicitado *
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      value={form.monto}
                      onChange={e => set('monto', e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      min={producto.monto_min}
                      max={producto.monto_max}
                      step={50000}
                    />
                  </div>
                  {!montoValido && monto > 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      Debe estar entre {formatCOP(producto.monto_min)} y {formatCOP(producto.monto_max)}
                    </p>
                  )}
                  {/* Slider */}
                  <input
                    type="range"
                    min={producto.monto_min} max={producto.monto_max} step={50000}
                    value={monto}
                    onChange={e => set('monto', e.target.value)}
                    className="w-full mt-2 accent-brand-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{formatCOP(producto.monto_min)}</span>
                    <span>{formatCOP(producto.monto_max)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Plazo (meses) *</label>
                  <input
                    type="number"
                    value={form.plazo}
                    onChange={e => set('plazo', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 mt-1"
                    min={producto.plazo_min} max={producto.plazo_max}
                  />
                  {!plazoValido && plazo > 0 && (
                    <p className="text-xs text-red-600 mt-1">Plazo entre {producto.plazo_min} y {producto.plazo_max} meses</p>
                  )}
                  <input
                    type="range" min={producto.plazo_min} max={producto.plazo_max} step={1}
                    value={plazo} onChange={e => set('plazo', e.target.value)}
                    className="w-full mt-2 accent-brand-600"
                  />
                </div>
              </CardBody>
            </Card>

            {/* Resultado */}
            <div className="space-y-4">
              {montoValido && plazoValido && (
                <>
                  <Card className="border-brand-200 bg-brand-50">
                    <CardBody>
                      <p className="text-xs text-brand-700 font-medium uppercase tracking-wide mb-3">Resultado del cálculo</p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cuota {producto.frecuencia}</span>
                          <span className="text-2xl font-bold text-brand-700">{formatCOP(cuota)}</span>
                        </div>
                        <div className="border-t border-brand-200 pt-3 space-y-1.5 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Capital</span><span className="font-medium">{formatCOP(monto)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Intereses totales</span><span className="font-medium">{formatCOP(totalInteres)}</span></div>
                          <div className="flex justify-between font-semibold"><span>Total a pagar</span><span>{formatCOP(totalPagar)}</span></div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>Tasa efectiva anual ≈</span>
                            <span>{(producto.tasa_nominal_anual * 1.05).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* Tabla de amortización (primeras 4 cuotas) */}
                  <Card>
                    <CardHeader>
                      <h2 className="text-sm font-semibold text-gray-800">Tabla de amortización (preview)</h2>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-left">
                            <th className="px-4 py-2 text-gray-500">#</th>
                            <th className="px-4 py-2 text-gray-500">Cuota</th>
                            <th className="px-4 py-2 text-gray-500">Capital</th>
                            <th className="px-4 py-2 text-gray-500">Interés</th>
                            <th className="px-4 py-2 text-gray-500">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {amortizacion.slice(0, 4).map(f => (
                            <tr key={f.n} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-500">{f.n}</td>
                              <td className="px-4 py-2 font-medium">{formatCOP(f.cuota)}</td>
                              <td className="px-4 py-2 text-green-700">{formatCOP(f.capital)}</td>
                              <td className="px-4 py-2 text-orange-600">{formatCOP(f.interes)}</td>
                              <td className="px-4 py-2 text-gray-600">{formatCOP(f.saldo)}</td>
                            </tr>
                          ))}
                          {amortizacion.length > 4 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-2 text-center text-gray-400 text-xs">
                                … {amortizacion.length - 4} cuotas más
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </div>

            <div className="lg:col-span-2 flex justify-between">
              <Button variant="secondary" onClick={() => setPaso(0)}><ArrowLeft size={16} />Anterior</Button>
              <Button onClick={() => setPaso(2)} disabled={!montoValido || !plazoValido}>
                Siguiente <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Confirmar ───────────────── */}
        {paso === 2 && (
          <div className="max-w-lg mx-auto space-y-5">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Resumen de la solicitud</h2></CardHeader>
              <CardBody className="space-y-2 text-sm">
                {[
                  ['Cliente',          cliente?.nombre ?? '—'],
                  ['Producto',         producto.nombre],
                  ['Monto',            formatCOP(monto)],
                  ['Plazo',            `${plazo} meses`],
                  ['Cuota mensual',    formatCOP(cuota)],
                  ['Total a pagar',    formatCOP(totalPagar)],
                  ['Propósito',        form.proposito || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 text-right">{v}</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Alert type="info">
              Al enviar, la solicitud pasará por el motor de scoring. Si supera los umbrales automáticos, quedará aprobada. De lo contrario, irá a revisión del comité.
            </Alert>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setPaso(1)}><ArrowLeft size={16} />Anterior</Button>
              <Button loading={loading} onClick={handleEnviar}>
                <Save size={16} />Enviar solicitud
              </Button>
            </div>
          </div>
        )}
      </PageContainer>
    </Shell>
  )
}
