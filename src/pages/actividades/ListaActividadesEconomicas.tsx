import { useState } from 'react'
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, Input } from '../../components/ui'
import { ACTIVIDADES_ECONOMICAS } from '../../mocks'
import type { ActividadEconomica } from '../../types'

const SECTORES = ['Comercio', 'Industria', 'Servicios', 'Transporte', 'Construcción', 'Agropecuario', 'Otro']

const SECTOR_COLOR: Record<string, string> = {
  Comercio:     'bg-blue-50 text-blue-700',
  Industria:    'bg-orange-50 text-orange-700',
  Servicios:    'bg-purple-50 text-purple-700',
  Transporte:   'bg-yellow-50 text-yellow-700',
  Construcción: 'bg-stone-50 text-stone-700',
  Agropecuario: 'bg-green-50 text-green-700',
  Otro:         'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = { nombre: '', descripcion: '', sector: 'Comercio' }

export default function ListaActividadesEconomicas() {
  const [items, setItems]       = useState<ActividadEconomica[]>(ACTIVIDADES_ECONOMICAS)
  const [modo, setModo]         = useState<'idle' | 'nuevo' | 'editar'>('idle')
  const [editandoId, setEditId] = useState<string | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [filtroSector, setFiltroSector] = useState<string>('todos')

  const reset = () => { setForm(EMPTY_FORM); setModo('idle'); setEditId(null) }

  const abrirNuevo = () => { setForm(EMPTY_FORM); setModo('nuevo'); setEditId(null) }

  const abrirEditar = (a: ActividadEconomica) => {
    setForm({ nombre: a.nombre, descripcion: a.descripcion, sector: a.sector })
    setEditId(a.id)
    setModo('editar')
  }

  const guardar = () => {
    if (!form.nombre.trim()) return
    if (modo === 'nuevo') {
      setItems(prev => [...prev, { id: `act-${Date.now()}`, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), sector: form.sector }])
    } else if (editandoId) {
      setItems(prev => prev.map(a => a.id === editandoId ? { ...a, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), sector: form.sector } : a))
    }
    reset()
  }

  const eliminar = (id: string) => { setItems(prev => prev.filter(a => a.id !== id)); setConfirmar(null) }

  const filtrados = filtroSector === 'todos' ? items : items.filter(a => a.sector === filtroSector)
  const sectoresPresentes = ['todos', ...Array.from(new Set(items.map(a => a.sector)))]

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Actividades Económicas"
          subtitle="Rubros productivos asociables a los productos crediticios"
          actions={<Button onClick={abrirNuevo}><Plus size={16}/>Nueva actividad</Button>}
        />

        {/* Panel de creación / edición */}
        {modo !== 'idle' && (
          <Card className="mb-5 border-brand-200 bg-brand-50">
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-brand-800">
                {modo === 'nuevo' ? 'Nueva actividad económica' : 'Editar actividad económica'}
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Nombre"
                  placeholder="Ej: Venta de abarrotes"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required
                />
                <Input
                  label="Descripción"
                  placeholder="Descripción breve de la actividad"
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Sector</label>
                  <select
                    value={form.sector}
                    onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={guardar} disabled={!form.nombre.trim()}>Guardar</Button>
                <Button variant="ghost" onClick={reset}>Cancelar</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Filtro de sector */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {sectoresPresentes.map(s => (
            <button
              key={s}
              onClick={() => setFiltroSector(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtroSector === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === 'todos' ? 'Todos' : s}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <Card>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Descripción', 'Sector', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{a.descripcion || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SECTOR_COLOR[a.sector] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditar(a)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14}/>
                        </button>
                        {confirmar === a.id ? (
                          <span className="flex items-center gap-1.5 text-xs text-red-600 ml-1">
                            ¿Eliminar?
                            <button onClick={() => eliminar(a.id)} className="font-semibold hover:underline">Sí</button>
                            <button onClick={() => setConfirmar(null)} className="text-gray-400 hover:underline">No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmar(a.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtrados.map(a => (
              <div key={a.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{a.nombre}</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${SECTOR_COLOR[a.sector] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.sector}
                      </span>
                    </div>
                    {a.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{a.descripcion}</p>}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => abrirEditar(a)} className="p-2 text-gray-400 hover:text-brand-600 rounded-lg"><Edit2 size={14}/></button>
                    <button onClick={() => setConfirmar(confirmar === a.id ? null : a.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                </div>
                {confirmar === a.id && (
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => eliminar(a.id)} className="text-xs text-red-600 font-semibold">Confirmar eliminación</button>
                    <button onClick={() => setConfirmar(null)} className="text-xs text-gray-400">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12">
              <Briefcase size={36} className="mx-auto text-gray-200 mb-3"/>
              <p className="text-gray-400 text-sm">No hay actividades económicas configuradas</p>
              {filtroSector !== 'todos' && (
                <button onClick={() => setFiltroSector('todos')} className="mt-1 text-xs text-brand-600 hover:underline">Ver todas</button>
              )}
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
