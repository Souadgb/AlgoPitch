import type { Direction, PredictionStatus } from '../api/types'

export function DirectionBadge({ direction }: { direction: Direction }) {
  return direction === 'up' ? (
    <span className="font-bold tracking-wide text-teal-600">▲ HAUSSE</span>
  ) : (
    <span className="font-bold tracking-wide text-red-600">▼ BAISSE</span>
  )
}

const STATUS_STYLES: Record<PredictionStatus, { label: string; className: string }> = {
  open: { label: 'En cours', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  success: { label: 'Réussie', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  failed: { label: 'Échouée', className: 'bg-red-50 text-red-700 ring-red-200' },
}

export function StatusBadge({ status }: { status: PredictionStatus }) {
  const { label, className } = STATUS_STYLES[status]
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}>
      {label}
    </span>
  )
}
