// ─── Roles y permisos: escritura en la base (tablas roles / rol_permisos) ───
import { neon } from './neon'
import { conReintento, mensaje } from './catalogos'
import { recargarTablas, USUARIOS } from '../mocks'
import type { PermisoRol, RolConfig } from '../types'

export type FilaPermiso = Omit<PermisoRol, 'rol_id'>

/** Crea (sin id) o actualiza un rol y reemplaza su matriz de permisos. Devuelve el id. */
export async function guardarRol(
  datos: Pick<RolConfig, 'nombre' | 'descripcion' | 'perfil' | 'activo'>,
  permisos: FilaPermiso[],
  id?: string | null,
): Promise<string> {
  const fila = { nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || null, perfil: datos.perfil, activo: datos.activo }
  if (id) {
    const actual = id
    const { data, error } = await conReintento(() => neon.from('roles').update(fila).eq('id', actual).select('id'))
    if (error) throw new Error(mensaje(error))
    if (!data || data.length === 0) throw new Error('No se guardó el rol (sin permiso o rol inexistente).')
  } else {
    id = `rol-${Date.now().toString(36)}`
    const nuevo = { id, ...fila }
    const { error } = await conReintento(() => neon.from('roles').insert(nuevo))
    if (error) throw new Error(mensaje(error))
  }
  const rolId = id
  // editar/borrar implican ver (el trigger de la base también lo asegura)
  const filas = permisos.map(p => ({ rol_id: rolId, modulo: p.modulo, ver: p.ver || p.editar || p.borrar, editar: p.editar, borrar: p.borrar }))
  if (filas.length) {
    const { error } = await conReintento(() => neon.from('rol_permisos').upsert(filas, { onConflict: 'rol_id,modulo' }).select('modulo'))
    if (error) throw new Error(mensaje(error))
  }
  await recargarTablas('roles', 'usuarios')
  return rolId
}

export function usuariosConRol(rolId: string) {
  return USUARIOS.filter(u => (u.rol_id ?? `rol-${u.rol}`) === rolId)
}

export async function eliminarRol(rol: RolConfig): Promise<void> {
  if (rol.es_sistema) throw new Error('Los roles del sistema no se pueden eliminar; puedes ajustar sus permisos.')
  if (usuariosConRol(rol.id).length) throw new Error('El rol tiene usuarios asignados. Cámbiales el rol antes de eliminarlo.')
  const { data, error } = await conReintento(() => neon.from('roles').delete().eq('id', rol.id).select('id'))
  if (error) throw new Error(mensaje(error))
  if (!data || data.length === 0) throw new Error('No se eliminó el rol (sin permiso).')
  await recargarTablas('roles')
}
