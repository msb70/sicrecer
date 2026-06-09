import { useState, useEffect, type ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, FileText, CheckSquare, CreditCard,
  MapPin, BarChart2, Settings, LogOut, Menu, X, ChevronDown,
  Calendar, Building2, Package, UserCheck, Bot, Calculator,
  ClipboardList, Briefcase, Banknote, FolderOpen, FilePlus,
  Landmark, BookOpen, ChevronRight
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { BrandLogo } from '../BrandLogo'
import type { Rol } from '../../types'
import { ROL_LABELS } from '../../types'

// ─── TYPES ────────────────────────────────────────────────────
interface NavItem {
  label: string
  to: string
  icon: ReactNode
  roles: Rol[]
}

interface NavGroup {
  id: string
  label: string
  icon: ReactNode
  roles: Rol[]
  items: NavItem[]
}

type SidebarEntry =
  | { type: 'item';  data: NavItem }
  | { type: 'group'; data: NavGroup }

// ─── NAVEGACIÓN ───────────────────────────────────────────────
const ALL_ROLES: Rol[] = ['administrador', 'coordinador', 'facilitador', 'comite', 'auditor']

const SIDEBAR_ENTRIES: SidebarEntry[] = [
  // Dashboard — standalone
  {
    type: 'item',
    data: { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ALL_ROLES },
  },

  // Datos
  {
    type: 'group',
    data: {
      id: 'datos',
      label: 'Datos',
      icon: <FolderOpen size={18} />,
      roles: ['administrador', 'coordinador'],
      items: [
        { label: 'Zonificación',    to: '/zonas',                  icon: <MapPin size={16} />,         roles: ['administrador', 'coordinador'] },
        { label: 'Convenios',       to: '/convenios',              icon: <Building2 size={16} />,      roles: ['administrador', 'coordinador'] },
        { label: 'Requisitos',      to: '/requisitos',             icon: <ClipboardList size={16} />,  roles: ['administrador', 'coordinador'] },
        { label: 'Act. Económicas', to: '/actividades-economicas', icon: <Briefcase size={16} />,      roles: ['administrador', 'coordinador'] },
        { label: 'Bancos',          to: '/bancos',                 icon: <Landmark size={16} />,       roles: ['administrador', 'coordinador'] },
      ],
    },
  },

  // Solicitud
  {
    type: 'group',
    data: {
      id: 'solicitud',
      label: 'Solicitud',
      icon: <FilePlus size={18} />,
      roles: ['facilitador', 'coordinador', 'administrador'],
      items: [
        { label: 'Prospectos', to: '/prospectos', icon: <Users size={16} />, roles: ['facilitador', 'coordinador', 'administrador'] },
      ],
    },
  },

  // Crédito
  {
    type: 'group',
    data: {
      id: 'credito',
      label: 'Crédito',
      icon: <CreditCard size={18} />,
      roles: ['facilitador', 'coordinador', 'administrador', 'comite', 'auditor'],
      items: [
        { label: 'Solicitudes',    to: '/solicitudes',    icon: <FileText size={16} />,    roles: ['facilitador', 'coordinador', 'administrador'] },
        { label: 'Clientes',       to: '/clientes',       icon: <Users size={16} />,       roles: ['facilitador', 'coordinador', 'administrador'] },
        { label: 'Cobranza',       to: '/cobranza',       icon: <Banknote size={16} />,    roles: ['facilitador', 'coordinador', 'administrador'] },
        { label: 'Comité',         to: '/comite',         icon: <CheckSquare size={16} />, roles: ['comite', 'administrador'] },
        { label: 'Cartera',        to: '/cartera',        icon: <CreditCard size={16} />,  roles: ['facilitador', 'coordinador', 'administrador', 'auditor'] },
        { label: 'Productos',      to: '/productos',      icon: <Package size={16} />,     roles: ['administrador', 'coordinador'] },
        { label: 'Cierre mensual', to: '/cierre-mensual', icon: <BookOpen size={16} />,    roles: ['administrador', 'coordinador', 'auditor'] },
      ],
    },
  },

  // Calculadora — standalone
  {
    type: 'item',
    data: { label: 'Calculadora', to: '/calculadora', icon: <Calculator size={18} />, roles: ['facilitador', 'coordinador', 'administrador'] },
  },

  // Reportes — standalone
  {
    type: 'item',
    data: { label: 'Reportes', to: '/reportes', icon: <BarChart2 size={18} />, roles: ['administrador', 'coordinador', 'auditor'] },
  },

  // Configuración
  {
    type: 'group',
    data: {
      id: 'configuracion',
      label: 'Configuración',
      icon: <Settings size={18} />,
      roles: ['administrador'],
      items: [
        { label: 'Usuarios',      to: '/usuarios',      icon: <UserCheck size={16} />, roles: ['administrador'] },
        { label: 'Configuración', to: '/configuracion', icon: <Settings size={16} />,  roles: ['administrador'] },
      ],
    },
  },

  // Agenda — standalone
  {
    type: 'item',
    data: { label: 'Agenda', to: '/agenda', icon: <Calendar size={18} />, roles: ['facilitador', 'coordinador'] },
  },

  // Asistente IA — standalone
  {
    type: 'item',
    data: { label: 'Asistente IA', to: '/asistente', icon: <Bot size={18} />, roles: ['facilitador', 'coordinador'] },
  },
]

function groupForPath(path: string): string | null {
  for (const entry of SIDEBAR_ENTRIES) {
    if (entry.type === 'group') {
      if (entry.data.items.some(i => path.startsWith(i.to))) {
        return entry.data.id
      }
    }
  }
  return null
}

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
  const location = useLocation()

  // Open state: set of group IDs that are expanded
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const active = groupForPath(location.pathname)
    return active ? new Set([active]) : new Set()
  })

  // Auto-open group when navigating to a child route
  useEffect(() => {
    const active = groupForPath(location.pathname)
    if (active) {
      setOpenGroups(prev => {
        if (prev.has(active)) return prev
        const next = new Set(prev)
        next.add(active)
        return next
      })
    }
  }, [location.pathname])

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinkClass = (isActive: boolean, indent = false) =>
    clsx(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
      indent && 'pl-8',
      isActive
        ? 'bg-brand-600 text-white'
        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    )

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white w-64">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-gray-800">
        <div className="min-w-0">
          <BrandLogo imageClassName="w-[146px]" />
          <p className="text-xs text-gray-400 truncate max-w-[160px]">{organizacion.nombre}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X size={18} />
          </button>
        )}
      </div>

      {/* ROL SWITCHER */}
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
        {SIDEBAR_ENTRIES.map((entry, idx) => {
          if (entry.type === 'item') {
            const item = entry.data
            if (!item.roles.includes(rol)) return null
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          }

          // Group
          const group = entry.data
          const visibleItems = group.items.filter(i => i.roles.includes(rol))
          if (visibleItems.length === 0) return null
          if (!group.roles.some(r => r === rol || group.items.some(i => i.roles.includes(rol)))) return null

          const isOpen = openGroups.has(group.id)
          const isGroupActive = visibleItems.some(i => location.pathname.startsWith(i.to))

          return (
            <div key={group.id}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isGroupActive && !isOpen
                    ? 'text-brand-400 bg-gray-800'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )}
              >
                {group.icon}
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight
                  size={14}
                  className={clsx('transition-transform duration-200', isOpen && 'rotate-90')}
                />
              </button>

              {/* Group items */}
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {visibleItems.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) => navLinkClass(isActive, true)}
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
          <BrandLogo framed className="rounded-lg px-2.5 py-1" imageClassName="w-[96px]" />
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
