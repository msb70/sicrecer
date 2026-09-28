import { useState } from 'react'
import { Input, Select } from '../ui'
import { PAIS_LABELS, type Pais } from '../../types'
import { CIUDADES_CATALOGO, ciudadCatalogo, localidadesDe, etiquetaLocalidad, type Ubicacion } from '../../lib/ubicaciones'

const OTRA = '__otra__'

interface Props {
  value: Ubicacion
  onChange: (cambios: Partial<Ubicacion>) => void
  /** Bloquea el país (p. ej. el perfil del portal ya registrado). */
  paisBloqueado?: boolean
  mostrarDireccion?: boolean
  disabled?: boolean
}

/** País → ciudad (catálogo u "Otra ciudad") → localidad (solo Bogotá) → dirección. */
export function SelectorUbicacion({ value, onChange, paisBloqueado, mostrarDireccion = true, disabled }: Props) {
  const pais = (value.pais ?? 'CO') as Pais
  const catalogo = CIUDADES_CATALOGO[pais] ?? []
  const canon = ciudadCatalogo(value.ciudad)
  const [otra, setOtra] = useState(Boolean(value.ciudad?.trim()) && !canon)
  const esOtra = catalogo.length === 0 || otra
  const localidades = esOtra ? [] : localidadesDe(value.ciudad)

  const elegirCiudad = (v: string) => {
    if (v === OTRA) { setOtra(true); onChange({ ciudad: '', localidad: null }); return }
    setOtra(false)
    onChange({ ciudad: v, localidad: null })
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Select label="País" value={pais} disabled={disabled || paisBloqueado}
          onChange={e => { setOtra(false); onChange({ pais: e.target.value, ciudad: '', localidad: null }) }}
          options={(Object.keys(PAIS_LABELS) as Pais[]).map(p => ({ value: p, label: PAIS_LABELS[p] }))} />
        {catalogo.length > 0 && (
          <Select label="Ciudad o municipio" value={esOtra ? OTRA : (canon ?? '')} disabled={disabled}
            onChange={e => elegirCiudad(e.target.value)}
            options={[
              { value: '', label: 'Selecciona…' },
              ...catalogo.map(c => ({ value: c, label: c })),
              { value: OTRA, label: 'Otra ciudad…' },
            ]} />
        )}
      </div>
      {esOtra && (
        <Input label={catalogo.length ? 'Nombre de la ciudad' : 'Ciudad'} value={value.ciudad ?? ''} disabled={disabled}
          onChange={e => onChange({ ciudad: e.target.value, localidad: null })} placeholder="Ej: Medellín" />
      )}
      {localidades.length > 0 && (
        <Select label="Localidad" value={value.localidad ?? ''} disabled={disabled}
          onChange={e => onChange({ localidad: e.target.value || null })}
          options={[{ value: '', label: 'Selecciona la localidad…' }, ...localidades.map(l => ({ value: l, label: etiquetaLocalidad(l) }))]} />
      )}
      {mostrarDireccion && (
        <Input label="Dirección" value={value.direccion ?? ''} disabled={disabled}
          onChange={e => onChange({ direccion: e.target.value })} placeholder="Calle, número, barrio" />
      )}
    </div>
  )
}
