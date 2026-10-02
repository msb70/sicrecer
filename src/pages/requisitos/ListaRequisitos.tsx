import { useState } from 'react'
import { Plus, Edit2, Trash2, ClipboardList, CheckCircle, XCircle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, Input, Alert } from '../../components/ui'
import { REQUISITOS } from '../../mocks'
import { guardarCatalogo, eliminarCatalogo } from '../../lib/catalogos'
import { useApp, usePermiso } from '../../context/AppContext'
import { TIPO_REQUISITO_LABELS, type Requisito, type TipoRequisito } from '../../types'

const EMPTY_FORM: { nombre: string; descripcion: string; obligatorio: boolean; tipo: TipoRequisito } = { nombre: '', descripcion: '', obligatorio: false, tipo: 'archivo' }

const AYUDA_TIPO: Record<TipoRequisito, string> = {
  archivo: 'El solicitante adjunta una imagen o PDF.',
  monto: 'El solicitante escribe un monto (p. ej. ingresos mensuales).',
  texto: 'El solicitante escribe un texto libre (p. ej. descripción del negocio).',
  documento_identidad: 'Se cubre con la foto del documento de identidad del perfil.',
  selfie: 'Se cubre con la selfie del perfil.',
}

const COLOR_TIPO: Record<TipoRequisito, string> = {
  archivo: 'bg-blue-50 text-blue-700', monto: 'bg-amber-50 text-amber-700', texto: 'bg-purple-50 text-purple-700',
  documento_identidad: 'bg-gray-100 text-gray-600', selfie: 'bg-gray-100 text-gray-600',
}

export default function ListaRequisitos() {
  const permiso = usePermiso('requisitos')
  const { modo: modoSesion } = useApp()
  const [items, setItems]       = useState<Requisito[]>([...REQUISITOS])
  const [error, setError]       = useState('')
  const [modo, setModo]         = useState<'idle' | 'nuevo' | 'editar'>('idle')
  const [editandoId, setEditId] = useState<string | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [confirmar, setConfirmar] = useState<string | null>(null)

  const reset = () => { setForm(EMPTY_FORM); setModo('idle'); setEditId(null) }

  const abrirNuevo = () => { setForm(EMPTY_FORM); setModo('nuevo'); setEditId(null) }

  const abrirEditar = (r: Requisito) => {
    setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '', obligatorio: r.obligatorio, tipo: r.tipo ?? 'archivo' })
    setEditId(r.id)
    setModo('editar')
  }

  const guardar = async () => {
    if (!form.nombre.trim()) return
    setError('')
    if (modoSesion !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    try {
      const fila = { nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null, obligatorio: form.obligatorio, tipo: form.tipo }
      await guardarCatalogo('requisitos', fila, modo === 'editar' ? editandoId : null, 'req')
      setItems([...REQUISITOS])
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    }
  }

  const eliminar = async (id: string) => {
    setError('')
    try {
      await eliminarCatalogo('requisitos', id)
      setItems([...REQUISITOS])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar')
    } finally {
      setConfirmar(null)
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Requisitos"
          subtitle="Documentos y condiciones exigidos en los productos crediticios"
          actions={permiso.editar && (<Button onClick={abrirNuevo}><Plus size={16}/>Nuevo requisito</Button>)}
        />

        {error && <Alert type="error" className="mb-4">{error}</Alert>}

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
                  placeholder="Lo verá el solicitante como ayuda"
                  value={form.descripcion}
                  onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Cómo lo cumple el solicitante?</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(p => ({ ...p, tipo: e.target.value as TipoRequisito }))}
                  className="w-full sm:w-80 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {(Object.keys(TIPO_REQUISITO_LABELS) as TipoRequisito[]).map(t => (
                    <option key={t} value={t}>{TIPO_REQUISITO_LABELS[t]}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{AYUDA_TIPO[form.tipo]}</p>
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
                  {['Nombre', 'Descripción', 'Se cumple con', 'Obligatoriedad', 'Acciones'].map(h => (
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR_TIPO[r.tipo ?? 'archivo']}`}>{TIPO_REQUISITO_LABELS[r.tipo ?? 'archivo']}</span>
                    </td>
                    <td className="px-4 py-3">
                      {r.obligatorio
                        ? <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium"><CheckCircle size={11}/>Obligatorio</span>
                        : <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full"><XCircle size={11}/>Opcional</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {permiso.editar && (<button
                          onClick={() => abrirEditar(r)}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14}/>
                        </button>)}
                        {confirmar === r.id ? (
                          <span className="flex items-center gap-1.5 text-xs text-red-600 ml-1">
                            ¿Eliminar?
                            <button onClick={() => eliminar(r.id)} className="font-semibold hover:underline">Sí</button>
                            <button onClick={() => setConfirmar(null)} className="text-gray-400 hover:underline">No</button>
                          </span>
                        ) : (
                          permiso.borrar && (<button
                            onClick={() => setConfirmar(r.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14}/>
                          </button>)
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
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR_TIPO[r.tipo ?? 'archivo']}`}>{TIPO_REQUISITO_LABELS[r.tipo ?? 'archivo']}</span>
                      {r.obligatorio
                        ? <span className="text-xs text-green-600 font-medium">Obligatorio</span>
                        : <span className="text-xs text-gray-400">Opcional</span>
                      }
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    {permiso.editar && (<button onClick={() => abrirEditar(r)} className="p-2 text-gray-400 hover:text-brand-600 rounded-lg"><Edit2 size={14}/></button>)}
                    {permiso.borrar && (<button onClick={() => setConfirmar(confirmar === r.id ? null : r.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>)}
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
              {permiso.editar && (<button onClick={abrirNuevo} className="mt-2 text-xs text-brand-600 hover:underline">Agregar el primero</button>)}
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
