import type { MaintenanceStatus, Condition } from '../../types'
import { CONDITIONS } from '../../lib/helpers'

const statusConfig: Record<MaintenanceStatus, { label: string; className: string }> = {
  ok:       { label: 'Al dia',    className: 'bg-green-100 text-green-700 border-green-200' },
  due_soon: { label: 'Proximo',   className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  overdue:  { label: 'Vencido',   className: 'bg-red-100 text-red-700 border-red-200' },
}

export function StatusBadge({ status }: { status: MaintenanceStatus }) {
  const { label, className } = statusConfig[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body font-medium border ${className}`}>
      {label}
    </span>
  )
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  const c = CONDITIONS.find((c) => c.key === condition) ?? CONDITIONS[CONDITIONS.length - 1]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-medium bg-garage-sand text-garage-dark border border-garage-sand/80">
      <span>{c.icon}</span> {c.label}
    </span>
  )
}

export function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={s} aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < rating ? '★' : '☆'}</span>
      ))}
    </span>
  )
}
