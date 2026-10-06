import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp, TrendingDown, CalendarDays, BookOpen, Lock, LockOpen, History, Download, AlertTriangle, Wallet,
} from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Spinner } from '../../components/ui'
import { CONVENIOS, formatCOP } from '../../mocks'
import { neon } from '../../lib/neon'
import { useApp, usePermiso } from '../../context/AppContext'

// ─────────────────────────────────────────────────────────────
// Cierre mensual por convenio (migración 0018).
//  · Mes cerrado  → cifras congeladas (cierres_mensuales + fotos).
//  · Mes abierto  → vista previa en vivo (rpc vista_previa_cierre),
//                   misma lógica que usará el cierre.
//  · Cerrar: meses terminados y en orden (permiso cierre/editar).
//  · Reabrir: solo Administrador, con motivo; la versión anterior
//    queda como auditoría.
//  · Un mes cerrado bloquea pagos, cobranzas y desembolsos con
//    fecha en ese mes (triggers en la BD).
// ─────────────────────────────────────────────────────────────

type Totales = {
  corte: string; mes_terminado?: boolean
  desembolsos_n: number; desembolsado: number; servicios: number; entregado: number
  recaudos_n: number; recaudado: number
  rec_capital: number; rec_interes: number; rec_mora: number; rec_gastos: number; rec_anticipo: number; rec_sin_desglose: number
  flujo_neto: number; esperado: number
  creditos_vigentes: number; saldo_capital: number; capital_vencido: number
  creditos_en_mora: number; saldo_en_mora: number; saldo_par30: number; saldo_par90: number
}
type Cierre = Totales & {
  id: string; convenio_id: string; mes: string; version: number
  estado: 'cerrado' | 'reabierto'; origen: 'manual' | 'reconstruido'
  cerrado_por_nombre: string | null; cerrado_en: string
  reabierto_por_nombre: string | null; reabierto_en: string | null; motivo_reapertura: string | null
  notas: string | null
}
type CreditoFoto = {
  credito_id: string; cliente_nombre: string; producto_nombre: string; fecha_desembolso: string
  monto_desembolsado: number; saldo_capital: number; capital_vencido: number; cuotas_vencidas: number
  dias_mora: number; categoria: string; recaudado_mes: number; desembolsado_mes: number
}
type Movimiento = {
  fecha: string; tipo: 'ingreso' | 'egreso'; credito_id: string; cliente_nombre: string
  concepto: string; referencia: string; monto: number
}

const NUM_TOTALES: (keyof Totales)[] = [
  'desembolsos_n', 'desembolsado', 'servicios', 'entregado', 'recaudos_n', 'recaudado',
  'rec_capital', 'rec_interes', 'rec_mora', 'rec_gastos', 'rec_anticipo', 'rec_sin_desglose',
  'flujo_neto', 'esperado', 'creditos_vigentes', 'saldo_capital', 'capital_vencido',
  'creditos_en_mora', 'saldo_en_mora', 'saldo_par30', 'saldo_par90',
]
// El Data API devuelve numeric como texto
function numerar<T extends object>(o: T, campos: string[]): T {
  const r = { ...o } as Record<string, unknown>
  for (const k of campos) if (r[k] != null) r[k] = Number(r[k])
  return r as T
}
const NUM_CREDITO = ['monto_desembolsado', 'saldo_capital', 'capital_vencido', 'cuotas_vencidas', 'dias_mora', 'recaudado_mes', 'desembolsado_mes']

const CATEGORIA: Record<string, { label: string; color: 'green' | 'yellow' | 'orange' | 'red' | 'gray' }> = {
  al_dia:      { label: 'Al día',      color: 'green' },
  mora_1_30:   { label: '1–30 días',   color: 'yellow' },
  mora_31_90:  { label: '31–90 días',  color: 'orange' },
  mora_mas_90: { label: '+90 días',    color: 'red' },
  cancelado:   { label: 'Cancelado',   color: 'gray' },
}

const mesActualISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const mesAnteriorISO = () => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const etiquetaMes = (ym: string) => {
  try { return new Date(ym.slice(0, 7) + '-02T12:00:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) }
  catch { return ym }
}
const fechaCorta = (f: string) => new Date(f.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')
const fechaHora = (f: string) => new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)} %` : '—')

function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const csv = filas.map(f => f.map(v => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = nombre; a.click()
  URL.revokeObjectURL(a.href)
}

export default function CierreMensual() {
  const { rol, modo } = useApp()
  const permiso = usePermiso('cierre')
  const esAdmin = rol === 'administrador'

  const [convenioId, setConvenioId] = useState(CONVENIOS[0]?.id ?? '')
  const [mes, setMes] = useState(mesAnteriorISO)
  const [tab, setTab] = useState<'movimientos' | 'cartera' | 'historico'>('movimientos')

  const [cierres, setCierres] = useState<Cierre[]>([])
  const [totales, setTotales] = useState<Totales | null>(null)
  const [creditos, setCreditos] = useState<CreditoFoto[]>([])
  const [movs, setMovs] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [notas, setNotas] = useState('')
  const [reabrir, setReabrir] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const convenio = CONVENIOS.find(c => c.id === convenioId)
  const mesISO = `${mes}-01`
  const vigente = useMemo(() => cierres.find(c => c.mes.slice(0, 10) === mesISO && c.estado === 'cerrado') ?? null, [cierres, mesISO])
  const versiones = useMemo(() => cierres.filter(c => c.mes.slice(0, 10) === mesISO).sort((a, b) => b.version - a.version), [cierres, mesISO])
  const mesTerminado = mes < mesActualISO()
  const ultimoCerrado = useMemo(() => cierres.filter(c => c.estado === 'cerrado').map(c => c.mes.slice(0, 7)).sort().pop() ?? null, [cierres])

  const cargar = useCallback(async () => {
    if (!convenioId || modo !== 'google') return
    setCargando(true); setError('')
    try {
      const { data: lista, error: e1 } = await neon.from('cierres_mensuales').select('*')
        .eq('convenio_id', convenioId).order('mes', { ascending: false }).order('version', { ascending: false })
      if (e1) throw new Error(e1.message)
      const cs = (lista ?? []).map(c => numerar(c as Cierre, NUM_TOTALES as string[]))
      setCierres(cs)

      const v = cs.find(c => c.mes.slice(0, 10) === mesISO && c.estado === 'cerrado')
      if (v) {
        const [{ data: cc, error: e2 }, { data: mm, error: e3 }] = await Promise.all([
          neon.from('cierre_creditos').select('*').eq('cierre_id', v.id).order('dias_mora', { ascending: false }),
          neon.from('cierre_movimientos').select('*').eq('cierre_id', v.id).order('fecha').order('id'),
        ])
        if (e2) throw new Error(e2.message)
        if (e3) throw new Error(e3.message)
        setTotales(v)
        setCreditos((cc ?? []).map(x => numerar(x as CreditoFoto, NUM_CREDITO)))
        setMovs((mm ?? []).map(x => numerar(x as Movimiento, ['monto'])))
      } else {
        const { data, error: e4 } = await neon.rpc('vista_previa_cierre', { p_convenio_id: convenioId, p_mes: mesISO })
        if (e4) throw new Error(e4.message)
        const r = data as { totales: Totales; creditos: CreditoFoto[]; movimientos: Movimiento[] }
        setTotales(numerar(r.totales, NUM_TOTALES as string[]))
        setCreditos((r.creditos ?? []).map(x => numerar(x, NUM_CREDITO)))
        setMovs((r.movimientos ?? []).map(x => numerar(x, ['monto'])))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el cierre')
      setTotales(null); setCreditos([]); setMovs([])
    } finally {
      setCargando(false)
    }
  }, [convenioId, mesISO, modo])

  useEffect(() => { void cargar() }, [cargar])

  const ejecutarCierre = async () => {
    setEnviando(true); setError(''); setAviso('')
    const { error: e } = await neon.rpc('cerrar_mes', { p_convenio_id: convenioId, p_mes: mesISO, p_notas: notas || null })
    setEnviando(false)
    if (e) { setError(e.message); return }
    setConfirmarCierre(false); setNotas('')
    setAviso(`Mes de ${etiquetaMes(mes)} cerrado. Desde ahora no se pueden registrar pagos ni desembolsos con fecha en ese mes.`)
    void cargar()
  }
  const ejecutarReapertura = async () => {
    setEnviando(true); setError(''); setAviso('')
    const { error: e } = await neon.rpc('reabrir_mes', { p_convenio_id: convenioId, p_mes: mesISO, p_motivo: motivo })
    setEnviando(false)
    if (e) { setError(e.message); return }
    setReabrir(false); setMotivo('')
    setAviso(`Mes de ${etiquetaMes(mes)} reabierto. La versión anterior queda en el histórico.`)
    void cargar()
  }

  const exportar = () => {
    if (!totales) return
    const t = totales
    const filas: (string | number)[][] = [
      ['Cierre mensual', convenio?.cooperante ?? convenioId, etiquetaMes(mes)],
      ['Estado', vigente ? `Cerrado v${vigente.version} (${vigente.origen})` : 'Abierto — vista previa'],
      ['Corte', t.corte],
      [],
      ['Recaudado', t.recaudado], ['  Capital', t.rec_capital], ['  Interés', t.rec_interes], ['  Mora', t.rec_mora],
      ['  Gastos administrativos', t.rec_gastos], ['  Anticipos a capital', t.rec_anticipo], ['  Sin desglose', t.rec_sin_desglose],
      ['Desembolsado', t.desembolsado], ['Servicios', t.servicios], ['Entregado en efectivo', t.entregado], ['Flujo neto', t.flujo_neto],
      ['Cuotas esperadas del mes', t.esperado],
      ['Créditos vigentes', t.creditos_vigentes], ['Saldo de capital', t.saldo_capital], ['Capital vencido', t.capital_vencido],
      ['Créditos en mora', t.creditos_en_mora], ['Saldo en mora', t.saldo_en_mora], ['Cartera en riesgo >30', t.saldo_par30], ['Cartera en riesgo >90', t.saldo_par90],
      [],
      ['MOVIMIENTOS'], ['Fecha', 'Tipo', 'Cliente', 'Concepto', 'Referencia', 'Monto'],
      ...movs.map(m => [m.fecha.slice(0, 10), m.tipo, m.cliente_nombre, m.concepto, m.referencia, m.monto]),
      [],
      ['CARTERA AL CORTE'], ['Crédito', 'Cliente', 'Producto', 'Desembolso', 'Monto', 'Saldo', 'Capital vencido', 'Cuotas vencidas', 'Días mora', 'Categoría', 'Recaudado mes'],
      ...creditos.map(c => [c.credito_id, c.cliente_nombre, c.producto_nombre, c.fecha_desembolso?.slice(0, 10), c.monto_desembolsado,
        c.saldo_capital, c.capital_vencido, c.cuotas_vencidas, c.dias_mora, CATEGORIA[c.categoria]?.label ?? c.categoria, c.recaudado_mes]),
    ]
    descargarCSV(`cierre_${convenioId}_${mes}${vigente ? `_v${vigente.version}` : '_preliminar'}.csv`, filas)
  }

  const t = totales
  const totalIngresos = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const totalEgresos = movs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)

  return (
    <Shell>
      <PageContainer>
        <PageHeader title="Cierre mensual por convenio" subtitle="Cifras congeladas al cierre · cartera al corte · histórico versionado" />

        {modo !== 'google' && (
          <Alert type="warning" className="mb-6">El cierre mensual trabaja sobre la base de datos real. Inicia sesión con Google para usarlo.</Alert>
        )}

        {/* Filtros y acciones */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Convenio</label>
            <select value={convenioId} onChange={e => setConvenioId(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-w-[220px]">
              {CONVENIOS.map(c => <option key={c.id} value={c.id}>{c.cooperante}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Mes</label>
            <input type="month" value={mes} max={mesActualISO()} onChange={e => e.target.value && setMes(e.target.value)}
              className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {t && <Button variant="secondary" size="sm" onClick={exportar}><Download size={14} /> Exportar CSV</Button>}
            {!vigente && mesTerminado && permiso.editar && t && (
              <Button size="sm" onClick={() => setConfirmarCierre(true)}><Lock size={14} /> Cerrar mes</Button>
            )}
            {vigente && esAdmin && ultimoCerrado === mes && (
              <Button variant="danger" size="sm" onClick={() => setReabrir(true)}><LockOpen size={14} /> Reabrir</Button>
            )}
          </div>
        </div>

        {error && <Alert type="error" className="mb-4">{error}</Alert>}
        {aviso && <Alert type="success" className="mb-4">{aviso}</Alert>}

        {/* Estado del mes */}
        {t && (
          <div className="mb-6">
            {vigente ? (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm">
                <Lock size={16} className="text-gray-500" />
                <span className="font-semibold text-gray-800">Cerrado</span>
                <Badge color={vigente.origen === 'reconstruido' ? 'purple' : 'blue'}>
                  {vigente.origen === 'reconstruido' ? 'Reconstruido' : 'Cierre manual'}
                </Badge>
                {vigente.version > 1 && <Badge color="orange">Versión {vigente.version}</Badge>}
                <span className="text-gray-500">
                  {vigente.cerrado_por_nombre ?? 'Sistema'} · {fechaHora(vigente.cerrado_en)} · corte {fechaCorta(vigente.corte)}
                </span>
                {vigente.notas && <span className="text-gray-400 text-xs w-full">{vigente.notas}</span>}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
                <AlertTriangle size={16} />
                <span className="font-semibold">Abierto — cifras en vivo</span>
                <span>
                  {mesTerminado
                    ? 'Pueden cambiar si se registran pagos o desembolsos con fecha de este mes. Ciérralo cuando cobranza confirme que está conciliado.'
                    : `El mes está en curso (corte provisional ${fechaCorta(t.corte)}). Solo se cierra cuando termine.`}
                </span>
              </div>
            )}
          </div>
        )}

        {cargando && <div className="py-16 flex justify-center"><Spinner size="lg" /></div>}

        {!cargando && t && (
          <>
            {/* Flujo del mes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Recaudado</p>
                </div>
                <p className="text-2xl font-bold text-green-800">{formatCOP(t.recaudado)}</p>
                <p className="text-xs text-green-600 mt-1">{t.recaudos_n} pagos · {pct(t.recaudado, t.esperado)} de lo esperado ({formatCOP(t.esperado)})</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={16} className="text-red-600" />
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Entregado</p>
                </div>
                <p className="text-2xl font-bold text-red-800">{formatCOP(t.entregado)}</p>
                <p className="text-xs text-red-600 mt-1">{t.desembolsos_n} desembolsos · crédito {formatCOP(t.desembolsado)}{t.servicios > 0 ? ` · servicios ${formatCOP(t.servicios)}` : ''}</p>
              </div>
              <div className={`border rounded-xl p-4 ${t.flujo_neto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays size={16} className={t.flujo_neto >= 0 ? 'text-blue-600' : 'text-orange-600'} />
                  <p className={`text-xs font-semibold uppercase tracking-wide ${t.flujo_neto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Flujo neto</p>
                </div>
                <p className={`text-2xl font-bold ${t.flujo_neto >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{formatCOP(t.flujo_neto)}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">{convenio?.cooperante}</p>
              </div>
            </div>

            {/* Desglose del recaudo + cartera al corte */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader><h2 className="text-sm font-semibold text-gray-800">Destino del recaudo</h2></CardHeader>
                <CardBody className="pt-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {([
                        ['Capital de cuotas', t.rec_capital], ['Interés', t.rec_interes], ['Mora', t.rec_mora],
                        ['Gastos administrativos', t.rec_gastos], ['Anticipos a capital', t.rec_anticipo],
                      ] as [string, number][]).map(([l, v]) => (
                        <tr key={l}><td className="py-2 text-gray-600">{l}</td><td className="py-2 text-right font-medium text-gray-900">{formatCOP(v)}</td></tr>
                      ))}
                      {t.rec_sin_desglose !== 0 && (
                        <tr><td className="py-2 text-amber-700">Sin desglose (cobranzas sin detalle de pagos)</td>
                          <td className="py-2 text-right font-medium text-amber-700">{formatCOP(t.rec_sin_desglose)}</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-800">Cartera al {fechaCorta(t.corte)}</h2>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      <tr><td className="py-2 text-gray-600">Saldo de capital ({t.creditos_vigentes} créditos)</td><td className="py-2 text-right font-semibold text-gray-900">{formatCOP(t.saldo_capital)}</td></tr>
                      <tr><td className="py-2 text-gray-600">Capital vencido</td><td className="py-2 text-right font-medium text-gray-900">{formatCOP(t.capital_vencido)} <span className="text-xs text-gray-400">({pct(t.capital_vencido, t.saldo_capital)})</span></td></tr>
                      <tr><td className="py-2 text-gray-600">Saldo en mora ({t.creditos_en_mora} créditos)</td><td className="py-2 text-right font-medium text-gray-900">{formatCOP(t.saldo_en_mora)} <span className="text-xs text-gray-400">({pct(t.saldo_en_mora, t.saldo_capital)})</span></td></tr>
                      <tr><td className="py-2 text-gray-600">Cartera en riesgo &gt; 30 días</td><td className="py-2 text-right font-medium text-orange-700">{formatCOP(t.saldo_par30)} <span className="text-xs text-gray-400">({pct(t.saldo_par30, t.saldo_capital)})</span></td></tr>
                      <tr><td className="py-2 text-gray-600">Cartera en riesgo &gt; 90 días</td><td className="py-2 text-right font-medium text-red-700">{formatCOP(t.saldo_par90)} <span className="text-xs text-gray-400">({pct(t.saldo_par90, t.saldo_capital)})</span></td></tr>
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            </div>

            {/* Pestañas */}
            <div className="flex gap-1 mb-3 border-b border-gray-200">
              {([['movimientos', 'Movimientos', BookOpen], ['cartera', 'Cartera por crédito', Wallet], ['historico', 'Histórico', History]] as const).map(([k, l, Icon]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <Icon size={14} /> {l}
                </button>
              ))}
            </div>

            {tab === 'movimientos' && (
              <Card>
                <CardBody className="p-0">
                  {movs.length === 0 ? (
                    <div className="py-14 text-center">
                      <CalendarDays size={36} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">Sin movimientos en {etiquetaMes(mes)}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-left">
                            {['Fecha', 'Tipo', 'Cliente', 'Concepto', 'Referencia'].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-right text-green-700">Ingreso</th>
                            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-right text-red-600">Egreso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {movs.map((m, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{fechaCorta(m.fecha)}</td>
                              <td className="px-4 py-3"><Badge color={m.tipo === 'ingreso' ? 'green' : 'red'}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}</Badge></td>
                              <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{m.cliente_nombre}</td>
                              <td className="px-4 py-3 text-gray-600 text-xs max-w-[260px] truncate" title={m.concepto}>{m.concepto}</td>
                              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{m.referencia}</td>
                              <td className="px-4 py-3 text-right font-semibold text-green-700 whitespace-nowrap">{m.tipo === 'ingreso' ? formatCOP(m.monto) : <span className="text-gray-200">—</span>}</td>
                              <td className="px-4 py-3 text-right font-semibold text-red-600 whitespace-nowrap">{m.tipo === 'egreso' ? formatCOP(m.monto) : <span className="text-gray-200">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-200 bg-gray-50">
                            <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Total del período</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{formatCOP(totalIngresos)}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{formatCOP(totalEgresos)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {tab === 'cartera' && (
              <Card>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          {['Cliente', 'Crédito', 'Desembolso'].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                          {['Saldo', 'Capital vencido', 'Días mora', 'Recaudado mes'].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">{h}</th>)}
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Categoría</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {creditos.map(c => (
                          <tr key={c.credito_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{c.cliente_nombre}</td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-xs">{c.credito_id}</td>
                            <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{c.fecha_desembolso ? fechaCorta(c.fecha_desembolso) : '—'}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCOP(c.saldo_capital)}</td>
                            <td className="px-4 py-3 text-right">{c.capital_vencido > 0 ? formatCOP(c.capital_vencido) : <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3 text-right">{c.dias_mora > 0 ? `${c.dias_mora} (${c.cuotas_vencidas} cuotas)` : <span className="text-gray-300">0</span>}</td>
                            <td className="px-4 py-3 text-right">{c.recaudado_mes > 0 ? formatCOP(c.recaudado_mes) : <span className="text-gray-300">—</span>}</td>
                            <td className="px-4 py-3"><Badge color={CATEGORIA[c.categoria]?.color ?? 'gray'}>{CATEGORIA[c.categoria]?.label ?? c.categoria}</Badge></td>
                          </tr>
                        ))}
                        {creditos.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">Sin créditos desembolsados a esa fecha</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardBody>
              </Card>
            )}

            {tab === 'historico' && (
              <Card>
                <CardBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left">
                          {['Mes', 'Estado'].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}
                          {['Recaudado', 'Entregado', 'Saldo cartera', 'En riesgo >30'].map(h => <th key={h} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">{h}</th>)}
                          <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cerrado por</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {cierres.map(c => (
                          <tr key={c.id} onClick={() => { setMes(c.mes.slice(0, 7)); setTab('movimientos') }}
                            className={`cursor-pointer hover:bg-gray-50 ${c.estado === 'reabierto' ? 'opacity-60' : ''}`}>
                            <td className="px-4 py-3 font-medium text-gray-900 capitalize whitespace-nowrap">{etiquetaMes(c.mes)}{c.version > 1 ? ` · v${c.version}` : ''}</td>
                            <td className="px-4 py-3">
                              {c.estado === 'cerrado'
                                ? <Badge color={c.origen === 'reconstruido' ? 'purple' : 'blue'}>{c.origen === 'reconstruido' ? 'Reconstruido' : 'Cerrado'}</Badge>
                                : <span title={c.motivo_reapertura ?? ''}><Badge color="orange">Reabierto</Badge></span>}
                            </td>
                            <td className="px-4 py-3 text-right">{formatCOP(c.recaudado)}</td>
                            <td className="px-4 py-3 text-right">{formatCOP(c.entregado)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCOP(c.saldo_capital)}</td>
                            <td className="px-4 py-3 text-right">{pct(c.saldo_par30, c.saldo_capital)}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {c.cerrado_por_nombre ?? 'Sistema'} · {fechaHora(c.cerrado_en)}
                              {c.estado === 'reabierto' && <div className="text-orange-700">Reabierto por {c.reabierto_por_nombre}: {c.motivo_reapertura}</div>}
                            </td>
                          </tr>
                        ))}
                        {cierres.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">Este convenio no tiene meses cerrados</td></tr>}
                      </tbody>
                    </table>
                  </div>
                  {versiones.length > 1 && (
                    <p className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
                      {etiquetaMes(mes)} tiene {versiones.length} versiones; las reabiertas se conservan como auditoría.
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* Confirmar cierre */}
        {confirmarCierre && t && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Cerrar {etiquetaMes(mes)}</h3>
              <p className="text-sm text-gray-500 mb-4">{convenio?.cooperante}</p>
              <ul className="text-sm text-gray-700 space-y-1 mb-4">
                <li>Recaudado: <b>{formatCOP(t.recaudado)}</b> ({t.recaudos_n} pagos)</li>
                <li>Entregado: <b>{formatCOP(t.entregado)}</b> ({t.desembolsos_n} desembolsos)</li>
                <li>Saldo de cartera: <b>{formatCOP(t.saldo_capital)}</b></li>
              </ul>
              <Alert type="warning" className="mb-4">
                Las cifras quedan congeladas y no se podrán registrar pagos, cobranzas ni desembolsos con fecha de este mes. Solo el Administrador puede reabrirlo.
              </Alert>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Notas (opcional)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
                placeholder="Ej.: conciliado con extracto bancario" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmarCierre(false)} disabled={enviando}>Cancelar</Button>
                <Button onClick={ejecutarCierre} loading={enviando}><Lock size={14} /> Cerrar mes</Button>
              </div>
            </div>
          </div>
        )}

        {/* Reabrir */}
        {reabrir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Reabrir {etiquetaMes(mes)}</h3>
              <p className="text-sm text-gray-500 mb-4">La versión actual del cierre queda en el histórico. Al volver a cerrar se genera una versión nueva.</p>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Motivo (obligatorio)</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-4"
                placeholder="Ej.: consignación del 28 no registrada a tiempo" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setReabrir(false)} disabled={enviando}>Cancelar</Button>
                <Button variant="danger" onClick={ejecutarReapertura} loading={enviando} disabled={motivo.trim().length < 10}>
                  <LockOpen size={14} /> Reabrir
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </Shell>
  )
}
