import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ChevronRight, FileText, Clock, CheckCircle2, XCircle, Send } from 'lucide-react'
import { PortalShell } from '../../components/portal/PortalShell'
import { Button, Card, Badge, EmptyState, Spinner, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { misSolicitudes, estadoPortal, type EstadoPortal } from '../../lib/portal'
import { formatCOP } from '../../mocks'
import type { Solicitud } from '../../types'

export const ESTADO_PORTAL_UI: Record<EstadoPortal, { color: 'blue' | 'yellow' | 'green' | 'red'; icon: JSX.Element }> = {
  'Enviada':     { color: 'blue',   icon: <Send size={14} /> },
  'En revisión': { color: 'yellow', icon: <Clock size={14} /> },
  'Aprobada':    { color: 'green',  icon: <CheckCircle2 size={14} /> },
  'No aprobada': { color: 'red',    icon: <XCircle size={14} /> },
}

export default function MisSolicitudes() {
  const navigate = useNavigate()
  const { solicitante } = useApp()
  const [solicitudes, setSolicitudes] = useState<Solicitud[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!solicitante) { navigate('/portal/perfil', { replace: true }); return }
    misSolicitudes(solicitante.id).then(setSolicitudes).catch(e => setError(e.message))
  }, [solicitante, navigate])

  return (
    <PortalShell
      titulo="Mis solicitudes"
      subtitulo={solicitante ? `Hola, ${solicitante.nombre.split(' ')[0]}` : undefined}
      acciones={<Button onClick={() => navigate('/portal/nueva')}><PlusCircle size={16} /> Nueva</Button>}
    >
      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {!solicitudes && !error && <div className="py-16 flex justify-center"><Spinner /></div>}

      {solicitudes && solicitudes.length === 0 && (
        <Card>
          <EmptyState
            icon={<FileText size={36} />}
            title="Aún no tienes solicitudes"
            description="Elige un producto, indica el monto y el plazo, y te mostraremos tu cuota estimada."
            action={<Button onClick={() => navigate('/portal/nueva')}><PlusCircle size={16} /> Crear mi primera solicitud</Button>}
          />
        </Card>
      )}

      {solicitudes && solicitudes.length > 0 && (
        <div className="space-y-3">
          {solicitudes.map(s => {
            const ep = estadoPortal(s.estado)
            const ui = ESTADO_PORTAL_UI[ep]
            return (
              <Card key={s.id} className="cursor-pointer hover:border-brand-200 transition-all" onClick={() => navigate(`/portal/solicitudes/${s.id}`)}>
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{s.producto_nombre}</p>
                    <p className="text-xs text-gray-500">
                      {formatCOP(s.monto_solicitado)} · {s.plazo} cuotas · {new Date(s.fecha_solicitud).toLocaleDateString('es-CO')}
                    </p>
                    {ep === 'Aprobada' && s.monto_aprobado != null && (
                      <p className="text-xs text-green-700 mt-0.5">Aprobado: {formatCOP(Number(s.monto_aprobado))} en {s.plazo_aprobado} cuotas</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge color={ui.color}><span className="inline-flex items-center gap-1">{ui.icon}{ep}</span></Badge>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PortalShell>
  )
}
