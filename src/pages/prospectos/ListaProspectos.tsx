import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserPlus, Eye, Pencil } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, EmptyState } from '../../components/ui'
import { PROSPECTOS } from '../../mocks'
import type { EstadoProspecto } from '../../types'
import { clsx } from 'clsx'

const ESTADO_COLOR: Record<EstadoProspecto, 'blue' | 'yellow' | 'green' | 'gray'> = {
  nuevo:      'blue',
  contactado: 'yellow',
  convertido: 'green',
  descartado: 'gray',
}

const ESTADO_LABEL: Record<EstadoProspecto, string> = {
  nuevo:      'Nuevo',
  contactado: 'Contactado',
  convertido: 'Convertido',
  descartado: 'Descartado',
}

export default function ListaProspectos() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoProspecto | 'todos'>('todos')

  const filtrados = PROSPECTOS.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.documento.includes(busqueda)
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Prospectos"
          subtitle={`${PROSPECTOS.length} registrados en tu zona`}
          actions={
            <Button onClick={() => navigate('/prospectos/nuevo')}>
              <Plus size={16} /> Nuevo prospecto
            </Button>
          }
        />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Buscar por nombre o documento…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['todos', 'nuevo', 'contactado', 'convertido', 'descartado'] as const).map(e => (
              <button
                key={e}
                onClick={() => setFiltroEstado(e)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                  filtroEstado === e
                    ? 'bg-brand-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {e === 'todos' ? 'Todos' : ESTADO_LABEL[e]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <Card>
          {filtrados.length === 0 ? (
            <EmptyState
              icon={<UserPlus size={40} />}
              title="Sin prospectos"
              description="Registra tu primer prospecto para comenzar."
              action={<Button onClick={() => navigate('/prospectos/nuevo')}><Plus size={16} />Nuevo prospecto</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nombre</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Documento</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha registro</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {p.nombre.split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <span className="font-medium text-gray-900">{p.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">{p.documento}</td>
                      <td className="px-6 py-4 text-gray-600">{p.telefono}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{new Date(p.fecha_registro).toLocaleDateString('es-CO')}</td>
                      <td className="px-6 py-4">
                        <Badge color={ESTADO_COLOR[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/prospectos/${p.id}`)}
                            className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => navigate(`/prospectos/${p.id}/editar`)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          {p.estado !== 'convertido' && (
                            <button
                              onClick={() => navigate(`/clientes/nuevo?prospecto=${p.id}`)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Convertir a cliente"
                            >
                              <UserPlus size={15} />
                            </button>
                          )}
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
