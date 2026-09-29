import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Wallet, MapPin, Repeat, CheckCircle2, Clock, Phone } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge, Button, Card, Alert, Spinner } from '../../components/ui'
import { useApp, usePermiso } from '../../context/AppContext'
import { CREDITOS, CLIENTES, formatCOP } from '../../mocks'
import { VISITAS, type Visita } from '../../mocks/extra'
import { coincide, filaDeCredito, type FiltrosCartera } from '../../lib/filtros'
import { cifraCorta } from '../../lib/dashboard'
import { ETIQUETA_PRE, type FilaRenovacion } from '../../lib/agenda'
import {
  cargarCuotas, diasVisibles, iso, deIso, mover, titulo, tipoCuota, COLORES, type CuotaCal, type Vista,
} from '../../lib/calendario'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface Evento {
  fecha: string
  tipo: keyof typeof COLORES
  cuota?: CuotaCal & { cliente: string; cliente_id?: string; telefono?: string | null }
  visita?: Visita
  renovacion?: FilaRenovacion
}

export default function TabCalendario({ filtros, renovacion }: { filtros: FiltrosCartera; renovacion: FilaRenovacion[] }) {
  const { modo } = useApp()
  const hoy = iso(new Date())
  const [vista, setVista] = useState<Vista>(() => (window.innerWidth < 640 ? 'dia' : 'mes'))
  const [ancla, setAncla] = useState(() => new Date())
  const [seleccion, setSeleccion] = useState(hoy)
  const [cuotas, setCuotas] = useState<CuotaCal[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const dias = useMemo(() => diasVisibles(ancla, vista), [ancla, vista])
  const desde = iso(dias[0]), hasta = iso(dias[dias.length - 1])

  useEffect(() => {
    if (modo !== 'google') return
    let vivo = true
    setCargando(true); setError('')
    cargarCuotas(desde, hasta)
      .then(c => { if (vivo) setCuotas(c) })
      .catch(e => { if (vivo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las cuotas') })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [desde, hasta, modo])

  // Eventos del rango visible, ya filtrados por convenio/zona/facilitador/actividad/producto
  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>()
    const add = (e: Evento) => { if (e.fecha >= desde && e.fecha <= hasta) m.set(e.fecha, [...(m.get(e.fecha) ?? []), e]) }
    for (const c of cuotas) {
      const cr = CREDITOS.find(x => x.id === c.credito_id)
      if (cr && !coincide(filaDeCredito(cr), filtros, cr.cliente_nombre)) continue
      if (!cr && (filtros.texto || filtros.convenio_id || filtros.zona_id || filtros.facilitador_id)) continue
      const cli = cr ? CLIENTES.find(x => x.id === cr.cliente_id) : undefined
      add({ fecha: c.fecha_vencimiento, tipo: tipoCuota(c, hoy), cuota: { ...c, cliente: cr?.cliente_nombre ?? c.credito_id, cliente_id: cr?.cliente_id, telefono: cli?.telefono ?? null } })
    }
    for (const v of VISITAS) {
      if (!coincide({ zona: v.zona, facilitador_id: v.facilitador_id ?? null }, filtros, v.cliente_nombre)) continue
      add({ fecha: v.fecha, tipo: 'visita', visita: v })
    }
    for (const r of renovacion) if (r.fecha_fin) add({ fecha: r.fecha_fin.slice(0, 10), tipo: 'renovacion', renovacion: r })
    return m
  }, [cuotas, renovacion, filtros, desde, hasta, hoy])

  const irHoy = () => { setAncla(new Date()); setSeleccion(hoy) }
  const elegir = (d: string) => { setSeleccion(d); if (vista !== 'mes' && vista !== 'semana') setAncla(deIso(d)) }
  const cambiarVista = (v: Vista) => { setVista(v); setAncla(deIso(seleccion)) }
  const navegar = (paso: number) => {
    const nueva = mover(ancla, vista, paso)
    setAncla(nueva)
    if (vista === 'dia') setSeleccion(iso(nueva))
  }

  return (
    <div>
      {/* Barra del calendario */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={irHoy}>Hoy</Button>
          <button onClick={() => navegar(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Anterior"><ChevronLeft size={18} /></button>
          <button onClick={() => navegar(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Siguiente"><ChevronRight size={18} /></button>
          <h2 className="text-base font-semibold text-gray-900">{titulo(ancla, vista)}</h2>
          {cargando && <Spinner size="sm" />}
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 self-start">
          {(['dia', 'semana', 'mes'] as Vista[]).map(v => (
            <button key={v} onClick={() => cambiarVista(v)}
              className={clsx('px-3 py-1.5 text-xs font-medium rounded-md', vista === v ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-600">
        {Object.values(COLORES).map(c => <span key={c.etiqueta} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${c.punto}`} />{c.etiqueta}</span>)}
      </div>

      {error && <Alert type="error" className="mb-3">{error}</Alert>}
      {modo !== 'google' && <Alert type="info" className="mb-3">Las cuotas del calendario se leen de la base de datos; en modo demo solo se ven las visitas.</Alert>}

      {vista === 'dia' ? (
        <DetalleDia fecha={seleccion} eventos={porDia.get(seleccion) ?? []} hoy={hoy} grande />
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {vista === 'mes'
              ? <Mes dias={dias} mesActual={ancla.getMonth()} porDia={porDia} hoy={hoy} seleccion={seleccion} onElegir={elegir} />
              : <Semana dias={dias} porDia={porDia} hoy={hoy} seleccion={seleccion} onElegir={elegir} />}
          </div>
          <DetalleDia fecha={seleccion} eventos={porDia.get(seleccion) ?? []} hoy={hoy} />
        </div>
      )}
    </div>
  )
}

// ─── Resumen compacto de un día (para celdas) ────────────────
function resumen(eventos: Evento[]) {
  const r = { vencida: { n: 0, m: 0 }, por_cobrar: { n: 0, m: 0 }, pagada: { n: 0, m: 0 }, visita: { n: 0, m: 0 }, renovacion: { n: 0, m: 0 } }
  for (const e of eventos) {
    r[e.tipo].n++
    if (e.cuota) r[e.tipo].m += e.tipo === 'pagada' ? e.cuota.monto_pagado || e.cuota.cuota : Math.max(0, e.cuota.cuota - e.cuota.monto_pagado)
  }
  return r
}

function Mes({ dias, mesActual, porDia, hoy, seleccion, onElegir }: {
  dias: Date[]; mesActual: number; porDia: Map<string, Evento[]>; hoy: string; seleccion: string; onElegir: (d: string) => void
}) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        {DIAS.map(d => <div key={d} className="px-2 py-2 text-xs font-semibold text-gray-500 text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {dias.map(d => {
          const f = iso(d)
          const r = resumen(porDia.get(f) ?? [])
          const fuera = d.getMonth() !== mesActual
          return (
            <button key={f} onClick={() => onElegir(f)}
              className={clsx('min-h-[92px] p-1.5 border-b border-r border-gray-100 text-left align-top transition-colors flex flex-col gap-1',
                fuera ? 'bg-gray-50/60' : 'bg-white', seleccion === f ? 'ring-2 ring-inset ring-brand-500 bg-brand-50/40' : 'hover:bg-gray-50')}>
              <span className={clsx('text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                f === hoy ? 'bg-brand-600 text-white' : fuera ? 'text-gray-300' : 'text-gray-700')}>{d.getDate()}</span>
              {r.vencida.n > 0 && <Chip tipo="vencida">{r.vencida.n} venc. · {cifraCorta(r.vencida.m)}</Chip>}
              {r.por_cobrar.n > 0 && <Chip tipo="por_cobrar">{r.por_cobrar.n} cobro{r.por_cobrar.n > 1 ? 's' : ''} · {cifraCorta(r.por_cobrar.m)}</Chip>}
              {r.visita.n > 0 && <Chip tipo="visita">{r.visita.n} visita{r.visita.n > 1 ? 's' : ''}</Chip>}
              {r.renovacion.n > 0 && <Chip tipo="renovacion">{r.renovacion.n} renovar</Chip>}
              {r.pagada.n > 0 && <span className="flex items-center gap-1 text-[10px] text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{r.pagada.n} pagada{r.pagada.n > 1 ? 's' : ''}</span>}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function Chip({ tipo, children }: { tipo: keyof typeof COLORES; children: ReactNode }) {
  return <span className={clsx('hidden sm:block text-[10px] leading-tight px-1.5 py-0.5 rounded border truncate', COLORES[tipo].chip)}>{children}</span>
}

function Semana({ dias, porDia, hoy, seleccion, onElegir }: {
  dias: Date[]; porDia: Map<string, Evento[]>; hoy: string; seleccion: string; onElegir: (d: string) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {dias.map((d, i) => {
        const f = iso(d)
        const ev = (porDia.get(f) ?? []).filter(e => e.tipo !== 'pagada')
        const pagadas = (porDia.get(f) ?? []).length - ev.length
        return (
          <button key={f} onClick={() => onElegir(f)}
            className={clsx('text-left rounded-xl border bg-white p-2 min-h-[180px] flex flex-col gap-1 transition-colors',
              seleccion === f ? 'border-brand-500 ring-2 ring-brand-200' : 'border-gray-200 hover:border-gray-300')}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{DIAS[i]}</span>
              <span className={clsx('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full', f === hoy ? 'bg-brand-600 text-white' : 'text-gray-800')}>{d.getDate()}</span>
            </div>
            {ev.slice(0, 6).map((e, k) => (
              <span key={k} className={clsx('text-[11px] leading-tight px-1.5 py-1 rounded border truncate', COLORES[e.tipo].chip)}>
                {e.visita ? `${e.visita.hora ?? ''} ${e.visita.cliente_nombre}` : e.renovacion ? e.renovacion.cliente_nombre : e.cuota?.cliente}
              </span>
            ))}
            {ev.length > 6 && <span className="text-[11px] text-gray-500">+{ev.length - 6} más</span>}
            {pagadas > 0 && <span className="text-[11px] text-green-700 mt-auto">{pagadas} pagada{pagadas > 1 ? 's' : ''}</span>}
          </button>
        )
      })}
    </div>
  )
}

// ─── Detalle del día seleccionado ─────────────────────────────
function DetalleDia({ fecha, eventos, hoy, grande = false }: { fecha: string; eventos: Evento[]; hoy: string; grande?: boolean }) {
  const navigate = useNavigate()
  const puedeCobrar = usePermiso('cobranza').editar
  const puedeSolicitar = usePermiso('solicitudes').editar
  const cobros = eventos.filter(e => e.tipo === 'vencida' || e.tipo === 'por_cobrar')
  const pagadas = eventos.filter(e => e.tipo === 'pagada')
  const visitas = eventos.filter(e => e.tipo === 'visita').sort((a, b) => (a.visita!.hora ?? '').localeCompare(b.visita!.hora ?? ''))
  const renov = eventos.filter(e => e.tipo === 'renovacion')
  const porCobrar = cobros.reduce((s, e) => s + Math.max(0, e.cuota!.cuota - e.cuota!.monto_pagado), 0)
  const cobrado = pagadas.reduce((s, e) => s + (e.cuota!.monto_pagado || e.cuota!.cuota), 0)
  const larga = deIso(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
  const etiqueta = fecha === hoy ? `Hoy · ${larga}` : larga.charAt(0).toUpperCase() + larga.slice(1)

  return (
    <Card className={clsx('h-fit', !grande && 'lg:sticky lg:top-4')}>
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{etiqueta}</p>
        <p className="text-xs text-gray-500">
          {eventos.length === 0 ? 'Sin compromisos' : [
            cobros.length && `${cobros.length} por cobrar (${formatCOP(porCobrar)})`,
            pagadas.length && `${pagadas.length} pagada${pagadas.length > 1 ? 's' : ''} (${formatCOP(cobrado)})`,
            visitas.length && `${visitas.length} visita${visitas.length > 1 ? 's' : ''}`,
            renov.length && `${renov.length} por renovar`,
          ].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className={clsx('divide-y divide-gray-50', !grande && 'max-h-[70vh] overflow-y-auto')}>
        {cobros.length > 0 && <Seccion icono={<Wallet size={14} className="text-amber-600" />} titulo="Cuotas por cobrar">
          {cobros.map(e => {
            const c = e.cuota!
            const saldo = Math.max(0, c.cuota - c.monto_pagado)
            return (
              <Fila key={`${c.credito_id}-${c.num}`} punto={COLORES[e.tipo].punto}
                titulo={c.cliente} sub={`Cuota ${c.num}${c.monto_pagado > 0 ? ` · abonado ${formatCOP(c.monto_pagado)}` : ''}${e.tipo === 'vencida' ? ' · vencida' : ''}`}
                derecha={<span className={clsx('text-sm font-semibold', e.tipo === 'vencida' ? 'text-red-600' : 'text-gray-900')}>{formatCOP(saldo)}</span>}
                acciones={<>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/cartera/${c.credito_id}`)}>Ver crédito</Button>
                  {puedeCobrar && <Button size="sm" onClick={() => navigate(`/cobranza/nueva?credito=${encodeURIComponent(c.credito_id)}`)}>Registrar pago</Button>}
                  {c.telefono && <a href={`tel:${c.telefono}`} className="text-xs text-brand-700 flex items-center gap-1"><Phone size={12} />{c.telefono}</a>}
                </>} />
            )
          })}
        </Seccion>}

        {visitas.length > 0 && <Seccion icono={<MapPin size={14} className="text-blue-600" />} titulo="Visitas">
          {visitas.map(e => {
            const v = e.visita!
            return (
              <Fila key={v.id} punto={COLORES.visita.punto}
                titulo={`${v.hora ? `${v.hora} · ` : ''}${v.cliente_nombre}`} sub={`${v.tipo}${v.motivo ? ` · ${v.motivo}` : ''}${v.zona ? ` · ${v.zona}` : ''}`}
                derecha={v.estado === 'realizada'
                  ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={13} />Realizada</span>
                  : <span className="text-xs text-amber-600 flex items-center gap-1"><Clock size={13} />{v.estado === 'reprogramada' ? 'Reprogramada' : 'Pendiente'}</span>}
                acciones={v.nota ? <span className="text-xs text-gray-500 italic">“{v.nota}”</span> : undefined} />
            )
          })}
        </Seccion>}

        {renov.length > 0 && <Seccion icono={<Repeat size={14} className="text-purple-600" />} titulo="Créditos que terminan (renovación)">
          {renov.map(e => {
            const r = e.renovacion!
            const pre = ETIQUETA_PRE[r.scoring?.preaprobacion ?? 'pendiente_visita']
            return (
              <Fila key={r.credito_id} punto={COLORES.renovacion.punto}
                titulo={r.cliente_nombre} sub={`${r.producto_nombre ?? ''} · ${r.cuotas_restantes} cuota(s) restante(s)`}
                derecha={<Badge color={pre.color}>{pre.texto}</Badge>}
                acciones={!r.tiene_solicitud_abierta && puedeSolicitar && r.scoring?.preaprobacion !== 'no_preaprobado'
                  ? <Button size="sm" onClick={() => navigate(`/solicitudes/nueva?cliente=${encodeURIComponent(r.cliente_id)}`)}>Crear solicitud</Button>
                  : r.tiene_solicitud_abierta ? <span className="text-xs text-blue-600">Ya tiene solicitud en curso</span> : undefined} />
            )
          })}
        </Seccion>}

        {pagadas.length > 0 && <Seccion icono={<CheckCircle2 size={14} className="text-green-600" />} titulo="Cuotas pagadas">
          {pagadas.map(e => (
            <Fila key={`${e.cuota!.credito_id}-${e.cuota!.num}`} punto={COLORES.pagada.punto}
              titulo={e.cuota!.cliente} sub={`Cuota ${e.cuota!.num}${e.cuota!.pagada_en ? ` · pagada el ${deIso(e.cuota!.pagada_en).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}` : ''}`}
              derecha={<span className="text-sm text-green-700">{formatCOP(e.cuota!.monto_pagado || e.cuota!.cuota)}</span>} />
          ))}
        </Seccion>}

        {eventos.length === 0 && <p className="px-4 py-10 text-center text-sm text-gray-400">No hay cuotas, visitas ni renovaciones este día.</p>}
      </div>
    </Card>
  )
}

function Seccion({ icono, titulo, children }: { icono: ReactNode; titulo: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">{icono}{titulo}</p>
      <div>{children}</div>
    </div>
  )
}

function Fila({ punto, titulo, sub, derecha, acciones }: { punto: string; titulo: string; sub?: string; derecha?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="px-4 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${punto}`} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{titulo}</p>
            {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
          </div>
        </div>
        <div className="shrink-0">{derecha}</div>
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-4">{acciones}</div>}
    </div>
  )
}
