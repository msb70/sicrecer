import { useState } from 'react'
import { Plus, Edit2, Trash2, ClipboardList, CheckCircle, XCircle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, Input } from '../../components/ui'
import { REQUISITOS } from '../../mocks'
import type { Requisito } from '../../types'

const EMPTY_FORM = { nombre: '', descripcion: '', obligatorio: false }

export default function ListaRequisitos() {
  const [items, setItems]       = useState<Requisito[]>(REQUISITOS)
  const [modo, setModo]         = useState<'idle' | 'nuevo' | 'editar'>('idle')
  const [editandoId, setEditId] = useState<string | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [confirmar, setConfirmar] = useState<string | null>(null)

  const reset = () => { setForm(EMPTY_FORM); setModo('idle'); setEditId(null) }

  const abrirNuevo = () => { setForm(EMPTY_FORM); setModo('nuevo'); setEditId(null) }

  const abrirEditar = (r: Requisito) => {
    setForm({ nombre: r.nombre, descripcion: r.descripcion, obligatorio: r.obligatorio })
    setEditId(r.id)
    setModo('editar')
  }

  const guardar = () => {
    if (!form.nombre.trim()) return
    if (modo === 'nuevo') {
      setItems(prev => [...prev, { id: `req-${Date.now()}`, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), obligatorio: form.obligatorio }])
    } else if (editandoId) {
      setItems(prev => prev.map(r => r.id === editandoId ? { ...r, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), obligatorio: form.obligatorio } : r))
    }
    reset()
  }

  const eliminar = (id: string) => { setItems(prev => prev.filter(r => r.id !== id)); setConfirmar(null) }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Requisitos"
          subtitle="Documentos y condiciones exigidos en los productos crediticios"
          actions={<Button onClick={abrirNuevo}><Plus size={16}/>Nuevo requisito</Button>}
        />

        {/* Panel de creación / edición */}
        {modo !== 'idle' && (
          <Card className="mb-5 border-brand-200 bg-brand-50">
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-brand-800">
                {modo === 'nuevo' ? 'Nuevo requisito' : 'Editar requisito'}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  placeholder="Ej: Cédula de ciudadanía"
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  required
                />
                <Input
                  label="Descripción"
                  placeholder="Detalle adicional del requisito"
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.obligatorio}
                  onChange={e => setForm(p => ({ ...p, obligatorio: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Obligatorio</span>
              </label>
              <div className="flex gap-2">
                <Button onClick={guardar} disabled={!form.nombre.trim()}>Guardar</Button>
                <Button variant="ghost" onClick={reset}>Cancelar</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tabla */}
        <Card>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nombre', 'Descripción', 'Tipo', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{r.descripcion || '—'}</td>
                    <td className="px-4 py-3">
                      {r.obligatorio
                        ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium"><CheckCircle size={11}/>Obligatorio</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle size={11}/>Opcional</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditar(r)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14}/>
                        </button>
                        {confirmar === r.id ? (
                          <span className="flex items-center gap-1.5 text-xs text-red-600 ml-1">
                            ¿Eliminar?
                            <button onClick={() => eliminar(r.id)} className="font-semibold hover:underline">Sí</button>
                            <button onClick={() => setConfirmar(null)} className="text-gray-400 hover:underline">No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmar(r.id)}
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
            {items.map(r => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{r.nombre}</p>
                    {r.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.descripcion}</p>}
                    <div className="mt-1.5">
                      {r.obligatorio
                        ? <span className="text-xs text-green-600 font-medium">Obligatorio</span>
                        : <span className="text-xs text-gray-400">Opcional</span>
                      }
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => abrirEditar(r)} className="p-2 text-gray-400 hover:text-brand-600 rounded-lg"><Edit2 size={14}/></button>
                    <button onClick={() => setConfirmar(confirmar === r.id ? null : r.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                </div>
                {confirmar === r.id && (
                  <div className="mt-2 flex gap-3">
                    <button onClick={() => eliminar(r.id)} className="text-xs text-red-600 font-semibold">Confirmar eliminación</button>
                    <button onClick={() => setConfirmar(null)} className="text-xs text-gray-400">Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList size={36} className="mx-auto text-gray-200 mb-3"/>
              <p className="text-gray-400 text-sm">No hay requisitos configurados</p>
              <button onClick={abrirNuevo} className="mt-2 text-xs text-brand-600 hover:underline">Agregar el primero</button>
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
