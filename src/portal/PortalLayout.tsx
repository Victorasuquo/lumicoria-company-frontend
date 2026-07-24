import {
  Bell,
  CaretDown,
  ChartDonut,
  CheckSquare,
  ClockCounterClockwise,
  FileText,
  FolderOpen,
  GearSix,
  ListChecks,
  SignOut,
  SquaresFour,
  UsersThree,
  X,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import type { ApiCollection, Engagement } from '../api/types'
import { usePortalAuth } from '../auth/AuthProvider'
import { usePortalQuery, useEngagements } from './hooks'
import { PortalError, PortalLoading, humanize } from './components/PortalState'

const navigation = [
  { label: 'Overview', to: '/portal', icon: SquaresFour, scope: 'engagements.read', end: true },
  { label: 'Milestones', to: '/portal/milestones', icon: ChartDonut, scope: 'milestones.read' },
  { label: 'Onboarding', to: '/portal/onboarding', icon: ListChecks, scope: 'onboarding.read' },
  { label: 'Status reports', to: '/portal/status-reports', icon: FileText, scope: 'status_reports.read' },
  { label: 'Deliverables', to: '/portal/deliverables', icon: FolderOpen, scope: 'deliverables.read' },
  { label: 'Reviews', to: '/portal/reviews', icon: CheckSquare, scope: 'deliverables.review' },
  { label: 'Notifications', to: '/portal/notifications', icon: Bell, scope: 'notifications.read' },
  { label: 'Team', to: '/portal/team', icon: UsersThree, scope: 'engagements.read' },
  { label: 'Settings', to: '/portal/settings', icon: GearSix, scope: 'portal.read' },
  { label: 'Audit', to: '/portal/audit', icon: ClockCounterClockwise, scope: 'security.audit.read' },
]

type UnreadCount = { unread_count: number }

export function PortalLayout() {
  const {
    context,
    destinations,
    firebaseUser,
    hasScope,
    logout,
    selectedEngagementId,
    selectEngagement,
    switchOrganization,
  } = usePortalAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const engagementsQuery = useEngagements()
  const unreadQuery = usePortalQuery<UnreadCount>(
    ['notifications', 'unread-count'],
    context?.organization_id
      ? `/organizations/${context.organization_id}/notifications/unread-count`
      : null,
    {
      enabled: hasScope('notifications.read'),
      refetchInterval: 45_000,
    },
  )

  const engagements = engagementsQuery.data?.items ?? []
  const selectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === selectedEngagementId) ?? null,
    [engagements, selectedEngagementId],
  )

  useEffect(() => {
    if (!engagements.length) return
    if (!selectedEngagementId || !engagements.some(({ id }) => id === selectedEngagementId)) {
      selectEngagement(engagements[0].id)
    }
  }, [engagements, selectEngagement, selectedEngagementId])

  if (engagementsQuery.isLoading) return <PortalLoading />
  if (engagementsQuery.error) {
    return <PortalError error={engagementsQuery.error} onRetry={() => void engagementsQuery.refetch()} />
  }

  const organizationName = destinations.find(
    ({ organization_id }) => organization_id === context?.organization_id,
  )?.display_name || 'Client workspace'

  return (
    <div className="portal-app-shell">
      <button
        className="portal-mobile-trigger"
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open portal navigation"
      >
        <SquaresFour aria-hidden="true" />
      </button>
      <aside className={`portal-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="portal-sidebar-head">
          <a className="portal-brand" href="/" aria-label="Return to Lumicoria.com">
            <img src="/brand-mark.png" alt="" />
            <span>Lumicoria</span>
          </a>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="portal-organization">
          <small>Workspace</small>
          {destinations.length > 1 ? (
            <label>
              <span className="sr-only">Organization</span>
              <select
                value={context?.organization_id}
                onChange={(event) => void switchOrganization(event.target.value)}
              >
                {destinations.map((destination) => (
                  <option value={destination.organization_id} key={destination.organization_id}>
                    {destination.display_name}
                  </option>
                ))}
              </select>
              <CaretDown aria-hidden="true" />
            </label>
          ) : (
            <strong>{organizationName}</strong>
          )}
        </div>

        <nav className="portal-navigation" aria-label="Client portal">
          {navigation.filter(({ scope }) => hasScope(scope)).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                className={({ isActive }) => isActive ? 'active' : undefined}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                key={item.to}
              >
                <Icon aria-hidden="true" weight="duotone" />
                <span>{item.label}</span>
                {item.label === 'Notifications' && Boolean(unreadQuery.data?.unread_count) && (
                  <b>{unreadQuery.data?.unread_count}</b>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="portal-sidebar-user">
          <div>
            <span>{(firebaseUser?.email || context?.principal_id || 'Client').slice(0, 1).toUpperCase()}</span>
            <p>
              <strong>{firebaseUser?.email || 'Client member'}</strong>
              <small>{humanize(context?.principal_type)}</small>
            </p>
          </div>
          <button type="button" onClick={() => void logout()} aria-label="Sign out">
            <SignOut aria-hidden="true" />
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="portal-sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <div className="portal-workspace">
        <header className="portal-topbar">
          <div>
            <small>Active engagement</small>
            <strong>{selectedEngagement?.name || 'No engagement assigned'}</strong>
          </div>
          {engagements.length > 1 && (
            <label className="portal-engagement-picker">
              <span className="sr-only">Select engagement</span>
              <select
                value={selectedEngagementId ?? ''}
                onChange={(event) => selectEngagement(event.target.value)}
              >
                {engagements.map((engagement: Engagement) => (
                  <option value={engagement.id} key={engagement.id}>
                    {engagement.name}
                  </option>
                ))}
              </select>
              <CaretDown aria-hidden="true" />
            </label>
          )}
          <NavLink className="portal-notification-button" to="/portal/notifications" aria-label="Notifications">
            <Bell aria-hidden="true" />
            {Boolean(unreadQuery.data?.unread_count) && <span>{unreadQuery.data?.unread_count}</span>}
          </NavLink>
        </header>
        <main className="portal-main">
          <Outlet context={{ engagements } satisfies { engagements: ApiCollection<Engagement>['items'] }} />
        </main>
      </div>
    </div>
  )
}
