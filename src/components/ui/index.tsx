import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type HTMLAttributes } from 'react'
import { clsx } from 'clsx'

// ─── BUTTON ───────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants: Record<BtnVariant, string> = {
    primary:   'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-brand-500',
    ghost:     'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }
  const sizes: Record<BtnSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button className={clsx(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}

// ─── INPUT ────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  helperText?: string   // alias of hint
}

export function Input({ label, error, hint, helperText, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const helper = hint ?? helperText
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        id={inputId}
        className={clsx(
          'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-all',
          'placeholder:text-gray-400 bg-white',
          error
            ? 'border-red-400 focus:ring-2 focus:ring-red-300'
            : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────
interface SelectOption { value: string; label: string }
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children?: ReactNode
  options?: SelectOption[]
}
export function Select({ label, error, children, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={selectId} className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        id={selectId}
        className={clsx(
          'w-full px-3 py-2 text-sm border rounded-lg outline-none bg-white transition-all',
          error ? 'border-red-400' : 'border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-200',
          className
        )}
        {...props}
      >
        {options
          ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
          : children
        }
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── CARD ─────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}
export function Card({ children, className, ...props }: CardProps) {
  return <div className={clsx('bg-white border border-gray-200 rounded-xl shadow-sm', className)} {...props}>{children}</div>
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-6 py-4 border-b border-gray-100', className)}>{children}</div>
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-6 py-4', className)}>{children}</div>
}

// ─── BADGE ────────────────────────────────────────────────────
type BadgeColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange'

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: BadgeColor }) {
  const colors: Record<BadgeColor, string> = {
    green:  'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red:    'bg-red-100 text-red-800',
    blue:   'bg-blue-100 text-blue-800',
    gray:   'bg-gray-100 text-gray-700',
    purple: 'bg-purple-100 text-purple-800',
    orange: 'bg-orange-100 text-orange-800',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', colors[color])}>
      {children}
    </span>
  )
}

// ─── ALERT ────────────────────────────────────────────────────
type AlertType = 'info' | 'warning' | 'error' | 'success'
export function Alert({ type = 'info', children, className }: { type?: AlertType; children: ReactNode; className?: string }) {
  const styles: Record<AlertType, string> = {
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  }
  return (
    <div className={clsx('px-4 py-3 rounded-lg border text-sm', styles[type], className)}>
      {children}
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'gray' }: { label: string; value: string; sub?: string; color?: BadgeColor }) {
  const accents: Record<BadgeColor, string> = {
    green:  'border-l-green-500',
    yellow: 'border-l-yellow-500',
    red:    'border-l-red-500',
    blue:   'border-l-blue-500',
    gray:   'border-l-gray-400',
    purple: 'border-l-purple-500',
    orange: 'border-l-orange-500',
  }
  return (
    <Card className={clsx('border-l-4', accents[color])}>
      <CardBody>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
      </CardBody>
    </Card>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="text-base font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── SPINNER ──────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return <span className={clsx(s, 'border-2 border-brand-600 border-t-transparent rounded-full animate-spin inline-block')} />
}
