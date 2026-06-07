import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Pencil, UserPlus, MapPin, Phone, FileText, Calendar,
  Mail, MessageCircle, PhoneCall, Navigation, StickyNote, Plus, X, Save,
  Signal
} from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { PROSPECTOS, ACTIVIDADES_CRM } from '../../mocks'
import type { ActividadCRM, TipoActividadCRM } from '../../types'

const ESTADO_COLOR = { nuevo: 'blue', contactado: 'yellow', convertido: 'green', descartado: 'gray' } as const
const ESTADO_LABEL = { nuevo: 'Nuevo', contactado: 'Contactado', convertido: 'Convertido', descartado: 'Descartado' }

const CANAL_PREFERIDO_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  email: 'Email',
  visita: 'Visita presencial',
}

const CANAL_CAPTACION_LABEL: Record<string, string> = {
  referido: 'Referido',
  redes_sociales: 'Redes sociales',
  evento: 'Evento / feria',
  visita_facilitador: 'Visita facilitador',
  otro: 'Otro',
}

const TIPO_CONFIG: Record<TipoActividadCRM, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  llamada:  { label: 'Llamada',    icon: <PhoneCall size={14}/>,      color: 'text-blue-600',   bg: 'bg-blue-100' },
  visita:   { label: 'Visita',     icon: <Navigation size={14}/>,     color: 'text-green-600',  bg: 'bg-green-100' },
  whatsapp: { label: 'WhatsApp',   icon: <MessageCircle size={14}/>,  color: 'text-emerald-600',bg: 'bg-emerald-100' },
  nota:     { label: 'Nota interna',icon: <StickyNote size={14}/>,   color: 'text-yellow-600', bg: 'bg-yellow-100' },
}

// Mutable store de actividades para la demo
const actividadesStore: ActividadCRM[] = [...ACTIVIDADES_CRM]
let nextActId = 100

