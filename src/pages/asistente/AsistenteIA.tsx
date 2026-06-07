import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, TrendingUp, AlertTriangle, DollarSign, Users } from 'lucide-react'
import { Shell, PageContainer } from '../../components/layout/Shell'
import { Button, Card } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { KPI_REPORTES } from '../../mocks/extra'
import { CREDITOS, CLIENTES, formatCOP } from '../../mocks'
import { clsx } from 'clsx'

// ─── Tipos ────────────────────────────────────────────────────

interface Mensaje {
  id: string
  rol: 'usuario' | 'asistente'
  texto: string
  timestamp: Date
}

// ─── Motor de respuestas mock ─────────────────────────────────

const RESPUESTAS: Array<{ triggers: string[]; respuesta: (ctx: MsgContext) => string }> = [
  {
    triggers: ['mora', 'morosidad', 'par', 'vencid'],
    respuesta: () =>
      `📊 **Situación de mora actual:**\n\n` +
      `• PAR 30: **${KPI_REPORTES.par_30}%** (cartera con +30 días mora)\n` +
      `• PAR 90: **${KPI_REPORTES.par_90}%** (cartera con +90 días mora)\n` +
      `• Créditos en mora: **${KPI_REPORTES.creditos_mora}**\n\n` +
      `El PAR30 supera el umbral de referencia (5%). Te recomiendo priorizar las visitas de cobranza en Zona Centro, donde el indicador es más alto (8.2%).`,
  },
  {
    triggers: ['cartera', 'portafolio', 'saldo'],
    respuesta: () =>
      `💼 **Resumen de cartera:**\n\n` +
      `• Cartera total: **${formatCOP(KPI_REPORTES.cartera_total)}**\n` +
      `• Créditos activos: **${KPI_REPORTES.creditos_activos}**\n` +
      `• Desembolsos este mes: **${formatCOP(KPI_REPORTES.desembolsos_mes)}**\n` +
      `• Tasa de recuperación: **${KPI_REPORTES.tasa_recuperacion}%**\n\n` +
      `La tendencia de desembolsos muestra crecimiento de +14% vs. el mes anterior.`,
  },
  {
    triggers: ['cliente', 'clientes', 'cuántos clientes'],
    respuesta: () => {
      const activos = CLIENTES.filter(c => c.creditos_activos > 0).length
      return (
        `👥 **Base de clientes:**\n\n` +
        `• Total de clientes registrados: **${CLIENTES.length}**\n` +
        `• Con crédito activo: **${activos}**\n` +
        `• Sin crédito activo: **${CLIENTES.length - activos}**\n\n` +
        `Los clientes con mayor tiempo sin actividad son candidatos para visitas de reactivación.`
      )
    },
  },
  {
    triggers: ['credito', 'crédito', 'préstamo', 'desembolso'],
    respuesta: () => {
      const enMora = CREDITOS.filter(c => c.dias_mora > 0)
      return (
        `📋 **Estado de créditos:**\n\n` +
        `• Total créditos: **${CREDITOS.length}**\n` +
        `• Al día: **${CREDITOS.filter(c => c.estado === 'al_dia').length}**\n` +
        `• Activos: **${CREDITOS.filter(c => c.estado === 'activo').length}**\n` +
        `• En mora: **${enMora.length}** (${enMora.map(c => c.cliente_nombre.split(' ')[0]).join(', ')})\n\n` +
        `El crédito de mayor riesgo acumula **${Math.max(...CREDITOS.map(c => c.dias_mora))} días** de mora.`
      )
    },
  },
  {
    triggers: ['zona', 'zonas', 'territorio', 'región'],
    respuesta: () =>
      `🗺️ **PAR por zona:**\n\n` +
      KPI_REPORTES.par_zona.map(z =>
        `• **${z.zona}**: PAR30 ${z.par30}% · Cartera ${formatCOP(z.cartera)}`
      ).join('\n') +
      `\n\nZona Centro requiere atención inmediata con PAR30 de 8.2%, por encima del umbral crítico.`,
  },
  {
    triggers: ['desembolso', 'desembolsos', 'trend', 'tendencia'],
    respuesta: () =>
      `📈 **Tendencia de desembolsos (últimos 6 meses):**\n\n` +
      KPI_REPORTES.tendencia_desembolsos.map(d =>
        `• **${d.mes}**: ${formatCOP(d.monto)}`
      ).join('\n') +
      `\n\nMayo fue el mes de mayor actividad. Junio mantiene un ritmo similar.`,
  },
  {
    triggers: ['visita', 'visitas', 'agenda', 'campo'],
    respuesta: () =>
      `📅 **Sugerencias de visita de campo:**\n\n` +
      `Basándome en el estado actual de la cartera, prioriza:\n\n` +
      `1. **Carmen Reyes** — 17 días en mora (cobranza urgente)\n` +
      `2. **Rosa Martínez** — cuota 4 próxima (seguimiento preventivo)\n` +
      `3. **María Pérez** — prospecto con evaluación pendiente\n\n` +
      `Puedes ver y gestionar estas visitas desde la sección **Agenda**.`,
  },
  {
    triggers: ['hola', 'buenos días', 'buenas', 'ayuda', 'qué puedes'],
    respuesta: ({ usuario }) =>
      `¡Hola, **${usuario}**! 👋 Soy el Asistente IA de SiCrecer.\n\n` +
      `Puedo ayudarte con:\n\n` +
      `• 📊 Indicadores de cartera (PAR30, PAR90, mora)\n` +
      `• 👥 Estado de clientes y créditos\n` +
      `• 📅 Sugerencias de visitas de campo\n` +
      `• 📈 Tendencias y desembolsos\n` +
      `• 🗺️ Análisis por zona\n\n` +
      `¿Por dónde empezamos?`,
  },
  {
    triggers: ['gracias', 'thanks', 'perfecto', 'excelente'],
    respuesta: () =>
      `Con gusto. Si necesitas cualquier otro análisis o consulta sobre la cartera, aquí estaré. 🤝`,
  },
]

