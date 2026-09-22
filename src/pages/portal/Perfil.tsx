import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Save, AlertCircle, ShieldCheck } from 'lucide-react'
import { PortalShell } from '../../components/portal/PortalShell'
import { CapturaFoto } from '../../components/portal/CapturaFoto'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import {
  guardarSolicitante, cargarActividades, listarFotos, obtenerFoto, subirFoto,
  type SolicitanteInput,
} from '../../lib/portal'
import { PAIS_LABELS, type ActividadEconomica, type Pais } from '../../types'

const TIPOS_DOC: Record<Pais, { value: string; label: string }[]> = {
  CO: [
    { value: 'cedula', label: 'Cédula de ciudadanía' },
    { value: 'cedula_extranjeria', label: 'Cédula de extranjería' },
    { value: 'pasaporte', label: 'Pasaporte' },
  ],
  VE: [
    { value: 'cedula', label: 'Cédula de identidad' },
    { value: 'pasaporte', label: 'Pasaporte' },
  ],
}

export default function Perfil() {
  const navigate = useNavigate()
  const { solicitante, setSolicitante, emailSesion, emailVerificado } = useApp()
  const esNuevo = !solicitante
  const bloqueado = solicitante?.estado === 'cliente'

  const [actividades, setActividades] = useState<ActividadEconomica[]>([])
  const [form, setForm] = useState({
    nombre: solicitante?.nombre ?? '',
    pais: (solicitante?.pais ?? 'CO') as Pais,
    tipo_documento: solicitante?.tipo_documento ?? 'cedula',
    documento: solicitante?.documento ?? '',
    fecha_nacimiento: solicitante?.fecha_nacimiento ?? '',
    genero: (solicitante?.genero ?? '') as '' | 'M' | 'F' | 'otro',
    telefono: solicitante?.telefono ?? '',
    ciudad: solicitante?.ciudad ?? '',
    direccion: solicitante?.direccion ?? '',
    actividad_economica_id: solicitante?.actividad_economica_id ?? '',
  })
  const [fotos, setFotos] = useState<{ documento?: string | null; selfie?: string | null }>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    cargarActividades().then(setActividades).catch(() => setActividades([]))
  }, [])

  useEffect(() => {
    if (!solicitante) return
    listarFotos(solicitante.id).then(async lista => {
      const doc = lista.some(f => f.tipo === 'documento') ? await obtenerFoto(solicitante.id, 'documento') : null
      const selfie = lista.some(f => f.tipo === 'selfie') ? await obtenerFoto(solicitante.id, 'selfie') : null
      setFotos({ documento: doc, selfie })
    }).catch(() => {})
  }, [solicitante?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    setError(''); setOk('')
    if (!emailVerificado) { setError('Confirma tu correo antes de guardar el perfil.'); return }
    if (!form.nombre.trim() || !form.documento.trim() || !form.telefono.trim()) {
      setError('Nombre, documento y teléfono son obligatorios'); return
    }
    if (!form.actividad_economica_id) { setError('Selecciona tu actividad económica'); return }
    setGuardando(true)
    try {
      const input: SolicitanteInput = {
        email: emailSesion,
        nombre: form.nombre.trim(),
        pais: form.pais,
        tipo_documento: form.tipo_documento,
        documento: form.documento.trim(),
        fecha_nacimiento: form.fecha_nacimiento || null,
        genero: form.genero || null,
        telefono: form.telefono.trim(),
        ciudad: form.ciudad.trim() || null,
        direccion: form.direccion.trim() || null,
        actividad_economica_id: form.actividad_economica_id,
      }
      const s = await guardarSolicitante(input, solicitante?.id)
      setSolicitante(s)
      setOk(esNuevo ? 'Perfil creado. Ahora sube tus fotos.' : 'Perfil actualizado.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar'
      setError(msg.includes('ux_solicitantes_doc') ? 'Ya existe una cuenta con ese documento.' : msg)
    } finally {
      setGuardando(false)
    }
  }

  const subir = (tipo: 'documento' | 'selfie') => async (dataUrl: string) => {
    if (!solicitante) throw new Error('Primero guarda tus datos')
    await subirFoto(solicitante.id, tipo, dataUrl)
    setFotos(f => ({ ...f, [tipo]: dataUrl }))
  }

  const completo = Boolean(solicitante && fotos.documento && fotos.selfie)

  return (
    <PortalShell
      titulo={esNuevo ? 'Completa tu perfil' : 'Mi perfil'}
      subtitulo={esNuevo ? 'Necesitamos tus datos y dos fotos antes de crear una solicitud' : emailSesion}
      acciones={completo ? <Button onClick={() => navigate('/portal/nueva')}>Nueva solicitud</Button> : undefined}
    >
      {!emailVerificado && (
        <Alert type="warning" className="mb-4">
          Tu correo aún no está verificado: no podrás guardar tu perfil hasta confirmarlo.{' '}
          <Link to={`/verificar?email=${encodeURIComponent(emailSesion)}`} className="underline font-medium">Ingresar el código</Link>
        </Alert>
      )}
      {bloqueado && (
        <Alert type="info" className="mb-4">Ya eres cliente. Los datos de identidad los gestiona tu facilitador.</Alert>
      )}
      {error && <Alert type="error" className="mb-4"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></Alert>}
      {ok && <Alert type="success" className="mb-4">{ok}</Alert>}

      <Card className="mb-5">
        <CardHeader><h2 className="text-sm font-semibold text-gray-800">1. Datos personales</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="País" value={form.pais} disabled={!esNuevo}
              onChange={e => { set('pais', e.target.value); set('tipo_documento', 'cedula') }}
              options={(Object.keys(PAIS_LABELS) as Pais[]).map(p => ({ value: p, label: PAIS_LABELS[p] }))} />
            <Input label="Nombre completo" value={form.nombre} onChange={e => set('nombre', e.target.value)} disabled={bloqueado} />
            <Select label="Tipo de documento" value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)} options={TIPOS_DOC[form.pais]} disabled={bloqueado} />
            <Input label="Número de documento" value={form.documento} onChange={e => set('documento', e.target.value)} disabled={bloqueado} />
            <Input label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} disabled={bloqueado} />
            <Select label="Género" value={form.genero} onChange={e => set('genero', e.target.value)} disabled={bloqueado}
              options={[{ value: '', label: 'Prefiero no decir' }, { value: 'F', label: 'Femenino' }, { value: 'M', label: 'Masculino' }, { value: 'otro', label: 'Otro' }]} />
            <Input label="Teléfono / WhatsApp" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+57 300 000 0000" />
            <Input label="Ciudad" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Dirección" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Select label="Actividad económica" value={form.actividad_economica_id} onChange={e => set('actividad_economica_id', e.target.value)} disabled={bloqueado}
                options={[{ value: '', label: 'Selecciona…' }, ...actividades.map(a => ({ value: a.id, label: a.nombre }))]} />
            </div>
          </div>
          {!bloqueado && (
            <div className="flex justify-end">
              <Button onClick={guardar} loading={guardando}><Save size={16} /> {esNuevo ? 'Guardar y continuar' : 'Guardar cambios'}</Button>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">2. Verificación de identidad</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {!solicitante && <p className="text-sm text-gray-500">Guarda primero tus datos para habilitar la carga de fotos.</p>}
          <div className={!solicitante ? 'opacity-50 pointer-events-none space-y-3' : 'space-y-3'}>
            <CapturaFoto
              titulo="Documento de identidad"
              descripcion="Foto nítida del frente de tu documento. Obligatoria."
              camara="environment"
              valorActual={fotos.documento}
              onCapturada={subir('documento')}
            />
            <CapturaFoto
              titulo="Foto de verificación (selfie)"
              descripcion="Tómate una foto con la cámara, rostro descubierto y buena luz. Obligatoria."
              camara="user"
              soloCamara
              valorActual={fotos.selfie}
              onCapturada={subir('selfie')}
            />
          </div>
          {completo && (
            <Alert type="success">Tu perfil está completo. Ya puedes crear una solicitud.</Alert>
          )}
        </CardBody>
      </Card>
    </PortalShell>
  )
}
