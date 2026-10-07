import { clsx } from 'clsx'
import { URL_TERMINOS, URL_POLITICA_DATOS } from '../../lib/legal'

/** Enlace a un documento legal: siempre en pestaña nueva para no perder el formulario. */
export function EnlaceLegal({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={clsx('underline font-medium text-brand-700 hover:text-brand-800', className)}
      onClick={e => e.stopPropagation()}>
      {children}
    </a>
  )
}

/** Línea de pie de página con Términos y Política de datos. */
export function EnlacesLegales({ className, oscuro }: { className?: string; oscuro?: boolean }) {
  const c = oscuro ? 'text-gray-400 hover:text-gray-200 no-underline hover:underline font-normal' : 'text-gray-500 hover:text-gray-700 font-normal'
  return (
    <span className={clsx('inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1', className)}>
      <EnlaceLegal href={URL_TERMINOS} className={c}>Términos y condiciones</EnlaceLegal>
      <span aria-hidden>·</span>
      <EnlaceLegal href={URL_POLITICA_DATOS} className={c}>Política de tratamiento de datos</EnlaceLegal>
    </span>
  )
}
