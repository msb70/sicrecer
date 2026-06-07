import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MapPin, Save, ArrowLeft } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Alert, Card, CardBody, CardHeader } from '../../components/ui'
import { PROSPECTOS } from '../../mocks'

export default function FormProspecto() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id
  const prospecto = isEditing ? PROSPECTOS.find(p => p.id === id) : null

  const [form, setForm] = useState({
    nombre:          prospecto?.nombre          ?? '',
    documento:       prospecto?.documento       ?? '',
    telefono:        prospecto?.telefono        ?? '',
    email:           prospecto?.email           ?? '',
    sexo:            prospecto?.sexo            ?? '',
    zona:            prospecto?.zona            ?? 'Zona Norte',
    estado:          prospecto?.estado          ?? 'nuevo',
    canal_preferido: prospecto?.canal_preferido ?? '',
    canal_captacion: prospecto?.canal_captacion ?? '',
    lat:             '4.7110',
    lng:             '-74.0721',
    nota:            '',
  })
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    setExito(true)
    setLoading(false)
    setTimeout(() => navigate('/prospectos'), 1200)
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
                  <div className="w-full h-32 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-1.5 text-gray-400">
                    <MapPin size={20} />
                    <p className="text-xs font-mono">{form.lat}, {form.lng}</p>
                  </div>
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
