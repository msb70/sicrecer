import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Banknote, Eye } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, Badge, StatCard } from '../../components/ui'
import { COBRANZAS, CLIENTES, CREDITOS, formatCOP } from '../../mocks'
import type { Cobranza } from '../../types'

export default function ListaCobranzas() {
  const navigate = useNavigate()
  const [items]        = useState<Cobranza[]>(COBRANZAS)
  const [clienteFiltro, setClienteFiltro] = useState('')

  const filtrados = clienteFiltro
    ? items.filter(c => c.cliente_id === clienteFiltro)
    : items

  const totalRecaudado = items.reduce((s, c) => s + c.monto, 0)
  const totalCuotas    = items.reduce((s, c) => s + c.cuotas_aplicadas.length, 0)

  const clientesConCob = Array.from(new Map(items.map(c => [c.cliente_id, c.cliente_nombre])).entries())

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Cobranza"
          subtitle="Registro de depósitos y aplicación de cuotas"
          actions={<Button onClick={() => navigate('/cobranza/nueva')}><Plus size={16}/>Nueva cobranza</Button>}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <StatCard label="Pagos registrados"  value={String(items.length)}           color="green"/>
          <StatCard label="Total recaudado"     value={formatCOP(totalRecaudado)}      color="blue"/>
          <StatCard label="Cuotas aplicadas"    value={String(totalCuotas)}            color="orange"/>
        </div>

        {/* Filtro cliente */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setClienteFiltro('')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !clienteFiltro ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Todos
          </button>
          {clientesConCob.map(([id, nombre]) => (
            <button
              key={id}
              onClick={() => setClienteFiltro(clienteFiltro === id ? '' : id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                clienteFiltro === id ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <Card>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Fecha', 'Cliente', 'Banco', 'N° Depósito', 'Monto', 'Cuotas aplicadas', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(cob => {
                  const credito = CREDITOS.find(cr => cr.id === cob.credito_id)
                  return (
                    <tr key={cob.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cob.fecha}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{cob.cliente_nombre}</p>
                          {credito && <p className="text-xs text-gray-400">{credito.producto_nombre}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{cob.banco}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cob.numero_deposito}</td>
                      <td className="px-4 py-3 font-semibold text-green-700">{formatCOP(cob.monto)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {cob.cuotas_aplicadas.map(n => (
                            <span key={n} className="inline-block bg-green-50 text-green-700 border border-green-100 rounded px-1.5 py-0.5 text-xs font-medium">
                              #{n}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          <Eye size={14}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtrados.map(cob => (
              <div key={cob.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{cob.cliente_nombre}</p>
                    <p className="text-xs text-gray-500">{cob.banco} · {cob.fecha}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{cob.numero_deposito}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="font-semibold text-green-700">{formatCOP(cob.monto)}</p>
                    <div className="flex flex-wrap gap-1 justify-end mt-1">
                      {cob.cuotas_aplicadas.map(n => (
                        <span key={n} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-medium">#{n}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12">
              <Banknote size={36} className="mx-auto text-gray-200 mb-3"/>
              <p className="text-gray-400 text-sm">No hay cobranzas registradas</p>
              <button onClick={() => navigate('/cobranza/nueva')} className="mt-2 text-xs text-brand-600 hover:underline">
                Registrar primera cobranza
              </button>
            </div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
