import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { COMITES, COMITE_MIEMBROS, PRODUCTOS, USUARIOS, recargarTablas } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { neon } from '../../lib/neon'
import { ROL_LABELS } from '../../types'

export default function FormComite() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { organizacion } = useApp()
  const comite = id ? COMITES.find(c => c.id === id) : undefined
  const esEdicion = Boolean(comite)

  const [nombre, setNombre] = useState(comite?.nombre ?? '')
  const [productoId, setProductoId] = useState(comite?.producto_id ?? (PRODUCTOS[0]?.id ?? ''))
  const [activo, setActivo] = useState(comite?.activo ?? true)
  const [miembros, setMiembros] = useState<string[]>(COMITE_MIEMBROS.filter(m => m.comite_id === id).map(m => m.usuario_id))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const candidatos = USUARIOS.filter(u => ['comite', 'coordinador', 'administrador'].includes(u.rol))
  const toggle = (uid: string) => setMiembros(m => m.includes(uid) ? m.filter(x => x !== uid) : [...m, uid])

  const guardar = async () => {
    setError('')
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (miembros.length === 0) { setError('Asigna al menos un miembro'); return }
    setGuardando(true)
    try {
      let comiteId = comite?.id
      if (esEdicion && comiteId) {
        const { error } = await neon.from('comites').update({ nombre: nombre.trim(), producto_id: productoId, activo }).eq('id', comiteId)
        if (error) throw new Error(error.message)
        const { error: e2 } = await neon.from('comite_miembros').delete().eq('comite_id', comiteId)
        if (e2) throw new Error(e2.message)
      } else {
        const { data, error } = await neon.from('comites').insert({ nombre: nombre.trim(), producto_id: productoId, organizacion_id: organizacion.id, activo }).select('id')
        if (error) throw new Error(error.message)
        comiteId = (data![0] as { id: string }).id
      }
      const { error: e3 } = await neon.from('comite_miembros').insert(miembros.map(usuario_id => ({ comite_id: comiteId, usuario_id })))
      if (e3) throw new Error(e3.message)
      await recargarTablas('comites', 'comite_miembros')
      navigate('/comites')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar'
      setError(msg.includes('ux_comite_activo_producto') ? 'Ese producto ya tiene un comité activo. Desactívalo primero.' : msg)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={esEdicion ? 'Editar comité' : 'Nuevo comité'}
          actions={<Button variant="ghost" onClick={() => navigate('/comites')}><ArrowLeft size={16} /> Volver</Button>}
        />
        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del comité</h2></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Comité Microcrédito Rural" />
              <Select label="Producto" value={productoId} onChange={e => setProductoId(e.target.value)}
                options={PRODUCTOS.map(p => ({ value: p.id, label: p.nombre }))} />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="w-4 h-4" />
                Comité activo (solo puede haber uno por producto)
              </label>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Miembros ({miembros.length})</h2></CardHeader>
            <CardBody className="space-y-2">
              <p className="text-xs text-gray-500">Las decisiones se toman por mayoría simple de los miembros. Reciben un email por cada solicitud nueva.</p>
              {candidatos.length === 0 && <p className="text-sm text-gray-500">No hay usuarios con rol comité, coordinador o administrador.</p>}
              {candidatos.map(u => (
                <label key={u.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer ${miembros.includes(u.id) ? 'bg-brand-50 border-brand-300' : 'border-gray-200'}`}>
                  <input type="checkbox" className="w-4 h-4" checked={miembros.includes(u.id)} onChange={() => toggle(u.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.nombre}</p>
                    <p className="text-xs text-gray-500">{u.email} · {ROL_LABELS[u.rol]}</p>
                  </div>
                </label>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate('/comites')}>Cancelar</Button>
          <Button onClick={guardar} loading={guardando}><Save size={16} /> {esEdicion ? 'Guardar cambios' : 'Crear comité'}</Button>
        </div>
      </PageContainer>
    </Shell>
  )
}
