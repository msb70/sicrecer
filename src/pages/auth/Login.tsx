import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { BrandLogo } from '../../components/BrandLogo'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

// Modo demo visible solo si VITE_DEMO_MODE=true (nunca en producción)
const DEMO_HABILITADO = import.meta.env.VITE_DEMO_MODE === 'true'

export default function Login() {
  const navigate = useNavigate()
  const { organizacion, loginGoogle, errorAuth } = useApp()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [error, setError] = useState('')

  const handleGoogle = async () => {
    setError('')
    setLoadingGoogle(true)
    await loginGoogle()
    // Neon Auth redirige a Google; si volvemos aquí es porque hubo error.
    setLoadingGoogle(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Completa todos los campos')
      return
    }

    setLoading(true)
    // Simular latencia de red
    await new Promise(r => setTimeout(r, 800))

    // Modo demo: cualquier email/contraseña accede
    if (password === 'primer-acceso') {
      navigate('/cambiar-contrasena')
    } else {
      navigate('/seleccionar-org')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <BrandLogo framed className="mb-4" imageClassName="w-[230px] max-w-full" />
          <p className="mt-1 text-sm text-gray-500">Sistema de Microcréditos por Convenios</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-6">
            {organizacion.nombre}
          </p>

          {(error || errorAuth) && (
            <Alert type="error">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                {error || errorAuth}
              </div>
            </Alert>
          )}

          {/* Login real con Google (Neon Auth) */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loadingGoogle}
            className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            <GoogleIcon />
            {loadingGoogle ? 'Redirigiendo…' : 'Continuar con Google'}
          </button>

          {DEMO_HABILITADO && (<>
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o modo demo</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="usuario@organización.org"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg outline-none transition-all placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Ingresar en modo demo
            </Button>
          </form>

          {/* Hint para demo */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Demo — credenciales de prueba</p>
            <p className="text-xs text-gray-500">Cualquier email + contraseña → accede con datos de ejemplo</p>
            <p className="text-xs text-gray-500">Contraseña <code className="bg-gray-200 px-1 rounded">primer-acceso</code> → flujo de cambio</p>
          </div>
          </>)}
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          SiCrecer v0.2 · Datos en Neon
        </p>
      </div>
    </div>
  )
}
