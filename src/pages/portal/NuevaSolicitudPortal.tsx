import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Send, Calculator, Upload, Paperclip, Trash2, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import { PortalShell } from '../../components/portal/PortalShell'
import { Button, Input, Card, CardHeader, CardBody, Alert, Spinner } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import {
  cargarCatalogoPortal, productosParaPais, listarFotos, crearSolicitudPortal, evaluarElegibilidad,
  listarAdjuntos, subirAdjunto, eliminarAdjunto, obtenerAdjunto, abrirDataUrl,
  requisitoCubiertoPorPerfil, productoElegiblePorActividad,
  type CatalogoPortal, type AdjuntoInfo,
} from '../../lib/portal'
import { generarPlan, resumenPlan } from '../../lib/finanzas'
import { formatCOP } from '../../mocks'
import { PAIS_LABELS, type Pais, type ProductoCredito } from '../../types'

const PASOS = ['País', 'Producto', 'Monto y plazo', 'Requisitos', 'Enviar']

export default function NuevaSolicitudPortal() {
  const navigate = useNavigate()
  const { solicitante } = useApp()

  const [catalogo, setCatalogo] = useState<CatalogoPortal | null>(null)
  const [fotos, setFotos] = useState<{ documento: boolean; selfie: boolean }>({ documento: false, selfie: false })
  const [error, setError] = useState('')
  const [paso, setPaso] = useState(0)
  const [pais, setPais] = useState<Pais>(solicitante?.pais ?? 'CO')
  const [productoId, setProductoId] = useState('')
  const [monto, setMonto] = useState('')
  const [plazo, setPlazo] = useState('')
  const [proposito, setProposito] = useState('')
  const [adjuntos, setAdjuntos] = useState<AdjuntoInfo[]>([])
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [errorAdjunto, setErrorAdjunto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState<string | null>(null)

  // Estado del perfil (fotos y adjuntos): se relee al entrar en requisitos/envío
  // y al volver a la pestaña, por si se completó en otra pantalla.
  const refrescarPerfil = async () => {
    if (!solicitante) return
    const [lista, adj] = await Promise.all([listarFotos(solicitante.id), listarAdjuntos(solicitante.id)])
    setFotos({ documento: lista.some(f => f.tipo === 'documento'), selfie: lista.some(f => f.tipo === 'selfie') })
    setAdjuntos(adj)
  }

  useEffect(() => {
    if (!solicitante) { navigate('/portal/perfil', { replace: true }); return }
    Promise.all([cargarCatalogoPortal(), refrescarPerfil()])
      .then(([cat]) => setCatalogo(cat))
      .catch(e => setError(e.message))
  }, [solicitante, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (paso >= 3) void refrescarPerfil().catch(() => {})
    const onFocus = () => { void refrescarPerfil().catch(() => {}) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [paso]) // eslint-disable-line react-hooks/exhaustive-deps

  const adjuntar = async (requisitoId: string, f: File | undefined) => {
    if (!f || !solicitante) return
    setSubiendo(requisitoId); setErrorAdjunto('')
    try {
      const info = await subirAdjunto(solicitante.id, requisitoId, f)
      setAdjuntos(a => [...a.filter(x => x.requisito_id !== requisitoId), info])
    } catch (err) {
      setErrorAdjunto(err instanceof Error ? err.message : 'No se pudo subir el archivo')
    } finally {
      setSubiendo(null)
    }
  }

  const quitarAdjunto = async (requisitoId: string) => {
    if (!solicitante) return
    try {
      await eliminarAdjunto(solicitante.id, requisitoId)
      setAdjuntos(a => a.filter(x => x.requisito_id !== requisitoId))
    } catch (err) {
      setErrorAdjunto(err instanceof Error ? err.message : 'No se pudo eliminar')
    }
  }

  const verAdjunto = async (requisitoId: string) => {
    if (!solicitante) return
    const a = await obtenerAdjunto(solicitante.id, requisitoId).catch(() => null)
    if (a) abrirDataUrl(a.dataUrl)
  }

  const productos = useMemo(() => catalogo ? productosParaPais(catalogo.productos, pais) : [], [catalogo, pais])
  const producto: ProductoCredito | undefined = productos.find(p => p.id === productoId)
  const montoN = parseInt(monto) || 0
  const plazoN = parseInt(plazo) || 0

  const requisitosProducto = useMemo(
    () => (producto?.requisito_ids ?? []).map(id => catalogo?.requisitos.find(r => r.id === id)).filter(Boolean) as NonNullable<CatalogoPortal['requisitos'][number]>[],
    [producto, catalogo]
  )

  const plan = useMemo(() => {
    if (!producto || montoN <= 0 || plazoN <= 0) return []
    return generarPlan({ monto: montoN, tasaNominalAnual: producto.tasa_nominal_anual, plazo: plazoN, metodo: producto.metodo_interes, frecuencia: producto.frecuencia })
  }, [producto, montoN, plazoN])
  const resumen = useMemo(() => resumenPlan(plan), [plan])

  const elegibilidad = useMemo(() => {
    if (!producto || !solicitante || !catalogo) return null
    return evaluarElegibilidad({
      producto, solicitante, monto: montoN, plazo: plazoN,
      adjuntos: adjuntos.map(a => a.requisito_id), requisitos: catalogo.requisitos,
      tieneDocumento: fotos.documento, tieneSelfie: fotos.selfie,
    })
  }, [producto, solicitante, catalogo, montoN, plazoN, adjuntos, fotos])

  const elegirProducto = (p: ProductoCredito) => {
    setProductoId(p.id)
    setMonto(String(p.monto_min))
    setPlazo(String(p.plazo_min))
  }

  const enviar = async () => {
    if (!solicitante || !producto) return
    setEnviando(true); setError('')
    try {
      const s = await crearSolicitudPortal({
        solicitante_id: solicitante.id, producto_id: producto.id,
        monto_solicitado: montoN, plazo: plazoN, proposito: proposito.trim() || undefined,
        requisitos_confirmados: adjuntos.map(a => a.requisito_id),
      })
      setEnviada(s.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud')
    } finally {
      setEnviando(false)
    }
  }

  if (enviada) {
    return (
      <PortalShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 size={56} className="text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Solicitud enviada</h2>
          <p className="text-gray-500 mt-2 max-w-sm">Un facilitador la revisará y la pasará al comité evaluador. Te avisaremos por correo cuando haya una decisión.</p>
          <Button className="mt-6" onClick={() => navigate(`/portal/solicitudes/${enviada}`)}>Ver mi solicitud</Button>
        </div>
      </PortalShell>
    )
  }

  const montoValido = producto ? montoN >= producto.monto_min && montoN <= producto.monto_max : false
  const plazoValido = producto ? plazoN >= producto.plazo_min && plazoN <= producto.plazo_max : false
  const perfilIncompleto = !fotos.documento || !fotos.selfie

  return (
    <PortalShell titulo="Nueva solicitud" acciones={<Button variant="ghost" onClick={() => navigate('/portal')}><ArrowLeft size={16} /> Volver</Button>}>
      {error && <Alert type="error" className="mb-4">{error}</Alert>}
      {!catalogo && !error && <div className="py-16 flex justify-center"><Spinner /></div>}

      {catalogo && (<>
        {perfilIncompleto && (
          <Alert type="warning" className="mb-4">
            Te faltan fotos de verificación en tu perfil. Puedes preparar la solicitud, pero no podrás enviarla hasta completarlas.{' '}
            <button className="underline font-medium" onClick={() => navigate('/portal/perfil')}>Ir a mi perfil</button>
          </Alert>
        )}

        {/* Stepper */}
        <div className="flex items-center mb-6">
          {PASOS.map((p, i) => (
            <div key={p} className="flex items-center flex-1 last:flex-none">
              <div className={clsx('flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0',
                i <= paso ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400')}>
                {i < paso ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={clsx('ml-1.5 text-xs hidden sm:block', i === paso ? 'text-brand-700 font-medium' : 'text-gray-400')}>{p}</span>
              {i < PASOS.length - 1 && <div className={clsx('flex-1 h-px mx-2', i < paso ? 'bg-brand-400' : 'bg-gray-200')} />}
            </div>
          ))}
        </div>

        {/* PASO 0: País */}
        {paso === 0 && (
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">¿En qué país solicitas el crédito?</h2></CardHeader>
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PAIS_LABELS) as Pais[]).map(p => (
                  <button key={p} onClick={() => { setPais(p); setProductoId('') }}
                    className={clsx('p-4 rounded-xl border-2 text-left transition-colors', pais === p ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                    <p className="font-semibold text-gray-900">{PAIS_LABELS[p]}</p>
                    <p className="text-xs text-gray-500">{productosParaPais(catalogo.productos, p).length} producto(s) disponibles</p>
                  </button>
                ))}
              </div>
              {solicitante && pais !== solicitante.pais && (
                <Alert type="warning">Tu perfil está registrado en {PAIS_LABELS[solicitante.pais]}. Solo puedes solicitar productos de tu país.</Alert>
              )}
              <div className="flex justify-end">
                <Button onClick={() => setPaso(1)} disabled={!solicitante || pais !== solicitante.pais}>Siguiente <ArrowRight size={16} /></Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* PASO 1: Producto */}
        {paso === 1 && (
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Elige un producto</h2></CardHeader>
            <CardBody className="space-y-3">
              {productos.length === 0 && <Alert type="info">No hay productos disponibles en {PAIS_LABELS[pais]} por ahora.</Alert>}
              {productos.map(p => {
                const elegible = solicitante ? productoElegiblePorActividad(p, solicitante) : false
                return (
                <button key={p.id} onClick={() => elegible && elegirProducto(p)} disabled={!elegible}
                  className={clsx('w-full p-4 rounded-xl border-2 text-left transition-colors',
                    !elegible ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' :
                    productoId === p.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300')}>
                  <p className="font-semibold text-gray-900">{p.nombre}</p>
                  {!elegible && <p className="text-xs text-red-600 mt-0.5">No disponible para tu actividad económica ({catalogo.actividades.find(a => a.id === solicitante?.actividad_economica_id)?.nombre ?? 'sin definir'}).</p>}
                  {p.descripcion && <p className="text-xs text-gray-500 mt-0.5">{p.descripcion}</p>}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-gray-400">Monto</span><br /><span className="font-medium">{formatCOP(p.monto_min)} – {formatCOP(p.monto_max)}</span></div>
                    <div><span className="text-gray-400">Plazo</span><br /><span className="font-medium">{p.plazo_min} – {p.plazo_max} cuotas</span></div>
                    <div><span className="text-gray-400">Tasa</span><br /><span className="font-medium">{p.tasa_nominal_anual}% anual</span></div>
                    <div><span className="text-gray-400">Pago</span><br /><span className="font-medium capitalize">{p.frecuencia}</span></div>
                  </div>
                </button>
                )
              })}
              {productos.length > 0 && solicitante && !productos.some(p => productoElegiblePorActividad(p, solicitante)) && (
                <Alert type="warning">Ningún producto admite tu actividad económica actual. Revísala en tu perfil o consulta con la organización.</Alert>
              )}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setPaso(0)}><ArrowLeft size={16} /> Anterior</Button>
                <Button onClick={() => setPaso(2)} disabled={!producto}>Siguiente <ArrowRight size={16} /></Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* PASO 2: Monto y plazo + simulación */}
        {paso === 2 && producto && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2"><Calculator size={16} className="text-brand-600" /><h2 className="text-sm font-semibold text-gray-800">{producto.nombre}: monto y plazo</h2></div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <Input label="Monto solicitado" type="number" value={monto} onChange={e => setMonto(e.target.value)} min={producto.monto_min} max={producto.monto_max} step={10000}
                    error={!montoValido && montoN > 0 ? `Entre ${formatCOP(producto.monto_min)} y ${formatCOP(producto.monto_max)}` : undefined} />
                  <input type="range" min={producto.monto_min} max={producto.monto_max} step={10000} value={montoN || producto.monto_min} onChange={e => setMonto(e.target.value)} className="w-full mt-2 accent-brand-600" />
                </div>
                <div>
                  <Input label={`Plazo (cuotas ${producto.frecuencia}es)`} type="number" value={plazo} onChange={e => setPlazo(e.target.value)} min={producto.plazo_min} max={producto.plazo_max}
                    error={!plazoValido && plazoN > 0 ? `Entre ${producto.plazo_min} y ${producto.plazo_max}` : undefined} />
                  <input type="range" min={producto.plazo_min} max={producto.plazo_max} step={1} value={plazoN || producto.plazo_min} onChange={e => setPlazo(e.target.value)} className="w-full mt-2 accent-brand-600" />
                </div>
                <Input label="¿Para qué usarás el crédito? (opcional)" value={proposito} onChange={e => setProposito(e.target.value)} placeholder="Ej. Comprar mercancía para mi tienda" />
              </CardBody>
            </Card>

            {montoValido && plazoValido && plan.length > 0 && (
              <Card className="border-brand-200 bg-brand-50">
                <CardBody>
                  <p className="text-xs text-brand-700 font-medium uppercase tracking-wide mb-2">Tu cuota estimada</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-600 capitalize">Cuota {producto.frecuencia}</span>
                    <span className="text-3xl font-bold text-brand-700">{formatCOP(plan[0].cuota)}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-brand-200 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-gray-500">Capital</span><br /><span className="font-medium">{formatCOP(montoN)}</span></div>
                    <div><span className="text-gray-500">Intereses</span><br /><span className="font-medium">{formatCOP(resumen.totalInteres)}</span></div>
                    <div><span className="text-gray-500">Total</span><br /><span className="font-medium">{formatCOP(resumen.totalPagar)}</span></div>
                  </div>
                  <details className="mt-3">
                    <summary className="text-xs text-brand-700 cursor-pointer">Ver todas las cuotas</summary>
                    <table className="w-full text-xs mt-2">
                      <thead><tr className="text-left text-gray-500"><th className="py-1">#</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr></thead>
                      <tbody>
                        {plan.map(f => (
                          <tr key={f.num} className="border-t border-brand-100"><td className="py-1">{f.num}</td><td>{formatCOP(f.cuota)}</td><td>{formatCOP(f.capital)}</td><td>{formatCOP(f.interes)}</td><td>{formatCOP(f.saldo)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                  <p className="text-[11px] text-gray-500 mt-2">Simulación referencial. Las condiciones finales las define el comité.</p>
                </CardBody>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setPaso(1)}><ArrowLeft size={16} /> Anterior</Button>
              <Button onClick={() => setPaso(3)} disabled={!montoValido || !plazoValido}>Siguiente <ArrowRight size={16} /></Button>
            </div>
          </div>
        )}

        {/* PASO 3: Requisitos (adjuntos) */}
        {paso === 3 && producto && (
          <Card>
            <CardHeader><h2 className="text-sm font-semibold text-gray-800">Requisitos del producto</h2></CardHeader>
            <CardBody className="space-y-3">
              <p className="text-xs text-gray-500">Adjunta cada documento (foto JPG/PNG o PDF de hasta 1 MB). Los obligatorios son imprescindibles para enviar.</p>
              {errorAdjunto && <Alert type="error">{errorAdjunto}</Alert>}
              {requisitosProducto.length === 0 && <p className="text-sm text-gray-500">Este producto no tiene requisitos adicionales.</p>}
              {requisitosProducto.map(r => {
                const porPerfil = requisitoCubiertoPorPerfil(r)
                const cubiertoPerfil = r.tipo === 'documento_identidad' ? fotos.documento : r.tipo === 'selfie' ? fotos.selfie : false
                const adj = adjuntos.find(a => a.requisito_id === r.id)
                const ok = porPerfil ? cubiertoPerfil : Boolean(adj)
                return (
                  <div key={r.id} className={clsx('p-3 rounded-lg border', ok ? 'bg-green-50 border-green-200' : r.obligatorio ? 'border-red-200' : 'border-gray-200')}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {ok ? <CheckCircle2 size={15} className="text-green-600 shrink-0" /> : <Paperclip size={15} className="text-gray-400 shrink-0" />}
                          {r.nombre} {r.obligatorio && <span className="text-xs text-red-600">(obligatorio)</span>}
                        </p>
                        {r.descripcion && <p className="text-xs text-gray-500 mt-0.5">{r.descripcion}</p>}
                        {porPerfil && (
                          <p className="text-xs text-gray-500 mt-1">
                            {cubiertoPerfil ? 'Cubierto con la foto de tu perfil.' : <>Se cubre con la foto de tu perfil. <button className="underline" onClick={() => navigate('/portal/perfil')}>Ir a mi perfil</button></>}
                          </p>
                        )}
                        {!porPerfil && adj && (
                          <p className="text-xs text-gray-600 mt-1 truncate">Adjunto: {adj.nombre_archivo}</p>
                        )}
                      </div>
                      {!porPerfil && (
                        <div className="flex items-center gap-1 shrink-0">
                          {adj && (
                            <>
                              <button onClick={() => void verAdjunto(r.id)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" title="Ver"><Eye size={15} /></button>
                              <button onClick={() => void quitarAdjunto(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Quitar"><Trash2 size={15} /></button>
                            </>
                          )}
                          <label className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer', subiendo === r.id ? 'opacity-60' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')}>
                            <Upload size={14} /> {subiendo === r.id ? 'Subiendo…' : adj ? 'Reemplazar' : 'Adjuntar'}
                            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={subiendo !== null}
                              onChange={e => { void adjuntar(r.id, e.target.files?.[0]); e.target.value = '' }} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setPaso(2)}><ArrowLeft size={16} /> Anterior</Button>
                <Button onClick={() => setPaso(4)}>Siguiente <ArrowRight size={16} /></Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* PASO 4: Verificación y envío */}
        {paso === 4 && producto && elegibilidad && (
          <div className="space-y-4">
            <Card>
              <CardHeader><h2 className="text-sm font-semibold text-gray-800">Resumen</h2></CardHeader>
              <CardBody className="space-y-1 text-sm">
                {[
                  ['País', PAIS_LABELS[pais]],
                  ['Producto', producto.nombre],
                  ['Monto', formatCOP(montoN)],
                  ['Plazo', `${plazoN} cuotas (${producto.frecuencia})`],
                  ['Cuota estimada', plan[0] ? formatCOP(plan[0].cuota) : '—'],
                  ['Total a pagar', formatCOP(resumen.totalPagar)],
                  ['Propósito', proposito || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
                ))}
              </CardBody>
            </Card>

            <Card className={elegibilidad.ok ? 'border-green-200' : 'border-red-200'}>
              <CardBody>
                {elegibilidad.ok ? (
                  <div className="flex items-center gap-2 text-green-700"><CheckCircle2 size={18} /><p className="text-sm font-medium">Cumples todos los requisitos. Puedes enviar tu solicitud.</p></div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-red-700 mb-2"><XCircle size={18} /><p className="text-sm font-medium">Aún no puedes enviar la solicitud:</p></div>
                    <ul className="list-disc pl-6 text-sm text-red-700 space-y-1">{elegibilidad.faltantes.map(f => <li key={f}>{f}</li>)}</ul>
                  </div>
                )}
              </CardBody>
            </Card>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setPaso(3)}><ArrowLeft size={16} /> Anterior</Button>
              <Button onClick={enviar} loading={enviando} disabled={!elegibilidad.ok}><Send size={16} /> Enviar solicitud</Button>
            </div>
          </div>
        )}
      </>)}
    </PortalShell>
  )
}
