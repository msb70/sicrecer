import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Input, Select, Card, CardHeader, CardBody, Alert } from '../../components/ui'
import { CONVENIOS } from '../../mocks'

export default function FormConvenio() {
  const navigate = useNavigate()
  const { id } = useParams()
  const convenio = id ? CONVENIOS.find(c => c.id === id) : null
  const esEdicion = Boolean(convenio)

  const [form, setForm] = useState({
    cooperante:       convenio?.cooperante       ?? '',
    monto_total:      String(convenio?.monto_total     ?? ''),
    moneda:           convenio?.moneda           ?? 'COP',
    pais:             convenio?.pais             ?? 'CO',
    fecha_inicio:     convenio?.fecha_inicio     ?? '',
    fecha_fin:        convenio?.fecha_fin        ?? '',
    estado:           convenio?.estado           ?? 'activo',
  })
  const [guardado, setGuardado] = useState(false)

  const campo = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const guardar = () => {
    // Mock: simula guardado
    setGuardado(true)
    setTimeout(() => navigate('/convenios'), 1200)
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title={esEdicion ? `Editar convenio` : 'Nuevo convenio'}
          subtitle={esEdicion ? convenio!.cooperante : 'Complete los datos del nuevo convenio'}
          actions={
            <Button variant="ghost" onClick={() => navigate('/convenios')}>
              <ArrowLeft size={16}/>Volver
            </Button>
          }
        />

        {guardado && <Alert type="success" className="mb-4">Convenio guardado correctamente. Redirigiendo…</Alert>}

        <div className="max-w-2xl">
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del convenio</h2></CardHeader>
            <CardBody className="space-y-5">
              <Input
                label="Nombre del cooperante"
                placeholder="Ej: Fundación MiCrédito"
                value={form.cooperante}
                onChange={e => campo('cooperante', e.target.value)}
                required
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Select
                  label="País"
                  value={form.pais}
                  onChange={e => campo('pais', e.target.value)}
                  options={[{ value: 'CO', label: '🇨🇴 Colombia' }, { value: 'VE', label: '🇻🇪 Venezuela' }]}
                />
                <Select
                  label="Moneda"
                  value={form.moneda}
                  onChange={e => campo('moneda', e.target.value)}
                  options={[{ value: 'COP', label: 'COP (Pesos colombianos)' }, { value: 'UVC', label: 'UVC (Unidad Virtual de Crédito)' }]}
                />
              </div>

              <Input
                label="Monto total del convenio"
                type="number"
                placeholder="Ej: 500000000"
                value={form.monto_total}
                onChange={e => campo('monto_total', e.target.value)}
                helperText={form.moneda === 'UVC' ? 'En unidades UVC' : 'En pesos COP'}
                required
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Fecha de inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => campo('fecha_inicio', e.target.value)}
                  required
                />
                <Input
                  label="Fecha de fin"
                  type="date"
                  value={form.fecha_fin}
                  onChange={e => campo('fecha_fin', e.target.value)}
                  required
                />
              </div>

              {esEdicion && (
                <Select
                  label="Estado"
                  value={form.estado}
                  onChange={e => campo('estado', e.target.value)}
                  options={[
                    { value: 'activo',     label: 'Activo' },
                    { value: 'suspendido', label: 'Suspendido' },
                    { value: 'cerrado',    label: 'Cerrado' },
                  ]}
                />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => navigate('/convenios')}>Cancelar</Button>
                <Button onClick={guardar} disabled={!form.cooperante || !form.monto_total || !form.fecha_inicio || !form.fecha_fin}>
                  <Save size={16}/>{esEdicion ? 'Guardar cambios' : 'Crear convenio'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageContainer>
    </Shell>
  )
}
