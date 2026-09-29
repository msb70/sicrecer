import { useState } from 'react'
import { AlertTriangle, Plus, Users, MapPin, Pencil, Wallet } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert, Input } from '../../components/ui'
import { SelectorCobertura } from '../../components/ubicacion/SelectorCobertura'
import { USUARIOS, CLIENTES, CREDITOS, ZONAS, formatCOP, recargarTablas } from '../../mocks'
import { guardarCatalogo } from '../../lib/catalogos'
import { describirCobertura } from '../../lib/ubicaciones'
import { useApp } from '../../context/AppContext'
import type { Zona } from '../../types'

/**
 * Zonas de trabajo. Regla (2026-09-29): el facilitador es por zona y lleva
 * los créditos de los clientes de su zona. La base de datos reasigna la
 * cartera al cambiar el facilitador de una zona y ubica a cada cliente nuevo
 * en la zona que cubre su ciudad/localidad.
 */
export default function Zonificacion() {
  const { modo, organizacion } = useApp()
  const [, refrescar] = useState(0)
  const [editando, setEditando] = useState<Zona | 'nueva' | null>(null)
  const [error, setError] = useState('')
  const [guardandoId, setGuardandoId] = useState<string | null>(null)

  const facilitadores = USUARIOS.filter(u => u.rol === 'facilitador')
  const zonas = [...ZONAS].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const sinZona = CLIENTES.filter(c => !c.zona_id).length
  const zonasSinFac = zonas.filter(z => z.activo && !z.facilitador_id)

  const stats = (z: Zona) => {
    const cli = CLIENTES.filter(c => c.zona_id === z.id)
    const creds = CREDITOS.filter(cr => cli.some(c => c.id === cr.cliente_id) && cr.estado !== 'cancelado' && cr.estado !== 'castigado')
    return {
      clientes: cli.length,
      creditos: creds.length,
      saldo: creds.reduce((s, c) => s + c.saldo_capital, 0),
      mora: creds.filter(c => c.dias_mora > 0).length,
    }
  }

  const guardar = async (id: string | null, fila: Partial<Zona>) => {
    setError('')
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return false }
    setGuardandoId(id ?? 'nueva')
    try {
      await guardarCatalogo('zonas', fila as Record<string, unknown>, id, 'zona')
      // Cambiar el facilitador reasigna la cartera en la base: recargar clientes.
      await recargarTablas('clientes', 'prospectos')
      refrescar(n => n + 1)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la zona')
      return false
    } finally {
      setGuardandoId(null)
    }
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Zonas y facilitadores"
          subtitle="Cada zona tiene un facilitador, que lleva la cartera de los clientes de esa zona"
          actions={<Button onClick={() => setEditando('nueva')}><Plus size={16} />Nueva zona</Button>}
        />

        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        {zonas.length === 0 && (
          <Alert type="warning" className="mb-4">
            No hay zonas cargadas. Si acabas de actualizar el sistema, la base de datos puede necesitar que se refresque la caché del Data API.
          </Alert>
        )}
        {(zonasSinFac.length > 0 || sinZona > 0) && (
          <Alert type="warning" className="mb-5">
            <AlertTriangle size={15} className="inline mr-1" />
            {zonasSinFac.length > 0 && <>Sin facilitador: <strong>{zonasSinFac.map(z => z.nombre).join(', ')}</strong>. Su cartera solo la ven coordinación y administración. </>}
            {sinZona > 0 && <><strong>{sinZona}</strong> cliente{sinZona === 1 ? '' : 's'} sin zona.</>}
          </Alert>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {zonas.map(zona => {
            const s = stats(zona)
            const fac = facilitadores.find(f => f.id === zona.facilitador_id)
            return (
              <Card key={zona.id} className={zona.activo ? '' : 'opacity-60'}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{zona.nombre}</h3>
                    <div className="flex items-center gap-2">
                      {!zona.activo && <Badge color="gray">Inactiva</Badge>}
                      {fac ? <Badge color="green">{fac.nombre}</Badge> : <Badge color="red">Sin facilitador</Badge>}
                      <button onClick={() => setEditando(zona)} className="p-1 text-gray-400 hover:text-gray-700" title="Editar zona"><Pencil size={14} /></button>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-3">
                    <span className="flex items-center gap-1"><Users size={13} />{s.clientes} clientes</span>
                    <span className="flex items-center gap-1"><Wallet size={13} />{s.creditos} créditos{s.mora > 0 && <span className="text-red-600"> ({s.mora} en mora)</span>}</span>
                    <span className="font-semibold text-gray-800">{formatCOP(s.saldo)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 flex items-start gap-1">
                    <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                    {zona.cobertura.length ? describirCobertura(zona.cobertura) : 'Sin cobertura definida: los clientes nuevos se asignan a mano.'}
                  </p>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Facilitador de la zona</label>
                  <select
                    value={zona.facilitador_id ?? ''}
                    disabled={guardandoId === zona.id}
                    onChange={e => void guardar(zona.id, { facilitador_id: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white outline-none focus:border-brand-500"
                  >
                    <option value="">— Sin facilitador —</option>
                    {facilitadores.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                  {facilitadores.length === 0 && <p className="text-xs text-orange-600 mt-1">No hay usuarios con rol facilitador. Créalos en Usuarios.</p>}
                </CardBody>
              </Card>
            )
          })}
        </div>

        {editando && (
          <ModalZona
            zona={editando === 'nueva' ? null : editando}
            guardando={guardandoId !== null}
            onClose={() => setEditando(null)}
            onGuardar={async fila => {
              const ok = await guardar(editando === 'nueva' ? null : editando.id,
                editando === 'nueva' ? { ...fila, organizacion_id: organizacion?.id ?? null } : fila)
              if (ok) setEditando(null)
            }}
          />
        )}
      </PageContainer>
    </Shell>
  )
}

function ModalZona({ zona, guardando, onClose, onGuardar }: {
  zona: Zona | null; guardando: boolean; onClose: () => void; onGuardar: (f: Partial<Zona>) => void
}) {
  const [nombre, setNombre] = useState(zona?.nombre ?? '')
  const [cobertura, setCobertura] = useState<string[]>(zona?.cobertura ?? [])
  const [activo, setActivo] = useState(zona?.activo ?? true)
  // Otra zona ya cubre alguna de las mismas claves
  const traslapes = ZONAS.filter(z => z.id !== zona?.id && z.activo && z.cobertura.some(k => cobertura.includes(k)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{zona ? `Editar ${zona.nombre}` : 'Nueva zona'}</h2>
        <div className="space-y-4">
          <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Usme – Ciudad Bolívar" />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Cobertura</p>
            <p className="text-xs text-gray-500 mb-2">Los clientes y prospectos nuevos cuya dirección cae aquí se asignan solos a esta zona (y a su facilitador).</p>
            <SelectorCobertura value={cobertura} onChange={setCobertura} />
          </div>
          {traslapes.length > 0 && (
            <Alert type="warning">Esta cobertura se cruza con: {traslapes.map(z => z.nombre).join(', ')}. Gana la zona con la coincidencia más específica (localidad sobre ciudad).</Alert>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="accent-brand-600" /> Zona activa
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" loading={guardando} disabled={!nombre.trim()}
              onClick={() => onGuardar({ nombre: nombre.trim(), cobertura, activo })}>Guardar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
