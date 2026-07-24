import { CalendarBlank, CheckCircle, Flag, Warning } from '@phosphor-icons/react'
import type { ApiCollection, Milestone } from '../../api/types'
import { useSelectedEngagement, usePortalQuery } from '../hooks'
import {
  formatPortalDate,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function MilestonesPage() {
  const { engagement, engagementId } = useSelectedEngagement()
  const query = usePortalQuery<ApiCollection<Milestone>>(
    ['milestones', engagementId],
    engagementId ? `/engagements/${engagementId}/milestones?page_size=100` : null,
  )

  if (!engagementId) return <PortalEmpty title="No engagement selected" description="Select an engagement to view its milestones." />
  if (query.isLoading) return <PortalLoading label="Loading milestones" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const milestones = query.data?.items ?? []
  const completed = milestones.filter(({ status }) => ['accepted', 'completed'].includes(status)).length

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Delivery path"
        title="Milestones"
        description={`The agreed delivery stages for ${engagement?.name || 'this engagement'}, including forecast dates, blockers, and acceptance state.`}
        action={<span className="portal-header-stat"><strong>{completed}/{milestones.length}</strong> complete</span>}
      />
      {milestones.length ? (
        <section className="portal-milestone-list">
          {milestones.map((milestone, index) => {
            const isComplete = ['accepted', 'completed'].includes(milestone.status)
            const isBlocked = milestone.status === 'blocked'
            return (
              <article className={isComplete ? 'is-complete' : isBlocked ? 'is-blocked' : ''} key={milestone.id}>
                <div className="portal-milestone-rail">
                  <span>{isComplete ? <CheckCircle weight="fill" /> : isBlocked ? <Warning weight="fill" /> : index + 1}</span>
                </div>
                <div className="portal-milestone-content">
                  <header>
                    <div>
                      <span className="portal-mono-label"><Flag aria-hidden="true" /> Milestone {index + 1}</span>
                      <h2>{milestone.title}</h2>
                    </div>
                    <StatusPill value={milestone.status} />
                  </header>
                  <p>{milestone.client_safe_summary || 'The engagement team has not added a client-facing summary yet.'}</p>
                  <dl>
                    <div><dt><CalendarBlank aria-hidden="true" /> Baseline</dt><dd>{formatPortalDate(milestone.baseline_start)} – {formatPortalDate(milestone.baseline_end)}</dd></div>
                    <div><dt><CalendarBlank aria-hidden="true" /> Forecast</dt><dd>{formatPortalDate(milestone.forecast_start)} – {formatPortalDate(milestone.forecast_end)}</dd></div>
                    <div><dt>Confidence</dt><dd>{milestone.forecast_confidence == null ? 'Not assessed' : `${milestone.forecast_confidence}%`}</dd></div>
                  </dl>
                  {milestone.blocker_reason && (
                    <div className="portal-blocker">
                      <Warning aria-hidden="true" weight="duotone" />
                      <div><strong>Current blocker</strong><span>{milestone.blocker_reason}</span></div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <PortalEmpty title="No milestones are visible yet" description="Client-visible milestones will appear once the engagement structure is published." />
      )}
    </div>
  )
}
