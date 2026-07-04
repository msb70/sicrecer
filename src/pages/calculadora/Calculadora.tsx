import { useState, useMemo } from 'react'
import { Calculator, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody } from '../../components/ui'
import { PRODUCTOS, formatCOP } from '../../mocks'
import type { ProductoCredito } from '../../types'

const FRECUENCIA_LABEL: Record<ProductoCredito['frecuencia'], string> = {
  semanal:   'Semanal',
  quincenal: 'Quincenal',
  mensual:   'Mensual',
}

// ─── Cálculo de cuota ─────────────────────────────────────────
// Motor financiero único (src/lib/finanzas.ts) — misma lógica que
// la función SQL generar_cronograma en la base de datos.
import { calcularCuota as cuotaMotor, generarPlan } from '../../lib/finanzas'

function calcularCuota(
  monto: number,
  plazo: number,
  tasaAnual: number,
  metodo: ProductoCredito['metodo_interes'],
  frecuencia: ProductoCredito['frecuencia']
): number {
  return cuotaMotor({ monto, tasaNominalAnual: tasaAnual, plazo, metodo, frecuencia })
}

// ─── Tabla de amortización resumida ──────────────────────────
interface FilaAmort {
  num: number; capital: number; interes: number; cuota: number; saldo: number
}

function tablaAmortizacion(
  monto: number, plazo: number, tasaAnual: number,
  metodo: ProductoCredito['metodo_interes'],
  frecuencia: ProductoCredito['frecuencia']
): FilaAmort[] {
  return generarPlan({ monto, tasaNominalAnual: tasaAnual, plazo, metodo, frecuencia })
    .map(f => ({ num: f.num, capital: f.capital, interes: f.interes, cuota: f.cuota, saldo: f.saldo }))
}

