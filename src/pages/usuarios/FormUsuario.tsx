import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { USUARIOS } from '../../mocks'
import { ROL_LABELS } from '../../types'
import type { Rol } from '../../types'

const ZONAS_DISPONIBLES = ['Zona Norte', 'Zona Centro', 'Zona Sur', 'UVC Caracas']

export default function FormUsuario() {
  const navigate = useNavigate()
  const { id } = useParams()
  const usuario = id ? USUARIOS.find(u => u.id === id) : null
  const esEdicion = Boolean(usuario)

  const [form, setForm] = useState({
    nombre:          usuario?.nombre ?? '',
    email:           usuario?.email  ?? '',
    rol:             usuario?.rol    ?? 'facilitador' as Rol,
    zona:            usuario?.zona   ?? '',
    contrasena:      '',
    confirmar:       '',
  })
  const [showPass, setShowPass] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const campo = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const passMatch = !form.contrasena || form.contrasena === form.confirmar

  const guardar = () => {
    if (!passMatch) return
    setGuardado(true)
    setTimeout(() => navigate('/usuarios'), 1200)
  }

  const rolesTienenZona: Rol[] = ['facilitador', 'coordinador']
  const necesitaZona = rolesTienenZona.includes(form.rol as Rol)

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
          subtitle={esEdicion ? usuario!.nombre : 'Invita a un miembro al sistema'}
          actions={<Button variant="ghost" onClick={() => navigate('/usuarios')}><ArrowLeft size={16}/>Volver</Button>}
        />

        {guardado && <Alert type="success" className="mb-4">Usuario guardado. Redirigiendo…</Alert>}

        <div className="max-w-xl">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del usuario</h2></CardHeader>
            <CardBody className="space-y-5">
              <Input
                label="Nombre completo"
                placeholder="Ej: María García"
                value={form.nombre}
                onChange={e => campo('nombre', e.target.value)}
                required
              />
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="maria@organizacion.org"
                value={form.email}
                onChange={e => campo('email', e.target.value)}
                required
              />

              <Select
                label="Rol"
                value={form.rol}
                onChange={e => campo('rol', e.target.value)}
                options={(Object.keys(ROL_LABELS) as Rol[]).map(r => ({ value: r, label: ROL_LABELS[r] }))}
              />

              {necesitaZona && (
                <Select
                  label="Zona asignada"
                  value={form.zona}
                  onChange={e => campo('zona', e.target.value)}
                  options={[
                    { value: '', label: 'Selecciona zona…' },
                    ...ZONAS_DISPONIBLES.map(z => ({ value: z, label: z })),
                  ]}
                />
              )}

              <div className="border-t border-gray-100 pt-5">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {esEdicion ? 'Cambiar contraseña (opcional)' : 'Contraseña temporal'}
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      label={esEdicion ? 'Nueva contraseña' : 'Contraseña'}
                      type={showPass ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={form.contrasena}
                      onChange={e => campo('contrasena', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {form.contrasena && (
                    <Input
                      label="Confirmar contraseña"
                      type={showPass ? 'text' : 'password'}
                      value={form.confirmar}
                      onChange={e => campo('confirmar', e.target.value)}
                      error={!passMatch ? 'Las contraseñas no coinciden' : ''}
                    />
                  )}
                  {!esEdicion && (
                    <p className="text-xs text-gray-400">
                      El usuario deberá cambiar esta contraseña en su primer acceso.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => navigate('/usuarios')}>Cancelar</Button>
                <Button
                  onClick={guardar}
                  disabled={!form.nombre || !form.email || !passMatch}
                >
                  <Save size={16}/>{esEdicion ? 'Guardar cambios' : 'Crear usuario'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    </Shell>
  )
}
