// ─── Requisitos de la solicitud interna (migración 0017) ──────
// El personal cubre cada requisito del producto en la propia solicitud:
// archivo (imagen/PDF), monto o texto según requisitos.tipo. Los tipos
// documento_identidad/selfie se cubren con un archivo (el cliente interno
// no tiene perfil de portal). enviar_a_comite exige los obligatorios.
import { neon } from './neon'
import {
  comprimirImagen, archivoADataUrl, dataUrlAHex, byteaADataUrl,
  ADJUNTO_MAX_BYTES, TEXTO_REQUISITO_MAX,
} from './portal'
import type { Requisito } from '../types'

export interface RespuestaSolicitud {
  requisito_id: string
  nombre_archivo: string | null
  mime: string | null
  valor_numero: number | null
  valor_texto: string | null
}

/** Lo que el usuario tiene en el formulario antes de guardar. */
export interface BorradorRequisito { archivo?: File; valor?: string }

function lanzar(prefijo: string, error: { message: string } | null) {
  if (error) throw new Error(`${prefijo}: ${error.message}`)
}

export function esEscrito(r: Requisito): boolean {
  return r.tipo === 'monto' || r.tipo === 'texto'
}

/** Convierte lo escrito en un monto válido (acepta 1.500.000 / 1500000 / 2500,50). null = inválido o vacío. */
export function parsearMonto(valor: string): number | null {
  const limpio = valor.trim()
  if (!limpio) return null
  const n = Number(limpio.replace(/[^\d.,-]/g, '').replace(/[.,](?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

export function respuestaCubre(r: Requisito, a: RespuestaSolicitud | undefined): boolean {
  if (!a) return false
  if (r.tipo === 'monto') return a.valor_numero != null
  if (r.tipo === 'texto') return !!a.valor_texto?.trim()
  return !!a.mime
}

export function borradorCubre(r: Requisito, b: BorradorRequisito | undefined): boolean {
  if (!b) return false
  if (r.tipo === 'monto') return parsearMonto(b.valor ?? '') != null
  if (r.tipo === 'texto') return !!b.valor?.trim()
  return !!b.archivo
}

export async function listarRespuestas(solicitudId: string): Promise<RespuestaSolicitud[]> {
  const { data, error } = await neon.from('solicitud_requisitos')
    .select('requisito_id, nombre_archivo, mime, valor_numero, valor_texto').eq('solicitud_id', solicitudId)
  lanzar('Error leyendo requisitos', error)
  return ((data ?? []) as RespuestaSolicitud[]).map(a => ({ ...a, valor_numero: a.valor_numero == null ? null : Number(a.valor_numero) }))
}

async function archivoAHex(archivo: File): Promise<{ mime: string; hex: string }> {
  let dataUrl: string
  if (archivo.type.startsWith('image/')) {
    dataUrl = await comprimirImagen(archivo, 1400, 300_000)
  } else if (archivo.type === 'application/pdf') {
    if (archivo.size > ADJUNTO_MAX_BYTES) throw new Error(`"${archivo.name}" supera 1 MB. Reduce el PDF o sube una foto.`)
    dataUrl = await archivoADataUrl(archivo)
  } else {
    throw new Error(`"${archivo.name}": formato no admitido. Sube una imagen (JPG/PNG) o un PDF.`)
  }
  return dataUrlAHex(dataUrl)
}

/** Guarda (o reemplaza) la respuesta de un requisito en la solicitud. */
export async function guardarRespuesta(solicitudId: string, r: Requisito, b: BorradorRequisito): Promise<RespuestaSolicitud | null> {
  let fila: Record<string, unknown>
  if (esEscrito(r)) {
    const texto = (b.valor ?? '').trim()
    if (!texto) { await eliminarRespuesta(solicitudId, r.id); return null }
    if (r.tipo === 'monto') {
      const n = parsearMonto(texto)
      if (n == null) throw new Error(`"${r.nombre}": escribe un monto válido.`)
      fila = { valor_numero: n, valor_texto: null }
    } else {
      if (texto.length > TEXTO_REQUISITO_MAX) throw new Error(`"${r.nombre}": máximo ${TEXTO_REQUISITO_MAX} caracteres.`)
      fila = { valor_numero: null, valor_texto: texto }
    }
    fila = { ...fila, nombre_archivo: null, mime: null, bytes: null }
  } else {
    if (!b.archivo) return null
    const { mime, hex } = await archivoAHex(b.archivo)
    fila = { nombre_archivo: b.archivo.name.slice(0, 120), mime, bytes: hex, valor_numero: null, valor_texto: null }
  }
  const completa = { solicitud_id: solicitudId, requisito_id: r.id, ...fila }
  const { error } = await neon.from('solicitud_requisitos').upsert(completa, { onConflict: 'solicitud_id,requisito_id' })
  lanzar(`Error guardando "${r.nombre}"`, error)
  return {
    requisito_id: r.id,
    nombre_archivo: (fila.nombre_archivo as string) ?? null, mime: (fila.mime as string) ?? null,
    valor_numero: (fila.valor_numero as number) ?? null, valor_texto: (fila.valor_texto as string) ?? null,
  }
}

export async function eliminarRespuesta(solicitudId: string, requisitoId: string): Promise<void> {
  const { error } = await neon.from('solicitud_requisitos').delete().eq('solicitud_id', solicitudId).eq('requisito_id', requisitoId)
  lanzar('Error eliminando requisito', error)
}

export async function obtenerArchivo(solicitudId: string, requisitoId: string): Promise<string | null> {
  const { data, error } = await neon.from('solicitud_requisitos').select('mime, bytes').eq('solicitud_id', solicitudId).eq('requisito_id', requisitoId).limit(1)
  lanzar('Error leyendo archivo', error)
  const f = data?.[0] as { mime: string | null; bytes: string | null } | undefined
  return f?.bytes && f.mime ? byteaADataUrl(f.bytes, f.mime) : null
}
