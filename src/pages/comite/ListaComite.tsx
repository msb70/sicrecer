import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Vote, Clock, CheckCircle2, XCircle, ChevronRight, Users, Globe } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Badge, Card, StatCard, EmptyState, Alert } from '../../components/ui'
import { SOLICITUDES, COMITES, COMITE_MIEMBROS, COMITE_VOTOS, USUARIOS, formatCOP } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { clsx } from 'clsx'

export default function ListaComite() {
  const navigate = useNavigate()
  const { usuario, rol } = useApp()
  const [filtro, setFiltro] = useState<'pendientes' | 'resueltas'>('pendientes')

  // Comités de los que soy miembro (admin ve todos)
  const misComites = rol === 'administrador'
    ? COMITES.map(c => c.id)
    : COMITE_MIEMBROS.filter(m => m.usuario_id === usuario.id).map(m => m.comite_id)

  const enComite  = SOLICITUDES.filter(s => s.estado === 'revision_comite' && s.comite_id && misComites.includes(s.comite_id))
  const resueltas = SOLICITUDES.filter(s => (s.estado === 'aprobada' || s.estado === 'rechazada') && s.comite_id && misComites.includes(s.comite_id))
    .sort((a, b) => (b.fecha_decision ?? '').localeCompare(a.fecha_decision ?? ''))
  const mostradas = filtro === 'pendientes' ? enComite : resueltas

  const hoy = new Date().toISOString().slice(0, 10)
  const aprobadasHoy  = resueltas.filter(s => s.estado === 'aprobada'  && (s.fecha_decision ?? '').startsWith(hoy)).length
  const rechazadasHoy = resueltas.filter(s => s.estado === 'rechazada' && (s.fecha_decision ?? '').startsWith(hoy)).length
  const pendientesDeMi = enComite.filter(s => !COMITE_VOTOS.some(v => v.solicitud_id === s.id && v.usuario_id === usuario.id)).length

  return (
    <Shell>
      <PageContainer>
        <PageHeader title="Comité de Crédito" subtitle="Solicitudes enviadas a evaluación. La decisión se toma por mayoría simple de los miembros." />

        {misComites.length === 0 && (
          <Alert type="warning" className="mb-4">No eres miembro de ningún comité. Pide a un administrador que te asigne en Configuración → Comités.</Alert>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="En revisión"      value={String(enComite.length)}   color="yellow" />
          <StatCard label="Pendientes de mi voto" value={String(pendientesDeMi)} color="blue" />
          <StatCard label="Aprobadas hoy"    value={String(aprobadasHoy)}      color="green" />
          <StatCard label="Rechazadas hoy"   value={String(rechazadasHoy)}     color="red" />
        </div>

        <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
          {(['pendientes', 'resueltas'] as const).map(t => (
            <button key={t} onClick={() => setFiltro(t)}
              className={clsx('px-4 py-2 text-sm font-medium rounded-lg transition-all', filtro === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              {t === 'pendientes' ? `Pendientes (${enComite.length})` : `Resueltas (${resueltas.length})`}
            </button>
          ))}
        </div>

        {mostradas.length === 0 ? (
          <Card>
            <EmptyState icon={<Vote size={36} />}
              title={filtro === 'pendientes' ? 'Sin solicitudes pendientes' : 'Sin solicitudes resueltas'}
              description="Las solicitudes que un facilitador envíe a tu comité aparecerán aquí." />
          </Card>
        ) : (
          <div className="space-y-3">
            {mostradas.map(sol => {
              const comite = COMITES.find(c => c.id === sol.comite_id)
              const miembros = COMITE_MIEMBROS.filter(m => m.comite_id === sol.comite_id)
              const votos = COMITE_VOTOS.filter(v => v.solicitud_id === sol.id)
              const total = miembros.length
              const emitidos = votos.length
              const necesarios = Math.floor(total / 2) + 1
              const diasPendiente = sol.enviada_comite_en ? Math.floor((Date.now() - new Date(sol.enviada_comite_en).getTime()) / 86400000) : 0
              const yoVote = votos.some(v => v.usuario_id === usuario.id)

              return (
                <Card key={sol.id} className="cursor-pointer hover:border-brand-200 transition-all" onClick={() => navigate(`/comite/${sol.id}`)}>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {sol.cliente_nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            {sol.cliente_nombre}
                            {sol.origen === 'externo' && <Badge color="purple"><span className="inline-flex items-center gap-1"><Globe size={11} /> Portal</span></Badge>}
                          </p>
                          <p className="text-xs text-gray-400">{sol.producto_nombre} · {formatCOP(sol.monto_solicitado)} · {sol.plazo} cuotas · {comite?.nombre}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {filtro === 'pendientes' && !yoVote && <Badge color="blue">Falta tu voto</Badge>}
                        <ChevronRight size={16} className="text-gray-300" />
                      </div>
                    </div>

                    {filtro === 'pendientes' && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1 text-gray-500"><Users size={12} /> Votos: {emitidos}/{total} (mayoría: {necesarios})</span>
                          <span className="flex items-center gap-1.5 text-gray-400"><Clock size={12} /> {diasPendiente}d en comité</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="h-2 rounded-full bg-yellow-400 transition-all" style={{ width: `${total ? (emitidos / total) * 100 : 0}%` }} />
                        </div>
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {miembros.map(m => {
                            const u = USUARIOS.find(x => x.id === m.usuario_id)
                            const v = votos.find(x => x.usuario_id === m.usuario_id)
                            return (
                              <div key={m.usuario_id} className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs',
                                v?.decision === 'aprobado' ? 'bg-green-50 text-green-700' : v?.decision === 'rechazado' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500')}>
                                {v?.decision === 'aprobado' && <CheckCircle2 size={11} />}
                                {v?.decision === 'rechazado' && <XCircle size={11} />}
                                {!v && <Clock size={11} />}
                                <span>{u?.nombre ?? m.usuario_id}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {filtro === 'resueltas' && (
                      <div className="flex items-center gap-2">
                        {sol.estado === 'aprobada'
                          ? <><CheckCircle2 size={14} className="text-green-500" /><span className="text-sm text-green-700 font-medium">Aprobada · {formatCOP(Number(sol.monto_aprobado ?? sol.monto_solicitado))} en {sol.plazo_aprobado ?? sol.plazo} cuotas</span></>
                          : <><XCircle size={14} className="text-red-500" /><span className="text-sm text-red-700 font-medium">Rechazada</span></>}
                        <span className="text-xs text-gray-400">· {sol.fecha_decision ? new Date(sol.fecha_decision).toLocaleDateString('es-CO') : ''}</span>
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
