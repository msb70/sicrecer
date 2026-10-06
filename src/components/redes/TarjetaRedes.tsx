import { useState } from 'react'
import { Instagram, Facebook, Pencil, Save, ExternalLink, Megaphone } from 'lucide-react'
import { Button, Input, Card, CardHeader, CardBody, Alert, Badge } from '../ui'
import { useApp } from '../../context/AppContext'
import { guardarCatalogo } from '../../lib/catalogos'
import {
  normalizarRed, urlRed, etiquetaRed, ORIGEN_CONSENTIMIENTO_LABEL,
  type RedSocial, type OrigenConsentimiento,
} from '../../lib/redes'
import { CampoConsentimiento } from './CampoConsentimiento'

interface Valor {
  instagram?: string | null
  facebook?: string | null
  acepta_comunicaciones?: boolean
  consentimiento_fecha?: string | null
  consentimiento_origen?: OrigenConsentimiento | null
}
interface Props {
  tabla: 'clientes' | 'prospectos'
  id: string
  valor: Valor
}

const RED_INFO: Record<RedSocial, { label: string; icon: JSX.Element; placeholder: string }> = {
  instagram: { label: 'Instagram', icon: <Instagram size={16} />, placeholder: '@usuario o enlace del perfil' },
  facebook:  { label: 'Facebook',  icon: <Facebook size={16} />,  placeholder: 'usuario o enlace del perfil' },
}

/** Redes sociales y autorización de campañas del prospecto o cliente. */
export function TarjetaRedes({ tabla, id, valor }: Props) {
  const { modo } = useApp()
  const inicial = {
    instagram: valor.instagram ?? '', facebook: valor.facebook ?? '',
    acepta: valor.acepta_comunicaciones ?? false,
    origen: (valor.consentimiento_origen ?? '') as OrigenConsentimiento | '',
    fecha: valor.consentimiento_fecha ?? null,
  }
  const [actual, setActual] = useState(inicial)
  const [form, setForm] = useState(inicial)
  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const sinRedes = !actual.instagram && !actual.facebook

  const guardar = async () => {
    setError('')
    if (modo !== 'google') { setError('En modo demo no se guardan cambios.'); return }
    if (form.acepta && !form.origen) { setError('Indica cómo dio la autorización de comunicaciones'); return }
    setGuardando(true)
    try {
      const fila = {
        instagram: normalizarRed('instagram', form.instagram),
        facebook: normalizarRed('facebook', form.facebook),
        acepta_comunicaciones: form.acepta,
        consentimiento_origen: form.acepta ? form.origen || null : actual.origen || null,
      }
      await guardarCatalogo(tabla, fila, id)
      const cambioPermiso = form.acepta !== actual.acepta
      setActual({
        instagram: fila.instagram ?? '', facebook: fila.facebook ?? '',
        acepta: form.acepta, origen: (fila.consentimiento_origen ?? '') as OrigenConsentimiento | '',
        fecha: cambioPermiso ? new Date().toISOString() : actual.fecha, // la fecha real la sella la BD
      })
      setEditando(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los datos de contacto')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Redes sociales y campañas</h2>
          {!editando && (
            <Button variant="ghost" size="sm" onClick={() => { setForm(actual); setEditando(true) }}>
              <Pencil size={14} />Editar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardBody>
        {error && <Alert type="error" className="mb-3">{error}</Alert>}
        {editando ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {(['instagram', 'facebook'] as RedSocial[]).map(red => (
                <Input key={red} label={RED_INFO[red].label} value={form[red]} placeholder={RED_INFO[red].placeholder}
                  onChange={e => setForm(f => ({ ...f, [red]: e.target.value }))} />
              ))}
            </div>
            <CampoConsentimiento acepta={form.acepta} origen={form.origen}
              onChange={c => setForm(f => ({ ...f, acepta: c.acepta ?? f.acepta, origen: c.origen ?? f.origen }))} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setEditando(false); setError('') }}>Cancelar</Button>
              <Button onClick={guardar} loading={guardando}><Save size={15} />Guardar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sinRedes ? (
              <p className="text-sm text-gray-500">Sin redes sociales registradas.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {(['instagram', 'facebook'] as RedSocial[]).filter(red => actual[red]).map(red => (
                  <div key={red} className="flex items-start gap-3">
                    <span className="text-gray-400 mt-0.5 shrink-0">{RED_INFO[red].icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">{RED_INFO[red].label}</p>
                      <a href={urlRed(red, actual[red]) ?? '#'} target="_blank" rel="noopener noreferrer"
                         className="text-sm font-medium text-brand-700 hover:underline inline-flex items-center gap-1 break-all">
                        {etiquetaRed(red, actual[red])}<ExternalLink size={12} className="shrink-0" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5 shrink-0"><Megaphone size={16} /></span>
              <div>
                <p className="text-xs text-gray-500">Comunicaciones comerciales</p>
                {actual.acepta ? (
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <Badge color="green">Autorizadas</Badge>
                    <span className="text-xs text-gray-500">
                      {actual.origen ? ORIGEN_CONSENTIMIENTO_LABEL[actual.origen] : ''}
                      {actual.fecha ? ` · ${new Date(actual.fecha).toLocaleDateString('es-CO', { dateStyle: 'medium' })}` : ''}
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5">
                    <Badge color="gray">Sin autorización</Badge>
                    <p className="text-xs text-gray-500 mt-1">No incluir en campañas.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
