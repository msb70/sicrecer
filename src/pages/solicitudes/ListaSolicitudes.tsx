import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Eye, FileText } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, EmptyState } from '../../components/ui'
import { SOLICITUDES, formatCOP } from '../../mocks'
import type { EstadoSolicitud } from '../../types'
import { clsx } from 'clsx'

const ESTADO_CONFIG: Record<EstadoSolicitud, { label: string; color: 'blue'|'yellow'|'green'|'red'|'gray'|'purple' }> = {
  borrador:        { label: 'Borrador',        color: 'gray'   },
  enviada:         { label: 'Enviada',          color: 'blue'   },
  scoring:         { label: 'Scoring',          color: 'blue'   },
  revision_comite: { label: 'En comité',        color: 'yellow' },
  aprobada:        { label: 'Aprobada',         color: 'green'  },
  rechazada:       { label: 'Rechazada',        color: 'red'    },
  desembolsada:    { label: 'Desembolsada',     color: 'purple' },
}

const BANDA_COLOR: Record<string, 'green'|'blue'|'yellow'|'orange'|'red'> = {
  A: 'green', B: 'blue', C: 'yellow', D: 'orange', E: 'red'
}

export default function ListaSolicitudes() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | 'todos'>('todos')

  const filtrados = SOLICITUDES.filter(s => {
    const matchBusqueda = s.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || s.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Solicitudes de crédito"
          subtitle={`${SOLICITUDES.length} solicitudes registradas`}
          actions={
            <Button onClick={() => navigate('/solicitudes/nueva')}>
              <Plus size={16} />Nueva solicitud
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Buscar por cliente…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFiltroEstado('todos')} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroEstado==='todos' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>Todos</button>
            {(Object.keys(ESTADO_CONFIG) as EstadoSolicitud[]).map(e => (
              <button key={e} onClick={() => setFiltroEstado(e)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', filtroEstado===e ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {ESTADO_CONFIG[e].label}
              </button>
            ))}
          </div>
        </div>

        <Card>
          {filtrados.length === 0 ? (
            <EmptyState icon={<FileText size={40} />} title="Sin solicitudes" action={<Button onClick={() => navigate('/solicitudes/nueva')}><Plus size={16} />Nueva solicitud</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Producto</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Monto</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Plazo</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{s.cliente_nombre}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs max-w-[140px] truncate">{s.producto_nombre}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{formatCOP(s.monto_solicitado)}</td>
                      <td className="px-6 py-4 text-gray-600">{s.plazo} meses</td>
                      <td className="px-6 py-4">
                        {s.score ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{s.score}</span>
                            {s.banda_riesgo && <Badge color={BANDA_COLOR[s.banda_riesgo]}>Banda {s.banda_riesgo}</Badge>}
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4"><Badge color={ESTADO_CONFIG[s.estado].color}>{ESTADO_CONFIG[s.estado].label}</Badge></td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{new Date(s.fecha_solicitud).toLocaleDateString('es-CO')}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/solicitudes/${s.id}`)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          <Eye size={15} />
                        </button>
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
