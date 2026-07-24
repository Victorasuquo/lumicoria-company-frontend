import { Check, CheckCircle, ListChecks, WarningCircle } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { jsonBody, portalFetch } from '../../api/client'
import type { ApiCollection, StatusReport } from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery, useSelectedEngagement } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function StatusReportsPage() {
  const { context, hasScope } = usePortalAuth()
  const { engagement, engagementId } = useSelectedEngagement()
  const query = usePortalQuery<ApiCollection<StatusReport>>(
    ['status-reports', engagementId],
    engagementId ? `/engagements/${engagementId}/status-reports?page_size=100` : null,
  )
  const acknowledgeMutation = useMutation({
    mutationFn: async (statusReportId: string) => {
      if (!context || !engagementId) throw new Error('Engagement context is unavailable.')
      return portalFetch(
        `/engagements/${engagementId}/status-reports/${statusReportId}/acknowledge`,
        {
          method: 'POST',
          organizationId: context.organization_id,
          ...jsonBody({ note: null }),
        },
      )
    },
    onSuccess: () => portalQueryClient.invalidateQueries({
      queryKey: ['portal', context?.organization_id, 'status-reports'],
    }),
  })

  if (!engagementId) return <PortalEmpty title="No engagement selected" description="Select an engagement to view status reports." />
  if (query.isLoading) return <PortalLoading label="Loading status reports" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const reports = [...(query.data?.items ?? [])].sort(
    (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime(),
  )

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Published updates"
        title="Status reports"
        description={`A durable record of delivery progress, completed work, blockers, and what comes next for ${engagement?.name || 'this engagement'}.`}
      />
      {acknowledgeMutation.error && <PortalError error={acknowledgeMutation.error} title="The report was not acknowledged" />}
      {reports.length ? (
        <section className="portal-report-list">
          {reports.map((report, index) => (
            <article className={index === 0 ? 'is-latest' : ''} key={report.id}>
              <header>
                <div>
                  <span>{index === 0 ? 'Latest report' : 'Status report'}</span>
                  <h2>{formatPortalDate(report.period_start)} – {formatPortalDate(report.period_end)}</h2>
                </div>
                <div><StatusPill value={report.health} /><StatusPill value={report.status} /></div>
              </header>
              <p className="portal-report-summary">{report.summary}</p>
              <div className="portal-report-columns">
                <div>
                  <h3><CheckCircle aria-hidden="true" weight="duotone" /> Accomplishments</h3>
                  {report.accomplishments.length ? <ul>{report.accomplishments.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No accomplishments were listed.</p>}
                </div>
                <div>
                  <h3><WarningCircle aria-hidden="true" weight="duotone" /> Blockers</h3>
                  {report.blockers.length ? <ul>{report.blockers.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No client-visible blockers.</p>}
                </div>
                <div>
                  <h3><ListChecks aria-hidden="true" weight="duotone" /> Next actions</h3>
                  {report.next_actions.length ? <ul>{report.next_actions.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No next actions were listed.</p>}
                </div>
              </div>
              <footer>
                <span>{report.published_at ? `Published ${formatPortalDate(report.published_at, true)}` : 'Draft report'}</span>
                {report.published_at && hasScope('status_reports.acknowledge') && (
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => acknowledgeMutation.mutate(report.id)}
                    disabled={acknowledgeMutation.isPending}
                  >
                    <Check aria-hidden="true" /> Acknowledge
                  </button>
                )}
              </footer>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty title="No status reports are visible" description="Published client updates will appear here." />
      )}
    </div>
  )
}