interface MsgContext { usuario: string }

function generarRespuesta(texto: string, ctx: MsgContext): string {
  const lower = texto.toLowerCase()
  for (const r of RESPUESTAS) {
    if (r.triggers.some(t => lower.includes(t))) {
      return r.respuesta(ctx)
    }
  }
  return (
    `Entendí tu consulta sobre: **"${texto}"**\n\n` +
    `En este momento puedo responder sobre mora, cartera, clientes, créditos, zonas y agenda de campo. ` +
    `¿Podrías reformular la pregunta con alguna de estas categorías?`
  )
}

// ─── Chips de acciones rápidas ────────────────────────────────

const ACCIONES_RAPIDAS = [
  { icono: <AlertTriangle size={13}/>, texto: '¿Cuántos créditos en mora?' },
  { icono: <TrendingUp size={13}/>,    texto: '¿Cuál es el PAR30 actual?' },
  { icono: <DollarSign size={13}/>,    texto: 'Resumen de cartera' },
  { icono: <Users size={13}/>,         texto: '¿Cuántos clientes activos?' },
]

// ─── Componente de mensaje ────────────────────────────────────

function BurbujaMensaje({ msg }: { msg: Mensaje }) {
  const esAsistente = msg.rol === 'asistente'

  // Formateo simple de **negrita** y saltos de línea
  const formatearTexto = (txt: string) => {
    return txt.split('\n').map((linea, i) => {
      const partes = linea.split(/(\*\*[^*]+\*\*)/g)
      return (
        <span key={i} className="block">
          {partes.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          )}
        </span>
      )
    })
  }

  return (
    <div className={clsx('flex gap-3 mb-4', !esAsistente && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        esAsistente ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-600'
      )}>
        {esAsistente ? <Bot size={16}/> : <User size={16}/>}
      </div>

      {/* Burbuja */}
      <div className={clsx(
        'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        esAsistente
          ? 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
          : 'bg-brand-600 text-white rounded-tr-sm'
      )}>
        {formatearTexto(msg.texto)}
        <p className={clsx('text-xs mt-2', esAsistente ? 'text-gray-400' : 'text-brand-200')}>
          {msg.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────

export default function AsistenteIA() {
  const { usuario } = useApp()
  const nombreUsuario = usuario?.nombre ?? 'coordinador'
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'bienvenida',
      rol: 'asistente',
      texto:
        `¡Hola, **${nombreUsuario}**! 👋 Soy el Asistente IA de SiCrecer.\n\n` +
        `Puedo responder preguntas sobre tu cartera, clientes en mora, tendencias de desembolsos y agenda de campo. ` +
        `Usa los accesos rápidos o escribe tu consulta.`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const enviar = (texto: string) => {
    if (!texto.trim() || cargando) return

    const msgUsuario: Mensaje = {
      id:        `u-${Date.now()}`,
      rol:       'usuario',
      texto:     texto.trim(),
      timestamp: new Date(),
    }

    setMensajes(prev => [...prev, msgUsuario])
    setInput('')
    setCargando(true)

    // Simular latencia de respuesta
    setTimeout(() => {
      const respuesta = generarRespuesta(texto, { usuario: nombreUsuario })
      setMensajes(prev => [...prev, {
        id:        `a-${Date.now()}`,
        rol:       'asistente',
        texto:     respuesta,
        timestamp: new Date(),
      }])
      setCargando(false)
    }, 600 + Math.random() * 400)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar(input)
    }
  }

  return (
    <Shell>
      <div className="flex flex-col h-[calc(100vh-0px)] max-h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-gray-100 bg-white">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
              <Bot size={18} className="text-brand-600"/>
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                Asistente IA
                <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  <Sparkles size={10}/>Beta
                </span>
              </h1>
              <p className="text-xs text-gray-400">Consultas sobre tu cartera y gestión de campo</p>
            </div>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto py-5 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            {mensajes.map(m => <BurbujaMensaje key={m.id} msg={m}/>)}

            {/* Indicador de escritura */}
            {cargando && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={16}/>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
        </div>

        {/* Acciones rápidas + Input */}
        <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto">
            {/* Chips */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {ACCIONES_RAPIDAS.map(a => (
                <button
                  key={a.texto}
                  onClick={() => enviar(a.texto)}
                  disabled={cargando}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-colors disabled:opacity-40"
                >
                  {a.icono}{a.texto}
                </button>
              ))}
            </div>

            {/* Caja de texto */}
            <div className="flex gap-3 items-end">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu consulta… (Enter para enviar)"
                disabled={cargando}
                className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none resize-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50 disabled:text-gray-400 min-h-[46px] max-h-32 overflow-y-auto"
                style={{ height: 'auto' }}
                onInput={e => {
                  const t = e.currentTarget
                  t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`
                }}
              />
              <Button
                onClick={() => enviar(input)}
                disabled={!input.trim() || cargando}
                className="flex-shrink-0"
              >
                <Send size={15}/>
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Las respuestas son generadas con datos locales de tu organización.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  )
}
