import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../../components/BrandLogo'
import { EnlacesLegales } from '../../components/legal/EnlacesLegales'
import { TERMINOS, POLITICA, type Bloque, type DocumentoLegal } from '../../lib/textosLegales'
import { RESPONSABLE, NIT_RESPONSABLE, CORREO_CONTACTO } from '../../lib/legal'

function Bloques({ bloques }: { bloques: Bloque[] }) {
  return <>{bloques.map((b, i) => typeof b === 'string'
    ? <p key={i}>{b}</p>
    : <ul key={i} className="list-disc pl-5 space-y-1">{b.lista.map(x => <li key={x}>{x}</li>)}</ul>)}</>
}

function Documento({ doc }: { doc: DocumentoLegal }) {
  useEffect(() => { document.title = `${doc.titulo} · SiCrecer`; window.scrollTo(0, 0) }, [doc])
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/"><BrandLogo imageClassName="w-[120px]" /></Link>
          <Link to="/registro" className="text-sm text-gray-300 hover:text-white">Crear cuenta</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <article className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 text-sm text-gray-700 leading-relaxed space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{doc.titulo}</h1>
          <p className="text-xs text-gray-500">
            {RESPONSABLE} · NIT {NIT_RESPONSABLE} · {CORREO_CONTACTO}<br />Vigencia: {doc.vigencia}
          </p>
          <Bloques bloques={doc.intro} />
          {doc.secciones.map(s => (
            <section key={s.titulo} className="space-y-2 pt-3">
              <h2 className="text-base font-semibold text-gray-900">{s.titulo}</h2>
              <Bloques bloques={s.bloques} />
            </section>
          ))}
        </article>
      </main>
      <footer className="text-center text-xs text-gray-400 pb-8 space-y-1">
        <div>SiCrecer · {RESPONSABLE}</div>
        <EnlacesLegales />
      </footer>
    </div>
  )
}

export function Terminos() { return <Documento doc={TERMINOS} /> }
export function PoliticaDatos() { return <Documento doc={POLITICA} /> }
