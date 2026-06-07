import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, FileText, CheckSquare, CreditCard,
  MapPin, BarChart2, Settings, LogOut, Menu, X, ChevronDown,
  Calendar, Building2, Package, UserCheck, Bot, Calculator,
  ClipboardList, Briefcase, Banknote
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import type { Rol } from '../../types'
import { ROL_LABELS } from '../../types'
import { USUARIOS } from '../../mocks'

// ─── ITEMS DE NAVEGACIÓN POR ROL ─────────────────────────────
interface NavItem {
  label: string
  to: string
  icon: ReactNode
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',       to: '/dashboard',     icon: <LayoutDashboard size={18} />, roles: ['administrador', 'coordinador', 'facilitador', 'comite', 'auditor'] },
  { label: 'Convenios',       to: '/convenios',     icon: <Building2 size={18} />,       roles: ['administrador', 'coordinador'] },
  { label: 'Productos',       to: '/productos',     icon: <Package size={18} />,         roles: ['administrador', 'coordinador'] },
  { label: 'Zonificación',    to: '/zonas',         icon: <MapPin size={18} />,          roles: ['administrador', 'coordinador'] },
  { label: 'Requisitos',       to: '/requisitos',    icon: <ClipboardList size={18} />,   roles: ['administrador', 'coordinador'] },
  { label: 'Act. Económicas', to: '/actividades-economicas', icon: <Briefcase size={18} />, roles: ['administrador', 'coordinador'] },
  { label: 'Usuarios',        to: '/usuarios',      icon: <UserCheck size={18} />,       roles: ['administrador'] },
  { label: 'Prospectos',      to: '/prospectos',    icon: <Users size={18} />,           roles: ['facilitador', 'coordinador'] },
  { label: 'Clientes',        to: '/clientes',      icon: <Users size={18} />,           roles: ['facilitador', 'coordinador', 'administrador'] },
  { label: 'Solicitudes',     to: '/solicitudes',   icon: <FileText size={18} />,        roles: ['facilitador', 'coordinador', 'administrador'] },
  { label: 'Comité',          to: '/comite',        icon: <CheckSquare size={18} />,     roles: ['comite', 'administrador'] },
  { label: 'Cartera',         to: '/cartera',       icon: <CreditCard size={18} />,      roles: ['facilitador', 'coordinador', 'administrador'] },
  { label: 'Calculadora',     to: '/calculadora',   icon: <Calculator size={18} />,      roles: ['facilitador', 'coordinador', 'administrador'] },
  { label: 'Cobranza',        to: '/cobranza',      icon: <Banknote size={18} />,        roles: ['facilitador', 'coordinador', 'administrador'] },
  { label: 'Agenda',          to: '/agenda',        icon: <Calendar size={18} />,        roles: ['facilitador'] },
  { label: 'Reportes',        to: '/reportes',      icon: <BarChart2 size={18} />,       roles: ['administrador', 'coordinador', 'auditor'] },
  { label: 'Asistente IA',    to: '/asistente',     icon: <Bot size={18} />,             roles: ['facilitador', 'coordinador'] },
  { label: 'Configuración',   to: '/configuracion', icon: <Settings size={18} />,        roles: ['administrador'] },
]

const ROL_COLORS: Record<Rol, string> = {
  administrador: 'bg-purple-100 text-purple-800',
  coordinador:   'bg-blue-100 text-blue-800',
  facilitador:   'bg-green-100 text-green-800',
  comite:        'bg-yellow-100 text-yellow-800',
  auditor:       'bg-gray-100 text-gray-700',
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function Sidebar({ onClose }: { onClose?: () => void }) {
  const { rol, setRol, usuario, organizacion, logout } = useApp()
  const navigate = useNavigate()
  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(rol))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
        <div>
          <p className="text-sm font-bold text-white">SiCrecer</p>
          <p className="text-xs text-gray-400 truncate max-w-[160px]">{organizacion.nombre}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X size={18} />
          </button>
        )}
      </div>

      {/* ROL SWITCHER (solo mock) */}
      <div className="px-3 py-3 border-b border-gray-800">
        <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Simular rol</p>
        <div className="relative">
          <select
            value={rol}
            onChange={e => setRol(e.target.value as Rol)}
            className="w-full text-xs bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 appearance-none cursor-pointer focus:outline-none focus:border-brand-500"
          >
            {(Object.keys(ROL_LABELS) as Rol[]).map(r => (
              <option key={r} value={r}>{ROL_LABELS[r]}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <span className={clsx('mt-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium', ROL_COLORS[rol])}>
          {ROL_LABELS[rol]}
        </span>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* USUARIO */}
      <div className="px-3 py-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {usuario.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{usuario.nombre}</p>
            <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ─── SHELL ────────────────────────────────────────────────────
export function Shell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold text-gray-900">SiCrecer</span>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

// ─── PAGE HEADER ─────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: {
  title: string; subtitle?: string; actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ─── PAGE CONTAINER ───────────────────────────────────────────
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="p-6 max-w-7xl mx-auto">{children}</div>
}
