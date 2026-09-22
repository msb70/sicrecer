import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PortalShell } from '../../components/portal/PortalShell'
import { Button, Card, CardHeader, CardBody, Badge, Alert, Spinner } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { misSolicitudes, estadoPortal, cargarCatalogoPortal, type CatalogoPortal } from '../../lib/portal'
import { generarPlan, resumenPlan } from '../../lib/finanzas'
import { formatCOP } from '../../mocks'
import type { Solicitud } from '../../types'
import { ESTADO_PORTAL_UI } from './MisSolicitudes'

const MENSAJE: Record<ReturnType<typeof estadoPortal>, string> = {
  'Enviada':     'Recibimos tu solicitud. Un facilitador la revisará pronto.',
  'En revisión': 'Tu solicitud está siendo evaluada por el comité de crédito.',
  'Aprobada':    'Tu solicitud fue aprobada. Un facilitador se pondrá en contacto contigo para el desembolso.',
  'No aprobada': 'Tu solicitud no fue aprobada en esta ocasión.',
}

export default function DetalleSolicitudPortal() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { solicitante } = useApp()
  const [solicitud, setSolicitud] = useState<Solicitud | null | undefined>(undefined)
  const [catalogo, setCatalogo] = useState<CatalogoPortal | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!solicitante) { navigate('/portal/perfil', { replace: true }); return }
    Promise.all([misSolicitudes(solicitante.id), cargarCatalogoPortal()])
      .then(([lista, cat]) => { setSolicitud(lista.find(s => s.id === id) ?? null); setCatalogo(cat) })
      .catch(e => setError(e.message))
  }, [solicitante, id, navigate])

  const producto = catalogo?.productos.find(p => p.id === solicitud?.producto_id)
  const ep = solicitud ? estadoPortal(solicitud.estado) : null

  const planAprobado = useMemo(() => {
    if (!solicitud || !producto || ep !== 'Aprobada' || solicitud.monto_aprobado == null || !solicitud.plazo_aprobado) return []
    return generarPlan({
      monto: Number(solicitud.monto_aprobado), tasaNominalAnual: producto.tasa_nominal_anual,
      plazo: solicitud.plazo_aprobado, metodo: producto.metodo_interes, frecuencia: producto.frecuencia,
    })
  }, [solicitud, producto, ep])
  const resumen = useMemo(() => resumenPlan(planAprobado), [planAprobado])

  return (
    <PortalShell titulo="Detalle de solicitud" acciones={<Button variant="ghost" onClick={() => navigate('/portal')}><ArrowLeft size={16} /> Volver</Button>}>
      {error && <Alert type="error">{error}</Alert>}
      {solicitud === undefined && !error && <div className="py-16 flex justify-center"><Spinner /></div>}
      {solicitud === null && <Alert type="error">Solicitud no encontrada.</Alert>}

      {solicitud && ep && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            ep === 'Aprobada' ? 'bg-green-50 border-green-200 text-green-800' :
            ep === 'No aprobada' ? 'bg-red-50 border-red-200 text-red-800' :
            ep === 'En revisión' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            {ESTADO_PORTAL_UI[ep].icon}
            <div>
              <p className="font-semibold">{ep}</p>
              <p className="text-sm opacity-80">{MENSAJE[ep]}</p>
            </div>
          </div>

          {ep === 'No aprobada' && (
            <Card className="border-red-200">
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Motivo</h2></CardHeader>
              <CardBody><p className="text-sm text-gray-700">{solicitud.motivo_rechazo || 'El comité no indicó un motivo detallado.'}</p></CardBody>
            </Card>
          )}

          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Lo que solicitaste</h2></CardHeader>
            <CardBody className="text-sm space-y-1">
              {[
                ['Producto', solicitud.producto_nombre],
                ['Monto', formatCOP(solicitud.monto_solicitado)],
                ['Plazo', `${solicitud.plazo} cuotas`],
                ['Fecha', new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CO', { dateStyle: 'long' })],
                ['Propósito', solicitud.proposito || '—'],
                ['Estado', <Badge key="b" color={ESTADO_PORTAL_UI[ep].color}>{ep}</Badge>],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
              ))}
            </CardBody>
          </Card>

          {ep === 'Aprobada' && solicitud.monto_aprobado != null && (
            <Card className="border-green-200">
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Condiciones aprobadas y plan de cuotas</h2></CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
                  <div><p className="text-xs text-gray-500">Monto aprobado</p><p className="font-semibold">{formatCOP(Number(solicitud.monto_aprobado))}</p></div>
                  <div><p className="text-xs text-gray-500">Plazo</p><p className="font-semibold">{solicitud.plazo_aprobado} cuotas</p></div>
                  <div><p className="text-xs text-gray-500">Cuota</p><p className="font-semibold">{planAprobado[0] ? formatCOP(planAprobado[0].cuota) : '—'}</p></div>
                  <div><p className="text-xs text-gray-500">Total a pagar</p><p className="font-semibold">{formatCOP(resumen.totalPagar)}</p></div>
                </div>
                {(Number(solicitud.monto_aprobado) !== solicitud.monto_solicitado || solicitud.plazo_aprobado !== solicitud.plazo) && (
                  <Alert type="info" className="mb-3">El comité ajustó las condiciones respecto a lo solicitado.</Alert>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-gray-500 border-b border-gray-100"><th className="py-1.5 pr-2">#</th><th className="pr-2">Cuota</th><th className="pr-2">Capital</th><th className="pr-2">Interés</th><th>Saldo</th></tr></thead>
                    <tbody>
                      {planAprobado.map(f => (
                        <tr key={f.num} className="border-b border-gray-50"><td className="py-1.5 pr-2 text-gray-500">{f.num}</td><td className="pr-2 font-medium">{formatCOP(f.cuota)}</td><td className="pr-2">{formatCOP(f.capital)}</td><td className="pr-2">{formatCOP(f.interes)}</td><td>{formatCOP(f.saldo)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">Las fechas de pago se fijan en el desembolso.</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </PortalShell>
  )
}
