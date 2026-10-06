/**
 * Redes sociales de prospectos y clientes (Instagram / Facebook).
 * Se guarda el usuario o ruta sin @ ni dominio; si no se puede reducir
 * (p. ej. facebook.com/profile.php?id=123) se guarda la URL completa.
 */
export type RedSocial = 'instagram' | 'facebook'

const DOMINIOS: Record<RedSocial, RegExp> = {
  instagram: /^(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/+/i,
  facebook:  /^(?:https?:\/\/)?(?:www\.|m\.|web\.|es-la\.)?(?:facebook\.com|fb\.com)\/+/i,
}

/** Normaliza lo que escribe el usuario: '@maria', 'instagram.com/maria/', URL… → 'maria'. */
export function normalizarRed(red: RedSocial, valor: string | null | undefined): string | null {
  let v = (valor ?? '').trim()
  if (!v) return null
  if (DOMINIOS[red].test(v)) {
    const ruta = v.replace(DOMINIOS[red], '')
    // profile.php?id=… no se puede reducir a un usuario: se conserva la URL
    if (/^profile\.php/i.test(ruta)) return 'https://www.facebook.com/' + ruta.replace(/#.*$/, '')
    v = ruta.split(/[?#]/)[0]
  } else if (/^https?:\/\//i.test(v)) {
    return v // otra URL: se respeta tal cual
  }
  v = v.replace(/^@+/, '').replace(/\/+$/, '').trim()
  return v || null
}

/** URL pública para abrir el perfil. */
export function urlRed(red: RedSocial, valor: string | null | undefined): string | null {
  if (!valor) return null
  if (/^https?:\/\//i.test(valor)) return valor
  return red === 'instagram' ? `https://www.instagram.com/${valor}` : `https://www.facebook.com/${valor}`
}

/** Texto corto para mostrar: '@maria' en Instagram, 'maria' o 'Perfil' en Facebook. */
export function etiquetaRed(red: RedSocial, valor: string | null | undefined): string {
  if (!valor) return ''
  if (/^https?:\/\//i.test(valor)) return red === 'facebook' && /profile\.php/i.test(valor) ? 'Perfil de Facebook' : valor
  return red === 'instagram' ? `@${valor}` : valor
}

// ─── Consentimiento de comunicaciones comerciales ────────────────
export type OrigenConsentimiento = 'formulario' | 'portal' | 'visita' | 'otro'

export const ORIGEN_CONSENTIMIENTO_LABEL: Record<OrigenConsentimiento, string> = {
  formulario: 'Formulario firmado',
  portal: 'Portal (casilla en el registro)',
  visita: 'Verbal en visita del facilitador',
  otro: 'Otro',
}

export const TEXTO_CONSENTIMIENTO =
  'Autorizo a SiCrecer a contactarme por WhatsApp, correo, teléfono y redes sociales con información de productos, ' +
  'campañas y novedades. Puedo retirar esta autorización en cualquier momento.'

export interface ContactoCampania {
  nombre: string
  telefono?: string | null
  email?: string | null
  instagram?: string | null
  facebook?: string | null
  zona?: string | null
  ciudad?: string | null
  acepta_comunicaciones?: boolean
  consentimiento_fecha?: string | null
  consentimiento_origen?: OrigenConsentimiento | string | null
}

/** Filas para el CSV de campañas: solo quien aceptó comunicaciones. */
export function filasCampania(lista: ContactoCampania[], tipo: 'Prospecto' | 'Cliente') {
  return lista.filter(c => c.acepta_comunicaciones).map(c => ({
    tipo,
    nombre: c.nombre,
    telefono: c.telefono ?? '',
    email: c.email ?? '',
    instagram: c.instagram ? urlRed('instagram', c.instagram) : '',
    facebook: c.facebook ? urlRed('facebook', c.facebook) : '',
    zona: c.zona ?? '',
    ciudad: c.ciudad ?? '',
    consentimiento_fecha: c.consentimiento_fecha ? c.consentimiento_fecha.slice(0, 10) : '',
    consentimiento_origen: c.consentimiento_origen ?? '',
  }))
}

export type FiltroContacto = 'todos' | 'con_redes' | 'acepta' | 'acepta_con_redes'
export const FILTRO_CONTACTO_LABEL: Record<FiltroContacto, string> = {
  todos: 'Todos',
  con_redes: 'Con redes',
  acepta: 'Acepta campañas',
  acepta_con_redes: 'Acepta + redes',
}
export function cumpleFiltroContacto(c: ContactoCampania, f: FiltroContacto): boolean {
  const redes = Boolean(c.instagram || c.facebook)
  if (f === 'con_redes') return redes
  if (f === 'acepta') return Boolean(c.acepta_comunicaciones)
  if (f === 'acepta_con_redes') return Boolean(c.acepta_comunicaciones) && redes
  return true
}
