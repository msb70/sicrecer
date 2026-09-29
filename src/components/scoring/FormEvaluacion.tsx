import { useEffect, useState } from 'react'
import { ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { Button, Card, CardHeader, CardBody, Alert } from '../ui'
import { formatCOP } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { evaluacionVacia, flujoLibre, guardarEvaluacion, obtenerEvaluacion, type Evaluacion } from '../../lib/scoring'

const cls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

/** Visita del asesor: datos que alimentan el scoring FEM (paso 3 de la ruta 1 / paso 4 de la ruta 2). */
export function FormEvaluacion({ solicitudId, editable, onGuardado }: { solicitudId: string; editable: boolean; onGuardado: () => void }) {
  const { modo, usuario } = useApp()
  const [ev, setEv] = useState<Evaluacion>(() => evaluacionVacia(solicitudId))
  const [existe, setExiste] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    if (modo !== 'google') return
    obtenerEvaluacion(solicitudId)
      .then(e => { if (e) { setEv(e); setExiste(true) } else setAbierto(editable) })
      .catch(() => {})
  }, [solicitudId, modo]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Evaluacion>(k: K, v: Evaluacion[K]) => setEv(e => ({ ...e, [k]: v }))
  const num = (k: 'ventas_mensuales' | 'costo_ventas' | 'gastos_negocio' | 'gastos_hogar' | 'otras_cuotas') => (
    <input type="number" min={0} step={1000} className={cls} disabled={!editable}
      value={ev[k] ?? ''} onChange={e => set(k, e.target.value === '' ? (k === 'otras_cuotas' ? 0 : null) : Number(e.target.value))} />
  )
  const check = (k: keyof Evaluacion, texto: string) => (
    <label className="flex items-start gap-2 text-sm text-gray-700">
      <input type="checkbox" className="accent-brand-600 mt-0.5" disabled={!editable} checked={Boolean(ev[k])}
        onChange={e => set(k, e.target.checked as never)} />
      <span>{texto}</span>
    </label>
  )
  const flujo = flujoLibre(ev)

  const guardar = async () => {
    setMsg(null)
    if (modo !== 'google') { setMsg({ tipo: 'error', texto: 'En modo demo no se guardan cambios.' }); return }
    if (ev.ventas_mensuales == null) { setMsg({ tipo: 'error', texto: 'Registra al menos las ventas mensuales verificadas.' }); return }
    setGuardando(true)
    try {
      await guardarEvaluacion({ ...ev, asesor_id: ev.asesor_id ?? usuario?.id ?? null })
      setExiste(true)
      setMsg({ tipo: 'success', texto: 'Evaluación guardada; el preanálisis se recalculó.' })
      onGuardado()
    } catch (e) {
      setMsg({ tipo: 'error', texto: e instanceof Error ? e.message : 'No se pudo guardar la evaluación' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <button className="w-full flex items-center justify-between" onClick={() => setAbierto(a => !a)}>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={15} className="text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-800">Evaluación del asesor (visita)</h2>
            <span className="text-xs text-gray-400">{existe ? `registrada${ev.fecha_visita ? ` el ${new Date(`${ev.fecha_visita}T00:00:00`).toLocaleDateString('es-CO')}` : ''}` : 'pendiente'}</span>
          </div>
          {abierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>
      </CardHeader>
      {abierto && (
        <CardBody className="space-y-5">
          <Seccion titulo="1. Requisitos (obligatorios antes de puntuar)">
            <div className="grid sm:grid-cols-2 gap-3">
              {check('consentimiento_consulta', 'Firmó la autorización de consulta a centrales')}
              {check('requisitos_completos', 'Identidad, documentos del producto y datos mínimos completos y coherentes')}
              <Campo etiqueta="Fecha de la visita">
                <input type="date" className={cls} disabled={!editable} value={ev.fecha_visita ?? ''} onChange={e => set('fecha_visita', e.target.value || null)} />
              </Campo>
              <Campo etiqueta="Destino del crédito">
                <input className={cls} disabled={!editable} value={ev.destino ?? ''} onChange={e => set('destino', e.target.value || null)} placeholder="Ej.: surtido, maquinaria" />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="2. Capacidad tangible (mensual, verificada en la visita)">
            <div className="grid sm:grid-cols-3 gap-3">
              <Campo etiqueta="Ventas">{num('ventas_mensuales')}</Campo>
              <Campo etiqueta="Costo de ventas / insumos">{num('costo_ventas')}</Campo>
              <Campo etiqueta="Gastos del negocio">{num('gastos_negocio')}</Campo>
              <Campo etiqueta="Gastos del hogar">{num('gastos_hogar')}</Campo>
              <Campo etiqueta="Cuotas de otras deudas">{num('otras_cuotas')}</Campo>
              <div className={`p-2.5 rounded-lg border ${flujo > 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <p className="text-xs text-gray-500">Flujo libre</p>
                <p className={`font-bold ${flujo > 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCOP(flujo)}</p>
                <p className="text-xs text-gray-400">Cuota máx. (40 %): {formatCOP(Math.max(0, flujo * 0.4))}</p>
              </div>
              <Campo etiqueta="Inicio del negocio">
                <input type="date" className={cls} disabled={!editable} value={ev.fecha_inicio_negocio ?? ''} onChange={e => set('fecha_inicio_negocio', e.target.value || null)} />
              </Campo>
              <Campo etiqueta="Estabilidad de las ventas">
                <select className={cls} disabled={!editable} value={ev.variabilidad_ventas ?? ''} onChange={e => set('variabilidad_ventas', (e.target.value || null) as Evaluacion['variabilidad_ventas'])}>
                  <option value="">Sin dato</option>
                  <option value="estable">Estables mes a mes</option>
                  <option value="moderada">Varían moderadamente</option>
                  <option value="alta">Muy variables / estacionales</option>
                </select>
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="3. Experiencia crediticia">
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo etiqueta="Consulta externa (con autorización)">
                <select className={cls} disabled={!editable} value={ev.consulta_externa} onChange={e => set('consulta_externa', e.target.value as Evaluacion['consulta_externa'])}>
                  <option value="no_consultada">No consultada</option>
                  <option value="sin_historial">Sin historial</option>
                  <option value="al_dia">Obligaciones al día</option>
                  <option value="reporte_rectificado">Reporte adverso ya rectificado</option>
                  <option value="reporte_negativo_vigente">Reporte adverso vigente</option>
                </select>
              </Campo>
              <Campo etiqueta="Referencias comerciales verificadas">
                <input type="number" min={0} max={10} className={cls} disabled={!editable} value={ev.referencias_verificadas}
                  onChange={e => set('referencias_verificadas', Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
              </Campo>
            </div>
            <p className="text-xs text-gray-400 mt-1">En clientes con créditos en SiCrecer, la experiencia se calcula con sus pagos.</p>
          </Seccion>

          <Seccion titulo="4. Voluntad de pago (solo con evidencia registrada)">
            <p className="text-xs font-medium text-gray-500 mb-1.5">Veracidad comprobada (3 puntos cada una)</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-3">
              {check('ver_identidad', 'Identidad y datos personales coinciden')}
              {check('ver_ventas_soportadas', 'Ventas soportadas con evidencia (cuaderno, facturas, extractos)')}
              {check('ver_referencias', 'Referencias contrastadas')}
              {check('ver_sin_discrepancias', 'Sin discrepancias entre lo declarado y lo observado')}
            </div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Compromisos verificables cumplidos (2 puntos cada uno)</p>
            <div className="grid sm:grid-cols-2 gap-2 mb-3">
              {check('comp_documentos', 'Entregó los documentos en el plazo acordado')}
              {check('comp_citas', 'Cumplió citas y visitas')}
              {check('comp_servicios', 'Servicios o proveedores al día (con soporte)')}
              {check('comp_ahorro_capacitacion', 'Cumplió ahorro programado o capacitación')}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo etiqueta="Fuentes de evidencia (separadas por coma)">
                <input className={cls} disabled={!editable} value={ev.evidencias.join(', ')}
                  onChange={e => set('evidencias', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} placeholder="Cuaderno de ventas, facturas…" />
              </Campo>
              <Campo etiqueta="Discrepancias verificadas">
                <input className={cls} disabled={!editable} value={ev.discrepancias ?? ''} onChange={e => set('discrepancias', e.target.value || null)} />
              </Campo>
            </div>
            <Campo etiqueta="Observaciones">
              <textarea rows={2} className={cls} disabled={!editable} value={ev.observaciones ?? ''} onChange={e => set('observaciones', e.target.value || null)} />
            </Campo>
          </Seccion>

          {msg && <Alert type={msg.tipo}>{msg.texto}</Alert>}
          {editable && (
            <div className="flex justify-end">
              <Button onClick={guardar} loading={guardando}><ClipboardCheck size={15} />{existe ? 'Actualizar evaluación' : 'Guardar evaluación'}</Button>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <div><p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">{titulo}</p>{children}</div>
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs text-gray-600 block mb-1">{etiqueta}</span>{children}</label>
}
