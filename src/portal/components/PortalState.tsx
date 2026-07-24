import {
  ArrowClockwise,
  CheckCircle,
  Empty,
  WarningCircle,
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { isPortalApiError } from '../../api/client'

export function PortalLoading({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <div className="portal-state portal-state-loading" role="status">
      <div className="portal-loader-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  )
}

export function PortalError({
  error,
  onRetry,
  title = 'This view could not be loaded',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const detail = error instanceof Error ? error.message : 'Please try again.'
  const requestId = isPortalApiError(error) ? error.requestId : null

  return (
    <div className="portal-state portal-state-error" role="alert">
      <WarningCircle aria-hidden="true" weight="duotone" />
      <div>
        <h3>{title}</h3>
        <p>{detail}</p>
        {requestId && <small>Request ID: {requestId}</small>}
      </div>
      {onRetry && (
        <button className="portal-secondary-button" type="button" onClick={onRetry}>
          <ArrowClockwise aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  )
}

export function PortalEmpty({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="portal-state portal-state-empty">
      <Empty aria-hidden="true" weight="duotone" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="portal-page-header">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="portal-page-action">{action}</div>}
    </header>
  )
}

export function StatusPill({ value }: { value: string | null | undefined }) {
  const normalized = value?.toLowerCase().replaceAll('_', '-') || 'unknown'
  return <span className={`portal-status portal-status-${normalized}`}>{humanize(value)}</span>
}

export function CompletionMark({ complete }: { complete: boolean }) {
  return complete
    ? <CheckCircle className="portal-complete-mark" aria-label="Complete" weight="fill" />
    : <span className="portal-incomplete-mark" aria-label="Not complete" />
}

export function humanize(value: string | null | undefined): string {
  if (!value) return 'Unknown'
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function formatPortalDate(
  value: string | null | undefined,
  includeTime = false,
): string {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}
