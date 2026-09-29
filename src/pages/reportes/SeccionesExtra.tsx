import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardBody, StatCard, Badge } from '../../components/ui'
import { BarrasHorizontales } from '../../components/graficos/Graficos'
import { formatCOP } from '../../mocks'
import { cifraCorta } from '../../lib/dashboard'
import { SEMAFORO } from '../../lib/scoring'
import type { CalidadFacilitador, FichaConvenio, analisisSolicitudes, composicion } from '../../lib/reportesExtra'

const pct = (n: number | null | undefined, d = 0) => n == null ? '—' : `${n.toFixed(d).replace('.', ',')} %`
const diasTxt = (n: number | null) => n == null ? '—' : `${n.toFixed(1).replace('.', ',')} días`
type Color = 'green' | 'yellow' | 'red' | 'gray'
const semaf = (v: number | null, bueno: number, malo: number, mayorEsMejor = true): Color => {
  if (v == null) return 'gray'
  return mayorEsMejor ? (v >= bueno ? 'green' : v >= malo ? 'yellow' : 'red') : (v <= bueno ? 'green' : v <= malo ? 'yellow' : 'red')
}

function Bloque({ titulo, nota, children, className }: { titulo: string; nota?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <h3 className="text-sm font-semibold text-gray-900">{titulo}</h3>
        {nota && <p className="text-xs text-gray-500 mt-0.5">{nota}</p>}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  )
}

const SERIES_PAR = [{ etiqueta: 'Al día o mora ≤ 30', color: '#16a34a' }, { etiqueta: 'Mora > 30', color: '#dc2626' }]

// ─── RESUMEN ─────────────────────────────────────────────────
export function ResumenExtra({ comp, recaudo, etiqueta, cargandoSerie }: {
  comp: ReturnType<typeof composicion>
  recaudo: { esperado: number; recaudado: number; pct: number | null }
  etiqueta: string
  cargandoSerie: boolean
}) {
  const navigate = useNavigate()
  const filas = (xs: { nombre: string; saldo: number; mora: number; n: number; par30: number }[]) =>
    xs.map(x => ({ etiqueta: x.nombre, sub: `${x.n} créditos`, valores: [x.saldo - x.mora, x.mora] }))
  const derecha = (xs: { saldo: number; par30: number }[]) => (i: number) =>
    <>{cifraCorta(xs[i].saldo)} · <span className={xs[i].par30 > 10 ? 'text-red-600 font-semibold' : xs[i].par30 > 5 ? 'text-amber-600' : 'text-green-700'}>PAR30 {pct(xs[i].par30)}</span></>
  const totalDes = comp.nuevos + comp.renovaciones
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={`Cumplimiento de recaudo · ${etiqueta}`} value={cargandoSerie ? '…' : pct(recaudo.pct)}
          sub={`${cifraCorta(recaudo.recaudado)} de ${cifraCorta(recaudo.esperado)} esperado`} color={semaf(recaudo.pct, 95, 80)} />
        <StatCard label="Nuevos vs. renovaciones" value={`${comp.nuevos} / ${comp.renovaciones}`}
          sub={totalDes ? `${pct((comp.renovaciones / totalDes) * 100)} de los desembolsos son renovación` : 'sin desembolsos en el período'} color="blue" />
        <StatCard label="Ticket promedio" value={comp.ticket == null ? '—' : cifraCorta(comp.ticket)} sub="monto medio desembolsado" color="gray" />
        <StatCard label="Mujeres en la cartera" value={pct(comp.mujeresPct)} sub="clientes con crédito vigente" color="gray" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Bloque titulo="Cartera por producto" nota="Saldo vigente y parte con más de 30 días de mora.">
          <BarrasHorizontales series={SERIES_PAR} filas={filas(comp.porProducto)} derecha={derecha(comp.porProducto)} />
        </Bloque>
        <Bloque titulo="Cartera por zona">
          <BarrasHorizontales series={SERIES_PAR} filas={filas(comp.porZona)} derecha={derecha(comp.porZona)} />
        </Bloque>
        <Bloque titulo="Cartera por actividad económica" nota="Las 6 actividades con más saldo.">
          <BarrasHorizontales series={SERIES_PAR} filas={filas(comp.porActividad)} derecha={derecha(comp.porActividad)} />
        </Bloque>
      </div>
      {comp.topMora.length > 0 && (
        <Bloque titulo="Los 5 créditos con más días de mora" nota="Prioridad de cobranza y posibles castigos.">
          <div className="divide-y divide-gray-50 -my-2">
            {comp.topMora.map(c => (
              <button key={c.id} onClick={() => navigate(`/cartera/${c.id}`)} className="w-full flex justify-between items-center py-2 text-left hover:bg-gray-50 px-1 rounded">
                <span><span className="text-sm font-medium text-gray-900">{c.cliente_nombre}</span> <span className="text-xs text-gray-500">· {c.producto_nombre}</span></span>
                <span className="flex items-center gap-3"><span className="text-sm text-gray-700">{formatCOP(c.saldo_capital)}</span><Badge color={c.dias_mora > 90 ? 'red' : 'yellow'}>{c.dias_mora} días</Badge></span>
              </button>
            ))}
          </div>
        </Bloque>
      )}
    </>
  )
}

