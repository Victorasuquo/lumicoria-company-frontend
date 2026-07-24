import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Clock,
  Pulse,
  Warning,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type {
  EngagementDashboard,
  EngagementHealth,
  NextAction,
  OnboardingProgress,
  PendingApproval,
  StatusReportVersion,
  TimelineItem,
} from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery, useSelectedEngagement } from '../hooks'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

type TimelineResponse = { items: TimelineItem[] }
type NextActionsResponse = { items: NextAction[]; generated_at: string }
type PendingApprovalsResponse = { items: PendingApproval[]; generated_at: string }

function numberFromSection(
  section: EngagementDashboard['progress'] | EngagementDashboard['onboarding'],
  key: string,
) {
  const value = section.data?.[key]
  return typeof value === 'number' ? value : 0
}

export function DashboardPage() {
  const { hasScope } = usePortalAuth()
  const { engagement, engagementId, engagementsQuery } = useSelectedEngagement()
  const dashboardQuery = usePortalQuery<EngagementDashboard>(
    ['dashboard', engagementId],
    engagementId ? `/engagements/${engagementId}/dashboard` : null,
  )
  const timelineQuery = usePortalQuery<TimelineResponse>(
    ['timeline', engagementId],
    engagementId ? `/engagements/${engagementId}/timeline?page_size=8` : null,
  )
  const actionsQuery = usePortalQuery<NextActionsResponse>(
    ['next-actions', engagementId],
    engagementId ? `/engagements/${engagementId}/next-actions` : null,
  )
  const approvalsQuery = usePortalQuery<PendingApprovalsResponse>(
    ['pending-approvals', engagementId],
    engagementId ? `/engagements/${engagementId}/pending-approvals` : null,
  )
  const onboardingQuery = usePortalQuery<OnboardingProgress>(
    ['onboarding-progress', engagementId],
    engagementId ? `/engagements/${engagementId}/onboarding/progress` : null,
    { enabled: hasScope('onboarding.read') },
  )
  const healthQuery = usePortalQuery<EngagementHealth>(
    ['health', engagementId],
    engagementId ? `/engagements/${engagementId}/health` : null,
    { enabled: hasScope('engagements.health.read') },
  )
  const latestStatusQuery = usePortalQuery<StatusReportVersion>(
    ['status-report-latest', engagementId],
    engagementId ? `/engagements/${engagementId}/status-reports/latest` : null,
    { enabled: hasScope('status_reports.read'), retry: false },
  )

  if (engagementsQuery.isLoading) return <PortalLoading />
  if (engagementsQuery.error) return <PortalError error={engagementsQuery.error} />
  if (!engagementId || !engagement) {
    return (
      <PortalEmpty
        title="No engagement is assigned"
        description="Your portal account is active, but no client-visible engagement has been granted yet."
      />
    )
  }
  if (dashboardQuery.isLoading) return <PortalLoading label="Loading engagement overview" />
  if (dashboardQuery.error) {
    return <PortalError error={dashboardQuery.error} onRetry={() => void dashboardQuery.refetch()} />
  }

  const dashboard = dashboardQuery.data
  const completedMilestones = dashboard
    ? numberFromSection(dashboard.progress, 'completed')
    : 0
  const totalMilestones = dashboard
    ? numberFromSection(dashboard.progress, 'total')
    : 0
  const onboardingPercent = onboardingQuery.data?.percent
    ?? (dashboard && numberFromSection(dashboard.onboarding, 'required_total')
      ? Math.round(
        numberFromSection(dashboard.onboarding, 'completed')
        / numberFromSection(dashboard.onboarding, 'required_total')
        * 100,
      )
      : 0)

  return (
    <div className="portal-page portal-dashboard-page">
      <PortalPageHeader
        eyebrow="Engagement overview"
        title={engagement.name}
        description={dashboard?.client_safe_summary || engagement.client_safe_summary || 'Your current delivery position, decisions, and next actions.'}
        action={<StatusPill value={dashboard?.engagement_status || engagement.status} />}
      />

      <section className="portal-metric-grid" aria-label="Engagement summary">
        <article>
          <div className="portal-metric-icon"><Pulse aria-hidden="true" weight="duotone" /></div>
          <span>Delivery health</span>
          <strong>{humanize(healthQuery.data?.health || String(dashboard?.health.data?.health || engagement.health))}</strong>
          <small>{healthQuery.data?.observed_at ? `Observed ${formatPortalDate(healthQuery.data.observed_at, true)}` : 'Current client-safe status'}</small>
        </article>
        <article>
          <div className="portal-metric-icon"><CheckCircle aria-hidden="true" weight="duotone" /></div>
          <span>Milestones</span>
          <strong>{completedMilestones} <em>of {totalMilestones}</em></strong>
          <small>Completed or accepted</small>
        </article>
        <article>
          <div className="portal-metric-icon"><CalendarBlank aria-hidden="true" weight="duotone" /></div>
          <span>Onboarding</span>
          <strong>{onboardingPercent}<em>%</em></strong>
          <div className="portal-meter"><span style={{ width: `${Math.min(100, onboardingPercent)}%` }} /></div>
        </article>
        <article>
          <div className="portal-metric-icon"><Warning aria-hidden="true" weight="duotone" /></div>
          <span>Pending decisions</span>
          <strong>{approvalsQuery.data?.items.length ?? 0}</strong>
          <small>Waiting for client action</small>
        </article>
      </section>

      <div className="portal-dashboard-grid">
        <section className="portal-panel portal-next-actions">
          <header>
            <div><h2>Your next actions</h2><p>Work currently waiting on your side.</p></div>
          </header>
          {actionsQuery.error ? <PortalError error={actionsQuery.error} /> : (
            <div className="portal-action-list">
              {actionsQuery.data?.items.length ? actionsQuery.data.items.map((action) => (
                <Link to={action.kind === 'checklist_item' ? '/portal/onboarding' : '/portal/milestones'} key={action.id}>
                  <span className="portal-action-kind">{humanize(action.kind)}</span>
                  <strong>{action.title}</strong>
                  <small><Clock aria-hidden="true" /> {formatPortalDate(action.due_at)}</small>
                  <ArrowRight aria-hidden="true" />
                </Link>
              )) : (
                <PortalEmpty title="Nothing is waiting on you" description="New approvals and assigned onboarding work will appear here." />
              )}
            </div>
          )}
        </section>

        <section className="portal-panel portal-delivery-position">
          <header>
            <div><h2>Delivery position</h2><p>Dates and current operating state.</p></div>
          </header>
          <dl>
            <div><dt>Started</dt><dd>{formatPortalDate(engagement.start_date)}</dd></div>
            <div><dt>Target completion</dt><dd>{formatPortalDate(engagement.target_end_date)}</dd></div>
            <div><dt>Offer</dt><dd>{humanize(engagement.offer_type)}</dd></div>
            <div><dt>Workspace</dt><dd>{engagement.workspace_display_name || 'Managed by Lumicoria'}</dd></div>
          </dl>
        </section>

        <section className="portal-panel portal-latest-report">
          <header>
            <div><h2>Latest status</h2><p>The most recently published client update.</p></div>
            <Link to="/portal/status-reports">All reports <ArrowRight aria-hidden="true" /></Link>
          </header>
          {latestStatusQuery.data ? (
            <div className="portal-report-snapshot">
              <span>Published {formatPortalDate(latestStatusQuery.data.published_at, true)}</span>
              <h3>{String(latestStatusQuery.data.snapshot.summary || 'Status update')}</h3>
              <div className="portal-report-snapshot-meta">
                <span>Revision {latestStatusQuery.data.revision}</span>
                {Boolean(latestStatusQuery.data.snapshot.health) && <StatusPill value={String(latestStatusQuery.data.snapshot.health)} />}
              </div>
            </div>
          ) : (
            <PortalEmpty title="No published report yet" description="Your first status report will appear after the engagement team publishes it." />
          )}
        </section>

        <section className="portal-panel portal-timeline">
          <header>
            <div><h2>Recent activity</h2><p>Client-visible changes across this engagement.</p></div>
          </header>
          {timelineQuery.error ? <PortalError error={timelineQuery.error} /> : (
            <ol>
              {timelineQuery.data?.items.length ? timelineQuery.data.items.map((item) => (
                <li key={item.id}>
                  <span />
                  <div>
                    <strong>{humanize(item.action)}</strong>
                    <small>{humanize(item.resource_type)} · {formatPortalDate(item.occurred_at, true)}</small>
                  </div>
                </li>
              )) : <li className="portal-timeline-empty">No client-visible activity has been recorded yet.</li>}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
