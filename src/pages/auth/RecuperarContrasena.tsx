import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, AlertCircle } from 'lucide-react'
import { Button, Input, Alert } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { BrandLogo } from '../../components/BrandLogo'

/** Solicita el correo de recuperación de contraseña (solicitantes con email+contraseña). */
export default function RecuperarContrasena() {
  const { recuperarContrasena } = useApp()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Ingresa tu correo'); return }
    setLoading(true)
    try {
      await recuperarContrasena(email)
      setEnviado(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo')
    } finally {
      setLoading(false)
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
            <KeyRound size={20} className="text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recuperar contraseña</h2>
          </div>
          {enviado ? (
            <>
              <p className="text-sm text-gray-600 mt-2">
                Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.
                Revisa también la carpeta de spam.
              </p>
              <Link to="/login" className="mt-4 inline-block text-sm text-brand-700 font-medium">Volver al inicio de sesión</Link>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Te enviaremos un enlace para establecer una contraseña nueva.
              </p>
              {error && <Alert type="error" className="mb-3"><div className="flex items-center gap-2"><AlertCircle size={16} />{error}</div></Alert>}
              <form onSubmit={submit} className="space-y-3">
                <Input label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                <Button type="submit" loading={loading} className="w-full" size="lg">Enviar enlace</Button>
              </form>
              <div className="mt-4 text-sm text-center">
                <Link to="/login" className="text-gray-500">Volver</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
