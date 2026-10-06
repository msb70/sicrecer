import { Select } from '../ui'
import { ORIGEN_CONSENTIMIENTO_LABEL, TEXTO_CONSENTIMIENTO, type OrigenConsentimiento } from '../../lib/redes'

interface Props {
  acepta: boolean
  origen?: OrigenConsentimiento | ''
  onChange: (c: { acepta?: boolean; origen?: OrigenConsentimiento | '' }) => void
  /** En el portal la persona marca la casilla ella misma: no se pide el origen. */
  portal?: boolean
  disabled?: boolean
}

/** Casilla de autorización de comunicaciones comerciales (campañas). */
export function CampoConsentimiento({ acepta, origen = '', onChange, portal, disabled }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" className="accent-brand-600 mt-0.5" checked={acepta} disabled={disabled}
          onChange={e => onChange({ acepta: e.target.checked })} />
        <span>
          {portal
            ? TEXTO_CONSENTIMIENTO
            : <>La persona <strong>autorizó</strong> recibir comunicaciones comerciales y campañas (WhatsApp, correo, teléfono, redes).</>}
        </span>
      </label>
      {!portal && acepta && (
        <Select label="¿Cómo dio la autorización?" value={origen} disabled={disabled}
          onChange={e => onChange({ origen: e.target.value as OrigenConsentimiento })}
          options={[{ value: '', label: 'Selecciona…' },
            ...(['formulario', 'visita', 'otro'] as OrigenConsentimiento[]).map(o => ({ value: o, label: ORIGEN_CONSENTIMIENTO_LABEL[o] }))]} />
      )}
    </div>
  )
}
