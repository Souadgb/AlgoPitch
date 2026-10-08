const LOCALE = 'fr-CA'

export function formatPrice(value: string | number | null | undefined, currency: string): string {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  // Petits cours (crypto, penny stocks) : plus de décimales
  const digits = Math.abs(amount) < 1 ? 6 : 2
  try {
    return new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(amount)
  } catch {
    // Devise non ISO (ex. « GBp » pour les pence de Londres)
    return `${amount.toLocaleString(LOCALE, { maximumFractionDigits: digits })} ${currency}`
  }
}

export function formatPct(value: number | null | undefined, { signed = true } = {}): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value / 100)
}

/** Date ISO « AAAA-MM-JJ » interprétée en date locale (sans décalage de fuseau). */
export function parseDate(iso: string): Date {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = iso.length > 10 ? new Date(iso) : parseDate(iso)
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
}

export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

const ASSET_TYPES: Record<string, string> = {
  equity: 'Action',
  etf: 'ETF',
  cryptocurrency: 'Crypto',
  index: 'Indice',
  mutualfund: 'Fonds',
  future: 'Contrat à terme',
  currency: 'Devise',
}

export function assetTypeLabel(type: string): string {
  return ASSET_TYPES[type] ?? type
}
