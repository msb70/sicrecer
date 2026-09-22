import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { BrandLogo } from '../../components/BrandLogo'
import { GoogleIcon } from '../../components/portal/GoogleIcon'

export default function Registro() {
  const navigate = useNavigate()
  const { registroEmail, loginGoogle } = useApp()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [ver, setVer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nombre.trim() || !email || !password) { setError('Completa todos los campos'); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const r = await registroEmail(email, password, nombre.trim())
      if (r.requiereVerificacion) navigate(`/verificar?email=${encodeURIComponent(email)}`)
      else navigate('/portal/perfil')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <BrandLogo framed className="mb-4" imageClassName="w-[200px] max-w-full" />
          <p className="text-sm text-gray-500">Crea tu cuenta para solicitar un crédito</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registro de solicitante</h2>

          {error && (
            <Alert type="error" className="mb-4">
              <div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div>
            </Alert>
          )}

          <button
            type="button"
            onClick={() => void loginGoogle('/portal/perfil')}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <GoogleIcon /> Registrarme con Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o con correo y contraseña</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <Input label="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" />
            <Input label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative">
                <input
                  type={ver ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password" minLength={8}
                  className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button type="button" onClick={() => setVer(!ver)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {ver ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-gray-400">Mínimo 8 caracteres</p>
            </div>
            <Input label="Repite la contraseña" type={ver ? 'text' : 'password'} value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" />
            <Button type="submit" loading={loading} className="w-full" size="lg">Crear cuenta</Button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-500">
            Te enviaremos un código a tu correo para confirmarlo.
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-gray-500">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-700 font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
