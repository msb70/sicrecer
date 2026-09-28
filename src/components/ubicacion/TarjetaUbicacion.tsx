import { useState } from 'react'
import { MapPin, Pencil, Save } from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Alert } from '../ui'
import { SelectorUbicacion } from './SelectorUbicacion'
import { useApp } from '../../context/AppContext'
import { guardarCatalogo } from '../../lib/catalogos'
import { PAIS_LABELS, type Pais } from '../../types'
import { describirUbicacion, etiquetaLocalidad, validarUbicacion, type Ubicacion } from '../../lib/ubicaciones'

interface Props {
  tabla: 'clientes' | 'prospectos'
  id: string
  valor: Ubicacion
}

/** Muestra y permite editar país, ciudad, localidad y dirección. */
export function TarjetaUbicacion({ tabla, id, valor }: Props) {
  const { modo, organizacion } = useApp()
  const inicial = { pais: valor.pais ?? organizacion?.pais ?? 'CO', ciudad: valor.ciudad ?? '', localidad: valor.localidad ?? null, direccion: valor.direccion ?? '' }
  const [actual, setActual] = useState<Ubicacion>(inicial)
  const [form, setForm] = useState<Ubicacion>(inicial)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const sinDatos = !actual.ciudad

  const guardar = async () => {
    setError('')
    const e = validarUbicacion(form)
    if (e) { setError(e); return }
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    setGuardando(true)
    try {
      const fila = { pais: form.pais, ciudad: form.ciudad?.trim(), localidad: form.localidad || null, direccion: form.direccion?.trim() || null }
      await guardarCatalogo(tabla, fila, id)
      setActual(fila); setEditando(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la dirección')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Dirección</h2>
          {!editando && (
            <Button variant="ghost" size="sm" onClick={() => { setForm(actual); setEditando(true) }}>
              <Pencil size={14} />{sinDatos ? 'Registrar' : 'Editar'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {error && <Alert type="error" className="mb-3">{error}</Alert>}
        {editando ? (
          <div className="space-y-4">
            <SelectorUbicacion value={form} onChange={c => setForm(f => ({ ...f, ...c }))} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setEditando(false); setError('') }}>Cancelar</Button>
              <Button onClick={guardar} loading={guardando}><Save size={15} />Guardar</Button>
            </div>
          </div>
        ) : sinDatos ? (
          <Alert type="warning">Sin ciudad registrada. Los productos limitados a ciertas zonas no se le podrán ofrecer hasta registrarla.</Alert>
        ) : (
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-gray-900">{actual.direccion || 'Sin dirección'}</p>
              <p className="text-gray-600">
                {[actual.localidad ? etiquetaLocalidad(actual.localidad) : null, actual.ciudad, PAIS_LABELS[(actual.pais ?? 'CO') as Pais]].filter(Boolean).join(' · ')}
              </p>
              <p className="sr-only">{describirUbicacion(actual)}</p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
