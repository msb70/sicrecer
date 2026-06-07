import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Badge, Card, CardBody, EmptyState } from '../../components/ui'
import { CLIENTES } from '../../mocks'
import { clsx } from 'clsx'

// Mock de grupos solidarios
const GRUPOS = [
  {
    id: 'grp-01',
    nombre: 'Las Emprendedoras del Norte',
    socios: ['cli-01', 'cli-03'],
    estado: 'activo' as const,
    fecha_formacion: '2025-08-01',
    credito_grupal: true,
  },
]

export default function GruposSolidarios() {
  const navigate = useNavigate()
  const [expandido, setExpandido] = useState<string | null>('grp-01')

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Grupos Solidarios"
          subtitle="Grupos de 3–15 socios con garantía mancomunada"
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate('/clientes')}><ArrowLeft size={16} />Clientes</Button>
              <Button><Plus size={16} />Nuevo grupo</Button>
            </div>
          }
        />

        <div className="space-y-4">
          {GRUPOS.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Users size={40} />}
                title="Sin grupos solidarios"
                description="Forma el primer grupo para habilitar créditos mancomunados."
                action={<Button><Plus size={16} />Nuevo grupo</Button>}
              />
            </Card>
          ) : (
            GRUPOS.map(grupo => {
              const socios = CLIENTES.filter(c => grupo.socios.includes(c.id))
              const abierto = expandido === grupo.id
              return (
                <Card key={grupo.id}>
                  <button
                    onClick={() => setExpandido(abierto ? null : grupo.id)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <Users size={18} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{grupo.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {socios.length} socios · Formado {new Date(grupo.fecha_formacion).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge color={grupo.estado === 'activo' ? 'green' : 'gray'}>
                        {grupo.estado}
                      </Badge>
                      {abierto ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {abierto && (
                    <CardBody className="border-t border-gray-100">
                      <div className="space-y-2 mb-4">
                        {socios.map((socio, i) => (
                          <div key={socio.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{socio.nombre}</p>
                                <p className="text-xs text-gray-500">{socio.actividad_economica}</p>
                              </div>
                            </div>
                            <Badge color={socio.estado === 'moroso' ? 'red' : 'green'}>
                              {socio.estado}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Alerta garantía mancomunada */}
                      {socios.some(s => s.estado === 'moroso') && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 mb-4">
                          ⚠️ <strong>Garantía mancomunada activada:</strong> un socio tiene mora. El grupo es corresponsable según la regla configurada.
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm">+ Agregar socio</Button>
                        <Button size="sm" onClick={() => navigate(`/solicitudes/nueva?grupo=${grupo.id}`)}>
                          <Plus size={14} /> Solicitar crédito grupal
                        </Button>
                      </div>
                    </CardBody>
                  )}
                </Card>
              )
            })
          )}
        </div>
      </PageContainer>
    </Shell>
  )
}
