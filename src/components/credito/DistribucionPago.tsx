import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Spinner } from '../ui'
import { simularPago } from '../../lib/creditos'
import { formatCOP } from '../../mocks'
import type { ResultadoPagoServidor } from '../../types'

/**
 * Previsualiza la distribución de un pago con la misma función de la base
 * (simular_pago): gastos administrativos → mora → interés → capital →
 * anticipo a capital. Se recalcula al cambiar monto o fecha.
 */
export function DistribucionPago({ creditoId, monto, fecha }: { creditoId: string; monto: number; fecha: string }) {
  const [res, setRes] = useState<ResultadoPagoServidor | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    setRes(null); setError('')
    if (!creditoId || !(monto > 0) || !fecha) return
    let vigente = true
    setCargando(true)
    const t = setTimeout(() => {
      simularPago(creditoId, monto, fecha)
        .then(r => { if (vigente) setRes(r) })
        .catch(e => { if (vigente) setError(e instanceof Error ? e.message : 'No se pudo simular') })
        .finally(() => { if (vigente) setCargando(false) })
    }, 400)
    return () => { vigente = false; clearTimeout(t) }
  }, [creditoId, monto, fecha])

  if (!creditoId || !(monto > 0)) {
    return (
      <div className="text-center py-6">
        <AlertCircle size={28} className="mx-auto text-gray-200 mb-2" />
        <p className="text-xs text-gray-400">Selecciona crédito e ingresa monto para ver cómo se aplica el pago</p>
      </div>
    )
  }
  if (cargando && !res) return <div className="flex justify-center py-6"><Spinner /></div>
  if (error) return <p className="text-xs text-red-600">{error}</p>
  if (!res) return null

  const filas: [string, number, string?][] = [
    ['1. Gastos administrativos', Number(res.gastos_admin)],
    ['2. Mora', Number(res.mora)],
    ['3. Interés', Number(res.interes)],
    ['4. Capital de cuotas', Number(res.capital)],
    ['5. Anticipo a capital', Number(res.anticipo), 'text-brand-700'],
  ]
  return (
    <div className="text-sm">
      {filas.map(([k, v, cls]) => (
        <div key={k} className="flex justify-between py-1.5 border-b border-gray-50">
          <span className="text-gray-500">{k}</span>
          <span className={cls ?? (v > 0 ? 'font-medium text-gray-900' : 'text-gray-300')}>{formatCOP(v)}</span>
        </div>
      ))}
      <div className="flex justify-between pt-2 font-semibold">
        <span>Total aplicado</span><span>{formatCOP(Number(res.monto_recibido))}</span>
      </div>
      {res.cuotas_completadas.length > 0 && (
        <p className="text-xs text-green-700 mt-2">Cuotas que quedan pagadas: {res.cuotas_completadas.join(', ')}</p>
      )}
      {Number(res.anticipo) > 0 && res.cuota_nueva !== null && (
        <p className="text-xs text-brand-700 mt-1">
          {Number(res.cuota_nueva) > 0 ? `Nueva cuota por anticipo: ${formatCOP(Number(res.cuota_nueva))} (mismo número de cuotas restantes).` : 'El crédito queda cancelado.'}
        </p>
      )}
      <p className="text-xs text-gray-500 mt-1">Saldo de capital después del pago: {formatCOP(Number(res.saldo_capital))}</p>
    </div>
  )
}
