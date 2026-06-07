import { useState } from 'react'
import { TrendingUp, TrendingDown, CalendarDays, BookOpen } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Card, CardHeader, CardBody, Badge } from '../../components/ui'
import { CONVENIOS, CREDITOS, COBRANZAS, formatCOP } from '../../mocks'

type Movimiento = {
  fecha: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  referencia: string
  monto: number
  cliente_nombre: string
}

export default function CierreMensual() {
  const [convenioId, setConvenioId] = useState(CONVENIOS[0]?.id ?? '')
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const convenio = CONVENIOS.find(c => c.id === convenioId)

  // Créditos del convenio seleccionado
  const creditosConvenio = CREDITOS.filter(cr => cr.convenio_id === convenioId)
  const creditoIds = new Set(creditosConvenio.map(cr => cr.id))

  // Egresos: desembolsos del mes
  const egresos: Movimiento[] = creditosConvenio
    .filter(cr => cr.fecha_desembolso?.startsWith(mes))
    .map(cr => ({
      fecha: cr.fecha_desembolso!,
      tipo: 'egreso',
      concepto: `Desembolso — ${cr.producto_nombre}`,
      referencia: cr.id.toUpperCase(),
      monto: cr.monto_desembolsado,
      cliente_nombre: cr.cliente_nombre,
    }))

  // Ingresos: cobranzas del mes vinculadas a este convenio
  const ingresos: Movimiento[] = COBRANZAS
    .filter(cb => cb.fecha.startsWith(mes) && creditoIds.has(cb.credito_id))
    .map(cb => {
      const credito = CREDITOS.find(cr => cr.id === cb.credito_id)
      return {
        fecha: cb.fecha,
        tipo: 'ingreso',
        concepto: `Cuotas [${cb.cuotas_aplicadas.join(', ')}] — ${credito?.producto_nombre ?? ''}`,
        referencia: cb.numero_deposito,
        monto: cb.monto,
        cliente_nombre: cb.cliente_nombre,
      }
    })

  const movimientos: Movimiento[] = [...egresos, ...ingresos]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0)
  const totalEgresos  = egresos.reduce((s, m) => s + m.monto, 0)
  const saldo         = totalIngresos - totalEgresos

  const mesLabel = (() => {
    try {
      return new Date(mes + '-02').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    } catch {
      return mes
    }
  })()

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Cierre mensual por convenio"
          subtitle="Estado de ingresos y egresos del período"
        />

        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Convenio</label>
            <select
              value={convenioId}
              onChange={e => setConvenioId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[220px]"
            >
              {CONVENIOS.map(c => (
                <option key={c.id} value={c.id}>{c.cooperante}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Mes</label>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Ingresos */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-600" />
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Ingresos</p>
            </div>
            <p className="text-2xl font-bold text-green-800">{formatCOP(totalIngresos)}</p>
            <p className="text-xs text-green-600 mt-1">{ingresos.length} pagos recibidos</p>
          </div>

          {/* Egresos */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} className="text-red-600" />
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Egresos</p>
            </div>
            <p className="text-2xl font-bold text-red-800">{formatCOP(totalEgresos)}</p>
            <p className="text-xs text-red-600 mt-1">{egresos.length} desembolsos</p>
          </div>

          {/* Saldo neto */}
          <div className={`border rounded-xl p-4 ${saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={16} className={saldo >= 0 ? 'text-blue-600' : 'text-orange-600'} />
              <p className={`text-xs font-semibold uppercase tracking-wide ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                Saldo neto
              </p>
            </div>
            <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
              {formatCOP(saldo)}
            </p>
            {convenio && (
              <p className="text-xs text-gray-500 mt-1 truncate">{convenio.cooperante}</p>
            )}
          </div>
        </div>

        {/* Tabla de movimientos */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800 capitalize">
                Movimientos · {mesLabel}
              </h2>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {movimientos.length === 0 ? (
              <div className="py-14 text-center">
                <CalendarDays size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">Sin movimientos para el período seleccionado</p>
                <p className="text-xs text-gray-300 mt-1">Ajusta el mes o el convenio</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Fecha</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cliente</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Concepto</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Referencia</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right text-green-700">Ingreso</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right text-red-600">Egreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {movimientos.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                          {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-4 py-3">
                          <Badge color={m.tipo === 'ingreso' ? 'green' : 'red'}>
                            {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.cliente_nombre}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[220px] truncate">{m.concepto}</td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{m.referencia}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">
                          {m.tipo === 'ingreso' ? formatCOP(m.monto) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">
                          {m.tipo === 'egreso' ? formatCOP(m.monto) : <span className="text-gray-200">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Total del período
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{formatCOP(totalIngresos)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatCOP(totalEgresos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </PageContainer>
    </Shell>
  )
}
