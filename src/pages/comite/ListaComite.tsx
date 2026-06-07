import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Vote, Clock, CheckCircle2, XCircle, ChevronRight, Users } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Badge, Card, CardHeader, CardBody, StatCard, EmptyState } from '../../components/ui'
import { SOLICITUDES, CLIENTES, PRODUCTOS, formatCOP } from '../../mocks'
import { clsx } from 'clsx'

// Mock de votos por solicitud
const VOTOS_MOCK: Record<string, { miembro: string; decision: 'aprobado' | 'rechazado' | 'pendiente'; comentario?: string }[]> = {
  'sol-002': [
    { miembro: 'Ana Restrepo',   decision: 'aprobado',  comentario: 'Cliente con buen historial interno.' },
    { miembro: 'Carlos Méndez',  decision: 'pendiente' },
    { miembro: 'Elena Gutiérrez',decision: 'pendiente' },
  ],
}

const QUORUM_REQUERIDO = 2 // de 3 miembros

export default function ListaComite() {
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<'pendientes' | 'resueltas'>('pendientes')

  const enComite    = SOLICITUDES.filter(s => s.estado === 'revision_comite')
  const resueltas   = SOLICITUDES.filter(s => s.estado === 'aprobada' || s.estado === 'rechazada')
  const mostradas   = filtro === 'pendientes' ? enComite : resueltas

  const votosEmitidos = (solId: string) => (VOTOS_MOCK[solId] ?? []).filter(v => v.decision !== 'pendiente').length
  const totalVotantes = (solId: string) => (VOTOS_MOCK[solId] ?? []).length || 3

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Comité de Crédito"
          subtitle="Revisión y votación de solicitudes derivadas por scoring"
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="En revisión"     value={String(enComite.length)}  color="yellow" />
          <StatCard label="Quórum req."     value={`${QUORUM_REQUERIDO}/3`} color="blue"   />
          <StatCard label="Aprobadas hoy"   value="1"                        color="green"  />
          <StatCard label="Rechazadas hoy"  value="0"                        color="red"    />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          {(['pendientes', 'resueltas'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize',
                filtro === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'pendientes' ? `Pendientes (${enComite.length})` : `Resueltas (${resueltas.length})`}
            </button>
          ))}
        </div>

        {mostradas.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Vote size={36}/>}
              title={filtro === 'pendientes' ? 'Sin solicitudes pendientes' : 'Sin solicitudes resueltas'}
              description="Las solicitudes derivadas por scoring aparecerán aquí."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {mostradas.map(sol => {
              const cliente  = CLIENTES.find(c => c.id === sol.cliente_id)
              const producto = PRODUCTOS.find(p => p.id === sol.producto_id)
              const emitidos = votosEmitidos(sol.id)
              const total    = totalVotantes(sol.id)
              const pctVoto  = (emitidos / total) * 100
              const quorumOk = emitidos >= QUORUM_REQUERIDO
              const diasPendiente = Math.floor((Date.now() - new Date(sol.fecha_solicitud).getTime()) / 86400000)

              return (
                <Card
                  key={sol.id}
                  className="cursor-pointer hover:border-brand-200 transition-all"
                  onClick={() => navigate(`/comite/${sol.id}`)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar cliente */}
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {sol.cliente_nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{sol.cliente_nombre}</p>
                          <p className="text-xs text-gray-400">{sol.producto_nombre} · {formatCOP(sol.monto_solicitado)} · {sol.plazo} meses</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sol.score && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Score</p>
                            <p className="text-lg font-bold text-gray-800">{sol.score}</p>
                          </div>
                        )}
                        {sol.banda_riesgo && (
                          <Badge color={
                            sol.banda_riesgo === 'A' ? 'green' :
                            sol.banda_riesgo === 'B' ? 'blue' :
                            sol.banda_riesgo === 'C' ? 'yellow' :
                            sol.banda_riesgo === 'D' ? 'orange' : 'red'
                          }>
                            Banda {sol.banda_riesgo}
                          </Badge>
                        )}
                        <ChevronRight size={16} className="text-gray-300"/>
                      </div>
                    </div>

                    {/* Quórum visual */}
                    {filtro === 'pendientes' && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1 text-gray-500">
                            <Users size={12}/> Votos emitidos: {emitidos}/{total}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {quorumOk
                              ? <><CheckCircle2 size={12} className="text-green-500"/><span className="text-green-600 font-medium">Quórum alcanzado</span></>
                              : <><Clock size={12} className="text-yellow-500"/><span className="text-yellow-600">Esperando votos</span></>
                            }
                            <span className="text-gray-400">· {diasPendiente}d pendiente</span>
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${quorumOk ? 'bg-green-500' : 'bg-yellow-400'}`}
                            style={{ width: `${pctVoto}%` }}
                          />
                        </div>

                        {/* Indicadores de voto por miembro */}
                        <div className="flex gap-2 mt-3">
                          {(VOTOS_MOCK[sol.id] ?? Array(3).fill({ decision: 'pendiente' })).map((v, i) => (
                            <div key={i} className={clsx(
                              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs',
                              v.decision === 'aprobado'  ? 'bg-green-50 text-green-700' :
                              v.decision === 'rechazado' ? 'bg-red-50 text-red-700' :
                              'bg-gray-100 text-gray-500'
                            )}>
                              {v.decision === 'aprobado'  && <CheckCircle2 size={11}/>}
                              {v.decision === 'rechazado' && <XCircle size={11}/>}
                              {v.decision === 'pendiente' && <Clock size={11}/>}
                              <span>{v.miembro ?? `Miembro ${i + 1}`}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resultado para resueltas */}
                    {filtro === 'resueltas' && (
                      <div className="flex items-center gap-2">
                        {sol.estado === 'aprobada'
                          ? <><CheckCircle2 size={14} className="text-green-500"/><span className="text-sm text-green-700 font-medium">Aprobada</span></>
                          : <><XCircle size={14} className="text-red-500"/><span className="text-sm text-red-700 font-medium">Rechazada</span></>
                        }
                        <span className="text-xs text-gray-400">· {new Date(sol.fecha_solicitud).toLocaleDateString('es-CO')}</span>
                      </div>
                    )}
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
