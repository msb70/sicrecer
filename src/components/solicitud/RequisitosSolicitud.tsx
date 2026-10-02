import { useEffect, useState } from 'react'
import { CheckCircle2, Paperclip, Upload, Eye, Trash2, XCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { Alert } from '../ui'
import { REQUISITOS, formatCOP } from '../../mocks'
import { abrirDataUrl, TEXTO_REQUISITO_MAX } from '../../lib/portal'
import {
  esEscrito, parsearMonto, respuestaCubre, borradorCubre, listarRespuestas, guardarRespuesta,
  eliminarRespuesta, obtenerArchivo, type RespuestaSolicitud, type BorradorRequisito,
} from '../../lib/requisitosSolicitud'
import { TIPO_REQUISITO_LABELS, type ProductoCredito, type Requisito } from '../../types'

export function requisitosDeProducto(producto?: ProductoCredito): Requisito[] {
  return (producto?.requisito_ids ?? []).map(id => REQUISITOS.find(r => r.id === id)).filter(Boolean) as Requisito[]
}

// ─── Fila de un requisito (presentación) ──────────────────────
function FilaRequisito(props: {
  r: Requisito
  ok: boolean
  editable: boolean
  ocupado?: boolean
  /** Nombre del archivo actual (requisitos de archivo) */
  archivo?: string | null
  valor: string
  onValor?: (v: string) => void
  onSalir?: () => void
  onArchivo?: (f: File) => void
  onVer?: () => void
  onQuitar?: () => void
}) {
  const { r, ok, editable, ocupado, archivo, valor } = props
  const escrito = esEscrito(r)
  return (
    <div className={clsx('p-3 rounded-lg border', ok ? 'bg-green-50 border-green-200' : r.obligatorio ? 'border-red-200' : 'border-gray-200')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
            {ok ? <CheckCircle2 size={15} className="text-green-600 shrink-0" /> : r.obligatorio ? <XCircle size={15} className="text-red-500 shrink-0" /> : <Paperclip size={15} className="text-gray-400 shrink-0" />}
            {r.nombre} {r.obligatorio && <span className="text-xs text-red-600">(obligatorio)</span>}
            <span className="text-[11px] text-gray-400 font-normal">· {TIPO_REQUISITO_LABELS[r.tipo ?? 'archivo']}</span>
          </p>
          {r.descripcion && <p className="text-xs text-gray-500 mt-0.5">{r.descripcion}</p>}
          {!escrito && archivo && <p className="text-xs text-gray-600 mt-1 truncate">Adjunto: {archivo}</p>}
        </div>
        {!escrito && (
          <div className="flex items-center gap-1 shrink-0">
            {archivo && props.onVer && <button type="button" onClick={props.onVer} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Ver"><Eye size={15} /></button>}
            {archivo && editable && props.onQuitar && <button type="button" onClick={props.onQuitar} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Quitar"><Trash2 size={15} /></button>}
            {editable && (
              <label className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer', ocupado ? 'opacity-60' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')}>
                <Upload size={14} /> {ocupado ? 'Subiendo…' : archivo ? 'Reemplazar' : 'Adjuntar'}
                <input type="file" accept="image/*,application/pdf" className="hidden" disabled={ocupado}
                  onChange={e => { const f = e.target.files?.[0]; if (f) props.onArchivo?.(f); e.target.value = '' }} />
              </label>
            )}
            {!editable && !archivo && <span className="text-xs text-gray-400">sin adjunto</span>}
          </div>
        )}
      </div>
      {escrito && (
        <div className="mt-2">
          {!editable ? (
            valor
              ? <p className={clsx('text-sm text-gray-800', r.tipo === 'texto' && 'whitespace-pre-wrap bg-white rounded p-2 border border-gray-100')}>{r.tipo === 'monto' ? formatCOP(parsearMonto(valor) ?? 0) : valor}</p>
              : <p className="text-xs text-gray-400">sin dato</p>
          ) : r.tipo === 'monto' ? (
            <div className="flex items-center gap-2">
              <input type="text" inputMode="decimal" placeholder="Ej: 1500000" value={valor}
                onChange={e => props.onValor?.(e.target.value)} onBlur={props.onSalir}
                className="w-48 px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {parsearMonto(valor) != null && <span className="text-xs text-gray-500">{formatCOP(parsearMonto(valor)!)}</span>}
              {valor.trim() && parsearMonto(valor) == null && <span className="text-xs text-red-600">Monto no válido</span>}
            </div>
          ) : (
            <>
              <textarea rows={3} maxLength={TEXTO_REQUISITO_MAX} placeholder="Escribe aquí la respuesta" value={valor}
                onChange={e => props.onValor?.(e.target.value)} onBlur={props.onSalir}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <p className="text-[11px] text-gray-400 text-right">{valor.length}/{TEXTO_REQUISITO_MAX}</p>
            </>
          )}
          {ocupado && <p className="text-xs text-gray-400 mt-1">Guardando…</p>}
        </div>
      )}
    </div>
  )
}

// ─── Formulario de nueva solicitud: estado local ──────────────
export function RequisitosBorrador({ requisitos, borradores, onChange }: {
  requisitos: Requisito[]
  borradores: Record<string, BorradorRequisito>
  onChange: (id: string, b: BorradorRequisito | undefined) => void
}) {
  if (requisitos.length === 0) return <p className="text-sm text-gray-500">Este producto no tiene requisitos.</p>
  const ver = (f: File) => {
    const url = URL.createObjectURL(f)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  return (
    <div className="space-y-3">
      {requisitos.map(r => {
        const b = borradores[r.id]
        return (
          <FilaRequisito key={r.id} r={r} ok={borradorCubre(r, b)} editable
            archivo={b?.archivo?.name ?? null} valor={b?.valor ?? ''}
            onValor={v => onChange(r.id, { valor: v })}
            onArchivo={f => onChange(r.id, { archivo: f })}
            onVer={b?.archivo ? () => ver(b.archivo!) : undefined}
            onQuitar={() => onChange(r.id, undefined)} />
        )
      })}
    </div>
  )
}

// ─── Solicitud ya creada: lee/escribe en la BD ────────────────
export function RequisitosSolicitud({ solicitudId, producto, editable }: {
  solicitudId: string
  producto?: ProductoCredito
  editable: boolean
}) {
  const requisitos = requisitosDeProducto(producto)
  const [respuestas, setRespuestas] = useState<RespuestaSolicitud[]>([])
  const [borradores, setBorradores] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listarRespuestas(solicitudId).then(setRespuestas).catch(e => setError(e.message))
  }, [solicitudId])

  if (requisitos.length === 0) return <p className="text-xs text-gray-400">El producto no tiene requisitos.</p>

  const valorGuardado = (r: Requisito) => {
    const a = respuestas.find(x => x.requisito_id === r.id)
    if (!a) return ''
    return r.tipo === 'monto' ? (a.valor_numero != null ? String(a.valor_numero) : '') : (a.valor_texto ?? '')
  }

  const guardar = async (r: Requisito, b: BorradorRequisito) => {
    setOcupado(r.id); setError('')
    try {
      const nueva = await guardarRespuesta(solicitudId, r, b)
      setRespuestas(rs => [...rs.filter(x => x.requisito_id !== r.id), ...(nueva ? [nueva] : [])])
      setBorradores(bs => { const n = { ...bs }; delete n[r.id]; return n })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setOcupado(null)
    }
  }

  const salir = (r: Requisito) => {
    const v = borradores[r.id]
    if (v === undefined || v.trim() === valorGuardado(r).trim()) return
    void guardar(r, { valor: v })
  }

  const quitar = async (r: Requisito) => {
    setError('')
    try {
      await eliminarRespuesta(solicitudId, r.id)
      setRespuestas(rs => rs.filter(x => x.requisito_id !== r.id))
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo eliminar') }
  }

  const ver = async (r: Requisito) => {
    const url = await obtenerArchivo(solicitudId, r.id).catch(() => null)
    if (url) abrirDataUrl(url)
  }

  const faltan = requisitos.filter(r => r.obligatorio && !respuestaCubre(r, respuestas.find(x => x.requisito_id === r.id)))

  return (
    <div className="space-y-3">
      {error && <Alert type="error">{error}</Alert>}
      {faltan.length > 0 && (
        <Alert type="warning">Faltan requisitos obligatorios: {faltan.map(r => r.nombre).join(', ')}. No se podrá enviar al comité hasta completarlos.</Alert>
      )}
      {requisitos.map(r => {
        const a = respuestas.find(x => x.requisito_id === r.id)
        return (
          <FilaRequisito key={r.id} r={r} ok={respuestaCubre(r, a)} editable={editable} ocupado={ocupado === r.id}
            archivo={a?.nombre_archivo ?? null}
            valor={borradores[r.id] ?? valorGuardado(r)}
            onValor={v => setBorradores(bs => ({ ...bs, [r.id]: v }))}
            onSalir={() => salir(r)}
            onArchivo={f => void guardar(r, { archivo: f })}
            onVer={a?.mime ? () => void ver(r) : undefined}
            onQuitar={() => void quitar(r)} />
        )
      })}
    </div>
  )
}
