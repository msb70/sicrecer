import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { PROSPECTOS, CLIENTES, ACTIVIDADES_ECONOMICAS } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { guardarCatalogo } from '../../lib/catalogos'
import { SelectorUbicacion } from '../../components/ubicacion/SelectorUbicacion'
import { validarUbicacion, type Ubicacion } from '../../lib/ubicaciones'

/**
 * Convierte un prospecto en cliente: crea la ficha en `clientes` y marca el
 * prospecto como "convertido". Si no viene prospecto, crea un cliente nuevo.
 */
export default function ConvertirProspecto() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { modo, usuario, organizacion } = useApp()
  const prospecto = PROSPECTOS.find(p => p.id === params.get('prospecto'))

  const [form, setForm] = useState({
    nombre: prospecto?.nombre ?? '',
    documento: prospecto?.documento ?? '',
    telefono: prospecto?.telefono ?? '',
    genero: prospecto?.sexo === 'M' || prospecto?.sexo === 'F' ? prospecto.sexo : '',
    fecha_nacimiento: '',
    actividad_economica: '',
    zona: prospecto?.zona ?? '',
  })
  const [ubic, setUbic] = useState<Ubicacion>({
    pais: prospecto?.pais ?? organizacion?.pais ?? 'CO', ciudad: prospecto?.ciudad ?? '',
    localidad: prospecto?.localidad ?? null, direccion: prospecto?.direccion ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const campo = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    setError('')
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    const doc = form.documento.trim()
    const existente = CLIENTES.find(c => c.documento === doc)
    if (existente) { setError(`Ya existe un cliente con el documento ${doc}: ${existente.nombre}`); return }
    const errUbic = validarUbicacion(ubic)
    if (errUbic) { setError(errUbic); return }
    setGuardando(true)
    try {
      const idCliente = await guardarCatalogo('clientes', {
        nombre: form.nombre.trim(),
        documento: doc,
        telefono: form.telefono.trim() || null,
        genero: form.genero || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        actividad_economica: form.actividad_economica || null,
        zona: form.zona || null,
        pais: ubic.pais, ciudad: ubic.ciudad?.trim(), localidad: ubic.localidad || null, direccion: ubic.direccion?.trim() || null,
        estado: 'activo',
        facilitador_id: prospecto?.facilitador_id ?? usuario?.id ?? null,
      }, null, 'cli')
      if (prospecto) await guardarCatalogo('prospectos', { estado: 'convertido' }, prospecto.id)
      navigate(`/clientes/${idCliente}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={prospecto ? 'Convertir prospecto a cliente' : 'Nuevo cliente'}
          subtitle={prospecto ? prospecto.nombre : 'Registra un cliente'}
          actions={<Button variant="ghost" onClick={() => navigate(prospecto ? `/prospectos/${prospecto.id}` : '/clientes')}><ArrowLeft size={16} />Volver</Button>}
        />
        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        <div className="max-w-xl">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del cliente</h2></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Nombre completo" value={form.nombre} onChange={e => campo('nombre', e.target.value)} required />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Documento" value={form.documento} onChange={e => campo('documento', e.target.value)} required />
                <Input label="Teléfono" value={form.telefono} onChange={e => campo('telefono', e.target.value)} />
                <Select label="Género" value={form.genero} onChange={e => campo('genero', e.target.value)}
                  options={[{ value: '', label: 'Sin especificar' }, { value: 'F', label: 'Femenino' }, { value: 'M', label: 'Masculino' }]} />
                <Input label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={e => campo('fecha_nacimiento', e.target.value)} />
              </div>
              <Select label="Actividad económica" value={form.actividad_economica} onChange={e => campo('actividad_economica', e.target.value)}
                options={[{ value: '', label: 'Selecciona…' }, ...ACTIVIDADES_ECONOMICAS.map(a => ({ value: a.nombre, label: `${a.nombre} (${a.sector})` }))]} />
              <Input label="Zona" value={form.zona} onChange={e => campo('zona', e.target.value)} />
              <SelectorUbicacion value={ubic} onChange={c => setUbic(u => ({ ...u, ...c }))} />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
                <Button onClick={guardar} loading={guardando} disabled={!form.nombre.trim() || !form.documento.trim()}>
                  <UserPlus size={16} />{prospecto ? 'Convertir en cliente' : 'Crear cliente'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    </Shell>
  )
}
