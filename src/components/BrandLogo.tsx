import { clsx } from 'clsx'
import sicrecerLogo from '../assets/sicrecer-logo-blanco.png'

interface BrandLogoProps {
  className?: string
  imageClassName?: string
  framed?: boolean
}

export function BrandLogo({ className, imageClassName, framed = false }: BrandLogoProps) {
  return (
    <div
      className={clsx(
        'inline-flex items-center justify-center',
        framed && 'rounded-2xl bg-gray-950 px-5 py-3 shadow-lg',
        className
      )}
    >
      <img
        src={sicrecerLogo}
        alt="Sicrecer"
        className={clsx('block h-auto object-contain', imageClassName)}
      />
    </div>
  )
}
