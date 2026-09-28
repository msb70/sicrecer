import { useState } from 'react'
import {
  BOGOTA, LOCALIDADES_BOGOTA, MUNICIPIOS_COLINDANTES, OTRAS, claveLocalidad, etiquetaLocalidad,
} from '../../lib/ubicaciones'

interface Props {
  value: string[]
  onChange: (cobertura: string[]) => void
}

/** Cobertura de un producto: cualquier lugar, o ciudades / localidades concretas. */
export function SelectorCobertura({ value, onChange }: Props) {
  const [restringir, setRestringir] = useState(value.length > 0)
  const tiene = (k: string) => value.includes(k)
  const alternar = (k: string) => onChange(tiene(k) ? value.filter(x => x !== k) : [...value, k])
  const todaBogota = tiene(BOGOTA)
  const locsBogota = LOCALIDADES_BOGOTA.map(l => claveLocalidad(BOGOTA, l))

  const alternarTodaBogota = () => {
    const sinBogota = value.filter(x => x !== BOGOTA && !locsBogota.includes(x))
    onChange(todaBogota ? sinBogota : [...sinBogota, BOGOTA])
  }

  const check = (k: string, etiqueta: string, onClick = () => alternar(k), marcado = tiene(k), deshabilitado = false) => (
    <label key={k} className={`flex items-center gap-2 text-sm ${deshabilitado ? 'text-gray-400' : 'text-gray-700'} cursor-pointer`}>
      <input type="checkbox" className="accent-brand-600" checked={marcado} disabled={deshabilitado} onChange={onClick} />
      {etiqueta}
    </label>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="radio" className="accent-brand-600" checked={!restringir} onChange={() => { setRestringir(false); onChange([]) }} />
          Cualquier ciudad o localidad
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="radio" className="accent-brand-600" checked={restringir} onChange={() => setRestringir(true)} />
          Solo en ciudades o localidades específicas
        </label>
      </div>

      {restringir && (
        <div className="space-y-4 pl-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Bogotá</p>
            {check(BOGOTA, 'Toda Bogotá (las 20 localidades)', alternarTodaBogota, todaBogota)}
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pl-6">
              {LOCALIDADES_BOGOTA.map(l => {
                const k = claveLocalidad(BOGOTA, l)
                return check(k, etiquetaLocalidad(l), () => alternar(k), todaBogota || tiene(k), todaBogota)
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Municipios colindantes</p>
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
              {MUNICIPIOS_COLINDANTES.map(m => check(m, m))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Otras</p>
            {check(OTRAS, 'Otras ciudades (fuera de este listado)')}
          </div>
          {value.length === 0 && (
            <p className="text-xs text-amber-700">Marca al menos una ciudad o localidad; si no marcas nada, el producto quedará disponible en cualquier lugar.</p>
          )}
        </div>
      )}
    </div>
  )
}
