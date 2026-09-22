// ─── PORTAL DE SOLICITANTES: acceso a datos ───────────────────
// Todo pasa por el Data API con la sesión del solicitante; la
// autorización real está en RLS (db/migrations/0004_portal_solicitantes.sql).

import { neon } from './neon'
import type {
  Solicitante, Solicitud, ProductoCredito, Requisito, ActividadEconomica,
  Organizacion, TipoDocumentoFoto, Pais,
} from '../types'

function lanzar(prefijo: string, error: { message: string } | null) {
  if (error) throw new Error(`${prefijo}: ${error.message}`)
}

// ─── Perfil ───────────────────────────────────────────────────
export async function obtenerSolicitante(email: string): Promise<Solicitante | null> {
  const { data, error } = await neon.from('solicitantes').select('*').eq('email', email.toLowerCase()).limit(1)
  lanzar('Error leyendo perfil', error)
  return (data?.[0] as Solicitante) ?? null
}

export type SolicitanteInput = Omit<Solicitante, 'id' | 'estado' | 'cliente_id' | 'creado_en'>

export async function guardarSolicitante(input: SolicitanteInput, idExistente?: string): Promise<Solicitante> {
  const fila = { ...input, email: input.email.toLowerCase() }
  if (idExistente) {
    const { data, error } = await neon.from('solicitantes').update(fila).eq('id', idExistente).select('*')
    lanzar('Error actualizando perfil', error)
    return data![0] as Solicitante
  }
  const { data, error } = await neon.from('solicitantes').insert(fila).select('*')
  lanzar('Error creando perfil', error)
  return data![0] as Solicitante
}

// ─── Fotos ────────────────────────────────────────────────────
export interface FotoInfo { tipo: TipoDocumentoFoto; creado_en: string }

export async function listarFotos(solicitanteId: string): Promise<FotoInfo[]> {
  const { data, error } = await neon.from('solicitante_documentos').select('tipo, creado_en').eq('solicitante_id', solicitanteId)
  lanzar('Error leyendo fotos', error)
  return (data ?? []) as FotoInfo[]
}

/** Devuelve la foto como data URL (para previsualizar). */
export async function obtenerFoto(solicitanteId: string, tipo: TipoDocumentoFoto): Promise<string | null> {
  const { data, error } = await neon.from('solicitante_documentos').select('mime, bytes').eq('solicitante_id', solicitanteId).eq('tipo', tipo).limit(1)
  lanzar('Error leyendo foto', error)
  const fila = data?.[0] as { mime: string; bytes: string } | undefined
  if (!fila) return null
  return byteaADataUrl(fila.bytes, fila.mime)
}

/** Sube (o reemplaza) una foto. `dataUrl` debe venir ya comprimida (ver comprimirImagen). */
export async function subirFoto(solicitanteId: string, tipo: TipoDocumentoFoto, dataUrl: string): Promise<void> {
  const { mime, hex } = dataUrlAHex(dataUrl)
  const fila = { solicitante_id: solicitanteId, tipo, mime, bytes: hex }
  const { error } = await neon.from('solicitante_documentos').upsert(fila, { onConflict: 'solicitante_id,tipo' })
  lanzar('Error subiendo foto', error)
}

// PostgREST serializa bytea como hex "\\x...." y acepta el mismo formato al escribir.
function dataUrlAHex(dataUrl: string): { mime: string; hex: string } {
  const [cab, b64] = dataUrl.split(',')
  const mime = /data:([^;]+);/.exec(cab)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  let hex = '\\x'
  for (let i = 0; i < bin.length; i++) hex += bin.charCodeAt(i).toString(16).padStart(2, '0')
  return { mime, hex }
}

function byteaADataUrl(hex: string, mime: string): string {
  const limpio = hex.startsWith('\\x') ? hex.slice(2) : hex
  let bin = ''
  for (let i = 0; i < limpio.length; i += 2) bin += String.fromCharCode(parseInt(limpio.slice(i, i + 2), 16))
  return `data:${mime};base64,${btoa(bin)}`
}

/**
 * Comprime una imagen (File o data URL) a JPEG con lado máximo `maxLado`
 * y calidad decreciente hasta quedar por debajo de `maxBytes`.
 * Objetivo: fotos de ~60-150 KB legibles.
 */
export async function comprimirImagen(origen: File | string, maxLado = 1024, maxBytes = 150_000): Promise<string> {
  const img = await cargarImagen(origen)
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  let calidad = 0.82
  let salida = canvas.toDataURL('image/jpeg', calidad)
  while (tamanoDataUrl(salida) > maxBytes && calidad > 0.35) {
    calidad -= 0.1
    salida = canvas.toDataURL('image/jpeg', calidad)
  }
  return salida
}

export function tamanoDataUrl(dataUrl: string): number {
  const b64 = dataUrl.split(',')[1] ?? ''
  return Math.floor(b64.length * 3 / 4)
}

