import { useState } from 'react'
import { Landmark, Plus, Pencil, Trash2, Save, X, Check } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Card, CardBody, EmptyState, Badge } from '../../components/ui'
import { BANCOS as BANCOS_MOCK } from '../../mocks'
import type { Banco } from '../../types'

// mutable store para la demo
const bancosStore: Banco[] = [...BANCOS_MOCK]
let nextId = 100

export default function ListaBancos() {
  const [bancos, setBancos] = useState<Banco[]>([...bancosStore])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nombre: '', activo: true })
  const [confirmarEliminar, setConfirmarEliminar] = useState<string | null>(null)

  const abrirNuevo = () => {
    setEditId(null)
    setForm({ nombre: '', activo: true })
    setPanelOpen(true)
  }

  const abrirEditar = (b: Banco) => {
    setEditId(b.id)
    setForm({ nombre: b.nombre, activo: b.activo })
    setPanelOpen(true)
  }

  const guardar = () => {
    if (!form.nombre.trim()) return
    if (editId) {
      const updated = bancos.map(b => b.id === editId ? { ...b, ...form } : b)
      setBancos(updated)
      bancosStore.splice(0, bancosStore.length, ...updated)
    } else {
      const nuevo: Banco = { id: `ban-${++nextId}`, nombre: form.nombre.trim(), activo: form.activo }
      const updated = [...bancos, nuevo]
      setBancos(updated)
      bancosStore.push(nuevo)
    }
    setPanelOpen(false)
    setEditId(null)
  }

  const eliminar = (id: string) => {
    const updated = bancos.filter(b => b.id !== id)
    setBancos(updated)
    bancosStore.splice(0, bancosStore.length, ...updated)
    setConfirmarEliminar(null)
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Bancos"
          subtitle={`${bancos.length} bancos registrados · Catálogo usado en cobranza`}
          actions={
            <Button onClick={abrirNuevo}><Plus size={16} />Nuevo banco</Button>
          }
        />

        {/* Panel crear / editar */}
        {panelOpen && (
          <Card className="mb-5 border-brand-200 bg-brand-50/30">
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">
                  {editId ? 'Editar banco' : 'Nuevo banco'}
                </h3>
                <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                  <X size={16} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 items-end">
                <Input
                  label="Nombre del banco *"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Bancolombia"
                  autoFocus
                />
                <div className="flex items-center gap-3 pb-1">
                  <input
                    type="checkbox"
                    id="activo-check"
                    checked={form.activo}
                    onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
                    className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <label htmlFor="activo-check" className="text-sm font-medium text-gray-700">
                    Banco activo
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="secondary" size="sm" onClick={() => setPanelOpen(false)}>
                  <X size={14} />Cancelar
                </Button>
                <Button size="sm" onClick={guardar} disabled={!form.nombre.trim()}>
                  <Save size={14} />{editId ? 'Guardar cambios' : 'Crear banco'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          {bancos.length === 0 ? (
            <EmptyState
              icon={<Landmark size={40} />}
              title="Sin bancos registrados"
              action={<Button onClick={abrirNuevo}><Plus size={16} />Nuevo banco</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bancos.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Landmark size={14} className="text-gray-500" />
                          </div>
                          <span className="font-medium text-gray-900">{b.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={b.activo ? 'green' : 'gray'}>
                          {b.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {confirmarEliminar === b.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 mr-1">¿Eliminar?</span>
                            <button
                              onClick={() => eliminar(b.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setConfirmarEliminar(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => abrirEditar(b)}
                              className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmarEliminar(b.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
