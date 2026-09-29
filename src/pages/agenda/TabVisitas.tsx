import { useState } from 'react'
import { MapPin, Clock, CheckCircle2, AlertTriangle, RefreshCw, Plus, Calendar } from 'lucide-react'
import { Button, Badge, Card, StatCard, Alert } from '../../components/ui'
import { VISITAS } from '../../mocks/extra'
import { CLIENTES, PROSPECTOS, ZONAS } from '../../mocks'
import { useApp, usePermiso } from '../../context/AppContext'
import { guardarCatalogo } from '../../lib/catalogos'
import type { Visita, TipoVisita, EstadoVisita } from '../../mocks/extra'
import { clsx } from 'clsx'

const TIPO_CONFIG: Record<TipoVisita, { label: string; color: 'red' | 'blue' | 'green' | 'yellow'; dot: string }> = {
  cobranza:    { label: 'Cobranza',    color: 'red',    dot: 'bg-red-500'    },
  seguimiento: { label: 'Seguimiento', color: 'blue',   dot: 'bg-blue-500'   },
  prospecto:   { label: 'Prospecto',   color: 'green',  dot: 'bg-green-500'  },
  grupo:       { label: 'Grupo',       color: 'yellow', dot: 'bg-yellow-500' },
}

const ESTADO_CONFIG: Record<EstadoVisita, { label: string; icon: React.ReactNode; color: string }> = {
  pendiente:    { label: 'Pendiente',    icon: <Clock size={13}/>,       color: 'text-yellow-600' },
  realizada:    { label: 'Realizada',    icon: <CheckCircle2 size={13}/>,color: 'text-green-600'  },
  reprogramada: { label: 'Reprogramada',icon: <RefreshCw size={13}/>,   color: 'text-gray-500'   },
}

// Agrupar visitas por fecha
function agrupar(visitas: Visita[]): Record<string, Visita[]> {
  return visitas.reduce((acc, v) => {
    acc[v.fecha] = [...(acc[v.fecha] ?? []), v]
    return acc
  }, {} as Record<string, Visita[]>)
}

