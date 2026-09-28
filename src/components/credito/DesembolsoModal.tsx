import { useState } from 'react'
import { Banknote, CheckCircle2 } from 'lucide-react'
import { Button, Alert } from '../ui'
import { DesgloseCredito } from './DesgloseCredito'
import { neon } from '../../lib/neon'
import { calcularCuota, fechaCuota, resumenPlan, generarPlan } from '../../lib/finanzas'
import { formatCOP } from '../../mocks'
import type { ProductoCredito, Solicitud } from '../../types'

/**
 * Registro del desembolso de una solicitud aprobada (rpc desembolsar_solicitud).
 * Crea el crédito con las condiciones del producto congeladas, descuenta los
 * servicios de desarrollo empresarial y genera el cronograma (primera cuota
 * un período después de la fecha de desembolso).
 */
export function DesembolsoModal({ solicitud, producto, onClose, onDone }: {
  solicitud: Solicitud
  producto: ProductoCredito
  onClose: () => void
  onDone: (creditoId: string) => void
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [fecha, setFecha] = useState(hoy)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState<{ credito_id: string; monto_entregado: number } | null>(null)

  const monto = Number(solicitud.monto_aprobado ?? solicitud.monto_solicitado)
  const plazo = Number(solicitud.plazo_aprobado ?? solicitud.plazo)
  const cond = { monto, tasaNominalAnual: producto.tasa_nominal_anual, plazo, frecuencia: producto.frecuencia }
  const cuota = calcularCuota(cond)
  const { totalPagar } = resumenPlan(generarPlan(cond))
  const primera = fecha ? fechaCuota(fecha, producto.frecuencia, 1) : ''

  const confirmar = async () => {
    setEnviando(true); setError('')
    try {
      const { data, error } = await neon.rpc('desembolsar_solicitud', { p_solicitud_id: solicitud.id, p_fecha_desembolso: fecha })
      if (error) throw new Error(error.message)
      const r = data as { credito_id: string; monto_entregado: number; duplicado?: boolean }
      setOk({ credito_id: r.credito_id, monto_entregado: r.monto_entregado })
      setTimeout(() => onDone(r.credito_id), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el desembolso')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-1">
          <Banknote size={18} className="text-brand-600" />
          <h2 className="text-base font-semibold text-gray-900">Registrar desembolso</h2>
        </div>
        <p className="text-xs text-gray-400 mb-5">{solicitud.cliente_nombre} · {producto.nombre}</p>

        {ok ? (
          <Alert type="success">
            <CheckCircle2 size={14} className="inline mr-1.5" />
            Crédito {ok.credito_id} creado. Entregar {formatCOP(ok.monto_entregado)} al cliente.
          </Alert>
        ) : (
          <div className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Fecha de entrega del dinero</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
              <p className="text-xs text-gray-400 mt-1">Primera cuota: {primera ? new Date(`${primera}T00:00:00`).toLocaleDateString('es-CO', { dateStyle: 'long' }) : '—'} (un período {producto.frecuencia} después).</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <DesgloseCredito monto={monto} pctServicios={producto.pct_servicios ?? 0} cuota={cuota} plazo={plazo}
                frecuencia={producto.frecuencia} totalPagar={totalPagar} />
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Tasa {producto.tasa_nominal_anual}% nominal anual · cuota fija · 30/360.</p>
              <p>Atraso: gastos administrativos {producto.pct_gastos_admin_periodo ?? 0}% y mora {producto.pct_mora_periodo ?? 0}% por período sobre capital vencido, tras {producto.dias_gracia_mora ?? 0} días de gracia.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1" onClick={confirmar} loading={enviando} disabled={!fecha}>
                <Banknote size={15} />Confirmar desembolso
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
