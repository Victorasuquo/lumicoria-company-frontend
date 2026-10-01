import {
  ArrowRight,
  CalendarBlank,
  Phone,
  Plus,
  TrendUp,
  UsersThree,
  Warning,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import {
  analyticsQueryString,
  crmScopes,
  type CRMAnalyticsReport,
  type CRMCollection,
  type CRMTicket,
  type CRMQueue,
} from '../../api/crm'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import {
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
  formatPortalDate,
  humanize,
} from '../components/PortalState'

type HospitalityWorkflow = {
  key: string
  name: string
  vertical: string
  definition: {
    fields?: Array<{ key: string; label: string; required?: boolean }>
    steps?: Array<{ key: string; label: string; required_fields?: string[]; actions?: string[] }>
  }
  escalation_rules: Array<{ condition?: string; reason: string }>
}

const hospitalityTerms = [
  'booking',
  'reservation',
  'guest',
  'room',
  'check-in',
  'check in',
  'check-out',
  'check out',
  'housekeeping',
  'maintenance',
  'airport transfer',
  'special request',
  'availability',
]

function defaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

function isHospitalityTicket(ticket: CRMTicket) {
  const text = `${ticket.category ?? ''} ${ticket.subject} ${ticket.description}`.toLowerCase()
  return ticket.category?.includes('hospitality') || hospitalityTerms.some((term) => text.includes(term))
}

function HospitalityMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric hospitality-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

export function HospitalityWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [stayDates, setStayDates] = useState('')
  const [roomOrService, setRoomOrService] = useState('')
  const [specialRequest, setSpecialRequest] = useState('')

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'hospitality', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'hospitality' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = usePortalQuery<CRMCollection<CRMTicket>>(
    ['crm', 'hospitality', 'tickets'],
    hasScope(crmScopes.ticketsRead) ? '/crm/tickets?page_size=100' : null,
    { enabled: hasScope(crmScopes.ticketsRead) },
  )
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(
    ['crm', 'hospitality', 'queues'],
    hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null,
    { enabled: hasScope(crmScopes.queuesRead) },
  )
  const workflows = usePortalQuery<{ items: HospitalityWorkflow[] }>(
    ['crm', 'hospitality', 'workflow'],
    hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )

  const hospitalityTickets = useMemo(
    () => (tickets.data?.items ?? []).filter(isHospitalityTicket),
    [tickets.data?.items],
  )
  const openTickets = hospitalityTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const waitingForStaff = hospitalityTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const urgentTickets = hospitalityTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const hospitalityWorkflow = workflows.data?.items.find((workflow) => workflow.key === 'hospitality_booking_enquiry')
  const hospitalityQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('hospitality') || queue.name.toLowerCase().includes('reservation'))

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!guestName.trim() || !stayDates.trim()) throw new Error('Guest name and stay dates are required.')
      const description = [
        `Guest: ${guestName.trim()}`,
        `Stay dates: ${stayDates.trim()}`,
        roomOrService.trim() ? `Room or service: ${roomOrService.trim()}` : '',
        specialRequest.trim() ? `Special request: ${specialRequest.trim()}` : '',
      ].filter(Boolean).join('\n')
      return portalFetch<CRMTicket>('/crm/tickets', {
        method: 'POST',
        organizationId: context.organization_id,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({
          subject: `Hospitality booking enquiry for ${guestName.trim()}`,
          description,
          source_channel: 'manual',
          queue_id: hospitalityQueue?.id ?? null,
          priority: specialRequest.trim() ? 'high' : 'normal',
          category: 'hospitality_booking_enquiry',
        }),
      })
    },
    onSuccess: () => {
      setGuestName('')
      setStayDates('')
      setRoomOrService('')
      setSpecialRequest('')
      setShowCreate(false)
      void tickets.refetch()
    },
  })

  if (report.isLoading || tickets.isLoading || workflows.isLoading) return <PortalLoading label="Loading hospitality workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page hospitality-page">
    <PortalPageHeader
      eyebrow="Hospitality operations"
      title="Keep every guest request moving"
      description="Handle booking enquiries, guest requests, and follow-up in one working view while availability, pricing, and sensitive decisions stay with your team."
      action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New hospitality request</button> : undefined}
    />

    <section className="hospitality-context-bar">
      <div><CalendarBlank aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div>
      <span>Showing requests tagged for hospitality or matched to the booking workflow. Other support work remains in the main Inbox.</span>
    </section>

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form hospitality-request-form" onSubmit={(event) => { event.preventDefault(); createRequest.mutate() }}>
      <div><span className="support-panel-kicker">Booking enquiry</span><h2>Capture a guest request</h2><p>Record the request first, then let the reservations team confirm current availability and pricing.</p></div>
      <div className="support-control-grid"><label>Guest name<input value={guestName} onChange={(event) => setGuestName(event.target.value)} required maxLength={160} /></label><label>Stay dates<input value={stayDates} onChange={(event) => setStayDates(event.target.value)} placeholder="For example, 12 to 15 October" required maxLength={120} /></label><label>Room or service<input value={roomOrService} onChange={(event) => setRoomOrService(event.target.value)} placeholder="Room, conference, airport transfer" maxLength={160} /></label></div>
      <label>Special request<textarea rows={3} value={specialRequest} onChange={(event) => setSpecialRequest(event.target.value)} placeholder="Accessibility, transfer, housekeeping, maintenance, or other request" maxLength={1000} /></label>
      {createRequest.error && <PortalError error={createRequest.error} title="Hospitality request was not created" />}
      <button className="portal-primary-button" type="submit" disabled={createRequest.isPending}>{createRequest.isPending ? 'Creating request' : 'Create request'}</button>
    </form>}

    <section className="support-metric-grid hospitality-metrics" aria-label="Hospitality metrics">
      <HospitalityMetric label="Open hospitality work" value={openTickets.length} detail="From visible CRM tickets" icon={CalendarBlank} />
      <HospitalityMetric label="Waiting for staff" value={waitingForStaff.length} detail="Needs a human decision" icon={UsersThree} />
      <HospitalityMetric label="Priority requests" value={urgentTickets.length} detail="High or urgent open work" icon={Warning} />
      <HospitalityMetric label="Recorded activity" value={report.data?.summary.tickets_total ?? 0} detail="Hospitality tickets in period" icon={TrendUp} />
    </section>

    <div className="support-detail-grid hospitality-content-grid">
      <main className="support-detail-main">
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Reservations and guest care</span><h2>Requests that need attention</h2><p>Use the ticket record to preserve the guest context and the next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>
          {tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : hospitalityTickets.length ? <div className="hospitality-request-list">{hospitalityTickets.slice(0, 12).map((ticket) => <Link className="hospitality-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · {ticket.category ? humanize(ticket.category) : 'Hospitality request'} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={ticket.status} /><ArrowRight aria-hidden="true" /></Link>)}</div> : <PortalEmpty title="No hospitality requests yet" description="Create a booking enquiry or connect a channel to begin routing guest work." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture request</button> : undefined} />}
        </section>

        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Guest request path</span><h2>{hospitalityWorkflow?.name || 'Hospitality booking enquiry'}</h2><p>Capture the request, then confirm availability with staff before promising a booking.</p></div></header>
          {hospitalityWorkflow ? <div className="hospitality-step-list">{hospitalityWorkflow.definition.steps?.map((step, index) => <div className="hospitality-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Team review and resolution'}</small></div><StatusPill value={index === 0 ? 'capture' : 'human review'} /></div>)}</div> : <PortalEmpty title="Hospitality workflow unavailable" description="The backend has not enabled the hospitality workflow catalogue for this organisation." />}
        </section>
      </main>

      <aside className="support-detail-side">
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Escalation guardrails</span><h2>Keep decisions accountable</h2></div></header>
          {hospitalityWorkflow?.escalation_rules?.length ? <ul className="hospitality-rule-list">{hospitalityWorkflow.escalation_rules.map((rule, index) => <li key={`${rule.reason}-${index}`}><Warning aria-hidden="true" /><span>{rule.reason}</span></li>)}</ul> : <p className="support-data-note">Availability, pricing, refunds, disputes, and special arrangements should be confirmed by authorised staff.</p>}
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Hospitality queue</span><h2>{hospitalityQueue?.name || 'No reservations queue found'}</h2></div></header>
          <dl className="support-definition-list"><div><dt>Open visible work</dt><dd>{openTickets.length}</dd></div><div><dt>Waiting for staff</dt><dd>{waitingForStaff.length}</dd></div><div><dt>Current routing</dt><dd>{hospitalityQueue?.routing_strategy ? humanize(hospitalityQueue.routing_strategy) : 'Configure a queue in Queues'}</dd></div></dl>
          <Link className="portal-secondary-button" to="/portal/support/queues">Review queues <ArrowRight aria-hidden="true" /></Link>
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Voice entry point</span><h2>Review guest calls</h2></div></header>
          <p>Voice enquiries can be reviewed in Calls and linked to the hospitality ticket that needs follow-up.</p>
          <Link className="portal-secondary-button" to="/portal/support/calls"><Phone aria-hidden="true" /> Open calls</Link>
        </section>
      </aside>
    </div>
  </div>
}