// ─── FACILITADORES ───────────────────────────────────────────
export function FacilitadoresExtra({ filas, etiqueta, cargando }: { filas: CalidadFacilitador[]; etiqueta: string; cargando: boolean }) {
  const conRecaudo = filas.filter(f => f.recaudo.esperado > 0)
  return (
    <div className="space-y-4">
      <Bloque titulo="Tablero de calidad por facilitador"
        nota={`Recaudo, visitas, días a desembolso y nuevos/renovaciones = ${etiqueta}. Mora temprana y retención = historia completa. Verde / amarillo / rojo según metas sugeridas.`}>
        {cargando ? <p className="text-sm text-gray-400">Cargando…</p> : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Facilitador', 'Cartera', 'PAR 30', 'Recaudo', 'Mora temprana', 'Retención', 'Visitas', 'Días a desembolso', 'Nuevos / renov.', 'Clientes'].map(h =>
                    <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filas.map(f => (
                  <tr key={f.id || 'sin'}>
                    <td className="px-2 py-2 font-medium text-gray-900 whitespace-nowrap">{f.nombre}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{cifraCorta(f.saldo)}</td>
                    <td className="px-2 py-2"><Badge color={semaf(f.par30, 5, 10, false)}>{pct(f.par30, 1)}</Badge></td>
                    <td className="px-2 py-2"><Badge color={semaf(f.recaudo.pct, 95, 80)}>{pct(f.recaudo.pct)}</Badge></td>
                    <td className="px-2 py-2" title={`${f.moraTemprana.malos} de ${f.moraTemprana.base} créditos`}>
                      <Badge color={semaf(f.moraTemprana.pct, 10, 20, false)}>{pct(f.moraTemprana.pct)}</Badge>
                      <span className="text-xs text-gray-400 ml-1">({f.moraTemprana.base})</span>
                    </td>
                    <td className="px-2 py-2" title={`${f.retencion.volvieron} de ${f.retencion.base} pagados`}>
                      {f.retencion.base ? <Badge color={semaf(f.retencion.pct, 60, 40)}>{pct(f.retencion.pct)}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{f.visitas.realizadas} / {f.visitas.programadas}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{diasTxt(f.diasADesembolso)}</td>
                    <td className="px-2 py-2">{f.nuevos} / {f.renovaciones}</td>
                    <td className="px-2 py-2">{f.clientesPorFacilitador}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloque>
      <div className="grid lg:grid-cols-2 gap-4">
        <Bloque titulo={`Cumplimiento de recaudo · ${etiqueta}`} nota="Cuánto se recaudó de lo que vencía en el período.">
          {conRecaudo.length ? (
            <BarrasHorizontales series={[{ etiqueta: 'Recaudado', color: '#2563eb' }, { etiqueta: 'Faltó recaudar', color: '#e5e7eb' }]}
              filas={conRecaudo.map(f => ({ etiqueta: f.nombre, valores: [Math.min(f.recaudo.recaudado, f.recaudo.esperado), Math.max(0, f.recaudo.esperado - f.recaudo.recaudado)] }))}
              porcentaje derecha={i => <>{pct(conRecaudo[i].recaudo.pct)} · {cifraCorta(conRecaudo[i].recaudo.recaudado)}</>} />
          ) : <p className="text-sm text-gray-400">Sin cuotas que vencieran en el período.</p>}
        </Bloque>
        <Card>
          <CardHeader><h3 className="text-sm font-semibold text-gray-900">Cómo leer el tablero</h3></CardHeader>
          <CardBody className="text-xs text-gray-600 space-y-2">
            <p><strong>Mora temprana</strong>: créditos que pagaron tarde (más de 7 días) o deben alguna de sus 3 primeras cuotas. Mide si la visita y el scoring están filtrando bien; meta ≤ 10 %.</p>
            <p><strong>Recaudo</strong>: recaudado ÷ cuotas que vencían en el período. Meta ≥ 95 %.</p>
            <p><strong>Retención</strong>: de los clientes que terminaron de pagar, cuántos volvieron por otro crédito. Meta ≥ 60 %; baja retención encarece la originación.</p>
            <p><strong>Visitas</strong>: realizadas / programadas en el período. <strong>Días a desembolso</strong>: de la solicitud al desembolso.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

// ─── CONVENIOS ───────────────────────────────────────────────
export function ConveniosExtra({ fichas, etiqueta }: { fichas: FichaConvenio[]; etiqueta: string }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {fichas.map(f => {
        const total = Math.max(f.fondo, f.saldoVigente + f.disponible, 1)
        return (
          <Card key={f.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{f.cooperante}</h3>
                <Badge color={f.estado === 'activo' ? 'green' : 'gray'}>{f.estado}</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Fondo {formatCOP(f.fondo)} · vence {f.fechaFin ? new Date(`${f.fechaFin.slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }) : '—'}</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <div className="flex h-3 rounded overflow-hidden bg-gray-100">
                  <div style={{ width: `${(f.saldoVigente / total) * 100}%`, background: '#16a34a' }} title="Prestado hoy" />
                  <div style={{ width: `${(f.disponible / total) * 100}%`, background: '#d1d5db' }} title="Disponible" />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-green-600 mr-1" />Prestado hoy {cifraCorta(f.saldoVigente)}</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-gray-300 mr-1" />Disponible {cifraCorta(f.disponible)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <Dato titulo="Colocado histórico" valor={cifraCorta(f.colocadoHistorico)} sub={`${f.creditos} créditos`} />
                <Dato titulo="Capital recuperado" valor={cifraCorta(f.recuperado)} sub="ya volvió al fondo" />
                <Dato titulo="Rotación del fondo" valor={`${f.rotacion.toFixed(2).replace('.', ',')}×`} sub="veces prestado" />
                <Dato titulo="Emprendedores" valor={String(f.clientes)} sub={`${pct(f.mujeresPct)} mujeres · ${pct(f.jovenesPct)} ≤ 28 años`} />
                <Dato titulo="Ticket promedio" valor={f.ticket == null ? '—' : cifraCorta(f.ticket)} sub={`${pct(f.renovacionesPct)} renovaciones`} />
                <Dato titulo="Calidad" valor={`PAR30 ${pct(f.par30, 1)}`} sub={`recaudo ${etiqueta}: ${pct(f.recaudo.pct)}`} alerta={f.par30 > 10} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Lista titulo="Actividades financiadas" items={f.actividades} />
                <Lista titulo="Zonas" items={f.zonas} />
              </div>
              <p className="text-xs text-gray-500 border-t border-gray-100 pt-2">
                Ritmo de colocación (últimos 3 meses): <strong>{cifraCorta(f.ritmoMensual)}/mes</strong>.{' '}
                {f.mesesParaAgotar == null ? 'Sin colocación reciente.' : f.mesesParaAgotar < 1 ? 'El disponible se agota este mes.' : `Al ritmo actual el disponible alcanza para ~${Math.round(f.mesesParaAgotar)} meses.`}
              </p>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

function Dato({ titulo, valor, sub, alerta }: { titulo: string; valor: string; sub?: string; alerta?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-2">
      <p className="text-[11px] text-gray-500">{titulo}</p>
      <p className={`text-sm font-semibold ${alerta ? 'text-red-600' : 'text-gray-900'}`}>{valor}</p>
      {sub && <p className="text-[10px] text-gray-400 leading-tight">{sub}</p>}
    </div>
  )
}

function Lista({ titulo, items }: { titulo: string; items: { nombre: string; n: number }[] }) {
  return (
    <div>
      <p className="font-medium text-gray-700 mb-1">{titulo}</p>
      {items.length ? items.map(i => <p key={i.nombre} className="text-gray-600 flex justify-between"><span className="truncate">{i.nombre}</span><span className="text-gray-400 ml-2">{i.n}</span></p>)
        : <p className="text-gray-400">—</p>}
    </div>
  )
}

// ─── SOLICITUDES ─────────────────────────────────────────────
export function SolicitudesExtra({ a, etiqueta }: { a: ReturnType<typeof analisisSolicitudes>; etiqueta: string }) {
  const maxT = Math.max(1, ...a.tiempos.map(t => t.dias ?? 0))
  const maxA = Math.max(1, ...a.antiguedad.map(t => t.n))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pendientes hoy" value={String(a.pendientes)} sub={`${a.antiguedad[3].n} con más de 30 días`} color={a.antiguedad[3].n ? 'red' : 'yellow'} />
        <StatCard label="Recorte de monto" value={pct(a.recorte)} sub="aprobado vs. solicitado" color="gray" />
        <StatCard label={`Desde el portal · ${etiqueta}`} value={`${a.portal.n} / ${a.portal.total}`} sub={a.portal.total ? `${pct((a.portal.n / a.portal.total) * 100)} de las recibidas` : 'sin solicitudes'} color="blue" />
        <StatCard label="Tiempo total a desembolso" value={diasTxt(a.tiempos.reduce<number | null>((s, t) => t.dias == null ? s : (s ?? 0) + t.dias, null))} sub="suma de etapas promedio" color="gray" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Bloque titulo="¿Dónde se demora la solicitud?" nota={`Promedio de días por etapa, solicitudes de ${etiqueta}.`}>
          <div className="space-y-3">
            {a.tiempos.map(t => (
              <div key={t.etapa}>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-700">{t.etapa} <span className="text-gray-400">· {t.n}</span></span><span className="font-medium">{diasTxt(t.dias)}</span></div>
                <div className="h-2 bg-gray-100 rounded-full"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${((t.dias ?? 0) / maxT) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Bloque>
        <Bloque titulo="Aprobación según el semáforo del scoring" nota="Si el comité aprueba rojos o rechaza verdes, el scoring y el comité no están alineados.">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 uppercase"><th className="text-left py-1">Semáforo</th><th className="text-right">Recibidas</th><th className="text-right">Aprob.</th><th className="text-right">Rech.</th><th className="text-right">En curso</th><th className="text-right">Tasa</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {a.semaforo.filter(s => s.n).map(s => (
                <tr key={s.semaforo ?? 'sin'}>
                  <td className="py-1.5">{s.semaforo ? <Badge color={SEMAFORO[s.semaforo].color}>{SEMAFORO[s.semaforo].texto}</Badge> : <span className="text-gray-400 text-xs">Sin scoring</span>}</td>
                  <td className="text-right">{s.n}</td><td className="text-right">{s.aprobadas}</td><td className="text-right">{s.rechazadas}</td><td className="text-right">{s.enProceso}</td>
                  <td className="text-right font-medium">{pct(s.tasa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloque>
        <Bloque titulo="Antigüedad de las solicitudes pendientes" nota="Solicitudes enviadas o en comité, por días de espera (hoy).">
          <div className="space-y-2">
            {a.antiguedad.map((t, i) => (
              <div key={t.tramo} className="flex items-center gap-3">
                <span className="w-28 text-xs text-gray-600">{t.tramo}</span>
                <div className="flex-1 h-5 bg-gray-50 rounded"><div className="h-5 rounded flex items-center px-2" style={{ width: `${Math.max(t.n ? 8 : 0, (t.n / maxA) * 100)}%`, background: ['#16a34a', '#eab308', '#f97316', '#dc2626'][i] }}>{t.n > 0 && <span className="text-xs text-white font-semibold">{t.n}</span>}</div></div>
              </div>
            ))}
          </div>
          {a.pendientesPorFacilitador.length > 0 && (
            <p className="text-xs text-gray-500 mt-3">Por facilitador: {a.pendientesPorFacilitador.map(p => `${p.nombre} ${p.n}`).join(' · ')}</p>
          )}
        </Bloque>
        <Bloque titulo="Motivos de rechazo" nota={`Rechazadas de ${etiqueta}.`}>
          {a.motivos.length ? (
            <div className="space-y-1.5">
              {a.motivos.map(m => <div key={m.motivo} className="flex justify-between text-sm"><span className="text-gray-700 truncate pr-3">{m.motivo}</span><Badge color="red">{m.n}</Badge></div>)}
            </div>
          ) : <p className="text-sm text-gray-400">Sin rechazos en el período.</p>}
        </Bloque>
      </div>
    </div>
  )
}
