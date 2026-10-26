import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Rol, Organizacion, Usuario, Solicitante, AccionPermiso, RolConfig } from '../types'
import { MATRIZ_BASE, matrizDesdeFilas, tienePermiso, type MatrizPermisos } from '../lib/permisos'
import { supabase } from '../lib/supabase'
import { obtenerSolicitante } from '../lib/portal'
import {
  ORGANIZACIONES, USUARIOS, ROLES, ROL_PERMISOS,
  cargarDatosDesdeSupabase, recargarTablas, restaurarDatosDemo,
} from '../mocks'

type ModoSesion = 'ninguno' | 'demo' | 'google'
/** interno = personal de la whitelist `usuarios`; solicitante = usuario externo del portal */
export type TipoSesion = 'interno' | 'solicitante' | null

interface AppContextValue {
  rol: Rol
  setRol: (r: Rol) => void
  usuario: Usuario
  setUsuario: (u: Usuario) => void
  organizacion: Organizacion
  setOrganizacion: (o: Organizacion) => void
  autenticado: boolean
  cargandoSesion: boolean
  errorAuth: string
  modo: ModoSesion
  login: (orgId: string, rol: Rol) => void
  loginGoogle: (callbackPath?: string) => Promise<void>
  logout: () => void
  // Portal de solicitantes
  tipoSesion: TipoSesion
  emailSesion: string
  emailVerificado: boolean
  solicitante: Solicitante | null
  setSolicitante: (s: Solicitante | null) => void
  loginEmail: (email: string, password: string) => Promise<{ requiereVerificacion: boolean }>
  registroEmail: (email: string, password: string, nombre: string) => Promise<{ requiereVerificacion: boolean }>
  verificarOtp: (email: string, otp: string) => Promise<void>
  reenviarOtp: (email: string) => Promise<void>
  recuperarContrasena: (email: string) => Promise<void>
  restaurarSesion: () => Promise<void>
  // Roles y permisos
  rolConfig: RolConfig | null
  permisos: MatrizPermisos
  puede: (modulo: string, accion?: AccionPermiso) => boolean
  refrescarPermisos: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(false)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [errorAuth, setErrorAuth] = useState('')
  const [modo, setModo] = useState<ModoSesion>('ninguno')
  const [organizacion, setOrganizacion] = useState<Organizacion>(ORGANIZACIONES[0])
  const [usuario, setUsuario] = useState<Usuario>(USUARIOS[0])
  const [rol, setRolState] = useState<Rol>('administrador')
  const [tipoSesion, setTipoSesion] = useState<TipoSesion>(null)
  const [emailSesion, setEmailSesionState] = useState('')
  const emailSesionRef = useRef('')
  const setEmailSesion = (e: string) => { emailSesionRef.current = e; setEmailSesionState(e) }
  const [emailVerificado, setEmailVerificado] = useState(false)
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null)
  const [versionPermisos, setVersionPermisos] = useState(0)

  // Rol configurable del usuario (usuarios.rol_id); sin él, el rol del sistema de su perfil.
  const rolId = (modo === 'google' ? usuario.rol_id : null) ?? `rol-${rol}`
  const rolConfig = useMemo(() => ROLES.find(r => r.id === rolId) ?? null, [rolId, versionPermisos]) // eslint-disable-line react-hooks/exhaustive-deps
  const permisos = useMemo<MatrizPermisos>(() => {
    const filas = ROL_PERMISOS.filter(p => p.rol_id === rolId)
    if (rolConfig && !rolConfig.activo) return { dashboard: { ver: true, editar: false, borrar: false } }
    return filas.length ? matrizDesdeFilas(filas) : MATRIZ_BASE[rol]
  }, [rolId, rol, rolConfig, versionPermisos])
  const puede = useCallback((modulo: string, accion: AccionPermiso = 'ver') => tienePermiso(permisos, modulo, accion), [permisos])
  const refrescarPermisos = async () => {
    if (modo === 'google') await recargarTablas('roles', 'usuarios')
    setVersionPermisos(v => v + 1)
  }

  const setRol = (r: Rol) => {
    // En sesión real el rol viene de la whitelist; no se puede simular.
    if (modo === 'google') return
    setRolState(r)
    const u = USUARIOS.find(u => u.rol === r) ?? USUARIOS[0]
    setUsuario(u)
  }

  // Restaurar sesión de Supabase Auth: primero whitelist interna (`usuarios`);
  // si no está, es un solicitante del portal (tabla `solicitantes`).
  async function restaurarSesion() {
    setCargandoSesion(true)
    try {
      const { data } = await supabase.auth.getSession()
      const user = data?.session?.user
      const email = user?.email
      if (!email) { setTipoSesion(null); setAutenticado(false); return }
      setEmailSesion(email.toLowerCase())
      // Con "Confirm email" obligatorio en Supabase no hay sesión sin correo
      // confirmado; se conserva el indicador por compatibilidad con la UI.
      setEmailVerificado(Boolean(user?.email_confirmed_at || user?.user_metadata?.email_verified))

      // Se reintenta la lectura de la whitelist antes de concluir que no es
      // usuario interno, para no mandar a un administrador al portal.
      let u: Usuario | null = null
      for (let intento = 1; intento <= 3 && !u; intento++) {
        const { data: filas, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('email', email)
          .limit(1)
        if (error) throw new Error(error.message)
        u = (filas?.[0] ?? null) as Usuario | null
        if (!u && intento < 3) await new Promise(r => setTimeout(r, 350 * intento))
      }
      if (u) {
        await cargarDatosDesdeSupabase()
        const org = ORGANIZACIONES.find(o => o.id === u.organizacion_id) ?? ORGANIZACIONES[0]
        if (!org) {
          console.error('[sesion] organizaciones vacío tras cargar datos', { usuario: u, organizaciones: ORGANIZACIONES.length })
          throw new Error(`No se pudo cargar la organización ${u.organizacion_id} de tu usuario. Contacta al administrador.`)
        }
        setUsuario(u)
        setRolState(u.rol)
        setVersionPermisos(v => v + 1)
        setOrganizacion(org)
        setModo('google')
        setTipoSesion('interno')
        setSolicitante(null)
        setAutenticado(true)
        return
      }

      // Solicitante (puede no tener perfil todavía → /portal/perfil lo pide)
      const s = await obtenerSolicitante(email)
      setSolicitante(s)
      setModo('google')
      setTipoSesion('solicitante')
      setAutenticado(true)
    } catch (err) {
      setErrorAuth(err instanceof Error ? err.message : 'Error restaurando la sesión')
    } finally {
      setCargandoSesion(false)
    }
  }

  // Al montar: restaurar sesión. Además, cuando Supabase completa el retorno de
  // Google (código PKCE en la URL) emite SIGNED_IN; se vuelve a restaurar para
  // no quedarse con la lectura previa (sin sesión).
  useEffect(() => {
    void restaurarSesion()
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_IN' || evento === 'TOKEN_REFRESHED') {
        // Evitar re-cargas si ya hay sesión restaurada con el mismo usuario
        void supabase.auth.getSession().then(({ data }) => {
          const email = data.session?.user?.email?.toLowerCase()
          if (email && email !== emailSesionRef.current) void restaurarSesion()
        })
      }
      if (evento === 'SIGNED_OUT') {
        setModo('ninguno'); setTipoSesion(null); setSolicitante(null); setEmailSesion(''); setAutenticado(false)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Email + contraseña (portal de solicitantes) ───────────
  const mensajeAuth = (m: string | undefined, porDefecto: string) => {
    const t = (m ?? '').toLowerCase()
    if (t.includes('invalid login credentials')) return 'Correo o contraseña incorrectos'
    if (t.includes('rate limit') || t.includes('too many')) return 'Demasiados intentos. Espera un momento y vuelve a intentarlo'
    if (t.includes('already registered')) return 'Ese correo ya tiene cuenta. Inicia sesión o recupera tu contraseña'
    if (t.includes('token has expired') || t.includes('otp_expired')) return 'El código venció. Solicita uno nuevo'
    if (t.includes('invalid') && t.includes('token')) return 'Código inválido'
    if (t.includes('password should be')) return 'La contraseña no cumple los requisitos mínimos'
    return m || porDefecto
  }

  const loginEmail = async (email: string, password: string) => {
    setErrorAuth('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password })
    if (error) {
      const msg = (error.message ?? '').toLowerCase()
      if (error.code === 'email_not_confirmed' || msg.includes('not confirmed')) return { requiereVerificacion: true }
      throw new Error(mensajeAuth(error.message, 'No se pudo iniciar sesión'))
    }
    await restaurarSesion()
    return { requiereVerificacion: false }
  }

  const registroEmail = async (email: string, password: string, nombre: string) => {
    setErrorAuth('')
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(), password,
      options: { data: { name: nombre, full_name: nombre } },
    })
    if (error) throw new Error(mensajeAuth(error.message, 'No se pudo crear la cuenta'))
    // Con confirmación de correo obligatoria no hay sesión hasta verificar el código.
    if (!data.session) return { requiereVerificacion: true }
    await restaurarSesion()
    return { requiereVerificacion: false }
  }

  const verificarOtp = async (email: string, otp: string) => {
    const e = email.toLowerCase(); const token = otp.trim()
    // Código de confirmación de registro; si la cuenta ya estaba confirmada
    // (reenvío como OTP de acceso), se acepta también como código de email.
    let { error } = await supabase.auth.verifyOtp({ email: e, token, type: 'signup' })
    if (error) ({ error } = await supabase.auth.verifyOtp({ email: e, token, type: 'email' }))
    if (error) throw new Error(mensajeAuth(error.message, 'Código inválido o vencido'))
    await restaurarSesion()
  }

  const reenviarOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.toLowerCase() })
    if (error) throw new Error(mensajeAuth(error.message, 'No se pudo reenviar el código'))
  }

  const recuperarContrasena = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: `${window.location.origin}/nueva-contrasena`,
    })
    if (error) throw new Error(mensajeAuth(error.message, 'No se pudo enviar el correo de recuperación'))
  }

  // Modo demo: sin credenciales, datos locales de ejemplo.
  // Deshabilitado en producción salvo que VITE_DEMO_MODE=true.
  const login = (orgId: string, r: Rol) => {
    if (import.meta.env.VITE_DEMO_MODE !== 'true') {
      setErrorAuth('El modo demo está deshabilitado en este entorno. Usa "Continuar con Google".')
      return
    }
    restaurarDatosDemo()
    const org = ORGANIZACIONES.find(o => o.id === orgId) ?? ORGANIZACIONES[0]
    setOrganizacion(org)
    setRol(r)
    setModo('demo')
    setTipoSesion('interno')
    setAutenticado(true)
  }

  // Login real: redirige a Google vía Supabase Auth (PKCE).
  const loginGoogle = async (callbackPath = '/') => {
    setErrorAuth('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${callbackPath}` },
    })
    if (error) setErrorAuth(error.message ?? 'No se pudo iniciar sesión con Google')
  }

  const logout = () => {
    if (modo === 'google') void supabase.auth.signOut()
    setModo('ninguno')
    setTipoSesion(null)
    setSolicitante(null)
    setEmailSesion('')
    setAutenticado(false)
  }

  return (
    <AppContext.Provider value={{
      rol, setRol, usuario, setUsuario, organizacion, setOrganizacion,
      autenticado, cargandoSesion, errorAuth, modo,
      login, loginGoogle, logout,
      tipoSesion, emailSesion, emailVerificado, solicitante, setSolicitante,
      loginEmail, registroEmail, verificarOtp, reenviarOtp, recuperarContrasena, restaurarSesion,
      rolConfig, permisos, puede, refrescarPermisos,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}

/** Permisos del usuario actual sobre un módulo: { ver, editar, borrar }. */
export function usePermiso(modulo: string) {
  const { puede } = useApp()
  return { ver: puede(modulo, 'ver'), editar: puede(modulo, 'editar'), borrar: puede(modulo, 'borrar') }
}
