import createClient from 'openapi-fetch'
import type { paths } from './generated/schema'

const configuredOrigin = import.meta.env.VITE_PORTAL_API_ORIGIN?.trim()

export const portalApiOrigin = (
  configuredOrigin || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '')
).replace(/\/+$/, '')
export const portalBasePath = '/api/v1/client-portal'

export type ProblemDetails = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  request_id: string
  errors: Array<Record<string, unknown>>
}

export class PortalApiError extends Error {
  status: number
  requestId: string

  constructor(public problem: ProblemDetails) {
    super(problem.detail || problem.title)
    this.name = 'PortalApiError'
    this.status = problem.status
    this.requestId = problem.request_id
  }
}

type PortalRequestOptions = Omit<RequestInit, 'headers'> & {
  headers?: HeadersInit
  organizationId?: string | null
  identityToken?: string
  idempotencyKey?: string
  ifMatch?: string
}

export const contractClient = createClient<paths>({
  baseUrl: portalApiOrigin || window.location.origin,
  credentials: 'include',
})

function toProblem(status: number, response: Response, payload?: unknown): ProblemDetails {
  const body = payload && typeof payload === 'object' ? payload as Partial<ProblemDetails> : {}
  return {
    type: body.type ?? 'about:blank',
    title: body.title ?? 'Portal request failed',
    status: body.status ?? status,
    detail: body.detail ?? `The portal API returned HTTP ${status}.`,
    instance: body.instance ?? response.url,
    code: body.code ?? 'PORTAL_REQUEST_FAILED',
    request_id: body.request_id ?? response.headers.get('X-Request-ID') ?? 'unavailable',
    errors: body.errors ?? [],
  }
}

export async function portalFetch<T>(
  path: string,
  options: PortalRequestOptions = {},
): Promise<{ data: T; response: Response }> {
  if (!portalApiOrigin) {
    throw new Error('The portal API origin is not configured.')
  }

  const {
    organizationId,
    identityToken,
    idempotencyKey,
    ifMatch,
    ...requestOptions
  } = options
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (organizationId) headers.set('X-Organization-ID', organizationId)
  if (identityToken) headers.set('Authorization', `Bearer ${identityToken}`)
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)
  if (ifMatch) headers.set('If-Match', ifMatch)

  const normalized = path.startsWith('/') ? path : `/${path}`
  const requestPath = normalized.startsWith(portalBasePath)
    || normalized.startsWith('/health/')
    || normalized.startsWith('/openapi/')
    ? normalized
    : `${portalBasePath}${normalized}`

  const response = await fetch(`${portalApiOrigin}${requestPath}`, {
    ...requestOptions,
    credentials: 'include',
    headers,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const hasBody = response.status !== 204 && response.status !== 205
  const payload = hasBody && contentType.includes('json')
    ? await response.json()
    : undefined

  if (!response.ok) {
    throw new PortalApiError(toProblem(response.status, response, payload))
  }

  return { data: payload as T, response }
}

export function jsonBody(value: unknown): Pick<RequestInit, 'body'> {
  return { body: JSON.stringify(value) }
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

export function isPortalApiError(error: unknown): error is PortalApiError {
  return error instanceof PortalApiError
}