/** Fecha local YYYY-MM-DD (no UTC), con desplazamiento opcional en días. */
function fechaLocal(desplazamiento = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + desplazamiento)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const fechaLarga = (f: string) => new Date(`${f}T00:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

export default function TabVisitas() {
  const permiso = usePermiso('agenda')
  const { modo, usuario } = useApp()
  const [visitas, setVisitas] = useState<Visita[]>([...VISITAS])
  const [error, setError] = useState('')
  const [verPasadas, setVerPasadas] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<TipoVisita | 'todos'>('todos')
  const [mostrarFormNota, setMostrarFormNota] = useState<string | null>(null)
  const [nota, setNota] = useState('')
  const [mostrarNuevaVisita, setMostrarNuevaVisita] = useState(false)

  const hoy = fechaLocal()
  const FECHAS_LABELS: Record<string, string> = { [hoy]: 'Hoy', [fechaLocal(1)]: 'Mañana', [fechaLocal(-1)]: 'Ayer' }
  // Por defecto: pendientes de días anteriores + hoy en adelante
  const filtradas = visitas.filter(v =>
    (filtroTipo === 'todos' || v.tipo === filtroTipo) &&
    (verPasadas || v.fecha >= hoy || v.estado === 'pendiente'))
  const agrupadas = agrupar(filtradas)
  const fechas    = Object.keys(agrupadas).sort()

  const pendientesHoy  = visitas.filter(v => v.fecha === hoy && v.estado === 'pendiente').length
  const realizadasHoy  = visitas.filter(v => v.fecha === hoy && v.estado === 'realizada').length
  const cobranzasHoy   = visitas.filter(v => v.fecha === hoy && v.tipo === 'cobranza').length

  const marcarRealizada = async (id: string) => {
    if (!nota.trim()) return
    setError('')
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    try {
      await guardarCatalogo('visitas', { estado: 'realizada', nota: nota.trim() }, id)
      setVisitas([...VISITAS])
      setMostrarFormNota(null)
      setNota('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la visita')
    }
  }

  return (
    <div>
        <div className="flex justify-end mb-4">
          {permiso.editar && (<Button onClick={() => setMostrarNuevaVisita(true)}><Plus size={16}/>Nueva visita</Button>)}
        </div>

        {/* KPIs del día */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Pendientes hoy" value={String(pendientesHoy)} color="yellow" />
          <StatCard label="Realizadas hoy"  value={String(realizadasHoy)} color="green"  />
          <StatCard label="Cobranzas hoy"   value={String(cobranzasHoy)}  color="red"    />
        </div>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        {/* Alerta cobranzas urgentes */}
        {cobranzasHoy > 0 && (
          <Alert type="warning" className="mb-5">
            <AlertTriangle size={14} className="inline mr-1.5"/>
            Tienes {cobranzasHoy} visita{cobranzasHoy > 1 ? 's' : ''} de cobranza programada{cobranzasHoy > 1 ? 's' : ''} hoy. Prioriza estas primero.
          </Alert>
        )}

        {/* Filtros de tipo */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(['todos', 'cobranza', 'seguimiento', 'prospecto', 'grupo'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filtroTipo === t ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {t === 'todos' ? 'Todas' : TIPO_CONFIG[t as TipoVisita].label}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
            <input type="checkbox" checked={verPasadas} onChange={e => setVerPasadas(e.target.checked)} />
            Ver visitas pasadas ya cerradas
          </label>
        </div>

        {/* Visitas agrupadas por fecha */}
        <div className="space-y-6">
          {fechas.map(fecha => (
            <div key={fecha}>
              {/* Header de fecha */}
              <div className="flex items-center gap-3 mb-3">
                <Calendar size={15} className="text-brand-500"/>
                <h3 className="text-sm font-semibold text-gray-800">
                  {FECHAS_LABELS[fecha] ?? fechaLarga(fecha)}
                </h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {agrupadas[fecha].length} visitas
                </span>
              </div>

              {/* Cards de visitas */}
              <div className="space-y-3">
                {agrupadas[fecha]
                  .sort((a, b) => a.hora.localeCompare(b.hora))
                  .map(visita => {
                    const tipoCfg   = TIPO_CONFIG[visita.tipo]
                    const estadoCfg = ESTADO_CONFIG[visita.estado]
                    const formularioAbierto = mostrarFormNota === visita.id

                    return (
                      <Card
                        key={visita.id}
                        className={clsx(
                          'transition-all',
                          visita.estado === 'realizada' && 'opacity-70',
                          visita.tipo === 'cobranza' && visita.estado === 'pendiente' && 'border-red-200'
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Dot tipo */}
                              <div className="flex flex-col items-center gap-1 pt-1">
                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${tipoCfg.dot}`}/>
                                <div className="w-px flex-1 bg-gray-100" style={{ minHeight: '20px' }}/>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                                    <Clock size={11}/>{visita.hora}
                                  </span>
                                  <Badge color={tipoCfg.color}>{tipoCfg.label}</Badge>
                                  <span className={clsx('flex items-center gap-1 text-xs font-medium', estadoCfg.color)}>
                                    {estadoCfg.icon}{estadoCfg.label}
                                  </span>
                                </div>

                                <p className="text-sm font-semibold text-gray-900 truncate">{visita.cliente_nombre}</p>

                                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                  <MapPin size={11}/>{visita.zona}
                                </div>

                                <p className="text-xs text-gray-500 mt-1.5">{visita.motivo}</p>

                                {visita.nota && (
                                  <div className="mt-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                                    <p className="text-xs text-green-700 font-medium mb-0.5">Nota de visita:</p>
                                    <p className="text-xs text-green-600 italic">"{visita.nota}"</p>
                                  </div>
                                )}

                                {/* Formulario de nota inline */}
                                {formularioAbierto && (
                                  <div className="mt-3 space-y-2">
                                    <textarea
                                      rows={2}
                                      value={nota}
                                      onChange={e => setNota(e.target.value)}
                                      placeholder="Describe el resultado de la visita…"
                                      className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none resize-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={() => marcarRealizada(visita.id)} disabled={!nota.trim()}>
                                        <CheckCircle2 size={13}/>Confirmar visita
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => { setMostrarFormNota(null); setNota('') }}>
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Acciones */}
                            {visita.estado === 'pendiente' && !formularioAbierto && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-shrink-0"
                                onClick={() => setMostrarFormNota(visita.id)}
                              >
                                <CheckCircle2 size={13}/>Registrar
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Modal nueva visita */}
        {mostrarNuevaVisita && (
          <NuevaVisitaModal
            hoy={hoy}
            demo={modo !== 'google'}
            facilitadorId={usuario?.id ?? null}
            onClose={() => setMostrarNuevaVisita(false)}
            onSaved={() => { setVisitas([...VISITAS]); setMostrarNuevaVisita(false) }}
          />
        )}
    </div>
  )
}

