import { Bell, Check, CheckCircle } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { createIdempotencyKey, portalFetch } from '../../api/client'
import type { ApiCollection, PortalNotification } from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function NotificationsPage() {
  const { context } = usePortalAuth()
  const organizationId = context?.organization_id
  const query = usePortalQuery<ApiCollection<PortalNotification>>(
    ['notifications'],
    organizationId ? `/organizations/${organizationId}/notifications?page_size=100` : null,
  )
  const readMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!organizationId) throw new Error('Organization context is unavailable.')
      return portalFetch(
        `/organizations/${organizationId}/notifications/${notificationId}/read`,
        {
          method: 'POST',
          organizationId,
          idempotencyKey: createIdempotencyKey(),
        },
      )
    },
    onSuccess: () => invalidateNotifications(organizationId),
  })
  const readAllMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('Organization context is unavailable.')
      return portalFetch(
        `/organizations/${organizationId}/notifications/read-all`,
        {
          method: 'POST',
          organizationId,
          idempotencyKey: createIdempotencyKey(),
        },
      )
    },
    onSuccess: () => invalidateNotifications(organizationId),
  })

  if (query.isLoading) return <PortalLoading label="Loading notifications" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const notifications = query.data?.items ?? []
  const unread = notifications.filter(({ read_at }) => !read_at)

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Client-visible changes, decisions, and work that may need your attention."
        action={unread.length ? (
          <button className="portal-secondary-button" type="button" onClick={() => readAllMutation.mutate()} disabled={readAllMutation.isPending}>
            <CheckCircle aria-hidden="true" /> Mark all read
          </button>
        ) : undefined}
      />
      {(readMutation.error || readAllMutation.error) && <PortalError error={readMutation.error || readAllMutation.error} title="Notification state was not updated" />}
      {notifications.length ? (
        <section className="portal-notification-list">
          {notifications.map((notification) => (
            <article className={notification.read_at ? 'is-read' : ''} key={notification.id}>
              <div className="portal-notification-icon"><Bell aria-hidden="true" weight={notification.read_at ? 'regular' : 'duotone'} /></div>
              <div>
                <header>
                  <h2>{notification.title}</h2>
                  <StatusPill value={notification.severity} />
                </header>
                <p>{notification.client_safe_body}</p>
                <small>{formatPortalDate(notification.created_at, true)}</small>
              </div>
              {!notification.read_at && (
                <button type="button" onClick={() => readMutation.mutate(notification.id)} disabled={readMutation.isPending}>
                  <Check aria-hidden="true" /> Mark read
                </button>
              )}
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty title="Your inbox is clear" description="New engagement notifications will appear here." />
      )}
    </div>
  )
}

function invalidateNotifications(organizationId: string | undefined) {
  return portalQueryClient.invalidateQueries({
    queryKey: ['portal', organizationId, 'notifications'],
  })
}
