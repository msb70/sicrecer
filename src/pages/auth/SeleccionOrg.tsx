import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Globe } from 'lucide-react'
import { Button } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { ORGANIZACIONES } from '../../mocks'
import type { Rol } from '../../types'
import { ROL_LABELS } from '../../types'
import { clsx } from 'clsx'
import { BrandLogo } from '../../components/BrandLogo'

const ROLES_DISPONIBLES: Rol[] = ['administrador', 'coordinador', 'facilitador', 'comite', 'auditor']

const PAIS_LABEL: Record<string, string> = { CO: '🇨🇴 Colombia', VE: '🇻🇪 Venezuela' }

export default function SeleccionOrg() {
  const navigate = useNavigate()
  const { login } = useApp()

  const [orgSeleccionada, setOrgSeleccionada] = useState<string>(ORGANIZACIONES[0].id)
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>('administrador')

  const handleIngresar = () => {
    login(orgSeleccionada, rolSeleccionado)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <BrandLogo framed className="mb-4" imageClassName="w-[230px] max-w-full" />
          <h1 className="text-2xl font-bold text-gray-900">Selecciona tu espacio</h1>
          <p className="mt-1 text-sm text-gray-500">Tu cuenta tiene acceso a las siguientes organizaciones</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Organizaciones */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Organización</p>
            <div className="space-y-2">
              {ORGANIZACIONES.map(org => (
                <button
                  key={org.id}
                  onClick={() => setOrgSeleccionada(org.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all',
                    orgSeleccionada === org.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm',
                    orgSeleccionada === org.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {org.nombre.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{org.nombre}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Globe size={11} />
                      {PAIS_LABEL[org.pais]}
                    </p>
                  </div>
                  {orgSeleccionada === org.id && (
                    <CheckCircle2 size={20} className="text-brand-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Rol (simulación demo) */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Rol en esta sesión
              <span className="ml-2 text-xs font-normal text-gray-400">(sólo demo)</span>
            </p>
            <div className="grid grid-cols-1 gap-2">
              {ROLES_DISPONIBLES.map(rol => (
                <button
                  key={rol}
                  onClick={() => setRolSeleccionado(rol)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm text-left transition-all',
                    rolSeleccionado === rol
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  )}
                >
                  {rolSeleccionado === rol
                    ? <CheckCircle2 size={16} className="text-brand-600 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                  }
                  {ROL_LABELS[rol]}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleIngresar} className="w-full" size="lg">
            Ingresar al sistema
          </Button>
        </div>
      </div>
    </div>
  )
}
