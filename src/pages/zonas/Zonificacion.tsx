import { useState } from 'react'
import { MapContainer, TileLayer, Circle, Tooltip as MapTooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { AlertTriangle, UserCheck, Users, MapPin } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { USUARIOS, CLIENTES } from '../../mocks'

const ZONAS_MOCK = [
  { id: 'z1', nombre: 'Zona Norte',  municipios: ['Barranquilla', 'Soledad', 'Malambo'],          facilitador_id: 'u3', color: '#10b981', lat: 10.9639,  lng: -74.7964 },
  { id: 'z2', nombre: 'Zona Centro', municipios: ['Bogotá-Kennedy', 'Bogotá-Bosa', 'Soacha'],     facilitador_id: null, color: '#6366f1', lat: 4.6097,   lng: -74.0817 },
  { id: 'z3', nombre: 'Zona Sur',    municipios: ['Cali-Aguablanca', 'Palmira', 'Yumbo'],          facilitador_id: null, color: '#f59e0b', lat: 3.4516,   lng: -76.5320 },
  { id: 'z4', nombre: 'UVC Caracas', municipios: ['Petare', 'Catia', 'El Valle'],                  facilitador_id: null, color: '#ef4444', lat: 10.4806,  lng: -66.9036 },
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

        {/* Mapa interactivo */}
        <Card className="mb-6 overflow-hidden">
          <div style={{ height: 380 }}>
            <MapContainer
              center={[6.5, -73.5]}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {ZONAS_MOCK.map(zona => (
                <Circle
                  key={zona.id}
                  center={[zona.lat, zona.lng]}
                  radius={80000}
                  pathOptions={{
                    color: zona.color,
                    fillColor: zona.color,
                    fillOpacity: zonaSeleccionada === zona.id ? 0.5 : 0.25,
                    weight: zonaSeleccionada === zona.id ? 3 : 1.5,
                  }}
                  eventHandlers={{ click: () => setZonaSeleccionada(prev => prev === zona.id ? null : zona.id) }}
                >
                  <MapTooltip sticky>
                    <strong>{zona.nombre}</strong><br />
                    {zona.municipios.join(' · ')}
                  </MapTooltip>
                </Circle>
              ))}
            </MapContainer>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3">
            {ZONAS_MOCK.map(z => (
              <span key={z.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: z.color }} />
                {z.nombre}
              </span>
            ))}
          </div>
        </Card>

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
