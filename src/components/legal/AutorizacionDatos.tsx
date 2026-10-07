import { useState } from 'react'
import { ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import {
  URL_TERMINOS, URL_POLITICA_DATOS, EMPRESA, FINALIDADES_DATOS, DERECHOS_TITULAR,
  AVISO_DATOS_SENSIBLES, MARCO_LEGAL, RESPONSABLE, NIT_RESPONSABLE, CORREO_CONTACTO,
} from '../../lib/legal'
import { EnlaceLegal } from './EnlacesLegales'

interface Props {
  acepta: boolean
  onChange: (acepta: boolean) => void
  disabled?: boolean
  /** Marca visual de error (intentó continuar sin aceptar). */
  error?: boolean
  /** Fecha en que quedó registrada la aceptación (ISO), si ya existe. */
  fecha?: string | null
  /** Versión compacta (pantalla de registro). */
  compacto?: boolean
}

/**
 * Casilla obligatoria: Términos y condiciones + Política de tratamiento de datos
 * + autorización previa, expresa e informada (Ley 1581/2012 art. 9).
 * Es independiente de la autorización de comunicaciones comerciales (opcional).
 */
export function AutorizacionDatos({ acepta, onChange, disabled, error, fecha, compacto }: Props) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" className="accent-brand-600 mt-0.5 shrink-0" checked={acepta} disabled={disabled}
          required aria-required="true" aria-invalid={error || undefined}
          onChange={e => onChange(e.target.checked)} />
        <span>
          Acepto los <EnlaceLegal href={URL_TERMINOS}>Términos y condiciones</EnlaceLegal> y
          la <EnlaceLegal href={URL_POLITICA_DATOS}>Política de tratamiento de datos</EnlaceLegal>
          {compacto ? '' : <> de {EMPRESA} ({RESPONSABLE}), y autorizo de manera previa, expresa e informada el tratamiento de mis datos personales
            para las finalidades allí descritas (Ley 1581 de 2012)</>}.
          <span className="text-red-600"> *</span>
        </span>
      </label>

      {fecha && acepta && (
        <p className="pl-6 text-xs text-gray-500 flex items-center gap-1">
          <ShieldCheck size={12} className="text-green-600" />
          Aceptado el {new Date(fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}

      <button type="button" onClick={() => setAbierto(!abierto)}
        className="pl-6 text-xs font-medium text-brand-700 hover:text-brand-800 inline-flex items-center gap-1">
        {abierto ? <ChevronUp size={12} /> : <ChevronDown size={12} />} ¿Qué estoy autorizando?
      </button>

      {abierto && (
        <div className="pl-6 text-xs text-gray-600 space-y-2 leading-relaxed">
          <p>
            La <strong>{RESPONSABLE}</strong> (NIT {NIT_RESPONSABLE}), responsable del tratamiento y operadora de {EMPRESA},
            recolectará, almacenará, usará, circulará y suprimirá tus datos personales conforme a su Política de
            tratamiento de datos, para:
          </p>
          <ul className="list-disc pl-4 space-y-0.5">{FINALIDADES_DATOS.map(f => <li key={f}>{f}</li>)}</ul>
          <p><strong>Tus derechos como titular</strong> (Ley 1581 de 2012, art. 8):</p>
          <ul className="list-disc pl-4 space-y-0.5">{DERECHOS_TITULAR.map(d => <li key={d}>{d}</li>)}</ul>
          <p>{AVISO_DATOS_SENSIBLES}</p>
          <p>
            Puedes ejercer tus derechos escribiendo a{' '}
            <a href={`mailto:${CORREO_CONTACTO}`} className="underline font-medium text-brand-700">{CORREO_CONTACTO}</a>{' '}
            (ver la <EnlaceLegal href={URL_POLITICA_DATOS}>Política de tratamiento de datos</EnlaceLegal>). Registramos la fecha,
            hora y versión de esta aceptación como prueba de la autorización.
          </p>
          <details>
            <summary className="cursor-pointer font-medium text-gray-700">Marco legal</summary>
            <div className="mt-1 space-y-1">
              <p className="font-medium">Colombia</p>
              <ul className="list-disc pl-4">{MARCO_LEGAL.colombia.map(x => <li key={x}>{x}</li>)}</ul>
              <p className="font-medium">Venezuela</p>
              <ul className="list-disc pl-4">{MARCO_LEGAL.venezuela.map(x => <li key={x}>{x}</li>)}</ul>
              <p className="font-medium">Referencias internacionales</p>
              <ul className="list-disc pl-4">{MARCO_LEGAL.internacional.map(x => <li key={x}>{x}</li>)}</ul>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
