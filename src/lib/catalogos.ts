// ─── Escritura de catálogos en la base de datos ───────────────
// Convenios, bancos, requisitos y actividades económicas. La RLS solo
// permite escribir al rol administrador; los errores de la base se
// devuelven como Error con un mensaje legible.

import { neon } from './neon'
import { recargarTablas, type TablaRecargable } from '../mocks'

export type TablaCatalogo = Extract<TablaRecargable,
  'convenios' | 'bancos' | 'requisitos' | 'actividades_economicas'
  | 'usuarios' | 'organizaciones' | 'prospectos' | 'actividades_crm' | 'visitas' | 'clientes' | 'solicitudes'>

function mensaje(err: { message?: string; code?: string } | null): string {
  const m = err?.message ?? 'Error desconocido'
  if (err?.code === '42501' || /row-level security|permission denied/i.test(m)) {
    return 'Tu rol no tiene permiso para esta operación.'
  }
  if (err?.code === '23503' || /foreign key/i.test(m)) {
    return 'No se puede eliminar: está en uso por otros registros (productos, créditos, etc.).'
  }
  if (err?.code === '23505' || /duplicate key|unique/i.test(m)) {
    return 'Ya existe un registro con ese dato (por ejemplo, el mismo correo o documento).'
  }
  return m
}

const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))
const esRls = (err: { message?: string; code?: string } | null) =>
  Boolean(err && (err.code === '42501' || /row-level security/i.test(err.message ?? '')))

/**
 * Ejecuta una escritura reintentando cuando la RLS la rechaza: el Data API a
 * veces resuelve la petición sin identidad (ver cargarDatosDesdeNeon).
 */
async function conReintento<R extends { error: { message?: string; code?: string } | null }>(op: () => PromiseLike<R>): Promise<R> {
  let r = await op()
  for (let i = 1; i <= 2 && esRls(r.error); i++) {
    await esperar(400 * i)
    r = await op()
  }
  return r
}

/** Crea (sin id) o actualiza (con id) una fila y recarga el catálogo en memoria. */
export async function guardarCatalogo<T extends Record<string, unknown>>(
  tabla: TablaCatalogo, fila: T, id?: string | null, prefijo = 'id',
): Promise<string> {
  if (id) {
    const actual = id
    const { data, error } = await conReintento(() => neon.from(tabla).update(fila).eq('id', actual).select('id'))
    if (error) throw new Error(mensaje(error))
    if (!data || data.length === 0) throw new Error('No se guardó el cambio (sin permiso o registro inexistente).')
  } else {
    id = `${prefijo}-${Date.now().toString(36)}`
    const nuevo = { id, ...fila }
    const { error } = await conReintento(() => neon.from(tabla).insert(nuevo))
    if (error) throw new Error(mensaje(error))
  }
  await recargarTablas(tabla)
  return id
}

export async function eliminarCatalogo(tabla: TablaCatalogo, id: string): Promise<void> {
  const { data, error } = await conReintento(() => neon.from(tabla).delete().eq('id', id).select('id'))
  if (error) throw new Error(mensaje(error))
  if (!data || data.length === 0) throw new Error('No se eliminó (sin permiso o registro inexistente).')
  await recargarTablas(tabla)
}
