import { ChartLine, Export } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, portalFetch, jsonBody } from '../../api/client'
import type {
  VoiceAnalyticsSummary,
  VoiceAnalyticsTimeseries,
  VoiceAnalyticsDispositions,
  VoiceCallRecord,
  VoiceCollection,
} from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { useVoiceQuery } from '../hooks'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

function defaultFromDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function VoiceAnalyticsPage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(defaultToDate)

  const dateParams = `from_date=${fromDate}&to_date=${toDate}`

  const summaryQuery = useVoiceQuery<VoiceAnalyticsSummary>(
    ['voice-analytics-summary', fromDate, toDate],
    `/voice/analytics/summary?${dateParams}`,
  )

  const timeseriesQuery = useVoiceQuery<VoiceAnalyticsTimeseries>(
    ['voice-analytics-timeseries', fromDate, toDate],
    `/voice/analytics/timeseries?${dateParams}`,
  )

  const dispositionsQuery = useVoiceQuery<VoiceAnalyticsDispositions>(
    ['voice-analytics-dispositions', fromDate, toDate],
    `/voice/analytics/dispositions?${dateParams}`,
  )

  const callsQuery = useVoiceQuery<VoiceCollection<VoiceCallRecord>>(
    ['voice-calls', fromDate, toDate],
    hasScope('voice.call.read')
      ? `/voice/calls?page_size=50&${dateParams}`
      : null,
    { enabled: hasScope('voice.call.read') },
  )

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<{ operation_id: string }>(
        '/voice/calls/exports',
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ from_date: fromDate, to_date: toDate }),
        },
      )
      return data
    },
  })

  if (summaryQuery.isLoading) return <PortalLoading label="Loading analytics" />
  if (summaryQuery.error) return <PortalError error={summaryQuery.error} onRetry={() => void summaryQuery.refetch()} />

  const summary = summaryQuery.data
  const points = timeseriesQuery.data?.points ?? []
  const dispositions = dispositionsQuery.data?.items ?? []
  const calls = callsQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice intelligence"
        title="Analytics"
        description="Call metrics, trends, and operational insights."
        action={
          hasScope('voice.call.export') ? (
            <button
              className="portal-secondary-button"
              type="button"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              <Export aria-hidden="true" /> {exportMutation.isPending ? 'Exporting…' : 'Export'}
            </button>
          ) : undefined
        }
      />

      <section className="portal-voice-date-range">
        <label>
          <span>From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
      </section>

      {exportMutation.error && <PortalError error={exportMutation.error} title="Export failed" />}
      {exportMutation.isSuccess && (
        <section className="portal-panel portal-voice-export-notice">
          <p>Export started. You will receive a notification when the file is ready for download.</p>
        </section>
      )}

      {summary && (
        <section className="portal-voice-metric-grid">
          <article>
            <span>Total Calls</span>
            <strong>{summary.total_calls.toLocaleString()}</strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{summary.completed_calls.toLocaleString()}</strong>
          </article>
          <article>
            <span>Resolved</span>
            <strong>{summary.resolved_calls.toLocaleString()}</strong>
          </article>
          <article>
            <span>Resolution Rate</span>
            <strong>{(summary.resolution_rate * 100).toFixed(1)}%</strong>
          </article>
          <article>
            <span>Avg Duration</span>
            <strong>{Math.round(summary.average_duration_seconds)}s</strong>
          </article>
          <article>
            <span>Cost</span>
            <strong>${(summary.total_cost_micros / 1_000_000).toFixed(2)}</strong>
          </article>
        </section>
      )}

      {points.length > 0 && (
        <section className="portal-panel portal-voice-chart">
          <header>
            <ChartLine aria-hidden="true" weight="duotone" />
            <h2>Call Volume</h2>
          </header>
          <TimeseriesChart points={points} />
        </section>
      )}

      {dispositions.length > 0 && (
        <section className="portal-panel portal-voice-dispositions">
          <header><h2>Dispositions</h2></header>
          {dispositions.map((d) => (
            <div key={d.code} className="portal-voice-disposition-row">
              <span className="portal-voice-disposition-label">{humanize(d.code)}</span>
              <div className="portal-voice-disposition-bar">
                <div style={{ width: `${d.percentage}%` }} />
              </div>
              <span className="portal-voice-disposition-value">{d.count} ({d.percentage.toFixed(1)}%)</span>
            </div>
          ))}
        </section>
      )}

      {hasScope('voice.call.read') && (
        <>
          <h2 className="portal-voice-section-title">Recent Calls</h2>
          {calls.length ? (
            <section className="portal-panel">
              <div className="portal-voice-call-table">
                <div className="portal-voice-call-table-header">
                  <span>Started</span>
                  <span>Agent</span>
                  <span>Direction</span>
                  <span>Status</span>
                  <span>Duration</span>
                  <span>Disposition</span>
                </div>
                {calls.map((call) => (
                  <Link key={call.id} to={`/portal/voice/calls/${call.id}`} className="portal-voice-call-table-row">
                    <span>{formatPortalDate(call.started_at, true)}</span>
                    <span className="portal-voice-truncated">{call.agent_id.slice(0, 12)}</span>
                    <span><StatusPill value={call.direction} /></span>
                    <span><StatusPill value={call.status} /></span>
                    <span>{call.duration_seconds}s</span>
                    <span>{call.disposition ? humanize(call.disposition) : '—'}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <PortalEmpty title="No calls in this period" description="Adjust the date range or wait for incoming call activity." />
          )}
        </>
      )}
    </div>
  )
}

function TimeseriesChart({ points }: { points: VoiceAnalyticsTimeseries['points'] }) {
  if (!points.length) return null

  const maxCalls = Math.max(...points.map((p) => p.total_calls), 1)
  const chartHeight = 200
  const barPadding = 2
  const barWidth = Math.max(4, Math.min(40, (800 - points.length * barPadding) / points.length))
  const chartWidth = points.length * (barWidth + barPadding)

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight + 24}`}
      className="portal-voice-chart-svg"
      preserveAspectRatio="xMidYEnd meet"
    >
      {points.map((point, i) => {
        const height = (point.total_calls / maxCalls) * chartHeight
        const x = i * (barWidth + barPadding)
        const y = chartHeight - height
        return (
          <g key={point.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={height}
              rx={2}
              fill="var(--portal-accent)"
              opacity={0.85}
            >
              <title>{`${point.date}: ${point.total_calls} calls`}</title>
            </rect>
            {points.length <= 14 && (
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                fontSize="8"
                fill="var(--portal-muted)"
              >
                {point.date.slice(5)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
