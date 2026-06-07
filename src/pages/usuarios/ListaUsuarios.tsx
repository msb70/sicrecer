import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Shield } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, StatCard } from '../../components/ui'
import { USUARIOS, ORGANIZACIONES } from '../../mocks'
import { ROL_LABELS } from '../../types'
import type { Rol } from '../../types'
import { clsx } from 'clsx'

const ROL_COLOR: Record<Rol, 'green' | 'blue' | 'yellow' | 'orange' | 'gray'> = {
  administrador: 'green',
  coordinador:   'blue',
  facilitador:   'yellow',
  comite:        'orange',
  auditor:       'gray',
}

export default function ListaUsuarios() {
  const navigate = useNavigate()
  const [filtroRol, setFiltroRol] = useState<Rol | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = USUARIOS
    .filter(u => filtroRol === 'todos' || u.rol === filtroRol)
    .filter(u => u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase()))

  const porRol = (rol: Rol) => USUARIOS.filter(u => u.rol === rol).length

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Usuarios y roles"
          subtitle="Gestión de acceso al sistema"
          actions={<Button onClick={() => navigate('/usuarios/nuevo')}><Plus size={16}/>Nuevo usuario</Button>}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {(Object.keys(ROL_LABELS) as Rol[]).map(rol => (
            <StatCard key={rol} label={ROL_LABELS[rol]} value={String(porRol(rol))} color={ROL_COLOR[rol]}/>
          ))}
        </div>

        {/* Búsqueda + filtro rol */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFiltroRol('todos')}
              className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroRol === 'todos' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              Todos
            </button>
            {(Object.keys(ROL_LABELS) as Rol[]).map(rol => (
              <button
                key={rol}
                onClick={() => setFiltroRol(rol)}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize', filtroRol === rol ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
              >
                {ROL_LABELS[rol].split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla / Cards */}
        <Card>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Usuario', 'Email', 'Organización', 'Rol', 'Zona', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {user.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.nombre}</p>
                          {user.primer_acceso && <p className="text-xs text-yellow-600">Pendiente activación</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{ORGANIZACIONES.find(o => o.id === user.organizacion_id)?.nombre ?? '—'}</td>
                    <td className="px-4 py-3"><Badge color={ROL_COLOR[user.rol]}>{ROL_LABELS[user.rol]}</Badge></td>
                    <td className="px-4 py-3 text-gray-500">{user.zona ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/usuarios/${user.id}/editar`)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <Edit size={15}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtrados.map(user => (
              <div key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                      {user.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.nombre}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/usuarios/${user.id}/editar`)} className="p-2 text-gray-400 hover:text-brand-600">
                    <Edit size={16}/>
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <Badge color={ROL_COLOR[user.rol]}>{ROL_LABELS[user.rol]}</Badge>
                  {user.zona && <span className="text-xs text-gray-500 self-center">{user.zona}</span>}
                  {user.primer_acceso && <Badge color="yellow">Sin activar</Badge>}
                </div>
              </div>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12">
              <Shield size={36} className="mx-auto text-gray-200 mb-3"/>
              <p className="text-gray-400 text-sm">Sin usuarios que coincidan</p>
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
