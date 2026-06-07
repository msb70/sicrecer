import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, ChevronRight } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, EmptyState } from '../../components/ui'
import { PRODUCTOS, CONVENIOS, formatCOP } from '../../mocks'

const METODO_LABEL = { flat: 'Flat', declining_balance: 'Saldo decreciente' }
const FREQ_LABEL   = { semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual' }

export default function ListaProductos() {
  const navigate = useNavigate()
  const [filtroConvenio, setFiltroConvenio] = useState('todos')

  const filtrados = PRODUCTOS.filter(p => filtroConvenio === 'todos' || p.convenio_id === filtroConvenio)

  const getConvenio = (id: string) => CONVENIOS.find(c => c.id === id)

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Productos crediticios"
          subtitle="Líneas de crédito disponibles por convenio"
          actions={<Button onClick={() => navigate('/productos/nuevo')}><Plus size={16}/>Nuevo producto</Button>}
        />

        {/* Filtro por convenio */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFiltroConvenio('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroConvenio === 'todos' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          {CONVENIOS.filter(c => c.estado === 'activo').map(c => (
            <button
              key={c.id}
              onClick={() => setFiltroConvenio(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroConvenio === c.id ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {c.cooperante}
            </button>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Plus size={36}/>}
              title="Sin productos"
              description="Crea el primer producto crediticio vinculado a un convenio."
              action={<Button onClick={() => navigate('/productos/nuevo')}><Plus size={16}/>Nuevo producto</Button>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {filtrados.map(prod => {
              const conv = getConvenio(prod.convenio_id)
              return (
                <Card key={prod.id} className="hover:border-brand-200 transition-colors cursor-pointer" onClick={() => navigate(`/productos/${prod.id}`)}>
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-semibold text-gray-900">{prod.nombre}</p>
                          <Badge color="blue">{FREQ_LABEL[prod.frecuencia]}</Badge>
                          <Badge color="gray">{METODO_LABEL[prod.metodo_interes]}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          Convenio: {conv?.cooperante ?? '—'} · {conv?.moneda ?? '—'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">Tasa nominal</p>
                            <p className="font-semibold text-gray-800">{prod.tasa_nominal_anual}%/año</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Plazo</p>
                            <p className="font-semibold text-gray-800">{prod.plazo_min}–{prod.plazo_max} meses</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Monto mínimo</p>
                            <p className="font-semibold text-gray-800">{formatCOP(prod.monto_min)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Monto máximo</p>
                            <p className="font-semibold text-gray-800">{formatCOP(prod.monto_max)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/productos/${prod.id}/editar`) }}
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit size={15}/>
                        </button>
                        <ChevronRight size={16} className="text-gray-300"/>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PageContainer>
    </Shell>
  )
}
