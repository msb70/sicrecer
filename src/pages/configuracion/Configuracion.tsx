import { useEffect, useRef, useState } from 'react'
import { Building2, Bell, Shield, Globe, Save, CheckCircle2, Eye, EyeOff, Upload, Trash2 } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody, Alert, Badge, Spinner } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { ORGANIZACIONES } from '../../mocks'
import { neon } from '../../lib/neon'
import { guardarCatalogo } from '../../lib/catalogos'
import { PAIS_LABELS, type ConfiguracionOrganizacion, type Organizacion } from '../../types'
import { clsx } from 'clsx'

// ─── Tipos ────────────────────────────────────────────────────

type Tab = 'organizacion' | 'notificaciones' | 'seguridad' | 'regional'

const NOTIF_DEFAULT = {
  mora_nueva:        true,
  pago_registrado:   true,
  solicitud_nueva:   false,
  comite_voto:       true,
  par_umbral:        true,
  par_umbral_valor:  5,
  reporte_semanal:   true,
  reporte_mensual:   true,
  canal_email:       true,
  canal_push:        false,
}

const REGIONAL_DEFAULT = {
  zona_horaria: 'America/Bogota',
  idioma:       'es-CO',
  formato_fecha:'DD/MM/YYYY',
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

// ─── Persistencia: organizaciones.configuracion (jsonb) ──────
// Solo el rol administrador puede escribir (RLS). Se fusiona la sección
// editada con lo ya guardado y se actualiza la organización en sesión.
function useGuardarOrganizacion() {
  const { organizacion, setOrganizacion, modo } = useApp()
  return async (cambios: { nombre?: string; logo?: string | null; seccion?: keyof ConfiguracionOrganizacion; valores?: Record<string, unknown> }) => {
    if (modo !== 'google') throw new Error('En modo demo no se guardan cambios.')
    const fila: Record<string, unknown> = {}
    if (cambios.nombre !== undefined) fila.nombre = cambios.nombre
    if (cambios.logo !== undefined) fila.logo = cambios.logo
    if (cambios.seccion) {
      const actual = (organizacion.configuracion ?? {}) as ConfiguracionOrganizacion
      fila.configuracion = { ...actual, [cambios.seccion]: { ...(actual[cambios.seccion] ?? {}), ...cambios.valores } }
    }
    await guardarCatalogo('organizaciones', fila, organizacion.id)
    const nueva = ORGANIZACIONES.find(o => o.id === organizacion.id)
    if (nueva) setOrganizacion(nueva as Organizacion)
  }
}

// ─── Sub-secciones ────────────────────────────────────────────

function TabOrganizacion() {
  const { organizacion } = useApp()
  const guardarOrg = useGuardarOrganizacion()
  const general = organizacion.configuracion?.general ?? {}
  const [form, setForm] = useState({
    nombre:    organizacion.nombre ?? '',
    nit:       general.nit ?? '',
    email:     general.email ?? '',
    telefono:  general.telefono ?? '',
    direccion: general.direccion ?? '',
  })
  const [logo, setLogo] = useState<string | null>(organizacion.logo ?? null)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const guardar = async () => {
    setError(''); setGuardando(true)
    try {
      if (!form.nombre.trim()) throw new Error('El nombre de la organización es obligatorio')
      await guardarOrg({
        nombre: form.nombre.trim(), logo,
        seccion: 'general',
        valores: { nit: form.nit.trim(), email: form.email.trim(), telefono: form.telefono.trim(), direccion: form.direccion.trim() },
      })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const cargarLogo = (file: File | undefined) => {
    setError('')
    if (!file) return
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type)) { setError('Formato no soportado: usa PNG, JPG, SVG o WEBP'); return }
    if (file.size > 300 * 1024) { setError('El logo debe pesar como máximo 300 KB'); return }
    const reader = new FileReader()
    reader.onload = () => setLogo(String(reader.result))
    reader.readAsDataURL(file)
  }

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Cambios guardados correctamente.</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Logo de la organización</h3></CardHeader>
        <CardBody>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 overflow-hidden">
              {logo ? <img src={logo} alt="Logo" className="w-full h-full object-contain" /> : <Building2 size={28}/>}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                onChange={e => { cargarLogo(e.target.files?.[0]); e.target.value = '' }} />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><Upload size={13}/>Cargar logo</Button>
                {logo && <Button variant="ghost" size="sm" onClick={() => setLogo(null)}><Trash2 size={13}/>Quitar</Button>}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">PNG, JPG, SVG o WEBP · Máx. 300 KB · Se guarda al pulsar “Guardar cambios”</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Datos generales</h3></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la organización</label>
              <input value={form.nombre} onChange={f('nombre')} className={inputCls}/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">NIT / RIF</label>
              <input value={form.nit} onChange={f('nit')} className={inputCls}/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Correo institucional</label>
              <input type="email" value={form.email} onChange={f('email')} className={inputCls}/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
              <input value={form.telefono} onChange={f('telefono')} className={inputCls}/>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Dirección</label>
            <input value={form.direccion} onChange={f('direccion')} className={inputCls}/>
          </div>
          <p className="text-xs text-gray-400">País: {PAIS_LABELS[organizacion.pais] ?? organizacion.pais}</p>
          <div className="flex justify-end pt-2">
            <Button onClick={guardar} loading={guardando}><Save size={14}/>Guardar cambios</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function TabNotificaciones() {
  const { organizacion } = useApp()
  const guardarOrg = useGuardarOrganizacion()
  const [notif, setNotif] = useState({ ...NOTIF_DEFAULT, ...(organizacion.configuracion?.notificaciones ?? {}) } as typeof NOTIF_DEFAULT)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const toggle = (key: keyof typeof notif) => () =>
    setNotif(prev => ({ ...prev, [key]: !prev[key as keyof typeof notif] }))

  const guardar = async () => {
    setError(''); setGuardando(true)
    try {
      await guardarOrg({ seccion: 'notificaciones', valores: notif })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const Toggle = ({ campo }: { campo: keyof typeof notif }) => (
    <button
      onClick={toggle(campo)}
      className={clsx(
        'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none shrink-0',
        notif[campo] ? 'bg-brand-500' : 'bg-gray-200'
      )}
    >
      <span className={clsx(
        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
        notif[campo] && 'translate-x-4'
      )}/>
    </button>
  )

  const Row = ({ label, campo, desc }: { label: string; campo: keyof typeof notif; desc?: string }) => (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <Toggle campo={campo}/>
    </div>
  )

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Preferencias guardadas.</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      <Alert type="info">
        Las preferencias quedan guardadas para la organización. Hoy el sistema solo genera correos para el portal de
        solicitantes (decisión del comité y desembolso) y para avisar a los miembros del comité, y quedan en cola hasta
        configurar el envío (Resend). Las demás alertas aún no están conectadas.
      </Alert>

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Alertas de cartera</h3></CardHeader>
        <CardBody>
          <Row campo="mora_nueva"      label="Nuevo crédito en mora"    desc="Alerta cuando un crédito entra en mora"/>
          <Row campo="pago_registrado" label="Pago registrado"          desc="Confirmación al registrar un pago"/>
          <Row campo="par_umbral"      label="PAR30 supera umbral"      desc={`Alerta cuando PAR30 > ${notif.par_umbral_valor}%`}/>
          <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50">
            <p className="text-sm text-gray-600">Umbral PAR30 (%)</p>
            <input type="number" min={0} max={100} value={notif.par_umbral_valor}
              onChange={e => setNotif(p => ({ ...p, par_umbral_valor: Number(e.target.value) || 0 }))}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-lg text-right" />
          </div>
          <Row campo="solicitud_nueva" label="Nueva solicitud de crédito" desc="Cuando un facilitador o un solicitante crea una solicitud"/>
          <Row campo="comite_voto"     label="Voto de comité requerido" desc="Recordatorio cuando hay solicitudes pendientes de votación"/>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Reportes automáticos</h3></CardHeader>
        <CardBody>
          <Row campo="reporte_semanal"  label="Reporte semanal" desc="Resumen de cartera cada lunes"/>
          <Row campo="reporte_mensual"  label="Reporte mensual" desc="Informe ejecutivo el primer día de cada mes"/>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Canales de envío</h3></CardHeader>
        <CardBody>
          <Row campo="canal_email" label="Correo electrónico" desc="Notificaciones al email institucional"/>
          <Row campo="canal_push"  label="Notificaciones push" desc="Requiere permisos del navegador"/>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={guardar} loading={guardando}><Save size={14}/>Guardar preferencias</Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

interface SesionAuth { id?: string; token: string; userAgent?: string | null; ipAddress?: string | null; updatedAt?: string; createdAt?: string }
interface CuentaAuth { providerId?: string; provider?: string }
type AuthSeguridad = {
  changePassword?: (a: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }) => Promise<{ error: { message?: string } | null }>
  listSessions?: () => Promise<{ data: SesionAuth[] | null; error: { message?: string } | null }>
  revokeSession?: (a: { token: string }) => Promise<{ error: { message?: string } | null }>
  listAccounts?: () => Promise<{ data: CuentaAuth[] | null; error: { message?: string } | null }>
  getSession: () => Promise<{ data: { session?: { token?: string } } | null }>
}

function describirDispositivo(ua?: string | null): string {
  if (!ua) return 'Dispositivo desconocido'
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'Navegador'
  const so = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  return so ? `${nav} · ${so}` : nav
}

function TabSeguridad() {
  const { modo } = useApp()
  const auth = neon.auth as unknown as AuthSeguridad
  const [mostrarPass, setMostrarPass] = useState(false)
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState('')
  const [tienePassword, setTienePassword] = useState<boolean | null>(null)
  const [sesiones, setSesiones] = useState<SesionAuth[] | null>(null)
  const [tokenActual, setTokenActual] = useState<string | undefined>()

  const cargar = async () => {
    if (modo !== 'google') { setSesiones([]); setTienePassword(false); return }
    try {
      const [cuentas, lista, actual] = await Promise.all([
        auth.listAccounts?.(), auth.listSessions?.(), auth.getSession(),
      ])
      setTienePassword(Boolean(cuentas?.data?.some(c => (c.providerId ?? c.provider) === 'credential')))
      setSesiones(lista?.data ?? [])
      setTokenActual(actual?.data?.session?.token)
    } catch {
      setSesiones([]); setTienePassword(null)
    }
  }
  useEffect(() => { void cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    setError('')
    if (!form.actual || !form.nueva) { setError('Completa todos los campos.'); return }
    if (form.nueva !== form.confirmar) { setError('Las contraseñas nuevas no coinciden.'); return }
    if (form.nueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (!auth.changePassword) { setError('El cambio de contraseña no está disponible.'); return }
    setGuardando(true)
    try {
      const { error } = await auth.changePassword({ currentPassword: form.actual, newPassword: form.nueva, revokeOtherSessions: true })
      if (error) throw new Error(error.message ?? 'No se pudo cambiar la contraseña')
      setGuardado(true)
      setForm({ actual: '', nueva: '', confirmar: '' })
      setTimeout(() => setGuardado(false), 3000)
      void cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    } finally {
      setGuardando(false)
    }
  }

  const cerrarSesion = async (token: string) => {
    setError('')
    try {
      const r = await auth.revokeSession?.({ token })
      if (r?.error) throw new Error(r.error.message ?? 'No se pudo cerrar la sesión')
      void cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar la sesión')
    }
  }

  const campoPass = (label: string, campo: keyof typeof form) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}<span className="text-red-500 ml-0.5">*</span></label>
      <div className="relative">
        <input
          type={mostrarPass ? 'text' : 'password'}
          value={form[campo]}
          onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
          className={`${inputCls} pr-10`}
        />
        <button type="button" onClick={() => setMostrarPass(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
          {mostrarPass ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Contraseña actualizada. Se cerraron tus otras sesiones.</Alert>}
      {error     && <Alert type="error">{error}</Alert>}

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h3></CardHeader>
        <CardBody className="space-y-4">
          {tienePassword === false ? (
            <p className="text-sm text-gray-500">
              Entras con tu cuenta de Google, así que no tienes contraseña en SiCrecer. La seguridad de tu acceso la gestiona Google.
            </p>
          ) : (
            <>
              {campoPass('Contraseña actual', 'actual')}
              {campoPass('Nueva contraseña', 'nueva')}
              {campoPass('Confirmar contraseña', 'confirmar')}
              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">Mínimo 8 caracteres.</div>
              <div className="flex justify-end">
                <Button onClick={guardar} loading={guardando}><Save size={14}/>Actualizar contraseña</Button>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Autenticación en dos pasos (2FA)</h3>
            <Badge color="gray">Próximamente</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-500">Si entras con Google, activa la verificación en dos pasos en tu cuenta de Google.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Sesiones activas</h3></CardHeader>
        <CardBody>
          {sesiones === null ? <div className="flex justify-center py-4"><Spinner /></div> :
           sesiones.length === 0 ? <p className="text-sm text-gray-400">No hay información de sesiones.</p> :
           sesiones.map(s => (
            <div key={s.token} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{describirDispositivo(s.userAgent)}</p>
                <p className="text-xs text-gray-400">
                  {s.ipAddress ?? 'IP desconocida'} · {s.updatedAt ?? s.createdAt ? new Date((s.updatedAt ?? s.createdAt)!).toLocaleString('es-CO') : ''}
                </p>
              </div>
              {s.token === tokenActual
                ? <Badge color="green">Sesión actual</Badge>
                : <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => cerrarSesion(s.token)}>Cerrar</Button>}
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function TabRegional() {
  const { organizacion } = useApp()
  const guardarOrg = useGuardarOrganizacion()
  const [form, setForm] = useState({ ...REGIONAL_DEFAULT, ...(organizacion.configuracion?.regional ?? {}) })
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async () => {
    setError(''); setGuardando(true)
    try {
      await guardarOrg({ seccion: 'regional', valores: form })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const Select = ({ label, campo, options }: {
    label: string; campo: keyof typeof form; options: { value: string; label: string }[]
  }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <select
        value={form[campo]}
        onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
        className={`${inputCls} bg-white`}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Configuración regional guardada.</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Región</h3></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-500">
            País de la organización: <strong>{PAIS_LABELS[organizacion.pais] ?? organizacion.pais}</strong>. La moneda de cada
            crédito la define su convenio (COP o UVC).
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Zona horaria" campo="zona_horaria" options={[
              { value: 'America/Bogota',   label: 'América/Bogotá (UTC-5)' },
              { value: 'America/Caracas',  label: 'América/Caracas (UTC-4)' },
            ]}/>
            <Select label="Idioma" campo="idioma" options={[
              { value: 'es-CO', label: 'Español (Colombia)' },
              { value: 'es-VE', label: 'Español (Venezuela)' },
            ]}/>
            <Select label="Formato de fecha" campo="formato_fecha" options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
            ]}/>
          </div>
          <div className="flex justify-end">
            <Button onClick={guardar} loading={guardando}><Save size={14}/>Guardar configuración</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────

const TABS: { id: Tab; label: string; icono: React.ReactNode }[] = [
  { id: 'organizacion',    label: 'Organización',   icono: <Building2 size={14}/> },
  { id: 'notificaciones',  label: 'Notificaciones', icono: <Bell size={14}/>      },
  { id: 'seguridad',       label: 'Seguridad',      icono: <Shield size={14}/>    },
  { id: 'regional',        label: 'Regional',       icono: <Globe size={14}/>     },
]

export default function Configuracion() {
  const [tab, setTab] = useState<Tab>('organizacion')
  const { rol } = useApp()

  return (
    <Shell>
      <PageContainer>
        <PageHeader title="Configuración" subtitle="Ajustes de la organización y del sistema"/>
        {rol !== 'administrador' && tab !== 'seguridad' && (
          <Alert type="info" className="mb-4">Solo un administrador puede guardar cambios de la organización.</Alert>
        )}

        <div className="flex flex-col lg:flex-row gap-5">
          <nav className="flex lg:flex-col gap-1 lg:w-48 flex-shrink-0 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                  tab === t.id ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {t.icono}{t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0">
            {tab === 'organizacion'   && <TabOrganizacion/>}
            {tab === 'notificaciones' && <TabNotificaciones/>}
            {tab === 'seguridad'      && <TabSeguridad/>}
            {tab === 'regional'       && <TabRegional/>}
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
