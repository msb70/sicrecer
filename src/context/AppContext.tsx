import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Rol, Organizacion, Usuario } from '../types'
import { ORGANIZACIONES, USUARIOS } from '../mocks'

interface AppContextValue {
  rol: Rol
  setRol: (r: Rol) => void
  usuario: Usuario
  setUsuario: (u: Usuario) => void
  organizacion: Organizacion
  setOrganizacion: (o: Organizacion) => void
  autenticado: boolean
  login: (orgId: string, rol: Rol) => void
  logout: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(false)
  const [organizacion, setOrganizacion] = useState<Organizacion>(ORGANIZACIONES[0])
  const [usuario, setUsuario] = useState<Usuario>(USUARIOS[0])
  const [rol, setRolState] = useState<Rol>('administrador')

  const setRol = (r: Rol) => {
    setRolState(r)
    const u = USUARIOS.find(u => u.rol === r) ?? USUARIOS[0]
    setUsuario(u)
  }

  const login = (orgId: string, r: Rol) => {
    const org = ORGANIZACIONES.find(o => o.id === orgId) ?? ORGANIZACIONES[0]
    setOrganizacion(org)
    setRol(r)
    setAutenticado(true)
  }

  const logout = () => setAutenticado(false)

  return (
    <AppContext.Provider value={{ rol, setRol, usuario, setUsuario, organizacion, setOrganizacion, autenticado, login, logout }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
