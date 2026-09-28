import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, Save, ArrowLeft } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Alert, Card, CardBody, CardHeader } from '../../components/ui'
import { SelectorUbicacion } from '../../components/ubicacion/SelectorUbicacion'
import { validarUbicacion, type Ubicacion } from '../../lib/ubicaciones'
import { PROSPECTOS } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { guardarCatalogo } from '../../lib/catalogos'

export default function FormProspecto() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const prospecto = isEditing ? PROSPECTOS.find(p => p.id === id) : null

  const { organizacion } = useApp()
  const [form, setForm] = useState({
    nombre:          prospecto?.nombre          ?? '',
    documento:       prospecto?.documento       ?? '',
    telefono:        prospecto?.telefono        ?? '',
    email:           prospecto?.email           ?? '',
    sexo:            prospecto?.sexo            ?? '',
    zona:            prospecto?.zona            ?? 'Zona Norte',
    pais:            prospecto?.pais            ?? organizacion?.pais ?? 'CO',
    ciudad:          prospecto?.ciudad          ?? '',
    localidad:       prospecto?.localidad       ?? '',
    direccion:       prospecto?.direccion       ?? '',
    estado:          prospecto?.estado          ?? 'nuevo',
    canal_preferido: prospecto?.canal_preferido ?? '',
    canal_captacion: prospecto?.canal_captacion ?? '',
    lat:             prospecto?.lat != null ? String(prospecto.lat) : '',
    lng:             prospecto?.lng != null ? String(prospecto.lng) : '',
    nota:            '',
  })
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')
  const { modo, usuario } = useApp()

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    const lat = form.lat.trim() ? Number(form.lat) : null
    const lng = form.lng.trim() ? Number(form.lng) : null
    if ((lat !== null && Number.isNaN(lat)) || (lng !== null && Number.isNaN(lng))) { setError('Coordenadas GPS inválidas'); return }
    const errUbic = validarUbicacion(form)
    if (errUbic) { setError(errUbic); return }
    setLoading(true)
    try {
      const fila = {
        nombre: form.nombre.trim(),
        documento: form.documento.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        sexo: form.sexo || null,
        zona: form.zona || null,
        pais: form.pais,
        ciudad: form.ciudad.trim(),
        localidad: form.localidad || null,
        direccion: form.direccion.trim() || null,
        estado: form.estado,
        canal_preferido: form.canal_preferido || null,
        canal_captacion: form.canal_captacion || null,
        lat, lng,
      }
      const pid = await guardarCatalogo('prospectos',
        isEditing ? fila : { ...fila, facilitador_id: usuario?.id ?? null, fecha_registro: new Date().toISOString().slice(0, 10) },
        isEditing ? id : null, 'pro')
      // La nota inicial se guarda como actividad del CRM
      if (form.nota.trim()) {
        await guardarCatalogo('actividades_crm', {
          prospecto_id: pid, tipo: 'nota', fecha: new Date().toISOString().slice(0, 10),
          descripcion: form.nota.trim(), facilitador_id: usuario?.id ?? null,
        }, null, 'acrm')
      }
      setExito(true)
      setTimeout(() => navigate(`/prospectos/${pid}`), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el prospecto')
    } finally {
      setLoading(false)
    }
  }

  const usarUbicacion = () => {
    if (!navigator.geolocation) { setError('Este dispositivo no permite obtener la ubicación'); return }
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => setError('No se pudo obtener la ubicación (permiso denegado o sin señal)'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={isEditing ? 'Editar prospecto' : 'Nuevo prospecto'}
          subtitle={isEditing ? prospecto?.nombre : 'Completa los datos del prospecto'}
          actions={
            <Button variant="ghost" onClick={() => navigate('/prospectos')}>
              <ArrowLeft size={16} /> Volver
            </Button>
          }
        />

        {exito && <Alert type="success">Prospecto guardado correctamente. Redirigiendo…</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Datos personales */}
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-800">Datos personales</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="Nombre completo *"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Ej. María García"
                  required
                />
                <Input
                  label="Número de documento *"
                  value={form.documento}
                  onChange={e => set('documento', e.target.value)}
                  placeholder="Cédula / RIF / Pasaporte"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Teléfono"
                    value={form.telefono}
                    onChange={e => set('telefono', e.target.value)}
                    placeholder="Ej. 3001234567"
                    type="tel"
                  />
                  <Input
                    label="Email"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                    type="email"
                  />
                </div>
                <Select
                  label="Sexo"
                  value={form.sexo}
                  onChange={e => set('sexo', e.target.value)}
                >
                  <option value="">— Sin especificar —</option>
                  <option value="F">Femenino</option>
                  <option value="M">Masculino</option>
                  <option value="otro">Otro</option>
                </Select>
                <Select
                  label="Estado"
                  value={form.estado}
                  onChange={e => set('estado', e.target.value)}
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="contactado">Contactado</option>
                  <option value="convertido">Convertido</option>
                  <option value="descartado">Descartado</option>
                </Select>
              </CardBody>
            </Card>

            {/* Canal y ubicación */}
            <div className="space-y-5">
              {/* Canal CRM */}
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-gray-800">Canal de contacto</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <Select
                    label="Canal preferido de contacto"
                    value={form.canal_preferido}
                    onChange={e => set('canal_preferido', e.target.value)}
                  >
                    <option value="">— Sin especificar —</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="llamada">Llamada telefónica</option>
                    <option value="email">Email</option>
                    <option value="visita">Visita presencial</option>
                  </Select>
                  <Select
                    label="Canal de captación"
                    value={form.canal_captacion}
                    onChange={e => set('canal_captacion', e.target.value)}
                  >
                    <option value="">— Sin especificar —</option>
                    <option value="referido">Referido por cliente</option>
                    <option value="redes_sociales">Redes sociales</option>
                    <option value="portal">Portal web</option>
                    <option value="evento">Evento / feria</option>
                    <option value="visita_facilitador">Visita del facilitador</option>
                    <option value="otro">Otro</option>
                  </Select>
                </CardBody>
              </Card>

              {/* Ubicación */}
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-gray-800">Ubicación</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <SelectorUbicacion
                    value={form}
                    onChange={(c: Partial<Ubicacion>) => setForm(f => ({ ...f, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ''])) }))}
                  />
                  <Select
                    label="Zona asignada"
                    value={form.zona}
                    onChange={e => set('zona', e.target.value)}
                  >
                    <option>Zona Norte</option>
                    <option>Zona Sur</option>
                    <option>Zona Centro</option>
                    <option>Zona Oriente</option>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Latitud (GPS)" value={form.lat} onChange={e => set('lat', e.target.value)} />
                    <Input label="Longitud (GPS)" value={form.lng} onChange={e => set('lng', e.target.value)} />
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={usarUbicacion}>
                    <MapPin size={14} />Usar mi ubicación actual
                  </Button>
                  <Input
                    label="Nota de visita"
                    value={form.nota}
                    onChange={e => set('nota', e.target.value)}
                    placeholder="Observaciones del primer contacto…"
                  />
                </CardBody>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/prospectos')}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!form.nombre || !form.documento}>
              <Save size={16} /> {isEditing ? 'Guardar cambios' : 'Registrar prospecto'}
            </Button>
          </div>
        </form>
      </PageContainer>
    </Shell>
  )
}
