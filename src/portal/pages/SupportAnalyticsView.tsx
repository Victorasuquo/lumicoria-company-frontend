import { ArrowClockwise } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { CRMAnalyticsReport } from '../../api/crm'
import { formatPortalDate, humanize, PortalEmpty, PortalError, PortalLoading, PortalPageHeader } from '../components/PortalState'

type Props = {
  fromDate: string
  toDate: string
  channel: string
  vertical: string
  workspaceVertical?: string | null
  channels: string[]
  report?: CRMAnalyticsReport
  loading: boolean
  refreshing: boolean
  error: Error | null
  validRange: boolean
  onFromDate: (value: string) => void
  onToDate: (value: string) => void
  onChannel: (value: string) => void
  onVertical: (value: string) => void
  onPreset: (days: number) => void
  onRefresh: () => void
  exportActions?: ReactNode
  exportStatus?: ReactNode
}

const numberFormatter = new Intl.NumberFormat()
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

function valueOf(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function dateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function SupportAnalyticsView(props: Props) {
  const { report, fromDate, toDate } = props
  const summary = report?.summary ?? {}
  const metrics = [
    { key: 'tickets_total', label: 'Tickets created', tone: 'violet' },
    { key: 'tickets_open', label: 'Open tickets', tone: 'amber' },
    { key: 'tickets_resolved', label: 'Tickets resolved', tone: 'green' },
    { key: 'calls_total', label: 'Voice calls', tone: 'blue' },
    { key: 'handoffs_total', label: 'Human handoffs', tone: 'violet' },
    { key: 'sla_breaches', label: 'SLA breaches', tone: 'red' },
  ]
  const daily = report?.daily ?? []
  const maximum = Math.max(1, ...daily.flatMap(row => [valueOf(row, 'tickets_total'), valueOf(row, 'calls_total')]))
  const hasDailyActivity = daily.some(row => valueOf(row, 'tickets_total') || valueOf(row, 'calls_total'))
  const verticals = [...new Set([
    ...(props.workspaceVertical ? [props.workspaceVertical] : []),
    ...((report?.vertical_metrics ?? []).map(row => String(row.vertical ?? '')).filter(Boolean)),
    ...(props.vertical ? [props.vertical] : []),
  ])]
  const days = Math.round((new Date(`${toDate}T12:00:00`).getTime() - new Date(`${fromDate}T12:00:00`).getTime()) / 86400000) + 1

  return (
    <div className="portal-page support-page support-analytics-page">
      <PortalPageHeader eyebrow="Support operations" title="Analytics" description="Track customer requests, voice calls, and the work that needs your team." action={props.exportActions} />

      <section className="support-analytics-filter-panel" aria-label="Reporting filters">
        <div className="support-analytics-filter-heading">
          <h2>Reporting period</h2>
          <div className="support-analytics-presets" role="group" aria-label="Quick date ranges">
            {[7, 30, 90].map(period => (
              <button key={period} type="button" aria-pressed={days === period} onClick={() => props.onPreset(period)}>
                {period} days
              </button>
            ))}
          </div>
        </div>
        <div className="support-analytics-filters">
          <label htmlFor="support-analytics-from">From
            <input id="support-analytics-from" type="date" value={fromDate} max={toDate || undefined} onChange={event => props.onFromDate(event.target.value)} />
          </label>
          <label htmlFor="support-analytics-to">To
            <input id="support-analytics-to" type="date" value={toDate} min={fromDate || undefined} onChange={event => props.onToDate(event.target.value)} />
          </label>
          <label htmlFor="support-analytics-channel">Channel
            <select id="support-analytics-channel" value={props.channel} onChange={event => props.onChannel(event.target.value)}>
              <option value="">All channels</option>
              {props.channels.map(channel => <option key={channel} value={channel}>{humanize(channel)}</option>)}
            </select>
          </label>
          <label htmlFor="support-analytics-vertical">{props.workspaceVertical ? 'Workspace vertical' : 'Vertical'}
            <select id="support-analytics-vertical" value={props.workspaceVertical || props.vertical} disabled={Boolean(props.workspaceVertical)} onChange={event => props.onVertical(event.target.value)}>
              {!props.workspaceVertical && <option value="">All verticals</option>}
              {verticals.map(vertical => <option key={vertical} value={vertical}>{humanize(vertical)}</option>)}
            </select>
          </label>
        </div>
        {!props.validRange && <p className="support-analytics-range-error" role="alert">Choose both dates, with the end date on or after the start date.</p>}
      </section>

      <div className="support-analytics-report-heading">
        <div>
          <h2>Support performance</h2>
          <p>{dateLabel(fromDate)} – {dateLabel(toDate)} · {props.channel ? humanize(props.channel) : 'All channels'}</p>
        </div>
        <button type="button" className="portal-secondary-button" onClick={props.onRefresh} disabled={props.refreshing || !props.validRange}>
          <ArrowClockwise size={16} aria-hidden="true" /> {props.refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {props.loading ? <PortalLoading label="Loading support analytics" /> : props.error ? <PortalError error={props.error} onRetry={props.onRefresh} /> : report && props.validRange ? (
        <>
          <dl className="support-analytics-summary">
            {metrics.map(metric => (
              <div key={metric.key} className={`support-analytics-stat is-${metric.tone}`}>
                <dt>{metric.label}</dt>
                <dd>{numberFormatter.format(summary[metric.key] ?? 0)}</dd>
              </div>
            ))}
          </dl>
          <div className="support-analytics-results">
            <section className="support-analytics-card">
              <header><h3>Daily activity</h3><p>Tickets created and voice calls during this period.</p></header>
              {hasDailyActivity ? (
                <figure className="support-analytics-chart">
                  <figcaption className="support-analytics-legend"><span><i className="is-tickets" /> Tickets</span><span><i className="is-calls" /> Voice calls</span><small>Peak: {numberFormatter.format(maximum)}</small></figcaption>
                  <div className="support-analytics-bars" aria-hidden="true">
                    {daily.map(row => (
                      <div key={String(row.date)} className="support-analytics-day" title={`${dateLabel(String(row.date))}: ${valueOf(row, 'tickets_total')} tickets, ${valueOf(row, 'calls_total')} voice calls`}>
                        <span className="is-tickets" style={{ height: `${valueOf(row, 'tickets_total') / maximum * 100}%` }} />
                        <span className="is-calls" style={{ height: `${valueOf(row, 'calls_total') / maximum * 100}%` }} />
                      </div>
                    ))}
                  </div>
                  <div className="support-analytics-chart-dates"><span>{dateLabel(fromDate)}</span><span>{dateLabel(toDate)}</span></div>
                  <details className="support-analytics-daily-data"><summary>View daily figures</summary><div className="support-analytics-table-scroll"><table><caption>Daily tickets and voice calls</caption><thead><tr><th scope="col">Date</th><th scope="col">Tickets</th><th scope="col">Voice calls</th></tr></thead><tbody>{daily.map(row => <tr key={String(row.date)}><th scope="row">{dateLabel(String(row.date))}</th><td>{numberFormatter.format(valueOf(row, 'tickets_total'))}</td><td>{numberFormatter.format(valueOf(row, 'calls_total'))}</td></tr>)}</tbody></table></div></details>
                </figure>
              ) : <PortalEmpty title="No activity in this period" description="Recorded tickets and voice calls will appear here. Try a longer reporting period." />}
            </section>

            <section className="support-analytics-card">
              <header><h3>Channel breakdown</h3><p>Where customer work enters your workspace.</p></header>
              {report.by_channel.length ? (
                <div className="support-analytics-table-scroll">
                  <table>
                    <caption>Support activity by channel</caption>
                    <thead><tr><th scope="col">Channel</th><th scope="col">Tickets</th><th scope="col">Conversations</th><th scope="col">Calls</th></tr></thead>
                    <tbody>{report.by_channel.map((row, index) => (
                      <tr key={String(row.channel ?? index)}>
                        <th scope="row"><span className="support-analytics-channel-name"><i className={`support-analytics-channel-dot channel-${String(row.channel)}`} />{humanize(String(row.channel ?? 'Unknown'))}</span></th>
                        <td>{numberFormatter.format(valueOf(row, 'tickets_total'))}</td>
                        <td>{numberFormatter.format(valueOf(row, 'conversations_total'))}</td>
                        <td>{numberFormatter.format(valueOf(row, 'calls_total'))}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <PortalEmpty title="No channel activity yet" description="Channels appear when customer activity is recorded in this period." />}
            </section>
          </div>
          <p className="support-analytics-source-note">Recorded CRM activity · Updated {formatPortalDate(report.generated_at, true)}</p>
        </>
      ) : null}
      {props.exportStatus}
    </div>
  )
}
