import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, TrendingDown } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Badge, Card, StatCard } from '../../components/ui'
import { CREDITOS, formatCOP } from '../../mocks'
import { KPI_REPORTES } from '../../mocks/extra'
import type { EstadoCredito } from '../../types'
import { clsx } from 'clsx'

const ESTADO_COLOR: Record<EstadoCredito, 'green' | 'blue' | 'red' | 'gray' | 'orange'> = {
  al_dia:    'green',
  activo:    'blue',
  en_mora:   'red',
  cancelado: 'gray',
  castigado: 'orange',
}

const ESTADO_LABEL: Record<EstadoCredito, string> = {
  al_dia:    'Al día',
  activo:    'Activo',
  en_mora:   'En mora',
  cancelado: 'Cancelado',
  castigado: 'Castigado',
}

type FiltroEstado = EstadoCredito | 'todos'

export default function ListaCartera() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = CREDITOS
    .filter(c => filtro === 'todos' || c.estado === filtro)
    .filter(c => c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const enMora    = CREDITOS.filter(c => c.estado === 'en_mora')
  const totalSaldo = CREDITOS.reduce((s, c) => s + c.saldo_capital, 0)

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Cartera activa"
          subtitle="Seguimiento de créditos desembolsados"
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Cartera total"     value={formatCOP(totalSaldo)}             color="blue"   />
          <StatCard label="PAR 30"            value={`${KPI_REPORTES.par_30}%`}         color={KPI_REPORTES.par_30 > 5 ? 'red' : 'green'} />
          <StatCard label="PAR 90"            value={`${KPI_REPORTES.par_90}%`}         color={KPI_REPORTES.par_90 > 3 ? 'red' : 'green'} />
          <StatCard label="Créditos en mora"  value={String(enMora.length)}             color="red"    />
        </div>

        {/* Alerta de mora */}
        {enMora.length > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0"/>
            <div>
              <p className="text-sm font-semibold text-red-800">
                {enMora.length} crédito{enMora.length > 1 ? 's' : ''} en mora
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {enMora.map(c => `${c.cliente_nombre} (${c.dias_mora}d)`).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input
            type="text"
            placeholder="Buscar cliente…"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
          <div className="flex gap-1.5 flex-wrap">
            {(['todos', 'al_dia', 'activo', 'en_mora'] as FiltroEstado[]).map(f => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  filtro === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {f === 'todos' ? 'Todos' : ESTADO_LABEL[f as EstadoCredito]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla desktop */}
        <Card>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Cliente', 'Producto', 'Saldo capital', 'Cuotas', 'Próx. vencimiento', 'Mora', 'Estado', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(cred => {
                  const diasMora = cred.dias_mora
                  const pctAvance = (cred.cuotas_pagadas / cred.cuotas_total) * 100
                  return (
                    <tr
                      key={cred.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/cartera/${cred.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {cred.cliente_nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="font-medium text-gray-900">{cred.cliente_nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cred.producto_nombre}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCOP(cred.saldo_capital)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 bg-brand-500 rounded-full" style={{ width: `${pctAvance}%` }}/>
                          </div>
                          <span className="text-xs text-gray-500">{cred.cuotas_pagadas}/{cred.cuotas_total}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(cred.proxima_cuota).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        {diasMora > 0
                          ? <span className="flex items-center gap-1 text-red-600 text-xs font-semibold"><TrendingDown size={13}/>{diasMora}d</span>
                          : <span className="text-green-600 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={ESTADO_COLOR[cred.estado]}>{ESTADO_LABEL[cred.estado]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={15} className="text-gray-300"/>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {filtrados.map(cred => (
              <div
                key={cred.id}
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => navigate(`/cartera/${cred.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{cred.cliente_nombre}</p>
                  <Badge color={ESTADO_COLOR[cred.estado]}>{ESTADO_LABEL[cred.estado]}</Badge>
                </div>
                <p className="text-xs text-gray-400 mb-2">{cred.producto_nombre}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Saldo:</span>
                  <span className="font-semibold text-gray-900">{formatCOP(cred.saldo_capital)}</span>
                </div>
                {cred.dias_mora > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle size={12}/>{cred.dias_mora} días en mora
                  </p>
                )}
              </div>
            ))}
          </div>

          {filtrados.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Sin créditos que coincidan</div>
          )}
        </Card>
      </PageContainer>
    </Shell>
  )
}
