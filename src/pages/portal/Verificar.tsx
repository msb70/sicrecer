import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { MailCheck, AlertCircle } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { BrandLogo } from '../../components/BrandLogo'

export default function Verificar() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { verificarOtp, reenviarOtp } = useApp()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setAviso('')
    if (!email || otp.trim().length < 4) { setError('Ingresa tu correo y el código recibido'); return }
    setLoading(true)
    try {
      await verificarOtp(email, otp)
      navigate('/portal/perfil')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  const reenviar = async () => {
    setError(''); setAviso('')
    try {
      await reenviarOtp(email)
      setAviso('Te enviamos un nuevo código. Revisa también la carpeta de spam.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <BrandLogo framed className="mb-4" imageClassName="w-[200px] max-w-full" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <MailCheck size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-900">Confirma tu correo</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Te enviamos un código de verificación. Vence en 15 minutos.
          </p>

          {error && <Alert type="error" className="mb-3"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></Alert>}
          {aviso && <Alert type="success" className="mb-3">{aviso}</Alert>}

          <form onSubmit={submit} className="space-y-3">
            <Input label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Código de verificación" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value)} placeholder="123456" className="tracking-widest text-lg" />
            <Button type="submit" loading={loading} className="w-full" size="lg">Confirmar</Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" onClick={reenviar} className="text-brand-700 font-medium">Reenviar código</button>
            <Link to="/login" className="text-gray-500">Volver</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
