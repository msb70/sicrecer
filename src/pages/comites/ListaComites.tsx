import { useNavigate } from 'react-router-dom'
import { Plus, CheckSquare, Users, ChevronRight } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, Badge, EmptyState, Alert } from '../../components/ui'
import { COMITES, COMITE_MIEMBROS, PRODUCTOS, USUARIOS } from '../../mocks'

export default function ListaComites() {
  const navigate = useNavigate()
  const productosSinComite = PRODUCTOS.filter(p => p.activo !== false && !COMITES.some(c => c.producto_id === p.id && c.activo))

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Comités de crédito"
          subtitle="Un comité activo por producto. Sus miembros reciben las solicitudes y votan."
          actions={<Button onClick={() => navigate('/comites/nuevo')}><Plus size={16} /> Nuevo comité</Button>}
        />

        {productosSinComite.length > 0 && (
          <Alert type="warning" className="mb-4">
            Sin comité activo: {productosSinComite.map(p => p.nombre).join(', ')}. Las solicitudes de estos productos no se podrán enviar a evaluación.
          </Alert>
        )}

        {COMITES.length === 0 ? (
          <Card>
            <EmptyState icon={<CheckSquare size={36} />} title="No hay comités" description="Crea un comité por producto y asigna sus miembros."
              action={<Button onClick={() => navigate('/comites/nuevo')}><Plus size={16} /> Crear comité</Button>} />
          </Card>
        ) : (
          <div className="space-y-3">
            {COMITES.map(c => {
              const producto = PRODUCTOS.find(p => p.id === c.producto_id)
              const miembros = COMITE_MIEMBROS.filter(m => m.comite_id === c.id).map(m => USUARIOS.find(u => u.id === m.usuario_id)).filter(Boolean)
              return (
                <Card key={c.id} className="cursor-pointer hover:border-brand-200" onClick={() => navigate(`/comites/${c.id}/editar`)}>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate">{c.nombre}</p>
                        <Badge color={c.activo ? 'green' : 'gray'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">Producto: {producto?.nombre ?? c.producto_id}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Users size={12} /> {miembros.length} miembro(s): {miembros.map(m => m!.nombre).join(', ') || '—'}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 shrink-0" />
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