// ─── INPUT NUM ────────────────────────────────────────────────
function NumInput({ label, value, onChange, min, max, step = 1, prefix, suffix, hint }: {
  label: string; value: string; onChange: (v: string) => void
  min?: number; max?: number; step?: number
  prefix?: string; suffix?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-3 text-sm text-gray-400 pointer-events-none">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step}
          className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-16' : 'pr-4'}`}
        />
        {suffix && <span className="absolute right-3 text-sm text-gray-400 pointer-events-none">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ─── PÁGINA ───────────────────────────────────────────────────
export default function Calculadora() {
  const [productoId, setProductoId] = useState(PRODUCTOS[0].id)
  const [monto, setMonto]           = useState('')
  const [plazo, setPlazo]           = useState('')
  const [verTabla, setVerTabla]     = useState(false)

  const producto = PRODUCTOS.find(p => p.id === productoId)!

  const montoNum = parseFloat(monto) || 0
  const plazoNum = parseInt(plazo)   || 0

  const errores = useMemo(() => {
    const e: string[] = []
    if (montoNum && montoNum < producto.monto_min) e.push(`Monto mínimo: ${formatCOP(producto.monto_min)}`)
    if (montoNum && montoNum > producto.monto_max) e.push(`Monto máximo: ${formatCOP(producto.monto_max)}`)
    if (plazoNum && plazoNum < producto.plazo_min) e.push(`Plazo mínimo: ${producto.plazo_min} cuotas`)
    if (plazoNum && plazoNum > producto.plazo_max) e.push(`Plazo máximo: ${producto.plazo_max} cuotas`)
    return e
  }, [montoNum, plazoNum, producto])

  const listo = montoNum > 0 && plazoNum > 0 && errores.length === 0

  const cuota         = listo ? calcularCuota(montoNum, plazoNum, producto.tasa_nominal_anual, producto.metodo_interes, producto.frecuencia) : 0
  const totalPagar    = Math.round(cuota) * plazoNum
  const totalInteres  = totalPagar - montoNum
  const tabla         = listo && verTabla ? tablaAmortizacion(montoNum, plazoNum, producto.tasa_nominal_anual, producto.metodo_interes, producto.frecuencia) : []

  const resetear = () => { setMonto(''); setPlazo(''); setVerTabla(false) }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Calculadora de crédito"
          subtitle="Simula cuotas antes de radicar una solicitud"
        />

        <div className="max-w-2xl space-y-5">
          {/* Formulario */}
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Parámetros del crédito</h2></CardHeader>
            <CardBody className="space-y-5">
              {/* Producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Producto</label>
                <select
                  value={productoId}
                  onChange={e => { setProductoId(e.target.value); setMonto(''); setPlazo('') }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
                >
                  {PRODUCTOS.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Tasa: {producto.tasa_nominal_anual}% anual
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {FRECUENCIA_LABEL[producto.frecuencia]}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {producto.metodo_interes === 'flat' ? 'Tasa fija' : 'Saldo decreciente'}
                  </span>
                </div>
              </div>

              {/* Monto */}
              <NumInput
                label="Monto del crédito"
                value={monto}
                onChange={setMonto}
                min={producto.monto_min}
                max={producto.monto_max}
                step={50000}
                prefix="$"
                hint={`Rango: ${formatCOP(producto.monto_min)} – ${formatCOP(producto.monto_max)}`}
              />

              {/* Plazo */}
              <NumInput
                label={`Plazo (cuotas ${producto.frecuencia === 'mensual' ? 'mensuales' : producto.frecuencia === 'quincenal' ? 'quincenales' : 'semanales'})`}
                value={plazo}
                onChange={setPlazo}
                min={producto.plazo_min}
                max={producto.plazo_max}
                suffix="cuotas"
                hint={`Rango: ${producto.plazo_min} – ${producto.plazo_max} cuotas`}
              />

              {/* Errores */}
              {errores.map(e => (
                <p key={e} className="text-xs text-red-500 flex items-center gap-1">⚠ {e}</p>
              ))}

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" onClick={resetear} className="gap-1.5">
                  <RefreshCw size={14} />Limpiar
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Resultado */}
          {listo && (
            <Card className="border-brand-200 bg-brand-50">
              <CardBody>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shrink-0">
                    <Calculator size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-brand-600 font-medium uppercase tracking-wider">Cuota {FRECUENCIA_LABEL[producto.frecuencia].toLowerCase()}</p>
                    <p className="text-3xl font-bold text-brand-700">{formatCOP(Math.round(cuota))}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-xl p-3 border border-brand-100">
                    <p className="text-xs text-gray-500 mb-1">Monto</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCOP(montoNum)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-brand-100">
                    <p className="text-xs text-gray-500 mb-1">Total intereses</p>
                    <p className="text-sm font-semibold text-orange-600">{formatCOP(totalInteres)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-brand-100">
                    <p className="text-xs text-gray-500 mb-1">Total a pagar</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCOP(totalPagar)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-brand-600">
                  <span>Periodicidad: <strong>{FRECUENCIA_LABEL[producto.frecuencia]}</strong> · {plazoNum} cuotas · {producto.tasa_nominal_anual}% anual</span>
                </div>

                {/* Tabla amortización */}
                <button
                  onClick={() => setVerTabla(o => !o)}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium py-2 border-t border-brand-100"
                >
                  {verTabla ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                  {verTabla ? 'Ocultar' : 'Ver'} tabla de amortización
                </button>
              </CardBody>

              {verTabla && (
                <div className="border-t border-brand-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-brand-100">
                        <th className="px-4 py-2 text-left font-medium text-brand-700">#</th>
                        <th className="px-4 py-2 text-right font-medium text-brand-700">Cuota</th>
                        <th className="px-4 py-2 text-right font-medium text-brand-700">Capital</th>
                        <th className="px-4 py-2 text-right font-medium text-brand-700">Interés</th>
                        <th className="px-4 py-2 text-right font-medium text-brand-700">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-50">
                      {tabla.map(f => (
                        <tr key={f.num} className="hover:bg-brand-50">
                          <td className="px-4 py-2 text-gray-500">{f.num}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCOP(f.cuota)}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{formatCOP(f.capital)}</td>
                          <td className="px-4 py-2 text-right text-orange-600">{formatCOP(f.interes)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{formatCOP(f.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      </PageContainer>
    </Shell>
  )
}