export default function DetalleProspecto() {
  const navigate = useNavigate()
  const { id } = useParams()
  const prospecto = PROSPECTOS.find(p => p.id === id)

  const [actividades, setActividades] = useState<ActividadCRM[]>(
    actividadesStore.filter(a => a.prospecto_id === id)
  )
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [formAct, setFormAct] = useState<{
    tipo: TipoActividadCRM; fecha: string; descripcion: string; resultado: string
  }>({
    tipo: 'llamada',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
    resultado: '',
  })

  const setA = (k: string, v: string) => setFormAct(f => ({ ...f, [k]: v }))

  const guardarActividad = () => {
    if (!formAct.descripcion.trim()) return
    const nueva: ActividadCRM = {
      id: `acrm-${++nextActId}`,
      prospecto_id: id!,
      tipo: formAct.tipo,
      fecha: formAct.fecha,
      descripcion: formAct.descripcion,
      resultado: formAct.resultado || undefined,
      facilitador_id: 'u-03',
    }
    actividadesStore.push(nueva)
    setActividades(prev => [nueva, ...prev])
    setPanelAbierto(false)
    setFormAct({ tipo: 'llamada', fecha: new Date().toISOString().slice(0, 10), descripcion: '', resultado: '' })
  }

  if (!prospecto) {
    return (
      <Shell>
        <PageContainer>
          <Alert type="error">Prospecto no encontrado.</Alert>
          <Button variant="ghost" onClick={() => navigate('/prospectos')} className="mt-4">
            <ArrowLeft size={16} />Volver
          </Button>
        </PageContainer>
      </Shell>
    )
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={prospecto.nombre}
          subtitle="Ficha de prospecto"
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/prospectos')}><ArrowLeft size={16} />Volver</Button>
              <Button variant="secondary" onClick={() => navigate(`/prospectos/${id}/editar`)}><Pencil size={16} />Editar</Button>
              {prospecto.estado !== 'convertido' && (
                <Button onClick={() => navigate(`/clientes/nuevo?prospecto=${id}`)}>
                  <UserPlus size={16} />Convertir a cliente
                </Button>
              )}
            </div>
          }
        />

        {prospecto.estado === 'convertido' && (
          <Alert type="success">Este prospecto ya fue convertido a cliente.</Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-5 mt-4">
          {/* Info principal */}
          <div className="lg:col-span-2 space-y-5">
            {/* Datos personales */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Datos personales</h2>
                  <Badge color={ESTADO_COLOR[prospecto.estado]}>{ESTADO_LABEL[prospecto.estado]}</Badge>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Documento</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">{prospecto.documento}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="text-sm font-medium text-gray-900">{prospecto.telefono}</p>
                    </div>
                  </div>
                  {prospecto.email && (
                    <div className="flex items-start gap-3">
                      <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900">{prospecto.email}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Zona</p>
                      <p className="text-sm font-medium text-gray-900">{prospecto.zona}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Fecha de registro</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(prospecto.fecha_registro).toLocaleDateString('es-CO', { dateStyle: 'long' })}
                      </p>
                    </div>
                  </div>
                  {(prospecto.canal_preferido || prospecto.canal_captacion) && (
                    <div className="flex items-start gap-3">
                      <Signal size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Canal</p>
                        <p className="text-sm font-medium text-gray-900">
                          {prospecto.canal_preferido ? CANAL_PREFERIDO_LABEL[prospecto.canal_preferido] ?? prospecto.canal_preferido : '—'}
                        </p>
                        {prospecto.canal_captacion && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Captación: {CANAL_CAPTACION_LABEL[prospecto.canal_captacion] ?? prospecto.canal_captacion}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Actividades CRM */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Actividades</h2>
                  <Button size="sm" variant="secondary" onClick={() => setPanelAbierto(true)}>
                    <Plus size={14} />Registrar actividad
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {/* Panel nueva actividad */}
                {panelAbierto && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nueva actividad</p>
                      <button onClick={() => setPanelAbierto(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                        <X size={14} />
                      </button>
                    </div>

                    {/* Tipo de actividad */}
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(TIPO_CONFIG) as TipoActividadCRM[]).map(tipo => {
                        const cfg = TIPO_CONFIG[tipo]
                        const sel = formAct.tipo === tipo
                        return (
                          <button
                            key={tipo}
                            onClick={() => setA('tipo', tipo)}
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-colors ${
                              sel
                                ? 'border-brand-400 bg-brand-50 text-brand-700'
                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`${sel ? 'text-brand-600' : cfg.color}`}>{cfg.icon}</span>
                            <span className="text-xs font-medium">{cfg.label}</span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                        <input
                          type="date"
                          value={formAct.fecha}
                          onChange={e => setA('fecha', e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Resultado / próximo paso</label>
                        <input
                          type="text"
                          value={formAct.resultado}
                          onChange={e => setA('resultado', e.target.value)}
                          placeholder="Ej: Visita programada para el viernes"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Descripción *</label>
                      <textarea
                        value={formAct.descripcion}
                        onChange={e => setA('descripcion', e.target.value)}
                        placeholder="Describe qué pasó en esta actividad…"
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setPanelAbierto(false)}>
                        <X size={13}/>Cancelar
                      </Button>
                      <Button size="sm" onClick={guardarActividad} disabled={!formAct.descripcion.trim()}>
                        <Save size={13}/>Guardar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de actividades */}
                {actividades.length === 0 && !panelAbierto && (
                  <div className="py-8 text-center">
                    <MessageCircle size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">Sin actividades registradas</p>
                    <button
                      onClick={() => setPanelAbierto(true)}
                      className="mt-2 text-xs text-brand-600 hover:underline"
                    >
                      + Registrar primera actividad
                    </button>
                  </div>
                )}

                {actividades
                  .sort((a, b) => b.fecha.localeCompare(a.fecha))
                  .map(act => {
                    const cfg = TIPO_CONFIG[act.tipo]
                    return (
                      <div key={act.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                          <span className={cfg.color}>{cfg.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(act.fecha + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{act.descripcion}</p>
                          {act.resultado && (
                            <p className="text-xs text-brand-600 mt-0.5 font-medium">→ {act.resultado}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </CardBody>
            </Card>
          </div>

          {/* Panel lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Acciones rápidas</h2></CardHeader>
              <CardBody className="space-y-2">
                <Button variant="secondary" className="w-full" size="sm" onClick={() => navigate(`/prospectos/${id}/editar`)}>
                  <Pencil size={14} /> Editar datos
                </Button>
                {prospecto.estado !== 'convertido' && (
                  <Button className="w-full" size="sm" onClick={() => navigate(`/clientes/nuevo?prospecto=${id}`)}>
                    <UserPlus size={14} /> Convertir a cliente
                  </Button>
                )}
                <Button variant="secondary" className="w-full" size="sm" onClick={() => setPanelAbierto(true)}>
                  <Plus size={14} /> Registrar actividad
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Resumen CRM</h2></CardHeader>
              <CardBody>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total actividades</span>
                    <span className="font-semibold text-gray-900">{actividades.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Llamadas</span>
                    <span className="font-medium">{actividades.filter(a => a.tipo === 'llamada').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Visitas</span>
                    <span className="font-medium">{actividades.filter(a => a.tipo === 'visita').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">WhatsApp</span>
                    <span className="font-medium">{actividades.filter(a => a.tipo === 'whatsapp').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Notas</span>
                    <span className="font-medium">{actividades.filter(a => a.tipo === 'nota').length}</span>
                  </div>
                  {actividades.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">Último contacto</p>
                      <p className="text-xs font-medium text-gray-700">
                        {new Date(
                          [...actividades].sort((a, b) => b.fecha.localeCompare(a.fecha))[0].fecha + 'T12:00:00'
                        ).toLocaleDateString('es-CO', { dateStyle: 'medium' })}
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
