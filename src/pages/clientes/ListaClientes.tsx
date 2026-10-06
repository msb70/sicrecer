import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileText, Users } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Badge, Card, EmptyState } from '../../components/ui'
import { CLIENTES, formatCOP } from '../../mocks'
import { BarraFiltros } from '../../components/filtros/BarraFiltros'
import { FILTROS_VACIOS, coincide, filaDeCliente, type FiltrosCartera } from '../../lib/filtros'
import { useApp, usePermiso } from '../../context/AppContext'
import type { EstadoCliente } from '../../types'
import { clsx } from 'clsx'
import { BarraCampanias, IconosContacto } from '../../components/redes/BarraCampanias'
import { cumpleFiltroContacto, filasCampania, type FiltroContacto } from '../../lib/redes'
import { descargarCSV } from '../../lib/reportes'

const ESTADO_COLOR: Record<EstadoCliente, 'green' | 'blue' | 'red'> = {
  activo:   'blue',
  al_dia:   'green',
  moroso:   'red',
  inactivo: 'green', // fallback (no usado en mock)
} as any

const ESTADO_LABEL: Record<EstadoCliente, string> = {
  activo:   'Activo',
  al_dia:   'Al día',
  moroso:   'En mora',
  inactivo: 'Inactivo',
}

export default function ListaClientes() {
  const permisoSol = usePermiso('solicitudes')
  const permisoCli = usePermiso('clientes')
  const [filtroContacto, setFiltroContacto] = useState<FiltroContacto>('todos')
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosCartera>(FILTROS_VACIOS)
  const { rol } = useApp()
  const [filtroEstado, setFiltroEstado] = useState<EstadoCliente | 'todos'>('todos')

  const filtrados = CLIENTES.filter(c => {
    const matchBusqueda = coincide(filaDeCliente(c), filtros, `${c.nombre} ${c.documento}`)
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado
    return matchBusqueda && matchEstado && cumpleFiltroContacto(c, filtroContacto)
  })
  const exportables = filtrados.filter(c => c.acepta_comunicaciones)
  const exportar = () => descargarCSV(`sicrecer_clientes_campania_${new Date().toISOString().slice(0, 10)}`,
    filasCampania(exportables, 'Cliente'))

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Clientes"
          subtitle={rol === 'facilitador' ? `${CLIENTES.length} clientes en tus zonas` : `${CLIENTES.length} clientes`}
          actions={
            <button
              onClick={() => navigate('/clientes/grupos')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users size={15} /> Grupos solidarios
            </button>
          }
        />

        {/* Filtros */}
        <BarraFiltros value={filtros} onChange={setFiltros} placeholder="Buscar por nombre o documento…" />
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-1.5">
            {(['todos', 'activo', 'al_dia', 'moroso'] as const).map(e => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filtroEstado === e
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {e === 'todos' ? 'Todos' : ESTADO_LABEL[e as EstadoCliente]}
              </button>
            ))}
          </div>
        </div>

        <BarraCampanias filtro={filtroContacto} onFiltro={setFiltroContacto} exportables={exportables.length}
          onExportar={permisoCli.editar ? exportar : undefined} />

        {/* Cards en mobile, tabla en desktop */}
        <div className="sm:hidden space-y-3">
          {filtrados.map(c => (
            <Card key={c.id}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {c.nombre.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                    <p className="text-xs text-gray-500">{c.actividad_economica}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={ESTADO_COLOR[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge>
                  <button onClick={() => navigate(`/clientes/${c.id}`)} className="text-xs text-brand-600 hover:underline">Ver ficha</button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="hidden sm:block">
          {filtrados.length === 0 ? (
            <EmptyState icon={<Users size={40} />} title="Sin clientes" description="No hay clientes que coincidan con el filtro." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Documento</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actividad</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Créditos activos</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total prestado</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {c.nombre.split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-1.5">{c.nombre} <IconosContacto c={c} /></p>
                            <p className="text-xs text-gray-400">{c.zona}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">{c.documento}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-[160px] truncate">{c.actividad_economica}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={clsx('font-semibold', c.creditos_activos > 0 ? 'text-brand-600' : 'text-gray-400')}>
                          {c.creditos_activos}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{formatCOP(c.total_prestado)}</td>
                      <td className="px-6 py-4"><Badge color={ESTADO_COLOR[c.estado]}>{ESTADO_LABEL[c.estado]}</Badge></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/clientes/${c.id}`)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" title="Ver ficha">
                            <Eye size={15} />
                          </button>
                          {permisoSol.editar && (<button onClick={() => navigate(`/solicitudes/nueva?cliente=${c.id}`)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Nueva solicitud">
                            <FileText size={15} />
                          </button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
