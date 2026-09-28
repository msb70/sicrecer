import { formatCOP } from '../../mocks'
import { desgloseDesembolso } from '../../lib/finanzas'

/**
 * Desglose del crédito para simuladores, portal, comité y desembolso.
 * Muestra en renglón aparte el costo de los servicios de desarrollo
 * empresarial (se descuentan del monto al desembolsar).
 */
export function DesgloseCredito({
  monto, pctServicios, cuota, plazo, frecuencia, totalPagar, compacto = false,
}: {
  monto: number
  pctServicios: number
  cuota?: number
  plazo?: number
  frecuencia?: string
  totalPagar?: number
  compacto?: boolean
}) {
  const d = desgloseDesembolso(monto, pctServicios)
  const filas: [string, string, string?][] = [
    ['Monto del crédito', formatCOP(d.montoCredito)],
    [`Servicios de desarrollo empresarial (${d.pctServicios}%)`, `− ${formatCOP(d.servicios)}`, 'text-amber-700'],
    ['Monto que recibes', formatCOP(d.entregado), 'font-semibold text-gray-900'],
  ]
  if (cuota !== undefined && plazo) {
    filas.push([`Cuota ${frecuencia ?? ''}`.trim(), `${formatCOP(cuota)} × ${plazo}`])
  }
  if (totalPagar !== undefined) filas.push(['Total a pagar', formatCOP(totalPagar), 'font-semibold text-gray-900'])

  return (
    <div className={compacto ? 'text-xs' : 'text-sm'}>
      {filas.map(([k, v, cls]) => (
        <div key={k} className="flex justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
          <span className="text-gray-500">{k}</span>
          <span className={`${cls ?? 'text-gray-800'} whitespace-nowrap text-right`}>{v}</span>
        </div>
      ))}
      {d.servicios > 0 && (
        <p className="text-[11px] text-gray-400 mt-2">
          Los servicios de desarrollo empresarial se descuentan al desembolsar. La cuota se calcula sobre el monto total del crédito.
        </p>
      )}
    </div>
  )
}
