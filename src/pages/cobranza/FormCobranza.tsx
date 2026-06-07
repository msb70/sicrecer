import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody, Input, Alert } from '../../components/ui'
import { CLIENTES, CREDITOS, COBRANZAS, PRODUCTOS, formatCOP } from '../../mocks'
import type { Cobranza } from '../../types'

// Cuota estimada basada en monto desembolsado ÷ cuotas totales (aprox.)
// Para demo; en producción se recalcularía con tasa real del producto
function cuotaEstimada(monto_desembolsado: number, cuotas_total: number): number {
  return monto_desembolsado / cuotas_total
}

const cobranzasStore: Cobranza[] = [...COBRANZAS]

export default function FormCobranza() {
  const navigate = useNavigate()

  const [clienteId,   setClienteId]   = useState('')
  const [creditoId,   setCreditoId]   = useState('')
  const [fecha,       setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [banco,       setBanco]       = useState('')
  const [numDeposito, setNumDeposito] = useState('')
  const [monto,       setMonto]       = useState('')
  const [guardado,    setGuardado]    = useState(false)

  const clientesConCredito = useMemo(() =>
    CLIENTES.filter(c => CREDITOS.some(cr => cr.cliente_id === c.id)),
  [])

  const creditosDelCliente = useMemo(() =>
    CREDITOS.filter(cr => cr.cliente_id === clienteId),
  [clienteId])

  const credito = CREDITOS.find(cr => cr.id === creditoId)

  // Cálculo de cuotas que cubre el pago
  const montoNum   = parseFloat(monto.replace(/[^0-9.]/g, '')) || 0
  const cuota      = credito ? cuotaEstimada(credito.monto_desembolsado, credito.cuotas_total) : 0
  const numCuotas  = credito && cuota > 0 ? Math.floor(montoNum / cuota) : 0
  const yapagas    = credito?.cuotas_pagadas ?? 0
  const cuotasAplicar: number[] = []
  for (let i = yapagas + 1; i <= Math.min(yapagas + numCuotas, credito?.cuotas_total ?? 0); i++) {
    cuotasAplicar.push(i)
  }

  const listo = clienteId && creditoId && fecha && banco && numDeposito && montoNum > 0

  const guardar = () => {
    if (!listo || !credito) return
    const nueva: Cobranza = {
      id: `cob-${Date.now()}`,
      cliente_id: clienteId,
      cliente_nombre: CLIENTES.find(c => c.id === clienteId)?.nombre ?? '',
      credito_id: creditoId,
      fecha, banco, numero_deposito: numDeposito,
      monto: montoNum,
      cuotas_aplicadas: cuotasAplicar,
      creado_por: 'u-03',
    }
    cobranzasStore.push(nueva)
    setGuardado(true)
    setTimeout(() => navigate('/cobranza'), 1400)
  }

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Registrar cobranza"
          subtitle="Ingresa el depósito recibido y se calcularán las cuotas cubiertas"
          actions={<Button variant="ghost" onClick={() => navigate('/cobranza')}><ArrowLeft size={16}/>Volver</Button>}
        />

        {guardado && <Alert type="success" className="mb-4"><CheckCircle2 size={14} className="inline mr-1"/>Cobranza registrada. Redirigiendo…</Alert>}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Cliente y crédito */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Cliente y crédito</h2></CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cliente</label>
                  <select
                    value={clienteId}
                    onChange={e => { setClienteId(e.target.value); setCreditoId('') }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="">— Selecciona un cliente —</option>
                    {clientesConCredito.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} · {c.documento}</option>
                    ))}
                  </select>
                </div>

                {clienteId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Crédito</label>
                    {creditosDelCliente.length === 0 ? (
                      <p className="text-sm text-gray-400">No hay créditos activos para este cliente</p>
                    ) : (
                      <select
                        value={creditoId}
                        onChange={e => setCreditoId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                      >
                        <option value="">— Selecciona el crédito —</option>
                        {creditosDelCliente.map(cr => (
                          <option key={cr.id} value={cr.id}>
                            {cr.producto_nombre} · {formatCOP(cr.monto_desembolsado)} · {cr.cuotas_pagadas}/{cr.cuotas_total} cuotas
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {credito && (
                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-0.5">Monto desembolsado</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCOP(credito.monto_desembolsado)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-0.5">Cuotas pagadas</p>
                      <p className="text-sm font-semibold text-gray-900">{credito.cuotas_pagadas} / {credito.cuotas_total}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-0.5">Cuota estimada</p>
                      <p className="text-sm font-semibold text-brand-700">{formatCOP(Math.round(cuota))}</p>
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Datos del depósito */}
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Datos del depósito</h2></CardHeader>
              <CardBody className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Fecha del depósito"
                    type="date"
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    required
                  />
                  <Input
                    label="Banco"
                    placeholder="Ej: Bancolombia"
                    value={banco}
                    onChange={e => setBanco(e.target.value)}
                    required
                  />
                  <Input
                    label="Número de depósito / referencia"
                    placeholder="Ej: 4521-2026-007"
                    value={numDeposito}
                    onChange={e => setNumDeposito(e.target.value)}
                    required
                  />
                  <Input
                    label="Monto recibido (COP)"
                    type="number"
                    step="1000"
                    placeholder="0"
                    value={monto}
                    onChange={e => setMonto(e.target.value)}
                    required
                  />
                </div>
              </CardBody>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => navigate('/cobranza')}>Cancelar</Button>
              <Button onClick={guardar} disabled={!listo}>
                <CheckCircle2 size={16}/>Registrar cobranza
              </Button>
            </div>
          </div>

          {/* Panel de cuotas a cubrir */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-800">Cuotas que cubre</h2>
              </CardHeader>
              <CardBody>
                {!credito || montoNum === 0 ? (
                  <div className="text-center py-6">
                    <AlertCircle size={28} className="mx-auto text-gray-200 mb-2"/>
                    <p className="text-xs text-gray-400">Selecciona crédito e ingresa monto para ver las cuotas cubiertas</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 bg-brand-50 rounded-xl border border-brand-100 text-center">
                      <p className="text-xs text-brand-600 mb-0.5">Cuotas a marcar como pagadas</p>
                      <p className="text-3xl font-bold text-brand-700">{cuotasAplicar.length}</p>
                      {numCuotas === 0 && montoNum > 0 && (
                        <p className="text-xs text-orange-500 mt-1">Monto insuficiente para una cuota completa</p>
                      )}
                    </div>

                    {cuotasAplicar.length > 0 && (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {cuotasAplicar.map(n => (
                          <div key={n} className="flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                            <span className="text-xs font-medium text-green-800">Cuota #{n}</span>
                            <CheckCircle2 size={14} className="text-green-500"/>
                          </div>
                        ))}
                      </div>
                    )}

                    {montoNum > 0 && numCuotas > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Monto ingresado</span>
                          <span className="font-medium">{formatCOP(montoNum)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cuotas a cubrir</span>
                          <span className="font-medium">{cuotasAplicar.length} × {formatCOP(Math.round(cuota))}</span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>Excedente / vuelto</span>
                          <span className="font-medium">{formatCOP(montoNum - cuotasAplicar.length * Math.round(cuota))}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
