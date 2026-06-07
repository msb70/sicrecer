import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'

export default function Login() {
  const navigate = useNavigate()
  const { organizacion } = useApp()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    // Mock: cualquier email/contraseña accede, excepto si email está vacío
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 mb-4 shadow-lg">
            <span className="text-white text-xl font-bold">SC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SiCrecer</h1>
          <p className="mt-1 text-sm text-gray-500">Sistema de Microcréditos por Convenios</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Iniciar sesión</h2>
          <p className="text-sm text-gray-500 mb-6">
            {organizacion.nombre}
          </p>

          {error && (
            <Alert type="error">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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

            <div className="flex justify-end">
              <button type="button" className="text-xs text-brand-600 hover:text-brand-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Ingresar
            </Button>
          </form>

          {/* Hint para demo */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Demo — credenciales de prueba</p>
            <p className="text-xs text-gray-500">Cualquier email + contraseña → accede</p>
            <p className="text-xs text-gray-500">Contraseña <code className="bg-gray-200 px-1 rounded">primer-acceso</code> → flujo de cambio</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          SiCrecer v0.1 · Fase UI Mock
        </p>
      </div>
    </div>
  )
}
