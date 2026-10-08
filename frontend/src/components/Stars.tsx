const STAR_PATH =
  'M10 1.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.7l5.9-.9L10 1.5z'

function StarRow({ className, size }: { className: string; size: number }) {
  return (
    <span className={`flex ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" width={size} height={size} className="shrink-0 fill-current">
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  )
}

/** Note de 0 à 5 par demi-étoile ; null = pas encore classé. */
export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value === null) {
    return <span className="text-xs text-slate-400">Non classé</span>
  }
  const label = `${value.toLocaleString('fr-CA')} étoile${value > 1 ? 's' : ''} sur 5`
  return (
    <span className="relative inline-flex" role="img" aria-label={label} title={label}>
      <StarRow className="text-slate-200" size={size} />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${(value / 5) * 100}%` }}>
        <StarRow className="text-amber-400" size={size} />
      </span>
    </span>
  )
}
