import { Check, Clock, FileMagnifyingGlass, X } from '@phosphor-icons/react'
import type { ApiCollection, ReviewCycle } from '../../api/types'
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

export function ReviewsPage() {
  const { engagement, engagementId } = useSelectedEngagement()
  const query = usePortalQuery<ApiCollection<ReviewCycle>>(
    ['review-cycles', engagementId],
    engagementId ? `/engagements/${engagementId}/review-cycles?page_size=100` : null,
  )

  if (!engagementId) return <PortalEmpty title="No engagement selected" description="Select an engagement to view review cycles." />
  if (query.isLoading) return <PortalLoading label="Loading review cycles" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const cycles = query.data?.items ?? []
  const openCycles = cycles.filter(({ status }) => ['open', 'in_review'].includes(status)).length

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Decision workspace"
        title="Reviews"
        description={`Formal review cycles, quorum progress, and immutable decision counts for ${engagement?.name || 'this engagement'}.`}
        action={<span className="portal-header-stat"><strong>{openCycles}</strong> open</span>}
      />
      {cycles.length ? (
        <section className="portal-review-list">
          {cycles.map((cycle) => {
            const progress = cycle.required_approvals
              ? Math.min(100, Math.round(cycle.approval_count / cycle.required_approvals * 100))
              : 0
            return (
              <article key={cycle.id}>
                <div className="portal-review-icon"><FileMagnifyingGlass aria-hidden="true" weight="duotone" /></div>
                <div className="portal-review-content">
                  <header>
                    <div>
                      <span>Review cycle {cycle.cycle_number}</span>
                      <h2>Deliverable review</h2>
                    </div>
                    <StatusPill value={cycle.status} />
                  </header>
                  <div className="portal-review-quorum">
                    <div>
                      <span>Approval quorum</span>
                      <strong>{cycle.approval_count} of {cycle.required_approvals}</strong>
                    </div>
                    <div className="portal-meter"><span style={{ width: `${progress}%` }} /></div>
                    <small>{humanize(cycle.quorum_type)} policy · Version {cycle.policy_version}</small>
                  </div>
                  <div className="portal-review-counts">
                    <span><Check aria-hidden="true" /> {cycle.approval_count} approvals</span>
                    <span><X aria-hidden="true" /> {cycle.rejection_count} rejections</span>
                    <span>{cycle.change_request_count} change requests</span>
                  </div>
                  <footer>
                    <span><Clock aria-hidden="true" /> Opened {formatPortalDate(cycle.opened_at, true)}</span>
                    <span>Due {formatPortalDate(cycle.due_at, true)}</span>
                  </footer>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <PortalEmpty title="No review cycles are visible" description="Reviews appear after a deliverable version is formally submitted." />
      )}
    </div>
  )
}
