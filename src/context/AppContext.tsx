import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Rol, Organizacion, Usuario } from '../types'
import { neon } from '../lib/neon'
import {
  ORGANIZACIONES, USUARIOS,
  cargarDatosDesdeNeon, restaurarDatosDemo,
} from '../mocks'

type ModoSesion = 'ninguno' | 'demo' | 'google'

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
  loginGoogle: () => Promise<void>
  logout: () => void
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

  const setRol = (r: Rol) => {
    setRolState(r)
    const u = USUARIOS.find(u => u.rol === r) ?? USUARIOS[0]
    setUsuario(u)
  }

  // Al montar: si hay sesión de Neon Auth (p. ej. tras el redirect de
  // Google), validar contra la whitelist `usuarios` y cargar los datos.
  useEffect(() => {
    let cancelado = false

    async function restaurarSesion() {
      try {
        const { data } = await neon.auth.getSession()
        const email = data?.user?.email
        if (!email) return

        const { data: filas, error } = await neon
          .from('usuarios')
          .select('*')
          .eq('email', email)
          .limit(1)

        if (error) throw new Error(error.message)

        const u = (filas?.[0] ?? null) as Usuario | null
        if (!u) {
          await neon.auth.signOut()
          if (!cancelado) {
            setErrorAuth(`La cuenta ${email} no está autorizada. Pide a un administrador que te registre.`)
          }
          return
        }

        await cargarDatosDesdeNeon()
        if (cancelado) return

        const org = ORGANIZACIONES.find(o => o.id === u.organizacion_id) ?? ORGANIZACIONES[0]
        setUsuario(u)
        setRolState(u.rol)
        setOrganizacion(org)
        setModo('google')
        setAutenticado(true)
      } catch (err) {
        if (!cancelado) {
          setErrorAuth(err instanceof Error ? err.message : 'Error restaurando la sesión')
        }
      } finally {
        if (!cancelado) setCargandoSesion(false)
      }
    }

    restaurarSesion()
    return () => { cancelado = true }
  }, [])

  // Modo demo: sin credenciales, datos locales de ejemplo.
  const login = (orgId: string, r: Rol) => {
    restaurarDatosDemo()
    const org = ORGANIZACIONES.find(o => o.id === orgId) ?? ORGANIZACIONES[0]
    setOrganizacion(org)
    setRol(r)
    setModo('demo')
    setAutenticado(true)
  }

  // Login real: redirige a Google vía Neon Auth.
  const loginGoogle = async () => {
    setErrorAuth('')
    const { error } = await neon.auth.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/dashboard`,
    })
    if (error) setErrorAuth(error.message ?? 'No se pudo iniciar sesión con Google')
  }

  const logout = () => {
    if (modo === 'google') void neon.auth.signOut()
    setModo('ninguno')
    setAutenticado(false)
  }

  return (
    <AppContext.Provider value={{
      rol, setRol, usuario, setUsuario, organizacion, setOrganizacion,
      autenticado, cargandoSesion, errorAuth, modo,
      login, loginGoogle, logout,
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
