import { useNavigate } from 'react-router-dom'
import { Plus, Edit, ShieldCheck, Lock } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card } from '../../components/ui'
import { ROLES, ROL_PERMISOS, MODULOS } from '../../mocks'
import { usePermiso } from '../../context/AppContext'
import { usuariosConRol } from '../../lib/roles'
import { ROL_LABELS } from '../../types'

/** Roles configurables: cada rol define a qué pantallas entra y qué puede hacer en ellas. */
export default function ListaRoles() {
  const navigate = useNavigate()
  const permiso = usePermiso('roles')

  const resumen = (rolId: string) => {
    const filas = ROL_PERMISOS.filter(p => p.rol_id === rolId)
    return {
      ver: filas.filter(p => p.ver).length,
      editar: filas.filter(p => p.editar).length,
      borrar: filas.filter(p => p.borrar).length,
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Roles y permisos"
          subtitle="Define a qué pantallas entra cada rol y si puede ver, agregar/editar o borrar"
          actions={permiso.editar && <Button onClick={() => navigate('/roles/nuevo')}><Plus size={16} />Nuevo rol</Button>}
        />

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Rol', 'Perfil de datos', 'Usuarios', 'Pantallas', 'Agregar/editar', 'Borrar', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ROLES.map(r => {
                  const s = resumen(r.id)
                  const n = usuariosConRol(r.id).length
                  return (
                    <tr key={r.id} className={permiso.editar ? 'hover:bg-gray-50 cursor-pointer' : ''} onClick={() => permiso.editar && navigate(`/roles/${r.id}/editar`)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-brand-600 shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-1.5">
                              {r.nombre}
                              {r.es_sistema && <Lock size={12} className="text-gray-400" aria-label="Rol del sistema" />}
                            </p>
                            {r.descripcion && <p className="text-xs text-gray-400">{r.descripcion}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ROL_LABELS[r.perfil]}</td>
                      <td className="px-4 py-3 text-gray-600">{n}</td>
                      <td className="px-4 py-3 text-gray-600">{s.ver} / {MODULOS.length}</td>
                      <td className="px-4 py-3 text-gray-600">{s.editar}</td>
                      <td className="px-4 py-3 text-gray-600">{s.borrar}</td>
                      <td className="px-4 py-3">{r.activo ? <Badge color="green">Activo</Badge> : <Badge color="gray">Inactivo</Badge>}</td>
                      <td className="px-4 py-3">
                        {permiso.editar && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/roles/${r.id}/editar`) }}
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                            title="Editar permisos"
                          >
                            <Edit size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-gray-400 mt-3">
          Los roles con candado son del sistema: no se pueden borrar ni cambiar de perfil, pero sí ajustar sus permisos.
          El rol se asigna a cada persona en Configuración → Usuarios.
        </p>
      </PageContainer>
    </Shell>
  )
}
