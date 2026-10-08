type ErrorBody = Record<string, unknown> | null

export class ApiError extends Error {
  readonly status: number
  readonly data: ErrorBody

  constructor(status: number, data: ErrorBody) {
    super(extractMessage(data) ?? `Erreur ${status}`)
    this.status = status
    this.data = data
  }

  /** Code d'erreur métier renvoyé par le backend (ex. « email_not_verified »). */
  get code(): string | undefined {
    const code = this.data?.code
    return typeof code === 'string' ? code : undefined
  }

  /** Premier message d'erreur pour chaque champ du formulaire. */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    for (const [field, value] of Object.entries(this.data ?? {})) {
      const message = Array.isArray(value) ? value[0] : value
      if (typeof message === 'string' && field !== 'code') errors[field] = message
    }
    return errors
  }
}

function extractMessage(data: ErrorBody): string | undefined {
  if (!data) return undefined
  if (typeof data.detail === 'string') return data.detail
  const nonField = data.non_field_errors
  if (Array.isArray(nonField) && typeof nonField[0] === 'string') return nonField[0]
  return undefined
}

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') headers['X-CSRFToken'] = getCookie('csrftoken') ?? ''

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}
