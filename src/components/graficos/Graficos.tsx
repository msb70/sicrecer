import { useState, type ReactNode } from 'react'
import { cifraCorta } from '../../lib/dashboard'

// Gráficos SVG livianos (sin librerías): barras apiladas, agrupadas y horizontales.

export interface Serie { etiqueta: string; color: string }

export function Leyenda({ series }: { series: readonly Serie[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-gray-600">
      {series.map(s => (
        <span key={s.etiqueta} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.etiqueta}
        </span>
      ))}
    </div>
  )
}

function Detalle({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-500 min-h-4 mt-1">{children}</p>
}

const H = 160, PAD_L = 52, PAD_B = 22, ANCHO = 560

function Ejes({ max, formato }: { max: number; formato: (n: number) => string }) {
  const y = (v: number) => H - (v / max) * H + 4
  return (
    <>
      {[0, max / 2, max].map(t => (
        <g key={t}>
          <line x1={PAD_L} x2={ANCHO} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{formato(t)}</text>
        </g>
      ))}
    </>
  )
}

/** Barras verticales apiladas (una por período). */
export function BarrasApiladas({ puntos, series, formato = cifraCorta, anotacion, detalle }: {
  puntos: { etiqueta: string; valores: number[] }[]
  series: readonly Serie[]
  formato?: (n: number) => string
  /** Texto pequeño sobre cada barra (p. ej. PAR30 %). */
  anotacion?: (i: number) => string | null
  detalle?: (i: number) => ReactNode
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...puntos.map(p => p.valores.reduce((a, b) => a + b, 0))) * 1.08
  const paso = (ANCHO - PAD_L) / Math.max(1, puntos.length)
  const bw = Math.min(34, paso * 0.62)
  const alto = (v: number) => (v / max) * H
  return (
    <div>
      <Leyenda series={series} />
      <svg viewBox={`0 0 ${ANCHO} ${H + PAD_B + 6}`} className="w-full" role="img">
        <Ejes max={max} formato={formato} />
        {puntos.map((p, i) => {
          const x = PAD_L + paso * i + (paso - bw) / 2
          let base = H + 4
          const total = p.valores.reduce((a, b) => a + b, 0)
          const nota = anotacion?.(i)
          return (
            <g key={p.etiqueta + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD_L + paso * i} y={0} width={paso} height={H + PAD_B} fill={hover === i ? '#f3f4f6' : 'transparent'} />
              {p.valores.map((v, k) => {
                const h = alto(v)
                base -= h
                return v > 0 ? <rect key={k} x={x} y={base} width={bw} height={h} fill={series[k].color} /> : null
              })}
              {nota && total > 0 && <text x={x + bw / 2} y={H + 4 - alto(total) - 4} textAnchor="middle" fontSize={9} fill="#6b7280">{nota}</text>}
              <text x={x + bw / 2} y={H + PAD_B} textAnchor="middle" fontSize={10} fill="#6b7280">{p.etiqueta}</text>
            </g>
          )
        })}
      </svg>
      <Detalle>
        {hover != null
          ? (detalle?.(hover) ?? <>{puntos[hover].etiqueta}: {series.map((s, k) => `${s.etiqueta} ${formato(puntos[hover].valores[k])}`).join(' · ')}</>)
          : 'Pasa el cursor sobre una barra para ver el detalle.'}
      </Detalle>
    </div>
  )
}

/** Barras verticales agrupadas (p. ej. esperado vs recaudado). */
export function BarrasAgrupadas({ puntos, series, formato = cifraCorta, anotacion, detalle }: {
  puntos: { etiqueta: string; valores: number[] }[]
  series: readonly Serie[]
  formato?: (n: number) => string
  anotacion?: (i: number) => { texto: string; color: string } | null
  detalle?: (i: number) => ReactNode
}) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...puntos.flatMap(p => p.valores)) * 1.12
  const paso = (ANCHO - PAD_L) / Math.max(1, puntos.length)
  const n = series.length
  const bw = Math.min(18, (paso * 0.7) / n)
  const alto = (v: number) => (v / max) * H
  return (
    <div>
      <Leyenda series={series} />
      <svg viewBox={`0 0 ${ANCHO} ${H + PAD_B + 6}`} className="w-full" role="img">
        <Ejes max={max} formato={formato} />
        {puntos.map((p, i) => {
          const cx = PAD_L + paso * i + paso / 2
          const x0 = cx - (bw * n + (n - 1)) / 2
          const nota = anotacion?.(i)
          const tope = Math.max(...p.valores)
          return (
            <g key={p.etiqueta + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={PAD_L + paso * i} y={0} width={paso} height={H + PAD_B} fill={hover === i ? '#f3f4f6' : 'transparent'} />
              {p.valores.map((v, k) => (
                <rect key={k} x={x0 + k * (bw + 1)} y={H + 4 - alto(v)} width={bw} height={alto(v)} rx={2} fill={series[k].color} />
              ))}
              {nota && <text x={cx} y={H + 4 - alto(tope) - 4} textAnchor="middle" fontSize={9} fontWeight={600} fill={nota.color}>{nota.texto}</text>}
              <text x={cx} y={H + PAD_B} textAnchor="middle" fontSize={10} fill="#6b7280">{p.etiqueta}</text>
            </g>
          )
        })}
      </svg>
      <Detalle>
        {hover != null
          ? (detalle?.(hover) ?? <>{puntos[hover].etiqueta}: {series.map((s, k) => `${s.etiqueta} ${formato(puntos[hover].valores[k])}`).join(' · ')}</>)
          : 'Pasa el cursor sobre un período para ver los montos.'}
      </Detalle>
    </div>
  )
}

/** Barras horizontales apiladas; `porcentaje` normaliza cada fila al 100 %. */
export function BarrasHorizontales({ filas, series, porcentaje = false, formato = cifraCorta, derecha }: {
  filas: { etiqueta: string; valores: number[]; sub?: string }[]
  series: readonly Serie[]
  porcentaje?: boolean
  formato?: (n: number) => string
  /** Texto a la derecha de cada fila. */
  derecha?: (i: number) => ReactNode
}) {
  const max = Math.max(1, ...filas.map(f => f.valores.reduce((a, b) => a + b, 0)))
  return (
    <div>
      <Leyenda series={series} />
      <div className="space-y-2.5">
        {filas.map((f, i) => {
          const total = f.valores.reduce((a, b) => a + b, 0)
          const escala = porcentaje ? (total || 1) : max
          return (
            <div key={f.etiqueta + i}>
              <div className="flex justify-between items-baseline gap-2 text-xs mb-1">
                <span className="font-medium text-gray-800 truncate">{f.etiqueta}{f.sub && <span className="text-gray-400 font-normal"> · {f.sub}</span>}</span>
                <span className="text-gray-500 shrink-0">{derecha ? derecha(i) : formato(total)}</span>
              </div>
              <div className="flex h-3.5 rounded bg-gray-100 overflow-hidden" title={series.map((s, k) => `${s.etiqueta}: ${porcentaje ? f.valores[k] : formato(f.valores[k])}`).join(' · ')}>
                {f.valores.map((v, k) => v > 0 && (
                  <div key={k} style={{ width: `${(v / escala) * 100}%`, background: series[k].color }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
