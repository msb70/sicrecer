// ─── Filtros comunes de cartera ───────────────────────────────
// Todas las consultas de cartera, cobranza, renovación y solicitudes
// se filtran por los mismos parámetros: convenio, zona, facilitador,
// actividad económica y producto.

import { CLIENTES, CREDITOS, PRODUCTOS, ZONAS } from '../mocks'
import type { Cliente } from '../types'

export interface FiltrosCartera {
  convenio_id: string
  zona_id: string
  facilitador_id: string
  actividad_economica_id: string
  producto_id: string
  texto: string
}

export const FILTROS_VACIOS: FiltrosCartera = {
  convenio_id: '', zona_id: '', facilitador_id: '', actividad_economica_id: '', producto_id: '', texto: '',
}

/** Campos que una fila debe exponer para poder filtrarse. */
export interface FilaFiltrable {
  convenio_id?: string | null
  zona_id?: string | null
  zona?: string | null
  facilitador_id?: string | null
  actividad_economica_id?: string | null
  producto_id?: string | null
}

const SIN = '__sin__'   // valor del filtro para "sin asignar"

function igual(filtro: string, valor?: string | null): boolean {
  if (!filtro) return true
  if (filtro === SIN) return !valor
  return filtro === valor
}

/** Zona de una fila: por id, o por nombre en datos que aún no tienen zona_id. */
function zonaDe(f: FilaFiltrable): string | null {
  if (f.zona_id) return f.zona_id
  if (!f.zona) return null
  return ZONAS.find(z => z.nombre.toLowerCase() === f.zona!.toLowerCase())?.id ?? null
}

export function coincide(f: FilaFiltrable, filtros: FiltrosCartera, textoFila = ''): boolean {
  return igual(filtros.convenio_id, f.convenio_id)
    && igual(filtros.zona_id, zonaDe(f))
    && igual(filtros.facilitador_id, f.facilitador_id)
    && igual(filtros.actividad_economica_id, f.actividad_economica_id)
    && igual(filtros.producto_id, f.producto_id)
    && (!filtros.texto || textoFila.toLowerCase().includes(filtros.texto.toLowerCase()))
}

export const hayFiltros = (f: FiltrosCartera) =>
  Boolean(f.convenio_id || f.zona_id || f.facilitador_id || f.actividad_economica_id || f.producto_id || f.texto)

export const SIN_ASIGNAR = SIN

// ─── Adaptadores para los datos en memoria ────────────────────

export function filaDeCliente(c: Cliente): FilaFiltrable {
  const cred = CREDITOS.find(cr => cr.cliente_id === c.id && cr.estado !== 'cancelado')
  return {
    convenio_id: cred?.convenio_id ?? null,
    zona_id: c.zona_id ?? null, zona: c.zona,
    facilitador_id: c.facilitador_id,
    actividad_economica_id: c.actividad_economica_id ?? null,
    producto_id: (cred as { producto_id?: string } | undefined)?.producto_id ?? null,
  }
}

export function filaDeCredito(cr: { cliente_id: string; convenio_id?: string | null; producto_id?: string | null }): FilaFiltrable {
  const c = CLIENTES.find(x => x.id === cr.cliente_id)
  return {
    convenio_id: cr.convenio_id ?? null,
    zona_id: c?.zona_id ?? null, zona: c?.zona ?? null,
    facilitador_id: c?.facilitador_id ?? null,
    actividad_economica_id: c?.actividad_economica_id ?? null,
    producto_id: cr.producto_id ?? null,
  }
}

export function filaDeSolicitud(s: { cliente_id?: string | null; producto_id?: string | null; facilitador_id?: string | null }): FilaFiltrable {
  const c = s.cliente_id ? CLIENTES.find(x => x.id === s.cliente_id) : undefined
  const p = PRODUCTOS.find(x => x.id === s.producto_id)
  return {
    convenio_id: p?.convenio_id ?? null,
    zona_id: c?.zona_id ?? null, zona: c?.zona ?? null,
    facilitador_id: c?.facilitador_id ?? s.facilitador_id ?? null,
    actividad_economica_id: c?.actividad_economica_id ?? null,
    producto_id: s.producto_id ?? null,
  }
}
