export function pctColor(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return 'text-slate-500'
  return value > 0 ? 'text-teal-600' : 'text-red-600'
}

/** Couleur du taux de succès, comme sur la maquette : vert si ≥ 50 %, rouge sinon. */
export function rateColor(rate: number | null): string {
  if (rate === null) return 'text-slate-400'
  return rate >= 0.5 ? 'text-emerald-600' : 'text-red-600'
}
