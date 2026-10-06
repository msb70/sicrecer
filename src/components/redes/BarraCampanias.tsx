import { Download, Instagram, Facebook, Megaphone } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '../ui'
import { FILTRO_CONTACTO_LABEL, type FiltroContacto, type ContactoCampania } from '../../lib/redes'

interface Props {
  filtro: FiltroContacto
  onFiltro: (f: FiltroContacto) => void
  /** Cuántos del listado filtrado aceptan campañas (los que se exportan). */
  exportables: number
  onExportar?: () => void
}

/** Filtro por redes / autorización y exportación CSV para campañas. */
export function BarraCampanias({ filtro, onFiltro, exportables, onExportar }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(FILTRO_CONTACTO_LABEL) as FiltroContacto[]).map(f => (
          <button key={f} onClick={() => onFiltro(f)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filtro === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
            {FILTRO_CONTACTO_LABEL[f]}
          </button>
        ))}
      </div>
      {onExportar && (
        <Button variant="secondary" size="sm" onClick={onExportar} disabled={exportables === 0}
          title="Solo exporta a quien autorizó comunicaciones comerciales">
          <Download size={14} />Exportar para campaña ({exportables})
        </Button>
      )}
    </div>
  )
}

/** Iconos compactos para la fila del listado. */
export function IconosContacto({ c }: { c: ContactoCampania }) {
  if (!c.instagram && !c.facebook && !c.acepta_comunicaciones) return null
  return (
    <span className="inline-flex items-center gap-1 text-gray-400">
      {c.instagram && <span title="Tiene Instagram"><Instagram size={13} /></span>}
      {c.facebook && <span title="Tiene Facebook"><Facebook size={13} /></span>}
      {c.acepta_comunicaciones && <span title="Acepta campañas" className="text-green-600"><Megaphone size={13} /></span>}
    </span>
  )
}
