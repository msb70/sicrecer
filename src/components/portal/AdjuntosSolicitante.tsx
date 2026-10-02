import { useEffect, useState } from 'react'
import { Paperclip, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { REQUISITOS, formatCOP } from '../../mocks'
import { listarAdjuntos, obtenerAdjunto, abrirDataUrl, requisitoCubiertoPorPerfil, requisitoEsEscrito, respuestaCubre, type AdjuntoInfo } from '../../lib/portal'
import type { ProductoCredito, Solicitud } from '../../types'

/** Lista, para personal interno, los requisitos del producto y lo que aportó el solicitante (archivo, monto o texto).
 *  Si se pasa `respuestas` (copia congelada en la solicitud), los montos/textos se muestran tal como se enviaron. */
export function AdjuntosSolicitante({ solicitanteId, producto, respuestas }: { solicitanteId: string; producto?: ProductoCredito; respuestas?: Solicitud['respuestas_requisitos'] }) {
  const [adjuntos, setAdjuntos] = useState<AdjuntoInfo[]>([])
  useEffect(() => { listarAdjuntos(solicitanteId).then(setAdjuntos).catch(() => setAdjuntos([])) }, [solicitanteId])

  const ver = async (rid: string) => {
    const a = await obtenerAdjunto(solicitanteId, rid).catch(() => null)
    if (a) abrirDataUrl(a.dataUrl)
  }

  const requisitos = (producto?.requisito_ids ?? []).map(id => REQUISITOS.find(r => r.id === id)).filter(Boolean) as typeof REQUISITOS
  if (requisitos.length === 0) return <p className="text-xs text-gray-400">El producto no tiene requisitos.</p>

  return (
    <div className="space-y-1.5">
      {requisitos.map(r => {
        const adj = adjuntos.find(a => a.requisito_id === r.id)
        const porPerfil = requisitoCubiertoPorPerfil(r)
        if (requisitoEsEscrito(r)) {
          const congelado = respuestas?.[r.id]
          const valor = congelado
            ? congelado.valor
            : r.tipo === 'monto' ? adj?.valor_numero ?? null : adj?.valor_texto?.trim() || null
          const ok = valor != null && valor !== ''
          const texto = !ok ? null : r.tipo === 'monto' ? formatCOP(Number(valor)) : String(valor)
          return (
            <div key={r.id} className="text-sm py-1 border-b border-gray-50 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {ok ? <CheckCircle2 size={14} className="text-green-600 shrink-0" /> : <XCircle size={14} className={r.obligatorio ? 'text-red-500 shrink-0' : 'text-gray-300 shrink-0'} />}
                  <span className="truncate">{r.nombre}{r.obligatorio && <span className="text-xs text-gray-400"> · obligatorio</span>}</span>
                </div>
                {r.tipo === 'monto' && <span className={ok ? 'text-sm font-medium text-gray-900 shrink-0' : 'text-xs text-gray-400 shrink-0'}>{texto ?? 'sin dato'}</span>}
                {r.tipo === 'texto' && !ok && <span className="text-xs text-gray-400 shrink-0">sin dato</span>}
              </div>
              {r.tipo === 'texto' && ok && <p className="mt-1 ml-6 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-2">{texto}</p>}
            </div>
          )
        }
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              {porPerfil || respuestaCubre(r, adj) ? <CheckCircle2 size={14} className="text-green-600 shrink-0" /> : <XCircle size={14} className={r.obligatorio ? 'text-red-500 shrink-0' : 'text-gray-300 shrink-0'} />}
              <span className="truncate">{r.nombre}{r.obligatorio && <span className="text-xs text-gray-400"> · obligatorio</span>}</span>
            </div>
            {porPerfil && <span className="text-xs text-gray-400 shrink-0">foto del perfil</span>}
            {!porPerfil && adj?.mime && (
              <button onClick={() => void ver(r.id)} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline shrink-0" title={adj.nombre_archivo ?? undefined}>
                <Eye size={13} /> Ver {adj.mime === 'application/pdf' ? 'PDF' : 'imagen'}
              </button>
            )}
            {!porPerfil && !adj?.mime && <span className="text-xs text-gray-400 shrink-0 inline-flex items-center gap-1"><Paperclip size={12} /> sin adjunto</span>}
          </div>
        )
      })}
    </div>
  )
}
