import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Info, Lock, Copy } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert, Badge } from '../../components/ui'
import { ROLES, ROL_PERMISOS, MODULOS } from '../../mocks'
import { useApp, usePermiso } from '../../context/AppContext'
import { guardarRol, eliminarRol, usuariosConRol, type FilaPermiso } from '../../lib/roles'
import { ROL_LABELS } from '../../types'
import type { AccionPermiso, Rol } from '../../types'

const PERFIL_AYUDA: Record<Rol, string> = {
  administrador: 'Ve toda la cartera de la organización.',
  coordinador:   'Ve toda la cartera de la organización.',
  facilitador:   'Ve solo los clientes, solicitudes y créditos de su zona.',
  comite:        'Ve las solicitudes que llegan al comité.',
  auditor:       'Ve toda la cartera, pensado para solo lectura.',
}

const ACCIONES: { id: AccionPermiso; label: string }[] = [
  { id: 'ver', label: 'Ver' },
  { id: 'editar', label: 'Agregar / editar' },
  { id: 'borrar', label: 'Borrar' },
]

type Matriz = Record<string, FilaPermiso>

function matrizDe(rolId: string | null): Matriz {
  const m: Matriz = {}
  for (const mod of MODULOS) {
    const p = rolId ? ROL_PERMISOS.find(x => x.rol_id === rolId && x.modulo === mod.id) : undefined
    m[mod.id] = { modulo: mod.id, ver: p?.ver ?? false, editar: p?.editar ?? false, borrar: p?.borrar ?? false }
  }
  if (!rolId) m.dashboard.ver = true
  return m
}

