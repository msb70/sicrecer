import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, X } from 'lucide-react'
import { Button, Alert } from '../../components/ui'
import { clsx } from 'clsx'

interface Requisito {
  label: string
  check: (p: string) => boolean
}

const REQUISITOS: Requisito[] = [
  { label: 'Al menos 8 caracteres',          check: p => p.length >= 8 },
  { label: 'Una letra mayúscula',             check: p => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula',             check: p => /[a-z]/.test(p) },
  { label: 'Un número',                       check: p => /\d/.test(p) },
  { label: 'Un carácter especial (!@#$...)',  check: p => /[^A-Za-z0-9]/.test(p) },
]

function PasswordInput({ label, value, onChange }: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 placeholder:text-gray-400"
          placeholder="••••••••"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export default function CambiarContrasena() {
  const navigate = useNavigate()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)

  const requisitosOk = REQUISITOS.every(r => r.check(nueva))
  const coinciden = nueva === confirmar && confirmar.length > 0
  const puedeGuardar = actual.length > 0 && requisitosOk && coinciden

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!puedeGuardar) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setExito(true)
    setLoading(false)
    setTimeout(() => navigate('/seleccionar-org'), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <span className="text-white text-xl font-bold">SC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">Es tu primer acceso. Establece una contraseña segura.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {exito ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">¡Contraseña actualizada!</p>
              <p className="text-sm text-gray-500 mt-1">Redirigiendo al inicio de sesión…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordInput label="Contraseña temporal actual" value={actual} onChange={setActual} />
              <PasswordInput label="Nueva contraseña" value={nueva} onChange={setNueva} />

              {/* Indicador de requisitos */}
              {nueva.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1.5">
                  {REQUISITOS.map(r => {
                    const ok = r.check(nueva)
                    return (
                      <div key={r.label} className={clsx('flex items-center gap-2 text-xs', ok ? 'text-green-700' : 'text-gray-500')}>
                        {ok ? <CheckCircle2 size={13} /> : <X size={13} className="text-gray-300" />}
                        {r.label}
                      </div>
                    )
                  })}
                </div>
              )}

              <PasswordInput label="Confirmar nueva contraseña" value={confirmar} onChange={setConfirmar} />

              {confirmar.length > 0 && !coinciden && (
                <Alert type="error">Las contraseñas no coinciden</Alert>
              )}

              <Button type="submit" loading={loading} disabled={!puedeGuardar} className="w-full" size="lg">
                Guardar contraseña
              </Button>

              <button type="button" onClick={() => navigate('/login')} className="w-full text-center text-sm text-gray-500 hover:text-gray-700">
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
