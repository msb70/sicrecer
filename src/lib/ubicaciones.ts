// ─── Ubicaciones: país, ciudad y localidad ────────────────────
// Catálogo de zonas donde opera SiCrecer: las 20 localidades de Bogotá y
// los municipios colindantes. Cualquier otra ciudad se escribe a mano
// ("Otra ciudad"). La cobertura de un producto es una lista de claves:
//   'Bogotá'            → toda la ciudad
//   'Bogotá|Usme'       → solo esa localidad
//   '*otras'            → ciudades fuera del catálogo
//   lista vacía         → cualquier ciudad o localidad
// Espejo en SQL: fn_cobertura_incluye (db/migrations/0009_ubicaciones.sql).

import type { Pais } from '../types'

export const BOGOTA = 'Bogotá'

/** En orden oficial: el índice + 1 es el número de la localidad. */
export const LOCALIDADES_BOGOTA = [
  'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa', 'Kennedy',
  'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño',
  'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz',
] as const

const NOTA_LOCALIDAD: Record<string, string> = {
  Usme: 'urbana y rural', 'Ciudad Bolívar': 'urbana y rural', Sumapaz: 'rural',
}

export const MUNICIPIOS_COLINDANTES = [
  'Soacha', 'Chía', 'Cajicá', 'Zipaquirá', 'Facatativá', 'Madrid', 'Funza', 'Mosquera',
] as const

export const CIUDADES_CATALOGO: Record<Pais, string[]> = {
  CO: [BOGOTA, ...MUNICIPIOS_COLINDANTES],
  VE: [],
}

export const OTRAS = '*otras'

/** Minúsculas, sin tildes ni espacios sobrantes (igual que fn_norm_txt). */
export function norm(s?: string | null): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

/** Nombre canónico si la ciudad está en el catálogo; si no, null. */
export function ciudadCatalogo(ciudad?: string | null): string | null {
  const n = norm(ciudad)
  return CIUDADES_CATALOGO.CO.find(c => norm(c) === n) ?? null
}

export function localidadesDe(ciudad?: string | null): readonly string[] {
  return norm(ciudad) === norm(BOGOTA) ? LOCALIDADES_BOGOTA : []
}

export function etiquetaLocalidad(localidad: string): string {
  const i = (LOCALIDADES_BOGOTA as readonly string[]).indexOf(localidad)
  if (i < 0) return localidad
  const nota = NOTA_LOCALIDAD[localidad]
  return `${localidad} (Localidad ${i + 1}${nota ? ` · ${nota}` : ''})`
}

export const claveLocalidad = (ciudad: string, localidad: string) => `${ciudad}|${localidad}`

/** ¿La cobertura del producto incluye esta ubicación? */
export function coberturaIncluye(cobertura: readonly string[] | null | undefined, ciudad?: string | null, localidad?: string | null): boolean {
  const cob = (cobertura ?? []).filter(Boolean)
  if (cob.length === 0) return true
  if (!ciudad?.trim()) return false
  if (!ciudadCatalogo(ciudad)) return cob.includes(OTRAS)
  const nc = norm(ciudad)
  if (cob.some(x => norm(x) === nc)) return true
  return Boolean(localidad) && cob.some(x => norm(x) === norm(claveLocalidad(ciudad, localidad!)))
}

export function describirCobertura(cobertura: readonly string[] | null | undefined): string {
  const cob = (cobertura ?? []).filter(Boolean)
  if (cob.length === 0) return 'Cualquier ciudad o localidad'
  const partes: string[] = []
  const locs = cob.filter(c => c.includes('|')).map(c => c.split('|')[1])
  if (cob.some(c => norm(c) === norm(BOGOTA))) partes.push('Toda Bogotá')
  else if (locs.length) partes.push(`Bogotá: ${locs.join(', ')}`)
  partes.push(...cob.filter(c => !c.includes('|') && c !== OTRAS && norm(c) !== norm(BOGOTA)))
  if (cob.includes(OTRAS)) partes.push('Otras ciudades')
  return partes.join(' · ')
}

export interface Ubicacion {
  pais?: string | null
  ciudad?: string | null
  localidad?: string | null
  direccion?: string | null
}

export function describirUbicacion(u: Ubicacion): string {
  return [u.direccion, u.localidad, u.ciudad].filter(x => x && String(x).trim()).join(', ') || '—'
}

/** Mensaje de error si la ubicación está incompleta, o '' si está bien. */
export function validarUbicacion(u: Ubicacion): string {
  if (!u.pais) return 'Selecciona el país'
  if (!u.ciudad?.trim()) return 'Indica la ciudad'
  if (localidadesDe(u.ciudad).length && !u.localidad) return 'Selecciona la localidad de Bogotá'
  return ''
}
