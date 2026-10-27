import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, X, Eye, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'
import { Button, Alert } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { BrandLogo } from '../../components/BrandLogo'

const REQUISITOS = [
  { label: 'Al menos 8 caracteres',          check: (p: string) => p.length >= 8 },
  { label: 'Una letra mayúscula',             check: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula',             check: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número',                       check: (p: string) => /\d/.test(p) },
  { label: 'Un carácter especial (!@#$...)',  check: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function PasswordInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder="••••••••"
          className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 placeholder:text-gray-400"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

/**
 * Página para fijar contraseña. Llega por:
 *  - enlace de recuperación de Supabase Auth (PKCE, evento PASSWORD_RECOVERY);
 *  - enlace de invitación de usuarios internos (?token_hash=…&type=invite|recovery),
 *    que genera el notificador y se canjea aquí con verifyOtp.
 */
export default function NuevaContrasena() {
  const navigate = useNavigate()
  const [listo, setListo] = useState(false)
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [enlaceInvalido, setEnlaceInvalido] = useState(false)
  const params = new URLSearchParams(window.location.search)
  const esInvitacion = params.get('type') === 'invite' || (params.has('token_hash') && params.get('type') === 'recovery')

  useEffect(() => {
    const tokenHash = params.get('token_hash')
    const tipo = params.get('type')
    if (tokenHash && (tipo === 'invite' || tipo === 'recovery')) {
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo }).then(({ data, error }) => {
        if (error || !data.session) { setEnlaceInvalido(true); return }
        window.history.replaceState(null, '', window.location.pathname) // el token es de un solo uso: fuera de la URL
        setListo(true)
      })
      return
    }
    // El intercambio del código PKCE lo hace el cliente al detectar la URL;
    // se espera a tener sesión antes de permitir el cambio.
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (evento === 'PASSWORD_RECOVERY' || (evento === 'SIGNED_IN' && sesion)) setListo(true)
    })
    void supabase.auth.getSession().then(({ data }) => { if (data.session) setListo(true) })
    return () => sub.subscription.unsubscribe()
  }, [])

  const requisitosOk = REQUISITOS.every(r => r.check(nueva))
  const coinciden = nueva === confirmar && confirmar.length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requisitosOk || !coinciden) return
    setError(''); setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: nueva })
      if (error) throw new Error(error.message)
      setExito(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <BrandLogo framed className="mb-4" imageClassName="w-[230px] max-w-full" />
          <h1 className="text-2xl font-bold text-gray-900">{esInvitacion ? 'Crea tu contraseña' : 'Nueva contraseña'}</h1>
          {esInvitacion && <p className="mt-1 text-sm text-gray-500">Bienvenido a SiCrecer. Con ella entrarás usando tu correo.</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {exito ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">¡Contraseña guardada!</p>
              <p className="text-sm text-gray-500 mt-1">Entrando…</p>
            </div>
          ) : enlaceInvalido ? (
            <div className="space-y-3">
              <Alert type="error">El enlace venció o ya fue usado.</Alert>
              <p className="text-sm text-gray-600">
                {esInvitacion
                  ? 'Pide a tu administrador que te reenvíe la invitación, o'
                  : 'Puedes'}{' '}
                <button type="button" className="text-brand-700 font-medium" onClick={() => navigate('/recuperar')}>solicitar un enlace nuevo</button>.
              </p>
            </div>
          ) : !listo ? (
            <p className="text-sm text-gray-500">
              Validando el enlace… Si esta pantalla no cambia, el enlace venció o ya fue usado:
              <button type="button" className="ml-1 text-brand-700 font-medium" onClick={() => navigate('/recuperar')}>pide uno nuevo</button>.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <Alert type="error">{error}</Alert>}
              <PasswordInput label="Nueva contraseña" value={nueva} onChange={setNueva} />
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
              <PasswordInput label="Confirmar contraseña" value={confirmar} onChange={setConfirmar} />
              {confirmar.length > 0 && !coinciden && <Alert type="error">Las contraseñas no coinciden</Alert>}
              <Button type="submit" loading={loading} disabled={!requisitosOk || !coinciden} className="w-full" size="lg">
                {esInvitacion ? 'Crear contraseña y entrar' : 'Guardar contraseña'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
