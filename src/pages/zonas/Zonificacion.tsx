import { useState } from 'react'
import { MapPin, AlertTriangle, UserCheck, Users } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { USUARIOS, CLIENTES } from '../../mocks'

// Mock de zonas para la demo
const ZONAS_MOCK = [
  { id: 'z1', nombre: 'Zona Norte',  municipios: ['Barranquilla', 'Soledad', 'Malambo'],            facilitador_id: 'u3', color: '#10b981' },
  { id: 'z2', nombre: 'Zona Centro', municipios: ['Bogotá-Kennedy', 'Bogotá-Bosa', 'Soacha'],       facilitador_id: null, color: '#6366f1' },
  { id: 'z3', nombre: 'Zona Sur',    municipios: ['Cali-Aguablanca', 'Palmira', 'Yumbo'],           facilitador_id: null, color: '#f59e0b' },
  { id: 'z4', nombre: 'UVC Caracas', municipios: ['Petare', 'Catia', 'El Valle'],                   facilitador_id: null, color: '#ef4444' },
]

export default function Zonificacion() {
  const [zonaSeleccionada, setZonaSeleccionada] = useState<string | null>(null)
  const [facilitadorAsignando, setFacilitadorAsignando] = useState<string | null>(null)
  const [asignaciones, setAsignaciones] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {}
    ZONAS_MOCK.forEach(z => { init[z.id] = z.facilitador_id })
    return init
  })

  const facilitadores = USUARIOS.filter(u => u.rol === 'facilitador')

  const asignar = (zonaId: string, facilitadorId: string) => {
    setAsignaciones(prev => ({ ...prev, [zonaId]: facilitadorId }))
    setFacilitadorAsignando(null)
  }

  const clientesPorZona = (zonaNombre: string) =>
    CLIENTES.filter(c => c.zona.toLowerCase().includes(zonaNombre.split(' ')[1]?.toLowerCase() ?? '__')).length

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Zonificación"
          subtitle="Gestión de zonas geográficas y asignación de facilitadores"
        />

        <Alert type="info" className="mb-5">
          <MapPin size={15} className="inline mr-1"/>
          El mapa interactivo estará disponible con la integración Leaflet/Mapbox. Por ahora gestiona las zonas en modo lista.
        </Alert>

        {/* Mapa placeholder */}
        <Card className="mb-6">
          <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
            {/* Simulación visual de mapa */}
            <div className="absolute inset-0 opacity-20">
              {ZONAS_MOCK.map((z, i) => (
                <div
                  key={z.id}
                  className="absolute rounded-full opacity-40"
                  style={{
                    background: z.color,
                    width: `${120 + i * 30}px`,
                    height: `${90 + i * 20}px`,
                    left: `${10 + i * 20}%`,
                    top:  `${10 + i * 15}%`,
                    filter: 'blur(20px)',
                  }}
                />
              ))}
            </div>
            <div className="text-center z-10">
              <MapPin size={40} className="mx-auto text-gray-400 mb-2"/>
              <p className="text-gray-500 font-medium">Mapa interactivo</p>
              <p className="text-xs text-gray-400">Leaflet · Próxima implementación</p>
            </div>
          </div>
        </Card>

        {/* Alertas de traslape (simuladas) */}
        <Alert type="warning" className="mb-5">
          <AlertTriangle size={15} className="inline mr-1"/>
          <strong>Traslape detectado:</strong> Zona Norte y Zona Centro comparten el municipio "Soacha". Verifica los límites.
        </Alert>

        {/* Lista de zonas */}
        <div className="grid sm:grid-cols-2 gap-4">
          {ZONAS_MOCK.map(zona => {
            const facAsig = facilitadores.find(f => f.id === asignaciones[zona.id])
            const numClientes = clientesPorZona(zona.nombre)
            const seleccionada = zonaSeleccionada === zona.id

            return (
              <Card
                key={zona.id}
                className={`cursor-pointer transition-all ${seleccionada ? 'border-brand-400 shadow-md' : 'hover:border-gray-300'}`}
                onClick={() => setZonaSeleccionada(seleccionada ? null : zona.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: zona.color }}/>
                      <h3 className="text-sm font-semibold text-gray-900">{zona.nombre}</h3>
                    </div>
                    {facAsig
                      ? <Badge color="green">Asignado</Badge>
                      : <Badge color="red">Sin facilitador</Badge>
                    }
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <span className="flex items-center gap-1 text-gray-500">
                      <MapPin size={13}/>{zona.municipios.length} municipios
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users size={13}/>{numClientes} clientes
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">{zona.municipios.join(' · ')}</p>

                  {facAsig ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                          {facAsig.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-800">{facAsig.nombre}</p>
                          <p className="text-xs text-gray-400">{facAsig.zona}</p>
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setFacilitadorAsignando(zona.id) }}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={e => { e.stopPropagation(); setFacilitadorAsignando(zona.id) }}
                    >
                      <UserCheck size={14}/>Asignar facilitador
                    </Button>
                  )}

                  {/* Panel asignación */}
                  {facilitadorAsignando === zona.id && (
                    <div
                      className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <p className="text-xs font-medium text-gray-700 mb-2">Selecciona facilitador:</p>
                      {facilitadores.map(f => (
                        <button
                          key={f.id}
                          onClick={() => asignar(zona.id, f.id)}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 text-left transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {f.nombre.split(' ').map(n=>n[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">{f.nombre}</p>
                            <p className="text-xs text-gray-400">{f.zona}</p>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => setFacilitadorAsignando(null)}
                        className="w-full text-xs text-gray-400 hover:text-gray-600 pt-1"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      </PageContainer>
    </Shell>
  )
}