function cargarImagen(origen: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { resolve(img); if (typeof origen !== 'string') URL.revokeObjectURL(img.src) }
    img.onerror = () => reject(new Error('No se pudo leer la imagen'))
    img.src = typeof origen === 'string' ? origen : URL.createObjectURL(origen)
  })
}

// ─── Adjuntos por requisito ───────────────────────────────────
export interface AdjuntoInfo { requisito_id: string; nombre_archivo: string; mime: string; creado_en: string }
export const ADJUNTO_MAX_BYTES = 1_000_000
export const ADJUNTO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

export async function listarAdjuntos(solicitanteId: string): Promise<AdjuntoInfo[]> {
  const { data, error } = await neon.from('solicitante_requisitos').select('requisito_id, nombre_archivo, mime, creado_en').eq('solicitante_id', solicitanteId)
  lanzar('Error leyendo adjuntos', error)
  return (data ?? []) as AdjuntoInfo[]
}

/** Sube (o reemplaza) el adjunto de un requisito. Imágenes se comprimen; PDF se sube tal cual (máx 1 MB). */
export async function subirAdjunto(solicitanteId: string, requisitoId: string, archivo: File): Promise<AdjuntoInfo> {
  let dataUrl: string
  if (archivo.type.startsWith('image/')) {
    dataUrl = await comprimirImagen(archivo, 1400, 300_000)
  } else if (archivo.type === 'application/pdf') {
    if (archivo.size > ADJUNTO_MAX_BYTES) throw new Error('El PDF supera 1 MB. Reduce su tamaño o sube una foto del documento.')
    dataUrl = await archivoADataUrl(archivo)
  } else {
    throw new Error('Formato no admitido. Sube una imagen (JPG/PNG) o un PDF.')
  }
  const { mime, hex } = dataUrlAHex(dataUrl)
  const fila = { solicitante_id: solicitanteId, requisito_id: requisitoId, nombre_archivo: archivo.name.slice(0, 120), mime, bytes: hex }
  const { error } = await neon.from('solicitante_requisitos').upsert(fila, { onConflict: 'solicitante_id,requisito_id' })
  lanzar('Error subiendo adjunto', error)
  return { requisito_id: requisitoId, nombre_archivo: fila.nombre_archivo, mime, creado_en: new Date().toISOString() }
}

export async function eliminarAdjunto(solicitanteId: string, requisitoId: string): Promise<void> {
  const { error } = await neon.from('solicitante_requisitos').delete().eq('solicitante_id', solicitanteId).eq('requisito_id', requisitoId)
  lanzar('Error eliminando adjunto', error)
}

/** Devuelve el adjunto como data URL (imagen o PDF). */
export async function obtenerAdjunto(solicitanteId: string, requisitoId: string): Promise<{ dataUrl: string; mime: string; nombre: string } | null> {
  const { data, error } = await neon.from('solicitante_requisitos').select('mime, bytes, nombre_archivo').eq('solicitante_id', solicitanteId).eq('requisito_id', requisitoId).limit(1)
  lanzar('Error leyendo adjunto', error)
  const fila = data?.[0] as { mime: string; bytes: string; nombre_archivo: string } | undefined
  if (!fila) return null
  return { dataUrl: byteaADataUrl(fila.bytes, fila.mime), mime: fila.mime, nombre: fila.nombre_archivo }
}

/** Abre un data URL en una pestaña nueva (vía Blob para evitar bloqueos del navegador). */
export function abrirDataUrl(dataUrl: string): void {
  const [cab, b64] = dataUrl.split(',')
  const mime = /data:([^;]+);/.exec(cab)?.[1] ?? 'application/octet-stream'
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const url = URL.createObjectURL(new Blob([arr], { type: mime }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function archivoADataUrl(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('No se pudo leer el archivo'))
    r.readAsDataURL(f)
  })
}

// ─── Catálogos visibles para el solicitante ───────────────────
export interface CatalogoPortal {
  productos: ProductoCredito[]
  requisitos: Requisito[]
  actividades: ActividadEconomica[]
  organizaciones: Organizacion[]
}

export async function cargarCatalogoPortal(): Promise<CatalogoPortal> {
  const [p, r, a, o] = await Promise.all([
    neon.from('productos_credito').select('*').order('nombre'),
    neon.from('requisitos').select('*').order('id'),
    neon.from('actividades_economicas').select('*').order('nombre'),
    neon.from('organizaciones').select('*').order('id'),
  ])
  lanzar('Error cargando productos', p.error)
  lanzar('Error cargando requisitos', r.error)
  lanzar('Error cargando actividades', a.error)
  lanzar('Error cargando organizaciones', o.error)
  return {
    productos: (p.data ?? []) as ProductoCredito[],
    requisitos: (r.data ?? []) as Requisito[],
    actividades: (a.data ?? []) as ActividadEconomica[],
    organizaciones: (o.data ?? []) as Organizacion[],
  }
}