// Modal nueva visita
function NuevaVisitaModal({ hoy, demo, facilitadorId, onClose, onSaved }: {
  hoy: string; demo: boolean; facilitadorId: string | null; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState({
    cliente_nombre: '', tipo: 'seguimiento' as TipoVisita,
    fecha: hoy, hora: '09:00', zona: ZONAS[0]?.nombre ?? '', motivo: '',
  })
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')
  // Nombres conocidos (clientes y prospectos) para vincular la visita
  const opciones = [
    ...CLIENTES.map(c => ({ nombre: c.nombre, cliente_id: c.id as string | null, zona: c.zona })),
    ...PROSPECTOS.filter(p => p.estado !== 'convertido').map(p => ({ nombre: p.nombre, cliente_id: null, zona: p.zona })),
  ]

  const guardar = async () => {
    if (!form.cliente_nombre || !form.motivo) return
    setErrorModal('')
    if (demo) { setErrorModal('En modo demo no se guardan cambios.'); return }
    setGuardando(true)
    try {
      const match = opciones.find(o => o.nombre.toLowerCase() === form.cliente_nombre.trim().toLowerCase())
      await guardarCatalogo('visitas', {
        cliente_id: match?.cliente_id ?? null,
        cliente_nombre: form.cliente_nombre.trim(),
        tipo: form.tipo, fecha: form.fecha, hora: form.hora, zona: form.zona,
        estado: 'pendiente', motivo: form.motivo.trim(), facilitador_id: facilitadorId,
      }, null, 'vis')
      setGuardado(true)
      setTimeout(onSaved, 700)
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : 'No se pudo agendar la visita')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Nueva visita de campo</h2>
        {guardado ? (
          <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Visita agendada.</Alert>
        ) : (
          <div className="space-y-4">
            {errorModal && <Alert type="error">{errorModal}</Alert>}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cliente / Prospecto</label>
              <input list="lista-contactos" value={form.cliente_nombre} onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                placeholder="Nombre del cliente" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500"/>
              <datalist id="lista-contactos">
                {opciones.map(o => <option key={`${o.cliente_id ?? 'p'}-${o.nombre}`} value={o.nombre} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as TipoVisita }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none bg-white focus:border-brand-500">
                  <option value="cobranza">Cobranza</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="prospecto">Prospecto</option>
                  <option value="grupo">Grupo solidario</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Zona</label>
                <select value={form.zona} onChange={e => setForm(f => ({ ...f, zona: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none bg-white focus:border-brand-500">
                  {ZONAS.map(z =>
                    <option key={z.id} value={z.nombre}>{z.nombre}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hora</label>
                <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500"/>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Motivo</label>
              <textarea rows={2} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Describe el objetivo de la visita…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none resize-none focus:border-brand-500"/>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1" onClick={guardar} loading={guardando} disabled={!form.cliente_nombre || !form.motivo}>
                <Plus size={15}/>Agendar visita
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