export default function FormRol() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { modo, usuario, rol: miPerfil, refrescarPermisos } = useApp()
  const permiso = usePermiso('roles')
  const rol = id ? ROLES.find(r => r.id === id) ?? null : null
  const esEdicion = Boolean(rol)
  const soloLectura = !permiso.editar
  const usuarios = rol ? usuariosConRol(rol.id) : []

  const [nombre, setNombre] = useState(rol?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? '')
  const [perfil, setPerfil] = useState<Rol>(rol?.perfil ?? 'facilitador')
  const [activo, setActivo] = useState(rol?.activo ?? true)
  const [matriz, setMatriz] = useState<Matriz>(() => matrizDe(rol?.id ?? null))
  const [copiarDe, setCopiarDe] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const grupos = useMemo(() => {
    const g = new Map<string, typeof MODULOS>()
    for (const m of [...MODULOS].sort((a, b) => a.orden - b.orden)) {
      if (!g.has(m.grupo)) g.set(m.grupo, [])
      g.get(m.grupo)!.push(m)
    }
    return [...g.entries()]
  }, [])

  // El Administrador nunca pierde Usuarios y Roles (la base también lo impide)
  const bloqueado = (modulo: string, accion: AccionPermiso) =>
    rol?.id === 'rol-administrador' && (modulo === 'roles' || modulo === 'usuarios') && accion !== 'borrar'

  const cambiar = (modulo: string, accion: AccionPermiso, valor: boolean) => {
    setMatriz(prev => {
      const f = { ...prev[modulo], [accion]: valor }
      if (accion === 'ver' && !valor) { f.editar = false; f.borrar = false }
      if ((accion === 'editar' || accion === 'borrar') && valor) f.ver = true
      return { ...prev, [modulo]: f }
    })
  }

  const marcarGrupo = (mods: typeof MODULOS, accion: AccionPermiso, valor: boolean) => {
    for (const m of mods) if (m.acciones.includes(accion) && !bloqueado(m.id, accion)) cambiar(m.id, accion, valor)
  }

  const copiar = () => {
    if (!copiarDe) return
    const origen = ROLES.find(r => r.id === copiarDe)
    setMatriz(matrizDe(copiarDe))
    if (origen && !rol?.es_sistema) setPerfil(origen.perfil)
    setOk(`Permisos copiados de ${origen?.nombre ?? 'otro rol'}. Revisa y guarda.`)
  }

  const guardar = async () => {
    setError(''); setOk('')
    if (!nombre.trim()) { setError('Ponle un nombre al rol.'); return }
    if (ROLES.some(r => r.nombre.trim().toLowerCase() === nombre.trim().toLowerCase() && r.id !== rol?.id)) { setError('Ya existe un rol con ese nombre.'); return }
    if (!Object.values(matriz).some(p => p.ver)) { setError('El rol debe poder ver al menos una pantalla.'); return }
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    setGuardando(true)
    try {
      await guardarRol({ nombre, descripcion, perfil, activo }, Object.values(matriz), rol?.id ?? null)
      const esMiRol = (usuario.rol_id ?? `rol-${miPerfil}`) === rol?.id
      if (esMiRol) await refrescarPermisos()
      setOk('Rol guardado.')
      setTimeout(() => navigate('/roles'), 700)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el rol')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!rol) return
    setError('')
    setGuardando(true)
    try {
      await eliminarRol(rol)
      navigate('/roles')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el rol')
      setConfirmarEliminar(false)
    } finally {
      setGuardando(false)
    }
  }

  if (id && !rol) {
    return (
      <Shell><PageContainer>
        <Alert type="error">Rol no encontrado.</Alert>
        <Button variant="ghost" className="mt-3" onClick={() => navigate('/roles')}><ArrowLeft size={16} />Volver</Button>
      </PageContainer></Shell>
    )
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={esEdicion ? `Rol: ${rol!.nombre}` : 'Nuevo rol'}
          subtitle={soloLectura ? 'Solo lectura' : 'Marca a qué pantallas entra y qué puede hacer en cada una'}
          actions={<Button variant="ghost" onClick={() => navigate('/roles')}><ArrowLeft size={16} />Volver</Button>}
        />

        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        {ok && <Alert type="success" className="mb-4">{ok}</Alert>}

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del rol</h2></CardHeader>
            <CardBody className="space-y-4">
              <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} disabled={soloLectura} placeholder="Ej.: Asesor junior" />
              <Input label="Descripción" value={descripcion ?? ''} onChange={e => setDescripcion(e.target.value)} disabled={soloLectura} placeholder="Para qué sirve este rol" />
              <div>
                <Select
                  label="Perfil de datos"
                  value={perfil}
                  onChange={e => setPerfil(e.target.value as Rol)}
                  disabled={soloLectura || Boolean(rol?.es_sistema)}
                  options={(Object.keys(ROL_LABELS) as Rol[]).map(r => ({ value: r, label: ROL_LABELS[r] }))}
                />
                <p className="text-xs text-gray-500 mt-1.5">{PERFIL_AYUDA[perfil]} Los permisos de abajo deciden qué puede hacer dentro de eso.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" className="accent-brand-600" checked={activo} disabled={soloLectura || Boolean(rol?.es_sistema)} onChange={e => setActivo(e.target.checked)} />
                Rol activo
              </label>
              {rol?.es_sistema && (
                <div className="flex gap-2 p-3 rounded-lg bg-gray-50 text-xs text-gray-600">
                  <Lock size={14} className="shrink-0 mt-0.5" />
                  <span>Rol del sistema: no se puede borrar, desactivar ni cambiar de perfil. Sí puedes ajustar sus permisos.</span>
                </div>
              )}
              {esEdicion && (
                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Usuarios con este rol ({usuarios.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {usuarios.length === 0 ? <span className="text-xs text-gray-400">Ninguno</span>
                      : usuarios.map(u => <Badge key={u.id} color="gray">{u.nombre}</Badge>)}
                  </div>
                </div>
              )}
              {!soloLectura && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1.5">Copiar permisos de otro rol</p>
                  <div className="flex gap-2">
                    <select className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white" value={copiarDe} onChange={e => setCopiarDe(e.target.value)}>
                      <option value="">Selecciona…</option>
                      {ROLES.filter(r => r.id !== rol?.id).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                    <Button variant="ghost" onClick={copiar} disabled={!copiarDe}><Copy size={14} />Copiar</Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Permisos por pantalla</h2></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Pantalla</th>
                    {ACCIONES.map(a => <th key={a.id} className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-32">{a.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {grupos.map(([grupo, mods]) => (
                    <GrupoFilas key={grupo} grupo={grupo} mods={mods} matriz={matriz} soloLectura={soloLectura}
                      bloqueado={bloqueado} cambiar={cambiar} marcarGrupo={marcarGrupo} />
                  ))}
                </tbody>
              </table>
            </div>
            <CardBody>
              <div className="flex gap-2 text-xs text-blue-800 bg-blue-50 rounded-lg p-3">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  <strong>Ver</strong> muestra la pantalla en el menú. <strong>Agregar/editar</strong> habilita crear y modificar
                  (en Comité es votar, en Desembolsos es desembolsar, en Cobranza es registrar pagos).
                  <strong> Borrar</strong> habilita eliminar registros. La base de datos aplica estas mismas reglas.
                </span>
              </div>
            </CardBody>
          </Card>
        </div>

        {!soloLectura && (
          <div className="flex justify-between gap-3 mt-4">
            <div>
              {esEdicion && permiso.borrar && !rol!.es_sistema && (
                confirmarEliminar ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setConfirmarEliminar(false)}>No</Button>
                    <Button onClick={eliminar} loading={guardando} className="bg-red-600 hover:bg-red-700">Sí, eliminar rol</Button>
                  </div>
                ) : (
                  <Button variant="ghost" className="text-red-600" disabled={usuarios.length > 0} onClick={() => setConfirmarEliminar(true)}
                    title={usuarios.length ? 'Tiene usuarios asignados' : undefined}>
                    <Trash2 size={15} />Eliminar
                  </Button>
                )
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => navigate('/roles')}>Cancelar</Button>
              <Button onClick={guardar} loading={guardando}><Save size={16} />{esEdicion ? 'Guardar cambios' : 'Crear rol'}</Button>
            </div>
          </div>
        )}
      </PageContainer>
    </Shell>
  )
}

function GrupoFilas({ grupo, mods, matriz, soloLectura, bloqueado, cambiar, marcarGrupo }: {
  grupo: string
  mods: typeof MODULOS
  matriz: Matriz
  soloLectura: boolean
  bloqueado: (m: string, a: AccionPermiso) => boolean
  cambiar: (m: string, a: AccionPermiso, v: boolean) => void
  marcarGrupo: (mods: typeof MODULOS, a: AccionPermiso, v: boolean) => void
}) {
  return (
    <>
      <tr className="bg-gray-50/60 border-t border-gray-100">
        <td className="px-4 py-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">{grupo}</td>
        {ACCIONES.map(a => {
          const aplican = mods.filter(m => m.acciones.includes(a.id))
          if (!aplican.length || soloLectura) return <td key={a.id} />
          const todos = aplican.every(m => matriz[m.id]?.[a.id])
          return (
            <td key={a.id} className="text-center">
              <button className="text-[11px] text-brand-600 hover:underline" onClick={() => marcarGrupo(aplican, a.id, !todos)}>
                {todos ? 'quitar todos' : 'marcar todos'}
              </button>
            </td>
          )
        })}
      </tr>
      {mods.map(m => (
        <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50">
          <td className="px-4 py-2 text-gray-800">{m.nombre}</td>
          {ACCIONES.map(a => (
            <td key={a.id} className="px-3 py-2 text-center">
              {m.acciones.includes(a.id) ? (
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-brand-600"
                  checked={Boolean(matriz[m.id]?.[a.id])}
                  disabled={soloLectura || bloqueado(m.id, a.id)}
                  onChange={e => cambiar(m.id, a.id, e.target.checked)}
                  aria-label={`${a.label} ${m.nombre}`}
                />
              ) : <span className="text-gray-200">—</span>}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
