import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, BarChart2, PieChart as PieIcon, MapPin } from 'lucide-react'
import { Shell, PageContainer, PageHeader } from '../../components/layout/Shell'
import { Button, Card, CardHeader, CardBody, StatCard, Badge } from '../../components/ui'
import { KPI_REPORTES } from '../../mocks/extra'
import { formatCOP } from '../../mocks'
import { clsx } from 'clsx'

// ─── Utilidades ───────────────────────────────────────────────

// Escala el valor dentro del rango [0, max] a [0, chartHeight]
function escalar(valor: number, max: number, height: number) {
  return max === 0 ? 0 : (valor / max) * height
}

// ─── Gráficos SVG inline ──────────────────────────────────────

function BarChart({ datos }: { datos: { mes: string; monto: number }[] }) {
  const max    = Math.max(...datos.map(d => d.monto))
  const H      = 120
  const W_BAR  = 28
  const GAP    = 12
  const totalW = datos.length * (W_BAR + GAP) - GAP + 20

  return (
    <svg viewBox={`0 0 ${totalW} ${H + 24}`} className="w-full" style={{ maxHeight: 160 }}>
      {datos.map((d, i) => {
        const x   = i * (W_BAR + GAP) + 10
        const h   = Math.max(4, escalar(d.monto, max, H))
        const y   = H - h
        const pct = ((d.monto / max) * 100).toFixed(0)
        return (
          <g key={d.mes}>
            <rect
              x={x} y={y} width={W_BAR} height={h}
              rx={4}
              fill={i === datos.length - 1 ? '#16a34a' : '#bbf7d0'}
              className="transition-all"
            />
            {/* Tooltip-like value */}
            {i === datos.length - 1 && (
              <text x={x + W_BAR / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="#16a34a" fontWeight="600">
                {(d.monto / 1000).toFixed(0)}k
              </text>
            )}
            {/* Mes label */}
            <text x={x + W_BAR / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {d.mes}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DonutChart({ datos }: { datos: { estado: string; monto: number; color: string }[] }) {
  const total  = datos.reduce((s, d) => s + d.monto, 0)
  const R      = 44
  const cx     = 55
  const cy     = 55
  let startAngle = -90

  const slices = datos.map(d => {
    const angle = (d.monto / total) * 360
    const endAngle = startAngle + angle
    const start = polarToXY(cx, cy, R, startAngle)
    const end   = polarToXY(cx, cy, R, endAngle)
    const large = angle > 180 ? 1 : 0
    const path  = `M ${cx} ${cy} L ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y} Z`
    startAngle  = endAngle
    return { ...d, path }
  })

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 110 110" className="w-28 h-28 flex-shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="1.5"/>
        ))}
        {/* Donut hole */}
        <circle cx={cx} cy={cy} r={22} fill="white"/>
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="#374151" fontWeight="600">
          {formatCOP(total / 1_000_000).replace('$', '')}M
        </text>
      </svg>
      <div className="space-y-2">
        {datos.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }}/>
            <div>
              <p className="text-xs font-medium text-gray-700">{d.estado}</p>
              <p className="text-xs text-gray-400">{formatCOP(d.monto)} ({((d.monto / total) * 100).toFixed(0)}%)</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// ─── Página principal ──────────────────────────────────────────

type PeriodoFiltro = 'mes' | 'trimestre' | 'año'

export default function Reportes() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes')
  const kpi = KPI_REPORTES

  const parColor = (par: number) => par > 5 ? 'text-red-600' : par > 3 ? 'text-yellow-600' : 'text-green-600'
  const parBg    = (par: number) => par > 5 ? 'red' : par > 3 ? 'yellow' : 'green'

  return (
    <Shell>
      <PageContainer>
        <PageHeader
          title="Reportes y métricas"
          subtitle="Dashboard ejecutivo — datos al 6 de junio 2026"
          actions={
            <div className="flex gap-2">
              {/* Filtro de período */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['mes', 'trimestre', 'año'] as PeriodoFiltro[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className={clsx(
                      'px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                      periodo === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Button variant="secondary"><Download size={14}/>Exportar PDF</Button>
            </div>
          }
        />

        {/* ── KPIs principales ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Cartera total"       value={formatCOP(kpi.cartera_total)} color="blue"  />
          <StatCard label="Desembolsos del mes" value={formatCOP(kpi.desembolsos_mes)} color="green"/>
          <StatCard label="PAR 30"              value={`${kpi.par_30}%`}             color={parBg(kpi.par_30) as 'red'|'green'|'yellow'} />
          <StatCard label="Tasa de recuperación" value={`${kpi.tasa_recuperacion}%`} color="green" />
        </div>

        {/* ── Segunda fila KPIs ── */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Créditos activos',    value: kpi.creditos_activos,   color: 'blue'   },
            { label: 'En mora',             value: kpi.creditos_mora,      color: 'red'    },
            { label: 'Cancelados',          value: kpi.creditos_cancelados,color: 'gray'   },
            { label: 'Clientes activos',    value: kpi.num_clientes,       color: 'green'  },
            { label: 'PAR 90',             value: `${kpi.par_90}%`,       color: parBg(kpi.par_90) },
          ].map(k => (
            <StatCard key={k.label} label={k.label} value={String(k.value)} color={k.color as 'blue'|'red'|'green'|'gray'}/>
          ))}
        </div>

        {/* ── Gráficos: Barras + Donut ── */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {/* Barras: tendencia desembolsos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-brand-500"/>
                  <h2 className="text-sm font-semibold text-gray-800">Tendencia de desembolsos</h2>
                </div>
                <span className="text-xs text-gray-400">Últimos 6 meses (COP)</span>
              </div>
            </CardHeader>
            <CardBody>
              <BarChart datos={kpi.tendencia_desembolsos}/>
              <div className="flex justify-between text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                <span>Promedio: {formatCOP(kpi.tendencia_desembolsos.reduce((s, d) => s + d.monto, 0) / kpi.tendencia_desembolsos.length)}</span>
                <span className="flex items-center gap-1 text-green-600">
                  <TrendingUp size={11}/>+14% vs mes anterior
                </span>
              </div>
            </CardBody>
          </Card>

          {/* Donut: distribución cartera */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieIcon size={15} className="text-brand-500"/>
                <h2 className="text-sm font-semibold text-gray-800">Distribución de cartera</h2>
              </div>
            </CardHeader>
            <CardBody>
              <DonutChart datos={kpi.distribucion_cartera}/>
              <div className="mt-4 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2 text-xs">
                <div className="text-gray-500">
                  Total créditos: <span className="font-medium text-gray-800">{kpi.num_creditos}</span>
                </div>
                <div className="text-gray-500">
                  Mora: <span className={clsx('font-medium', parColor(kpi.par_30))}>{kpi.par_30}% PAR30</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ── PAR por zona ── */}
        <Card className="mb-5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-brand-500"/>
              <h2 className="text-sm font-semibold text-gray-800">PAR 30 por zona</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {kpi.par_zona.map(z => {
                const maxPAR = Math.max(...kpi.par_zona.map(x => x.par30))
                const barW   = (z.par30 / maxPAR) * 100
                const nivel  = z.par30 > 5 ? 'Crítico' : z.par30 > 3 ? 'Alerta' : 'Normal'
                const nivelColor = z.par30 > 5 ? 'red' : z.par30 > 3 ? 'yellow' : 'green'
                return (
                  <div key={z.zona}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 font-medium">{z.zona}</span>
                        <Badge color={nivelColor as 'red'|'yellow'|'green'}>{nivel}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatCOP(z.cartera)}</span>
                        <span className={clsx('font-bold', parColor(z.par30))}>{z.par30}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={clsx('h-2 rounded-full transition-all', {
                          'bg-red-500':    z.par30 > 5,
                          'bg-yellow-400': z.par30 > 3 && z.par30 <= 5,
                          'bg-green-500':  z.par30 <= 3,
                        })}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-50">
              Referencia: PAR30 &gt;5% = Crítico · 3-5% = Alerta · &lt;3% = Normal
            </p>
          </CardBody>
        </Card>

        {/* ── Tabla resumen indicadores ── */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-gray-800">Resumen de indicadores clave</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Indicador', 'Valor', 'Referencia', 'Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {[
                  { nombre: 'PAR 30',              valor: `${kpi.par_30}%`,           ref: '< 5%',   ok: kpi.par_30 < 5   },
                  { nombre: 'PAR 90',              valor: `${kpi.par_90}%`,           ref: '< 3%',   ok: kpi.par_90 < 3   },
                  { nombre: 'Tasa de recuperación',valor: `${kpi.tasa_recuperacion}%`,ref: '> 90%',  ok: kpi.tasa_recuperacion > 90 },
                  { nombre: 'Cartera en mora',     valor: formatCOP(110_000),         ref: '< 10% cartera', ok: true },
                  { nombre: 'Créditos activos',    valor: String(kpi.creditos_activos),ref: '—',     ok: true },
                  { nombre: 'Créditos en mora',    valor: String(kpi.creditos_mora),  ref: '< 2',    ok: kpi.creditos_mora < 2 },
                ].map(row => (
                  <tr key={row.nombre} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{row.nombre}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.valor}</td>
                    <td className="px-4 py-3 text-gray-400">{row.ref}</td>
                    <td className="px-4 py-3">
                      <Badge color={row.ok ? 'green' : 'red'}>
                        {row.ok ? '✓ Dentro del umbral' : '✗ Fuera del umbral'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContainer>
    </Shell>
  )
}
