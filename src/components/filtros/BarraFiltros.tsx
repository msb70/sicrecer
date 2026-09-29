import { Search, X } from 'lucide-react'
import { ACTIVIDADES_ECONOMICAS, CONVENIOS, PRODUCTOS, USUARIOS, ZONAS } from '../../mocks'
import { useApp } from '../../context/AppContext'
import { FILTROS_VACIOS, SIN_ASIGNAR, hayFiltros, type FiltrosCartera } from '../../lib/filtros'

type Campo = 'convenio' | 'zona' | 'facilitador' | 'actividad' | 'producto'

interface Props {
  value: FiltrosCartera
  onChange: (f: FiltrosCartera) => void
  /** Campos a mostrar (por defecto todos). El de facilitador se oculta al propio facilitador. */
  campos?: Campo[]
  placeholder?: string
}

const cls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 min-w-0'

/** Barra de filtros común: convenio, zona, facilitador, actividad económica y producto. */
export function BarraFiltros({ value, onChange, campos = ['convenio', 'zona', 'facilitador', 'actividad', 'producto'], placeholder = 'Buscar cliente…' }: Props) {
  const { rol } = useApp()
  const set = (k: keyof FiltrosCartera, v: string) => onChange({ ...value, [k]: v })
  const ver = (c: Campo) => campos.includes(c) && !(c === 'facilitador' && rol === 'facilitador')
  const zonas = ZONAS.filter(z => z.activo)
  const facilitadores = USUARIOS.filter(u => u.rol === 'facilitador')

  return (
    <div className="flex flex-col gap-2 mb-5">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={value.texto}
          onChange={e => set('texto', e.target.value)}
          placeholder={placeholder}
          className={`${cls} w-full pl-9`}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ver('convenio') && (
          <select aria-label="Convenio" value={value.convenio_id} onChange={e => set('convenio_id', e.target.value)} className={cls}>
            <option value="">Todos los convenios</option>
            {CONVENIOS.map(c => <option key={c.id} value={c.id}>{c.cooperante}</option>)}
          </select>
        )}
        {ver('zona') && (
          <select aria-label="Zona" value={value.zona_id} onChange={e => set('zona_id', e.target.value)} className={cls}>
            <option value="">Todas las zonas</option>
            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            <option value={SIN_ASIGNAR}>Sin zona</option>
          </select>
        )}
        {ver('facilitador') && (
          <select aria-label="Facilitador" value={value.facilitador_id} onChange={e => set('facilitador_id', e.target.value)} className={cls}>
            <option value="">Todos los facilitadores</option>
            {facilitadores.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            <option value={SIN_ASIGNAR}>Sin facilitador</option>
          </select>
        )}
        {ver('actividad') && (
          <select aria-label="Actividad económica" value={value.actividad_economica_id} onChange={e => set('actividad_economica_id', e.target.value)} className={cls}>
            <option value="">Todas las actividades</option>
            {ACTIVIDADES_ECONOMICAS.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            <option value={SIN_ASIGNAR}>Sin actividad</option>
          </select>
        )}
        {ver('producto') && (
          <select aria-label="Producto" value={value.producto_id} onChange={e => set('producto_id', e.target.value)} className={cls}>
            <option value="">Todos los productos</option>
            {PRODUCTOS.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
        {hayFiltros(value) && (
          <button
            onClick={() => onChange(FILTROS_VACIOS)}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
