import { Check, X } from 'lucide-react'
import { clsx } from 'clsx'
import type { Credito, Solicitud } from '../../types'

type Estado = 'hecha' | 'actual' | 'pendiente' | 'rechazada' | 'omitida'
export interface Etapa { id: string; titulo: string; detalle?: string; estado: Estado }

const f = (x?: string | null) => x ? new Date(x.length <= 10 ? `${x}T00:00:00` : x).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined

/** Etapas del crédito: creada → evaluación → comité → decisión → desembolso → pago. */
export function etapasSolicitud(s: Solicitud, credito?: Credito | null): Etapa[] {
  const orden: Record<string, number> = { borrador: 0, enviada: 1, scoring: 2, revision_comite: 3, aprobada: 4, firma: 4, rechazada: 4, desembolsada: 5 }
  const n = orden[s.estado] ?? 1
  const rechazada = s.estado === 'rechazada'
  const sc = (s.scoring ?? {}) as { estado?: string; fecha_visita?: string | null; score?: number | null }
  const evaluada = sc.estado === 'evaluada'

  const etapas: Etapa[] = [
    { id: 'creada', titulo: s.estado === 'borrador' ? 'Borrador' : 'Solicitud creada', detalle: f(s.fecha_solicitud), estado: s.estado === 'borrador' ? 'actual' : 'hecha' },
    {
      id: 'evaluacion', titulo: 'Visita y scoring',
      detalle: evaluada ? [sc.fecha_visita && f(sc.fecha_visita), s.semaforo && `semáforo ${s.semaforo}`, sc.score != null && `${sc.score} pts`].filter(Boolean).join(' · ') : (n > 2 ? 'sin visita registrada' : 'pendiente de visita'),
      estado: 'pendiente',   // se calcula abajo
    },
    { id: 'comite', titulo: 'Comité', detalle: s.enviada_comite_en ? `enviada ${f(s.enviada_comite_en)}` : undefined, estado: n === 3 ? 'actual' : n > 3 ? 'hecha' : 'pendiente' },
    {
      id: 'decision', titulo: rechazada ? 'Rechazada' : 'Aprobada',
      detalle: s.fecha_decision ? [f(s.fecha_decision), s.monto_aprobado ? `$${Math.round(s.monto_aprobado).toLocaleString('es-CO')}` : null].filter(Boolean).join(' · ') : undefined,
      estado: rechazada ? 'rechazada' : n >= 4 ? 'hecha' : 'pendiente',
    },
    { id: 'desembolso', titulo: 'Desembolso', detalle: credito?.fecha_desembolso ? f(credito.fecha_desembolso) : undefined, estado: rechazada ? 'omitida' : n >= 5 ? 'hecha' : n === 4 ? 'actual' : 'pendiente' },
    {
      id: 'pago', titulo: credito?.estado === 'cancelado' ? 'Crédito pagado' : 'Pagando',
      detalle: credito ? `${credito.cuotas_pagadas}/${credito.cuotas_total} cuotas${credito.dias_mora > 0 ? ` · ${credito.dias_mora} días de mora` : ''}` : undefined,
      estado: rechazada ? 'omitida' : !credito ? 'pendiente' : credito.estado === 'cancelado' ? 'hecha' : 'actual',
    },
  ]
  // Evaluación: si la solicitud aún está en 'enviada' pero ya tiene visita, la visita cuenta como hecha
  const ev = etapas[1]
  if (evaluada) ev.estado = 'hecha'
  else if (n <= 2 && s.estado !== 'borrador') ev.estado = 'actual'
  else if (n > 2) ev.estado = 'hecha'
  else ev.estado = 'pendiente'
  // En 'enviada' con visita hecha, lo actual es enviar al comité
  if (n <= 2 && evaluada && !rechazada) etapas[2].estado = 'actual'
  return etapas
}

const ESTILO: Record<Estado, { circulo: string; texto: string; linea: string }> = {
  hecha:     { circulo: 'bg-brand-600 border-brand-600 text-white',        texto: 'text-gray-900',  linea: 'bg-brand-500' },
  actual:    { circulo: 'bg-white border-brand-600 text-brand-700 ring-4 ring-brand-100', texto: 'text-brand-700 font-semibold', linea: 'bg-gray-200' },
  pendiente: { circulo: 'bg-white border-gray-300 text-gray-400',          texto: 'text-gray-400',  linea: 'bg-gray-200' },
  rechazada: { circulo: 'bg-red-600 border-red-600 text-white',            texto: 'text-red-700 font-semibold', linea: 'bg-gray-200' },
  omitida:   { circulo: 'bg-gray-100 border-gray-200 text-gray-300',       texto: 'text-gray-300 line-through', linea: 'bg-gray-100' },
}

/** Diagrama horizontal (vertical en móvil) con las etapas hechas sombreadas. */
export function LineaTiempo({ etapas }: { etapas: Etapa[] }) {
  return (
    <ol className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
      {etapas.map((e, i) => {
        const es = ESTILO[e.estado]
        const ultima = i === etapas.length - 1
        return (
          <li key={e.id} className="relative flex sm:flex-col sm:flex-1 items-start sm:items-center gap-3 sm:gap-2 sm:text-center">
            {!ultima && <span className={clsx('hidden sm:block absolute top-4 left-1/2 w-full h-1 rounded', e.estado === 'hecha' ? ESTILO.hecha.linea : es.linea)} />}
            <span className={clsx('relative z-10 w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold', es.circulo)}>
              {e.estado === 'hecha' ? <Check size={15} strokeWidth={3} /> : e.estado === 'rechazada' ? <X size={15} strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 sm:px-1">
              <p className={clsx('text-sm leading-tight', es.texto)}>{e.titulo}</p>
              {e.detalle && e.estado !== 'omitida' && <p className="text-xs text-gray-500 mt-0.5">{e.detalle}</p>}
              {e.estado === 'actual' && <p className="text-[11px] text-brand-600 mt-0.5">etapa actual</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
