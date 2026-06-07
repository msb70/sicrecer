import { useState } from 'react'
import { Building2, Bell, Shield, Globe, Save, CheckCircle2, Eye, EyeOff, Upload } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody, Alert, Badge } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { clsx } from 'clsx'

// ─── Tipos ────────────────────────────────────────────────────

type Tab = 'organizacion' | 'notificaciones' | 'seguridad' | 'regional'

// ─── Datos mock de la organización ───────────────────────────

const ORG_DEFAULT = {
  nombre:   'Cooperativa AMUCOOP',
  nit:      '900.123.456-7',
  email:    'contacto@amucoop.org',
  telefono: '+57 314 555 0192',
  direccion:'Carrera 12 #45-67, Bogotá D.C.',
  pais:     'Colombia',
  moneda:   'COP',
  zona_horaria: 'America/Bogota',
  logo_url: '',
}

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

// ─── Sub-secciones ────────────────────────────────────────────

function TabOrganizacion() {
  const [form, setForm]   = useState(ORG_DEFAULT)
  const [guardado, setGuardado] = useState(false)

  const guardar = () => {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  const f = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Cambios guardados correctamente.</Alert>}

      {/* Logo */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Logo de la organización</h3></CardHeader>
        <CardBody>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600">
              <Building2 size={28}/>
            </div>
            <div>
              <Button variant="secondary" size="sm"><Upload size={13}/>Cargar logo</Button>
              <p className="text-xs text-gray-400 mt-1.5">PNG o SVG · Máx. 500KB · Recomendado: 200×200px</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Datos generales */}
      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Datos generales</h3></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la organización</label>
              <input value={form.nombre} onChange={f('nombre')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">NIT / RIF</label>
              <input value={form.nit} onChange={f('nit')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Correo institucional</label>
              <input type="email" value={form.email} onChange={f('email')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"/>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
              <input value={form.telefono} onChange={f('telefono')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"/>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Dirección</label>
            <input value={form.direccion} onChange={f('direccion')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"/>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={guardar}><Save size={14}/>Guardar cambios</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function TabNotificaciones() {
  const [notif, setNotif] = useState(NOTIF_DEFAULT)
  const [guardado, setGuardado] = useState(false)

  const toggle = (key: keyof typeof notif) => () =>
    setNotif(prev => ({ ...prev, [key]: !prev[key as keyof typeof notif] }))

  const guardar = () => {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  const Toggle = ({ campo }: { campo: keyof typeof notif }) => (
    <button
      onClick={toggle(campo)}
      className={clsx(
        'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none',
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

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Alertas de cartera</h3></CardHeader>
        <CardBody>
          <Row campo="mora_nueva"      label="Nuevo crédito en mora"    desc="Alerta cuando un crédito entra en mora"/>
          <Row campo="pago_registrado" label="Pago registrado"          desc="Confirmación al registrar un pago"/>
          <Row campo="par_umbral"      label="PAR30 supera umbral"      desc={`Alerta cuando PAR30 > ${notif.par_umbral_valor}%`}/>
          <Row campo="solicitud_nueva" label="Nueva solicitud de crédito" desc="Cuando un facilitador crea una solicitud"/>
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
          <Row campo="canal_email" label="Correo electrónico" desc="Recibe notificaciones en tu email institucional"/>
          <Row campo="canal_push"  label="Notificaciones push" desc="Requiere permisos del navegador"/>
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button onClick={guardar}><Save size={14}/>Guardar preferencias</Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function TabSeguridad() {
  const [mostrarPass, setMostrarPass] = useState(false)
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [guardado, setGuardado] = useState(false)
  const [error, setError]       = useState('')

  const guardar = () => {
    setError('')
    if (!form.actual || !form.nueva) { setError('Completa todos los campos.'); return }
    if (form.nueva !== form.confirmar) { setError('Las contraseñas nuevas no coinciden.'); return }
    if (form.nueva.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    setGuardado(true)
    setForm({ actual: '', nueva: '', confirmar: '' })
    setTimeout(() => setGuardado(false), 3000)
  }

  const Input = ({ label, campo, required }: { label: string; campo: keyof typeof form; required?: boolean }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="relative">
        <input
          type={mostrarPass ? 'text' : 'password'}
          value={form[campo]}
          onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 pr-10"
        />
        <button
          type="button"
          onClick={() => setMostrarPass(v => !v)}
          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
        >
          {mostrarPass ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Contraseña actualizada.</Alert>}
      {error     && <Alert type="error">{error}</Alert>}

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Cambiar contraseña</h3></CardHeader>
        <CardBody className="space-y-4">
          <Input label="Contraseña actual"    campo="actual"    required/>
          <Input label="Nueva contraseña"     campo="nueva"     required/>
          <Input label="Confirmar contraseña" campo="confirmar" required/>
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y un número.
          </div>
          <div className="flex justify-end">
            <Button onClick={guardar}><Save size={14}/>Actualizar contraseña</Button>
          </div>
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
          <p className="text-sm text-gray-500">
            Añade una capa adicional de seguridad con OTP via SMS o aplicación autenticadora.
            Esta funcionalidad estará disponible en la próxima versión.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" disabled>
            <Shield size={13}/>Activar 2FA
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Sesiones activas</h3></CardHeader>
        <CardBody>
          {[
            { dispositivo: 'Chrome · macOS', ip: '192.168.1.45', actual: true,  tiempo: 'Ahora' },
            { dispositivo: 'Safari · iPhone', ip: '181.50.12.33', actual: false, tiempo: 'Hace 2 horas' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{s.dispositivo}</p>
                <p className="text-xs text-gray-400">{s.ip} · {s.tiempo}</p>
              </div>
              {s.actual
                ? <Badge color="green">Sesión actual</Badge>
                : <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">Cerrar</Button>
              }
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────

function TabRegional() {
  const [form, setForm] = useState({
    pais:         'Colombia',
    moneda:       'COP',
    zona_horaria: 'America/Bogota',
    idioma:       'es-CO',
    formato_fecha:'DD/MM/YYYY',
    simbolo:      '$',
  })
  const [guardado, setGuardado] = useState(false)

  const guardar = () => {
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  const Select = ({ label, campo, options }: {
    label: string; campo: keyof typeof form; options: { value: string; label: string }[]
  }) => (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <select
        value={form[campo]}
        onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )

  return (
    <div className="space-y-5">
      {guardado && <Alert type="success"><CheckCircle2 size={14} className="inline mr-1.5"/>Configuración regional guardada.</Alert>}

      <Card>
        <CardHeader><h3 className="text-sm font-semibold text-gray-800">Región y moneda</h3></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="País" campo="pais" options={[
              { value: 'Colombia', label: '🇨🇴 Colombia' },
              { value: 'Venezuela', label: '🇻🇪 Venezuela' },
              { value: 'Ecuador',   label: '🇪🇨 Ecuador'  },
              { value: 'Perú',      label: '🇵🇪 Perú'     },
            ]}/>
            <Select label="Moneda" campo="moneda" options={[
              { value: 'COP', label: 'COP — Peso colombiano' },
              { value: 'VES', label: 'VES — Bolívar venezolano' },
              { value: 'USD', label: 'USD — Dólar americano' },
            ]}/>
            <Select label="Zona horaria" campo="zona_horaria" options={[
              { value: 'America/Bogota',   label: 'América/Bogotá (UTC-5)' },
              { value: 'America/Caracas',  label: 'América/Caracas (UTC-4)' },
              { value: 'America/Lima',     label: 'América/Lima (UTC-5)' },
              { value: 'America/Guayaquil',label: 'América/Guayaquil (UTC-5)' },
            ]}/>
            <Select label="Idioma" campo="idioma" options={[
              { value: 'es-CO', label: 'Español (Colombia)' },
              { value: 'es-VE', label: 'Español (Venezuela)' },
              { value: 'es-ES', label: 'Español (España)' },
            ]}/>
            <Select label="Formato de fecha" campo="formato_fecha" options={[
              { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2026)' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2026)' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2026-12-31)' },
            ]}/>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
            <strong>Vista previa:</strong> Un crédito de <strong>$1.850.000 COP</strong> con fecha de vencimiento <strong>31/12/2026</strong>.
          </div>

          <div className="flex justify-end">
            <Button onClick={guardar}><Save size={14}/>Guardar configuración</Button>
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

  return (
    <Shell>
      <PageContainer>
        <PageHeader title="Configuración" subtitle="Ajustes de la organización y del sistema"/>

        <div className="flex flex-col lg:flex-row gap-5">
          {/* Sidebar de tabs */}
          <nav className="flex lg:flex-col gap-1 lg:w-48 flex-shrink-0 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                  tab === t.id
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {t.icono}{t.label}
              </button>
            ))}
          </nav>

          {/* Contenido */}
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
