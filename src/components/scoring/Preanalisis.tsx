import { useEffect, useState } from 'react'
import { AlertTriangle, Ban, Info } from 'lucide-react'
import { Badge, Card, CardHeader, CardBody, Alert, Spinner } from '../ui'
import { formatCOP } from '../../mocks'
import { obtenerScoring, SEMAFORO, type ScoringFEM } from '../../lib/scoring'

/** Preanálisis FEM: semáforo, puntaje por componente, capacidad y alertas (expediente para comité). */
export function Preanalisis({ solicitudId, inicial, recarga = 0 }: { solicitudId: string; inicial?: ScoringFEM | null; recarga?: number }) {
  const [s, setS] = useState<ScoringFEM | null>(inicial ?? null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setCargando(true); setError('')
    obtenerScoring(solicitudId)
      .then(r => { if (vivo) setS(r) })
      .catch(e => { if (vivo) setError(e instanceof Error ? e.message : 'No se pudo calcular el scoring') })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [solicitudId, recarga])

  const sem = s?.semaforo ? SEMAFORO[s.semaforo] : null
  const c = s?.componentes

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Preanálisis · scoring FEM</h2>
            <p className="text-xs text-gray-500">
              {s?.ruta === 'renovacion' ? 'Ruta 2: cliente con experiencia (renovación)' : 'Ruta 1: crédito nuevo'}
              {s?.fecha_visita && ` · visita del ${new Date(`${s.fecha_visita}T00:00:00`).toLocaleDateString('es-CO')}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cargando && <Spinner size="sm" />}
            {s?.score != null && <span className="text-2xl font-bold text-gray-900">{s.score}<span className="text-sm text-gray-400">/100</span></span>}
            {sem ? <Badge color={sem.color}>{sem.texto}</Badge> : s && <Badge color="gray">Sin evaluación</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {s?.estado === 'sin_evaluacion' && (
          <Alert type="warning">{s.razones[0]} Registra la evaluación del asesor para obtener el semáforo y el monto sugerido.</Alert>
        )}

        {sem && <p className="text-sm text-gray-700"><strong>{sem.texto}:</strong> {sem.accion}.</p>}

        {c && (
          <div className="space-y-3">
            <Barra titulo="Capacidad de pago" valor={c.capacidad} max={50}
              detalle={`Cobertura de la cuota ${c.cobertura}/30 · estabilidad ${c.estabilidad}/20 (antigüedad ${c.antiguedad}/12, ventas ${c.variabilidad}/8)`} />
            <Barra titulo="Experiencia crediticia" valor={c.experiencia} max={30}
              detalle={s?.recurrente ? 'Según sus pagos en SiCrecer' : 'Sin historial: base 15 + referencias y consulta externa'} />
            <Barra titulo="Voluntad de pago" valor={c.voluntad} max={20}
              detalle={`Veracidad comprobada ${c.veracidad}/12 · compromisos cumplidos ${c.compromisos}/8`} />
          </div>
        )}

        {s?.estado === 'evaluada' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Dato etiqueta="Flujo libre mensual" valor={formatCOP(s.flujo_libre ?? 0)} alerta={(s.flujo_libre ?? 0) <= 0} />
            <Dato etiqueta="Cuota mensual propuesta" valor={formatCOP(s.cuota_mensual ?? 0)} />
            <Dato etiqueta="Proporción del flujo" valor={s.proporcion_flujo != null ? `${String(s.proporcion_flujo).replace('.', ',')} % (tope 40 %)` : '—'}
              alerta={(s.proporcion_flujo ?? 0) > 40} />
            <Dato etiqueta="Monto pedido" valor={formatCOP(s.monto_pedido ?? 0)} />
            <Dato etiqueta="Monto por capacidad" valor={s.monto_capacidad != null ? formatCOP(s.monto_capacidad) : '—'} />
            <Dato etiqueta="Monto sugerido" valor={s.monto_sugerido != null ? formatCOP(s.monto_sugerido) : 'Sin propuesta'} fuerte />
          </div>
        )}

        {(s?.filtros?.length ?? 0) > 0 && (
          <Lista icono={<Ban size={13} className="text-red-600" />} titulo="Filtros (impiden proponer)" items={s!.filtros!} clase="text-red-700" />
        )}
        {(s?.alertas?.length ?? 0) > 0 && (
          <Lista icono={<AlertTriangle size={13} className="text-amber-600" />} titulo="Alertas para el comité" items={s!.alertas!} clase="text-amber-800" />
        )}
        {s?.estado === 'evaluada' && (
          <p className="text-xs text-gray-400 flex items-start gap-1">
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            El scoring orienta; toda aprobación la decide el comité y deja el motivo registrado. La impresión del asesor no suma puntos sin evidencia.
          </p>
        )}
      </CardBody>
    </Card>
  )
}

function Barra({ titulo, valor, max, detalle }: { titulo: string; valor: number; max: number; detalle: string }) {
  const pct = max ? (valor / max) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-gray-700">{titulo}</span>
        <span className="font-semibold text-gray-900">{valor}/{max}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-yellow-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{detalle}</p>
    </div>
  )
}

function Dato({ etiqueta, valor, alerta, fuerte }: { etiqueta: string; valor: string; alerta?: boolean; fuerte?: boolean }) {
  return (
    <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
      <p className="text-xs text-gray-500">{etiqueta}</p>
      <p className={`${fuerte ? 'text-base font-bold' : 'font-semibold'} ${alerta ? 'text-red-600' : 'text-gray-900'}`}>{valor}</p>
    </div>
  )
}

function Lista({ icono, titulo, items, clase }: { icono: React.ReactNode; titulo: string; items: string[]; clase: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">{icono}{titulo}</p>
      <ul className={`text-xs list-disc pl-5 space-y-0.5 ${clase}`}>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  )
}