/** Actividades económicas (accesible antes de tener perfil). */
export async function cargarActividades(): Promise<ActividadEconomica[]> {
  const { data, error } = await neon.from('actividades_economicas').select('*').order('nombre')
  lanzar('Error cargando actividades', error)
  return (data ?? []) as ActividadEconomica[]
}

export function productosParaPais(productos: ProductoCredito[], pais: Pais): ProductoCredito[] {
  return productos.filter(p => p.publico && p.activo !== false && (p.paises ?? []).includes(pais))
}

// ─── Solicitudes del solicitante ──────────────────────────────
export async function misSolicitudes(solicitanteId: string): Promise<Solicitud[]> {
  const { data, error } = await neon.from('solicitudes').select('*').eq('solicitante_id', solicitanteId).order('creado_en', { ascending: false })
  lanzar('Error cargando solicitudes', error)
  return (data ?? []) as Solicitud[]
}

export interface NuevaSolicitudPortal {
  solicitante_id: string
  producto_id: string
  monto_solicitado: number
  plazo: number
  proposito?: string
  requisitos_confirmados: string[]
}

export async function crearSolicitudPortal(s: NuevaSolicitudPortal): Promise<Solicitud> {
  const { data, error } = await neon.from('solicitudes').insert({
    ...s, origen: 'externo', estado: 'enviada',
  }).select('*')
  if (error) {
    // Mensajes de negocio vienen de la BD (trigger fn_validar_solicitud_externa / índice único)
    const msg = error.message.includes('ux_solicitud_abierta')
      ? 'Ya tienes una solicitud abierta para este producto.'
      : error.message
    throw new Error(msg)
  }
  return data![0] as Solicitud
}

// ─── Elegibilidad (misma regla que el trigger en BD) ──────────
export interface ResultadoElegibilidad {
  ok: boolean
  faltantes: string[]   // mensajes
}

export function evaluarElegibilidad(args: {
  producto: ProductoCredito
  solicitante: Solicitante
  monto: number
  plazo: number
  /** ids de requisitos con adjunto subido */
  adjuntos: string[]
  requisitos: Requisito[]
  tieneDocumento: boolean
  tieneSelfie: boolean
}): ResultadoElegibilidad {
  const { producto: p, solicitante: s, monto, plazo, adjuntos, requisitos, tieneDocumento, tieneSelfie } = args
  const faltantes: string[] = []
  if (!(p.paises ?? []).includes(s.pais)) faltantes.push('El producto no está disponible en tu país.')
  if (monto < p.monto_min || monto > p.monto_max) faltantes.push('El monto está fuera del rango del producto.')
  if (plazo < p.plazo_min || plazo > p.plazo_max) faltantes.push('El plazo está fuera del rango del producto.')
  const acts = p.actividad_economica_ids ?? []
  if (acts.length > 0 && (!s.actividad_economica_id || !acts.includes(s.actividad_economica_id))) {
    faltantes.push('Tu actividad económica no es elegible para este producto.')
  }
  for (const rid of p.requisito_ids ?? []) {
    const r = requisitos.find(x => x.id === rid)
    if (!r) continue
    const cubierto = requisitoCubiertoPorPerfil(r) || adjuntos.includes(rid)
    if (r.obligatorio && !cubierto) faltantes.push(`Falta adjuntar: ${r.nombre}.`)
  }
  if (!tieneDocumento) faltantes.push('Falta la foto de tu documento de identidad.')
  if (!tieneSelfie) faltantes.push('Falta tu foto de verificación (selfie).')
  return { ok: faltantes.length === 0, faltantes }
}

export function requisitoCubiertoPorPerfil(r: Requisito): boolean {
  return r.tipo === 'documento_identidad' || r.tipo === 'selfie'
}

/** ¿El solicitante puede optar a este producto por su actividad económica? Lista vacía = cualquier actividad. */
export function productoElegiblePorActividad(p: ProductoCredito, s: Solicitante): boolean {
  const acts = p.actividad_economica_ids ?? []
  return acts.length === 0 || (!!s.actividad_economica_id && acts.includes(s.actividad_economica_id))
}

// ─── Estado visible para el solicitante ───────────────────────
export type EstadoPortal = 'Enviada' | 'En revisión' | 'Aprobada' | 'No aprobada'

export function estadoPortal(estado: Solicitud['estado']): EstadoPortal {
  switch (estado) {
    case 'borrador':
    case 'enviada': return 'Enviada'
    case 'scoring':
    case 'revision_comite': return 'En revisión'
    case 'aprobada':
    case 'firma':
    case 'desembolsada': return 'Aprobada'
    case 'rechazada': return 'No aprobada'
  }
}
