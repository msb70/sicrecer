import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Info } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { USUARIOS, ORGANIZACIONES, ZONAS, ROLES } from '../../mocks'
import { useApp, usePermiso } from '../../context/AppContext'
import { guardarCatalogo, eliminarCatalogo } from '../../lib/catalogos'
import type { Rol } from '../../types'

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Alta y edición de usuarios internos. El acceso al sistema se controla con
 * la tabla `usuarios` (lista blanca por correo): la persona entra con
 * "Continuar con Google" usando ese correo (o con correo y contraseña si se
 * registra con el mismo correo). No se guardan contraseñas aquí.
 */
export default function FormUsuario() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { modo, usuario: yo, organizacion } = useApp()
  const permiso = usePermiso('usuarios')
  const usuario = id ? USUARIOS.find(u => u.id === id) : null
  const esEdicion = Boolean(usuario)
  const esYoMismo = Boolean(usuario && yo && usuario.id === yo.id)

  const [form, setForm] = useState({
    nombre:          usuario?.nombre          ?? '',
    email:           usuario?.email           ?? '',
    rol_id:          usuario?.rol_id ?? (usuario ? `rol-${usuario.rol}` : 'rol-facilitador'),
    zona:            usuario?.zona            ?? '',
    organizacion_id: usuario?.organizacion_id ?? organizacion?.id ?? '',
  })
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [error, setError] = useState('')

  const campo = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const rolSel = ROLES.find(r => r.id === form.rol_id)
  const perfil: Rol = rolSel?.perfil ?? usuario?.rol ?? 'facilitador'
  const rolesTienenZona: Rol[] = ['facilitador', 'coordinador']
  const necesitaZona = rolesTienenZona.includes(perfil)
  const email = form.email.trim().toLowerCase()

  const guardar = async () => {
    setError('')
    if (!EMAIL_OK.test(email)) { setError('Correo electrónico inválido'); return }
    if (!esEdicion && USUARIOS.some(u => u.email.toLowerCase() === email)) { setError('Ya existe un usuario con ese correo'); return }
    if (esYoMismo && form.rol_id !== (usuario!.rol_id ?? `rol-${usuario!.rol}`)) { setError('No puedes cambiar tu propio rol'); return }
    if (!rolSel) { setError('Selecciona un rol'); return }
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    setGuardando(true)
    try {
      const fila = {
        nombre: form.nombre.trim(),
        email,
        rol: perfil,
        rol_id: form.rol_id,
        zona: necesitaZona ? (form.zona || null) : null,
        organizacion_id: form.organizacion_id,
      }
      const idUsuario = await guardarCatalogo('usuarios', esEdicion ? fila : { ...fila, primer_acceso: true }, usuario?.id ?? null, 'u')
      // El facilitador es por zona: la zona elegida pasa a ser suya (y con ella su cartera).
      const zona = perfil === 'facilitador' && form.zona ? ZONAS.find(z => z.nombre === form.zona) : undefined
      if (zona && zona.facilitador_id !== idUsuario) {
        await guardarCatalogo('zonas', { facilitador_id: idUsuario }, zona.id)
      }
      setGuardado(true)
      setTimeout(() => navigate('/usuarios'), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!usuario) return
    setError('')
    setGuardando(true)
    try {
      await eliminarCatalogo('usuarios', usuario.id)
      navigate('/usuarios')
    } catch (err) {
      setError(err instanceof Error
        ? `${err.message} Si el usuario tiene historial (cobranzas, solicitudes), cámbiale el rol a Auditor en lugar de eliminarlo.`
        : 'No se pudo eliminar')
      setConfirmarEliminar(false)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
          subtitle={esEdicion ? usuario!.nombre : 'Da acceso a un miembro del equipo'}
          actions={<Button variant="ghost" onClick={() => navigate('/usuarios')}><ArrowLeft size={16}/>Volver</Button>}
        />

        {guardado && <Alert type="success" className="mb-4">Usuario guardado. Redirigiendo…</Alert>}
        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        <div className="max-w-xl space-y-4">
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
                helperText="Con este correo entrará al sistema (Continuar con Google)."
                required
              />

              <Select
                label="Organización"
                value={form.organizacion_id}
                onChange={e => campo('organizacion_id', e.target.value)}
                options={[
                  { value: '', label: 'Selecciona organización…' },
                  ...ORGANIZACIONES.map(o => ({ value: o.id, label: `${o.nombre} (${o.pais})` })),
                ]}
              />

              <div>
                <Select
                  label="Rol"
                  value={form.rol_id}
                  onChange={e => campo('rol_id', e.target.value)}
                  disabled={esYoMismo}
                  options={ROLES.filter(r => r.activo || r.id === form.rol_id).map(r => ({ value: r.id, label: r.nombre }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {rolSel?.descripcion ?? ''} Los permisos de cada rol se configuran en Configuración → Roles y permisos.
                </p>
              </div>

              {necesitaZona && (
                <Select
                  label="Zona asignada"
                  value={form.zona}
                  onChange={e => campo('zona', e.target.value)}
                  options={[
                    { value: '', label: 'Selecciona zona…' },
                    ...ZONAS.map(z => ({ value: z.nombre, label: z.nombre })),
                  ]}
                />
              )}

              <div className="flex gap-2 p-3 rounded-lg bg-blue-50 text-xs text-blue-800">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  No hay contraseñas que asignar: el acceso se da por correo. Avísale a la persona que entre en
                  sicrecer.com con “Continuar con Google” usando <strong>{email || 'este correo'}</strong>.
                  Si no usa Google, puede crear su contraseña registrándose con el mismo correo.
                </span>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <div>
                  {esEdicion && !esYoMismo && permiso.borrar && (
                    confirmarEliminar ? (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setConfirmarEliminar(false)}>No</Button>
                        <Button onClick={eliminar} loading={guardando} className="bg-red-600 hover:bg-red-700">Sí, quitar acceso</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" className="text-red-600" onClick={() => setConfirmarEliminar(true)}>
                        <Trash2 size={15}/>Eliminar
                      </Button>
                    )
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => navigate('/usuarios')}>Cancelar</Button>
                  <Button
                    onClick={guardar}
                    loading={guardando}
                    disabled={!form.nombre.trim() || !form.email.trim() || !form.organizacion_id}
                  >
                    <Save size={16}/>{esEdicion ? 'Guardar cambios' : 'Crear usuario'}
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    </Shell>
  )
}
