import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FileText, UserCircle, LogOut, PlusCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useApp } from '../../context/AppContext'
import { BrandLogo } from '../BrandLogo'

/** Layout del portal de solicitantes: barra superior + contenido, pensado para móvil. */
export function PortalShell({ children, titulo, subtitulo, acciones }: {
  children: ReactNode; titulo?: string; subtitulo?: string; acciones?: ReactNode
}) {
  const { solicitante, emailSesion, logout } = useApp()
  const navigate = useNavigate()

  const salir = () => { logout(); navigate('/login') }

  const link = (isActive: boolean) => clsx(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
    isActive ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 text-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <BrandLogo imageClassName="w-[120px]" />
          <div className="flex items-center gap-1">
            <NavLink to="/portal" end className={({ isActive }) => link(isActive)}>
              <FileText size={16} /><span className="hidden sm:inline">Mis solicitudes</span>
            </NavLink>
            <NavLink to="/portal/nueva" className={({ isActive }) => link(isActive)}>
              <PlusCircle size={16} /><span className="hidden sm:inline">Nueva</span>
            </NavLink>
            <NavLink to="/portal/perfil" className={({ isActive }) => link(isActive)}>
              <UserCircle size={16} /><span className="hidden sm:inline">Mi perfil</span>
            </NavLink>
            <button onClick={salir} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white" title="Salir">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 text-xs text-gray-400 truncate">
          {solicitante?.nombre ?? emailSesion}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {(titulo || acciones) && (
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              {titulo && <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>}
              {subtitulo && <p className="mt-0.5 text-sm text-gray-500">{subtitulo}</p>}
            </div>
            {acciones}
          </div>
        )}
        {children}
      </main>

      <footer className="text-center text-xs text-gray-400 py-4">SiCrecer · Portal de solicitantes</footer>
    </div>
  )
}
