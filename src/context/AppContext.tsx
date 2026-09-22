import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Rol, Organizacion, Usuario, Solicitante } from '../types'
import { neon } from '../lib/neon'
import { obtenerSolicitante } from '../lib/portal'
import {
  ORGANIZACIONES, USUARIOS,
  cargarDatosDesdeNeon, restaurarDatosDemo,
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
  restaurarSesion: () => Promise<void>
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
  const [emailSesion, setEmailSesion] = useState('')
  const [emailVerificado, setEmailVerificado] = useState(false)
  const [solicitante, setSolicitante] = useState<Solicitante | null>(null)

  const setRol = (r: Rol) => {
    // En sesión real el rol viene de la whitelist; no se puede simular.
    if (modo === 'google') return
    setRolState(r)
    const u = USUARIOS.find(u => u.rol === r) ?? USUARIOS[0]
    setUsuario(u)
  }

  // Restaurar sesión de Neon Auth: primero whitelist interna (`usuarios`);
  // si no está, es un solicitante del portal (tabla `solicitantes`).
  async function restaurarSesion() {
    setCargandoSesion(true)
    try {
      const { data } = await neon.auth.getSession()
      const email = data?.user?.email
      if (!email) { setTipoSesion(null); setAutenticado(false); return }
      setEmailSesion(email.toLowerCase())
      setEmailVerificado(Boolean((data?.user as { emailVerified?: boolean } | undefined)?.emailVerified))

      const { data: filas, error } = await neon
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .limit(1)
      if (error) throw new Error(error.message)

      const u = (filas?.[0] ?? null) as Usuario | null
      if (u) {
        await cargarDatosDesdeNeon()
        const org = ORGANIZACIONES.find(o => o.id === u.organizacion_id) ?? ORGANIZACIONES[0]
        setUsuario(u)
        setRolState(u.rol)
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

  useEffect(() => { void restaurarSesion() }, [])

  // ─── Email + contraseña (portal de solicitantes) ───────────
  // Nota: el SDK expone el plugin emailOtp; tipado laxo para no depender de su versión.
  type AuthExt = {
    signIn: { email: (a: { email: string; password: string }) => Promise<{ data: unknown; error: { message?: string; code?: string; status?: number } | null }> }
    signUp: { email: (a: { email: string; password: string; name: string }) => Promise<{ data: { user?: { emailVerified?: boolean } } | null; error: { message?: string } | null }> }
    emailOtp: {
      verifyEmail: (a: { email: string; otp: string }) => Promise<{ data: unknown; error: { message?: string } | null }>
      sendVerificationOtp: (a: { email: string; type: 'email-verification' }) => Promise<{ error: { message?: string } | null }>
    }
  }
  const authExt = neon.auth as unknown as AuthExt

  const loginEmail = async (email: string, password: string) => {
    setErrorAuth('')
    const { error } = await authExt.signIn.email({ email: email.toLowerCase(), password })
    if (error) {
      const msg = (error.message ?? '').toLowerCase()
      if (error.status === 403 || msg.includes('verif')) return { requiereVerificacion: true }
      throw new Error(error.message ?? 'No se pudo iniciar sesión')
    }
    await restaurarSesion()
    return { requiereVerificacion: false }
  }

  const registroEmail = async (email: string, password: string, nombre: string) => {
    setErrorAuth('')
    const { data, error } = await authExt.signUp.email({ email: email.toLowerCase(), password, name: nombre })
    if (error) throw new Error(error.message ?? 'No se pudo crear la cuenta')
    if (data?.user && !data.user.emailVerified) return { requiereVerificacion: true }
    await restaurarSesion()
    return { requiereVerificacion: false }
  }

  const verificarOtp = async (email: string, otp: string) => {
    const { error } = await authExt.emailOtp.verifyEmail({ email: email.toLowerCase(), otp: otp.trim() })
    if (error) throw new Error(error.message ?? 'Código inválido o vencido')
    await restaurarSesion()
  }

  const reenviarOtp = async (email: string) => {
    const { error } = await authExt.emailOtp.sendVerificationOtp({ email: email.toLowerCase(), type: 'email-verification' })
    if (error) throw new Error(error.message ?? 'No se pudo reenviar el código')
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

  // Login real: redirige a Google vía Neon Auth.
  const loginGoogle = async (callbackPath = '/dashboard') => {
    setErrorAuth('')
    const { error } = await neon.auth.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}${callbackPath}`,
    })
    if (error) setErrorAuth(error.message ?? 'No se pudo iniciar sesión con Google')
  }

  const logout = () => {
    if (modo === 'google') void neon.auth.signOut()
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
      loginEmail, registroEmail, verificarOtp, reenviarOtp, restaurarSesion,
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
