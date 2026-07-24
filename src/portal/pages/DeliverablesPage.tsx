import { DownloadSimple, File, FileArrowUp } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { portalFetch } from '../../api/client'
import type { ApiCollection, Deliverable, DownloadAuthorization } from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery, useSelectedEngagement } from '../hooks'
import {
  formatPortalDate,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function DeliverablesPage() {
  const { context } = usePortalAuth()
  const { engagement, engagementId } = useSelectedEngagement()
  const query = usePortalQuery<ApiCollection<Deliverable>>(
    ['deliverables', engagementId],
    engagementId ? `/engagements/${engagementId}/deliverables?page_size=100` : null,
  )
  const downloadMutation = useMutation({
    mutationFn: async (deliverable: Deliverable) => {
      if (!context || !engagementId || !deliverable.latest_version_id) {
        throw new Error('A downloadable version is not available.')
      }
      const { data } = await portalFetch<DownloadAuthorization>(
        `/engagements/${engagementId}/deliverables/${deliverable.id}/download?deliverable_version_id=${encodeURIComponent(deliverable.latest_version_id)}`,
        { organizationId: context.organization_id },
      )
      return data
    },
    onSuccess: (authorization) => {
      window.open(authorization.download_url, '_blank', 'noopener,noreferrer')
    },
  })

  if (!engagementId) return <PortalEmpty title="No engagement selected" description="Select an engagement to view deliverables." />
  if (query.isLoading) return <PortalLoading label="Loading deliverables" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const deliverables = query.data?.items ?? []
  const accepted = deliverables.filter(({ status }) => status === 'accepted').length

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Delivery library"
        title="Deliverables"
        description={`Client-visible artifacts, review state, acceptance criteria, and secure downloads for ${engagement?.name || 'this engagement'}.`}
        action={<span className="portal-header-stat"><strong>{accepted}</strong> accepted</span>}
      />
      {downloadMutation.error && <PortalError error={downloadMutation.error} title="Download is unavailable" />}
      {deliverables.length ? (
        <section className="portal-deliverable-grid">
          {deliverables.map((deliverable) => (
            <article key={deliverable.id}>
              <div className="portal-file-icon"><File aria-hidden="true" weight="duotone" /></div>
              <header>
                <StatusPill value={deliverable.status} />
                <span>Version {deliverable.latest_version_number || '—'}</span>
              </header>
              <h2>{deliverable.title}</h2>
              <p>{deliverable.client_safe_summary || 'No client-facing summary has been added.'}</p>
              <dl>
                <div><dt>Due</dt><dd>{formatPortalDate(deliverable.due_at)}</dd></div>
                <div><dt>Criteria</dt><dd>{deliverable.acceptance_criteria.length}</dd></div>
                <div><dt>Submitted</dt><dd>{formatPortalDate(deliverable.submitted_at)}</dd></div>
              </dl>
              <footer>
                {deliverable.latest_version_id ? (
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => downloadMutation.mutate(deliverable)}
                    disabled={downloadMutation.isPending}
                  >
                    <DownloadSimple aria-hidden="true" /> Download latest
                  </button>
                ) : (
                  <span><FileArrowUp aria-hidden="true" /> Awaiting first version</span>
                )}
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty title="No deliverables are visible" description="Approved client-facing deliverables will appear here as the engagement progresses." />
      )}
    </div>
  )
}
