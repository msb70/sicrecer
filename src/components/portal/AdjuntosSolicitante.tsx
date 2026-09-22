import { useEffect, useState } from 'react'
import { Paperclip, Eye, CheckCircle2, XCircle } from 'lucide-react'
import { REQUISITOS } from '../../mocks'
import { listarAdjuntos, obtenerAdjunto, abrirDataUrl, requisitoCubiertoPorPerfil, type AdjuntoInfo } from '../../lib/portal'
import type { ProductoCredito } from '../../types'

/** Lista, para personal interno, los requisitos del producto y los adjuntos del solicitante. */
export function AdjuntosSolicitante({ solicitanteId, producto }: { solicitanteId: string; producto?: ProductoCredito }) {
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
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              {porPerfil || adj ? <CheckCircle2 size={14} className="text-green-600 shrink-0" /> : <XCircle size={14} className={r.obligatorio ? 'text-red-500 shrink-0' : 'text-gray-300 shrink-0'} />}
              <span className="truncate">{r.nombre}{r.obligatorio && <span className="text-xs text-gray-400"> · obligatorio</span>}</span>
            </div>
            {porPerfil && <span className="text-xs text-gray-400 shrink-0">foto del perfil</span>}
            {!porPerfil && adj && (
              <button onClick={() => void ver(r.id)} className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline shrink-0" title={adj.nombre_archivo}>
                <Eye size={13} /> Ver {adj.mime === 'application/pdf' ? 'PDF' : 'imagen'}
              </button>
            )}
            {!porPerfil && !adj && <span className="text-xs text-gray-400 shrink-0 inline-flex items-center gap-1"><Paperclip size={12} /> sin adjunto</span>}
          </div>
        )
      })}
    </div>
  )
}
