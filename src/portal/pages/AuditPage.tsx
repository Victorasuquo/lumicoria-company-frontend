import { ClockCounterClockwise, Fingerprint } from '@phosphor-icons/react'
import type { ApiCollection, AuditEvent } from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function AuditPage() {
  const { context } = usePortalAuth()
  const organizationId = context?.organization_id
  const query = usePortalQuery<ApiCollection<AuditEvent>>(
    ['audit-events'],
    organizationId ? `/organizations/${organizationId}/audit-events?page_size=100` : null,
  )

  if (query.isLoading) return <PortalLoading label="Loading audit history" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const events = query.data?.items ?? []
  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Security evidence"
        title="Audit history"
        description="Client-visible evidence of actions, actors, resources, and outcomes inside this organization."
      />
      {events.length ? (
        <section className="portal-audit-list">
          {events.map((event) => (
            <article key={event.id}>
              <div className="portal-audit-icon"><ClockCounterClockwise aria-hidden="true" weight="duotone" /></div>
              <div>
                <header><h2>{humanize(event.action)}</h2><StatusPill value={event.result} /></header>
                <p>{humanize(event.resource_type)} <code>{event.resource_id}</code></p>
                <small><Fingerprint aria-hidden="true" /> {event.actor_id} · {formatPortalDate(event.occurred_at, true)}</small>
              </div>
              <span>{event.request_id}</span>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty title="No audit events are visible" description="Client-visible security and decision evidence will appear here." />
      )}
    </div>
  )
}
