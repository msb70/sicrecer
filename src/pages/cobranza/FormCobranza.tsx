import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody, Input, Alert } from '../../components/ui'
import { CLIENTES, CREDITOS, COBRANZAS, BANCOS, formatCOP, cargarDatosDesdeNeon } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { aplicarPago } from '../../lib/creditos'
import { DistribucionPago } from '../../components/credito/DistribucionPago'
import type { Cobranza } from '../../types'

// La distribución del pago la calcula la base de datos (simular_pago /
// aplicar_pago): gastos administrativos → mora → interés → capital, y
// el excedente se aplica como anticipo a capital con recálculo de cuota.

const cobranzasStore: Cobranza[] = [...COBRANZAS]

export default function FormCobranza() {
  const navigate = useNavigate()
  const { modo, usuario } = useApp()

  const [params] = useSearchParams()
  const [clienteId,   setClienteId]   = useState(() => CREDITOS.find(cr => cr.id === params.get('credito'))?.cliente_id ?? '')
  const [creditoId,   setCreditoId]   = useState(() => params.get('credito') ?? '')
  const [fecha,       setFecha]       = useState(new Date().toISOString().slice(0, 10))
  const [banco,       setBanco]       = useState('')
  const [numDeposito, setNumDeposito] = useState('')
  const [monto,       setMonto]       = useState('')
  const [metodo,      setMetodo]      = useState<'efectivo' | 'transferencia' | 'pse'>('transferencia')
  const [guardado,    setGuardado]    = useState(false)
  const [enviando,    setEnviando]    = useState(false)
  const [errorPago,   setErrorPago]   = useState('')
  // Clave de idempotencia estable por formulario: un doble clic o un
  // reintento de red no duplica el pago.
  const [claveIdem] = useState(() => `ui-${crypto.randomUUID()}`)

  const activo = (estado: string) => estado !== 'cancelado' && estado !== 'castigado'
  const clientesConCredito = useMemo(() =>
    CLIENTES.filter(c => CREDITOS.some(cr => cr.cliente_id === c.id && activo(cr.estado))),
  [])

  const creditosDelCliente = useMemo(() =>
    CREDITOS.filter(cr => cr.cliente_id === clienteId && activo(cr.estado)),
  [clienteId])

  const credito = CREDITOS.find(cr => cr.id === creditoId)

  const montoNum   = parseFloat(monto.replace(/[^0-9.]/g, '')) || 0
  const cuota      = Number(credito?.cuota_actual ?? 0)

  const listo = clienteId && creditoId && fecha && banco && numDeposito && montoNum > 0

  const guardar = async () => {
    if (!listo || !credito || enviando) return
    setErrorPago('')

    // Sesión real: transacción en la base de datos vía aplicar_pago
    // (idempotente; asigna contra el cronograma real y actualiza el crédito).
    if (modo === 'google') {
      setEnviando(true)
      try {
        await aplicarPago({
          creditoId, monto: montoNum, fecha, banco, referencia: numDeposito, metodo, claveIdempotencia: claveIdem,
        })
      } catch (err) {
        setErrorPago(err instanceof Error ? err.message : 'No se pudo registrar el pago')
        setEnviando(false)
        return
      }
      await cargarDatosDesdeNeon()  // refrescar créditos/cobranzas en memoria
      setEnviando(false)
      setGuardado(true)
      setTimeout(() => navigate(`/cartera/${creditoId}`), 1400)
      return
    }

    // Modo demo: solo memoria local, sin persistencia.
    const nueva: Cobranza = {
      id: `cob-${Date.now()}`,
      cliente_id: clienteId,
      cliente_nombre: CLIENTES.find(c => c.id === clienteId)?.nombre ?? '',
      credito_id: creditoId,
      fecha, banco, numero_deposito: numDeposito,
      monto: montoNum,
      cuotas_aplicadas: [],
      creado_por: usuario.id,
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

        {guardado && <Alert type="success" className="mb-4"><CheckCircle2 size={14} className="inline mr-1"/>{modo === 'google' ? 'Pago aplicado en la base de datos. Redirigiendo…' : 'Cobranza registrada (demo, sin persistencia). Redirigiendo…'}</Alert>}
        {errorPago && !guardado && <Alert type="error" className="mb-4"><AlertCircle size={14} className="inline mr-1"/>{errorPago}</Alert>}

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
                      <p className="text-xs text-gray-500 mb-0.5">Monto del crédito</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCOP(credito.monto_desembolsado)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-0.5">Cuotas pagadas</p>
                      <p className="text-sm font-semibold text-gray-900">{credito.cuotas_pagadas} / {credito.cuotas_total}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-0.5">Cuota actual</p>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Banco <span className="text-red-500">*</span></label>
                    <select
                      value={banco}
                      onChange={e => setBanco(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="">— Selecciona banco —</option>
                      {BANCOS.filter(b => b.activo).map(b => (
                        <option key={b.id} value={b.nombre}>{b.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Número de depósito / referencia"
                    placeholder="Ej: 4521-2026-007"
                    value={numDeposito}
                    onChange={e => setNumDeposito(e.target.value)}
                    required
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Método</label>
                    <select value={metodo} onChange={e => setMetodo(e.target.value as typeof metodo)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="pse">PSE</option>
                    </select>
                  </div>
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
              <Button onClick={guardar} disabled={!listo || enviando}>
                <CheckCircle2 size={16}/>{enviando ? 'Aplicando pago…' : 'Registrar cobranza'}
              </Button>
            </div>
          </div>

          {/* Panel de cuotas a cubrir */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-800">Cómo se aplica el pago</h2>
              </CardHeader>
              <CardBody>
                {modo === 'google'
                  ? <DistribucionPago creditoId={creditoId} monto={montoNum} fecha={fecha} />
                  : <p className="text-xs text-gray-400">La simulación de aplicación está disponible con sesión real (base de datos).</p>}
                <p className="text-[11px] text-gray-400 mt-3">Orden: gastos administrativos → mora → interés → capital. Lo que exceda las cuotas vencidas y la cuota corriente es anticipo a capital.</p>
              </CardBody>
            </Card>
          </div>
        </div>
      </PageContainer>
    </Shell>
  )
}
