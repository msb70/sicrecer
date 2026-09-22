import { useEffect, useRef, useState } from 'react'
import { Camera, Upload, RefreshCw, Check, X } from 'lucide-react'
import { Button } from '../ui'
import { comprimirImagen, tamanoDataUrl } from '../../lib/portal'

interface Props {
  titulo: string
  descripcion: string
  /** 'user' = cámara frontal (selfie); 'environment' = trasera (documento) */
  camara: 'user' | 'environment'
  /** Si es true, no se permite subir archivo: solo cámara (selfie en vivo). */
  soloCamara?: boolean
  valorActual?: string | null       // data URL ya guardada (preview)
  onCapturada: (dataUrl: string) => Promise<void>
}

/**
 * Captura una foto con la cámara del dispositivo (getUserMedia) o desde
 * archivo, la comprime en cliente y la entrega como data URL JPEG pequeño.
 */
export function CapturaFoto({ titulo, descripcion, camara, soloCamara, valorActual, onCapturada }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [modo, setModo] = useState<'idle' | 'camara' | 'preview'>('idle')
  const [preview, setPreview] = useState<string | null>(valorActual ?? null)
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { setPreview(valorActual ?? null) }, [valorActual])
  useEffect(() => () => detener(), [])

  const detener = () => {
    stream.current?.getTracks().forEach(t => t.stop())
    stream.current = null
  }

  const abrirCamara = async () => {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: camara, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false,
      })
      stream.current = s
      setModo('camara')
      // el <video> se monta tras el cambio de modo
      setTimeout(() => { if (video.current) { video.current.srcObject = s; void video.current.play() } }, 50)
    } catch {
      setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
    }
  }

  const capturar = async () => {
    const v = video.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth; canvas.height = v.videoHeight
    canvas.getContext('2d')!.drawImage(v, 0, 0)
    detener()
    const comprimida = await comprimirImagen(canvas.toDataURL('image/jpeg', 0.9))
    setPendiente(comprimida)
    setModo('preview')
  }

  const desdeArchivo = async (f: File | undefined) => {
    if (!f) return
    setError('')
    try {
      const comprimida = await comprimirImagen(f)
      setPendiente(comprimida)
      setModo('preview')
    } catch {
      setError('No se pudo leer la imagen.')
    }
  }

  const confirmar = async () => {
    if (!pendiente) return
    setGuardando(true); setError('')
    try {
      await onCapturada(pendiente)
      setPreview(pendiente)
      setPendiente(null)
      setModo('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la foto')
    } finally {
      setGuardando(false)
    }
  }

  const cancelar = () => { detener(); setPendiente(null); setModo('idle') }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{titulo}</p>
          <p className="text-xs text-gray-500">{descripcion}</p>
        </div>
        {preview && modo === 'idle' && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><Check size={12} /> Guardada</span>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {modo === 'camara' && (
        <div className="space-y-2">
          <video ref={video} playsInline muted className="w-full rounded-lg bg-black aspect-[4/3] object-cover" />
          <div className="flex gap-2">
            <Button onClick={capturar} className="flex-1"><Camera size={16} /> Tomar foto</Button>
            <Button variant="secondary" onClick={cancelar}><X size={16} /></Button>
          </div>
        </div>
      )}

      {modo === 'preview' && pendiente && (
        <div className="space-y-2">
          <img src={pendiente} alt="Vista previa" className="w-full rounded-lg object-contain max-h-72 bg-gray-100" />
          <p className="text-xs text-gray-400">{Math.round(tamanoDataUrl(pendiente) / 1024)} KB</p>
          <div className="flex gap-2">
            <Button onClick={confirmar} loading={guardando} className="flex-1"><Check size={16} /> Usar esta foto</Button>
            <Button variant="secondary" onClick={cancelar}><RefreshCw size={16} /> Repetir</Button>
          </div>
        </div>
      )}

      {modo === 'idle' && (
        <div className="space-y-2">
          {preview && <img src={preview} alt={titulo} className="w-full rounded-lg object-contain max-h-56 bg-gray-100" />}
          <div className="flex gap-2">
            <Button variant={preview ? 'secondary' : 'primary'} onClick={abrirCamara} className="flex-1">
              <Camera size={16} /> {preview ? 'Volver a tomar' : 'Abrir cámara'}
            </Button>
            {!soloCamara && (
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer">
                <Upload size={16} /> Subir
                <input type="file" accept="image/*" capture={camara} className="hidden" onChange={e => void desdeArchivo(e.target.files?.[0])} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
