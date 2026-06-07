import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, AlertTriangle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, StatCard, EmptyState } from '../../components/ui'
import { CONVENIOS, formatCOP, formatUVC } from '../../mocks'
import type { EstadoConvenio } from '../../types'
import { clsx } from 'clsx'

const ESTADO_COLOR: Record<EstadoConvenio, 'green' | 'gray' | 'red'> = {
  activo:     'green',
  cerrado:    'gray',
  suspendido: 'red',
}

const PAIS_FLAG: Record<string, string> = { CO: '🇨🇴', VE: '🇻🇪' }

export default function ListaConvenios() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<EstadoConvenio | 'todos'>('todos')

  const filtrados = CONVENIOS.filter(c => filtro === 'todos' || c.estado === filtro)
  const activos   = CONVENIOS.filter(c => c.estado === 'activo')
  const totalFondo = activos.reduce((s, c) => s + c.monto_total, 0)
  const totalDisp  = activos.reduce((s, c) => s + c.saldo_disponible, 0)
  const usoPct     = totalFondo > 0 ? (((totalFondo - totalDisp) / totalFondo) * 100).toFixed(0) : '0'

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Convenios"
          subtitle="Fondos de cooperantes disponibles para colocación"
          actions={<Button onClick={() => navigate('/convenios/nuevo')}><Plus size={16} />Nuevo convenio</Button>}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Convenios activos"    value={String(activos.length)}    color="green" />
          <StatCard label="Fondo total"          value={formatCOP(totalFondo)}     color="blue"  />
          <StatCard label="Disponible"           value={formatCOP(totalDisp)}      color="green" />
          <StatCard label="Uso del fondo"        value={`${usoPct}%`}              color={Number(usoPct) >= 80 ? 'red' : 'yellow'} />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-5">
          {(['todos', 'activo', 'cerrado', 'suspendido'] as const).map(e => (
            <button
              key={e}
              onClick={() => setFiltro(e)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
                filtro === e ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              {e === 'todos' ? 'Todos' : e.charAt(0).toUpperCase() + e.slice(1)}
            </button>
          ))}
        </div>

        {/* Cards de convenios */}
        <div className="space-y-4">
          {filtrados.length === 0 ? (
            <Card><EmptyState icon={<Plus size={36} />} title="Sin convenios" action={<Button onClick={() => navigate('/convenios/nuevo')}><Plus size={16} />Nuevo convenio</Button>} /></Card>
          ) : filtrados.map(conv => {
            const usado  = conv.monto_total - conv.saldo_disponible
            const pct    = (usado / conv.monto_total) * 100
            const alerta = pct >= 95 ? 'red' : pct >= 80 ? 'yellow' : null
            const fmt    = conv.moneda === 'UVC' ? formatUVC : formatCOP
            const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-brand-500'

            return (
              <Card key={conv.id} className={clsx(alerta === 'red' && 'border-red-200', alerta === 'yellow' && 'border-yellow-200')}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{PAIS_FLAG[conv.pais]}</span>
                      <div>
                        <p className="font-semibold text-gray-900">{conv.cooperante}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(conv.fecha_inicio).toLocaleDateString('es-CO')} → {new Date(conv.fecha_fin).toLocaleDateString('es-CO')} · {conv.moneda}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alerta && (
                        <span className={clsx('flex items-center gap-1 text-xs font-medium', alerta === 'red' ? 'text-red-600' : 'text-yellow-600')}>
                          <AlertTriangle size={13} />
                          {pct.toFixed(0)}% usado
                        </span>
                      )}
                      <Badge color={ESTADO_COLOR[conv.estado]}>{conv.estado}</Badge>
                      <button onClick={() => navigate(`/convenios/${conv.id}`)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Eye size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Barra de uso */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Colocado: {fmt(usado)}</span>
                      <span>Disponible: {fmt(conv.saldo_disponible)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Fondo total: <span className="font-semibold text-gray-800">{fmt(conv.monto_total)}</span></span>
                    <span className="text-gray-400 text-xs">{pct.toFixed(1)}% del fondo usado</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </PageContainer>
    </Shell>
  )
}
