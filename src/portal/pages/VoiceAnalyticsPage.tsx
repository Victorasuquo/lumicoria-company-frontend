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

function pct(value: number): number {
  return value <= 1 ? value * 100 : value
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
            <strong>{pct(summary.resolution_rate).toFixed(1)}%</strong>
          </article>
          <article>
            <span>Avg Duration</span>
            <strong>{formatDuration(summary.average_duration_seconds)}</strong>
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
          {dispositions.map((d) => {
            const p = pct(d.percentage)
            return (
              <div key={d.code} className="portal-voice-disposition-row">
                <span className="portal-voice-disposition-label">{humanize(d.code)}</span>
                <div className="portal-voice-disposition-bar">
                  <div style={{ width: `${Math.max(p, 2)}%` }} />
                </div>
                <span className="portal-voice-disposition-value">{d.count} ({p.toFixed(1)}%)</span>
              </div>
            )
          })}
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
                    <span>{formatDuration(call.duration_seconds)}</span>
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function TimeseriesChart({ points }: { points: VoiceAnalyticsTimeseries['points'] }) {
  if (!points.length) return null

  const maxCalls = Math.max(...points.map((p) => p.total_calls), 1)
  const yTicks = computeYTicks(maxCalls)
  const yMax = yTicks[yTicks.length - 1] || maxCalls

  const padding = { top: 12, right: 16, bottom: 40, left: 40 }
  const barPadding = 2
  const barWidth = Math.max(8, Math.min(40, (700 - points.length * barPadding) / points.length))
  const plotWidth = points.length * (barWidth + barPadding)
  const plotHeight = 200
  const svgWidth = padding.left + plotWidth + padding.right
  const svgHeight = padding.top + plotHeight + padding.bottom

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="portal-voice-chart-svg"
      preserveAspectRatio="xMidYMid meet"
    >
      {yTicks.map((tick) => {
        const y = padding.top + plotHeight - (tick / yMax) * plotHeight
        return (
          <g key={tick}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + plotWidth}
              y2={y}
              stroke="var(--portal-border, #e2e2e2)"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--portal-muted, #888)"
            >
              {tick}
            </text>
          </g>
        )
      })}

      {points.map((point, i) => {
        const height = (point.total_calls / yMax) * plotHeight
        const x = padding.left + i * (barWidth + barPadding)
        const y = padding.top + plotHeight - height
        const resolvedHeight = (point.resolved_calls / yMax) * plotHeight
        const resolvedY = padding.top + plotHeight - resolvedHeight
        return (
          <g key={point.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(height, height > 0 ? 2 : 0)}
              rx={2}
              fill="var(--portal-accent, #6366f1)"
              opacity={0.85}
            >
              <title>{`${point.date}: ${point.total_calls} calls (${point.resolved_calls} resolved)`}</title>
            </rect>
            {point.resolved_calls > 0 && (
              <rect
                x={x}
                y={resolvedY}
                width={barWidth}
                height={Math.max(resolvedHeight, 2)}
                rx={2}
                fill="var(--portal-success, #22c55e)"
                opacity={0.9}
              >
                <title>{`${point.date}: ${point.resolved_calls} resolved`}</title>
              </rect>
            )}
            {(points.length <= 14 || i % Math.ceil(points.length / 14) === 0) && (
              <text
                x={x + barWidth / 2}
                y={svgHeight - 8}
                textAnchor="middle"
                fontSize="9"
                fill="var(--portal-muted, #888)"
                transform={points.length > 7 ? `rotate(-45, ${x + barWidth / 2}, ${svgHeight - 8})` : undefined}
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

function computeYTicks(maxValue: number): number[] {
  if (maxValue <= 5) return Array.from({ length: maxValue + 1 }, (_, i) => i)
  const step = Math.ceil(maxValue / 5)
  const ticks: number[] = []
  for (let v = 0; v <= maxValue + step - 1; v += step) {
    ticks.push(v)
    if (ticks.length >= 6) break
  }
  return ticks
}
