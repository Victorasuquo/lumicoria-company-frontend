import {
  ArrowRight,
  CalendarBlank,
  CalendarCheck,
  CheckCircle,
  Clock,
  Phone,
  Plus,
  Scissors,
  ShieldCheck,
  TrendUp,
  UsersThree,
  Warning,
} from '@phosphor-icons/react'
import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import {
  analyticsQueryString,
  crmQueryString,
  crmScopes,
  type CRMAnalyticsReport,
  type CRMCollection,
  type CRMCustomer,
  type CRMQueue,
  type CRMTicket,
  type CRMWorkflowRun,
  type CRMWorkflowTemplate,
} from '../../api/crm'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

type AppointmentWorkflow = {
  key: string
  name: string
  vertical: string
  definition: {
    fields?: Array<{ key: string; label: string; required?: boolean; type?: string; options?: string[] }>
    steps?: Array<{ key: string; label: string; required_fields?: string[]; actions?: string[] }>
  }
  escalation_rules: { rules?: Array<{ reason: string; field?: string; value?: string }> }
}

type WorkflowRunResult = {
  ticket: CRMTicket
  run: CRMWorkflowRun | null
  workflowError: string | null
}

const APPOINTMENT_CATEGORY = 'appointment_booking'
const APPOINTMENT_WORKFLOW_KEY = 'appointment_booking'
const appointmentSourceChannels = [
  { value: 'manual', label: 'Staff entry' },
  { value: 'voice', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'email', label: 'Email' },
  { value: 'web_chat', label: 'Website chat' },
  { value: 'widget', label: 'Website widget' },
] as const

function defaultFromDate() {
  const date = new Date()
  date.setDate(date.getDate() - 30)
  return date.toISOString().slice(0, 10)
}

function AppointmentMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric appointments-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function AppointmentsWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [service, setService] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [sourceChannel, setSourceChannel] = useState<(typeof appointmentSourceChannels)[number]['value']>('manual')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'appointments', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'appointments' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'appointments', 'tickets', APPOINTMENT_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: APPOINTMENT_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'appointments', 'queues'], hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null, { enabled: hasScope(crmScopes.queuesRead) })
  const workflows = usePortalQuery<{ items: AppointmentWorkflow[] }>(['crm', 'appointments', 'workflow-catalog'], hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'appointments', 'workflow-templates', 'published'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'appointments', status: 'published', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'appointments', 'workflow-templates', 'draft'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'appointments', status: 'draft', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })

  const appointmentWorkflow = workflows.data?.items.find((workflow) => workflow.key === APPOINTMENT_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === APPOINTMENT_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === APPOINTMENT_WORKFLOW_KEY)
  const appointmentQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('appointment') || queue.name.toLowerCase().includes('salon') || queue.name.toLowerCase().includes('booking'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'appointments', 'workflow-runs', publishedTemplate?.id], publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null, { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) })
  const appointmentTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openAppointments = appointmentTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const awaitingConfirmation = appointmentTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const recordedAppointments = report.data?.summary.tickets_total ?? 0

  const invalidateAppointments = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'appointments'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ key: APPOINTMENT_WORKFLOW_KEY, name: 'Appointment booking', vertical: 'appointments', version: 1, catalog_key: APPOINTMENT_WORKFLOW_KEY }) })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The appointments workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, { method: 'POST', organizationId: context.organization_id, ifMatch: publishETag, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => { setWorkflowNotice('Appointments workflow enabled. New booking requests will now require availability confirmation before they are closed.'); invalidateAppointments() },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: 'Appointments and bookings', description: 'Salon, spa, clinic administration, and service appointment requests that require availability confirmation.', routing_strategy: 'least_loaded' }) })
    },
    onSuccess: () => { setWorkflowNotice('Appointments and bookings queue created.'); invalidateAppointments() },
  })

  const createAppointment = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!customerName.trim() || !service.trim() || !preferredTime.trim()) throw new Error('Customer name, service, and preferred time are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        customer = (await portalFetch<CRMCustomer>('/crm/customers', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ display_name: customerName.trim(), profile: { workflow: APPOINTMENT_WORKFLOW_KEY, service: service.trim(), preferred_time: preferredTime.trim() } }) })).data
      }
      const description = [`Customer: ${customerName.trim()}`, `Service: ${service.trim()}`, `Preferred time: ${preferredTime.trim()}`, contactNumber.trim() ? `Contact number: ${contactNumber.trim()}` : ''].filter(Boolean).join('\n')
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: `${service.trim()} appointment request for ${customerName.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: appointmentQueue?.id ?? null, priority: 'normal', category: APPOINTMENT_CATEGORY }) })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Appointment request created. Enable the appointments workflow to start the guided booking path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { customer_name: customerName.trim(), service: service.trim(), preferred_time: preferredTime.trim(), contact_number: contactNumber.trim() || undefined } }) })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Appointment request created, but the workflow could not start: ${error.message}` : 'Appointment request created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => { setCustomerName(''); setService(''); setPreferredTime(''); setContactNumber(''); setSourceChannel('manual'); setShowCreate(false); setWorkflowNotice(result.workflowError || (result.run ? `Appointment request created and workflow run ${result.run.id} started.` : 'Appointment request created.')); invalidateAppointments() },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, { method: 'POST', organizationId: context.organization_id, ifMatch: `"v${run.version}"`, idempotencyKey: createIdempotencyKey(), ...jsonBody(event) })
    },
    onSuccess: (result) => { setWorkflowNotice(`Booking workflow updated: ${humanize(result.data.status)}.`); invalidateAppointments() },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading appointments workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page appointments-page">
    <PortalPageHeader eyebrow="Appointments for salons and service businesses" title="Keep every booking request moving to a confirmed time" description="Capture service requests from calls, WhatsApp, social messages, and your website, then keep availability checks and staff follow-up in one visible workflow." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New appointment request</button> : undefined} />

    <section className="appointments-context-bar"><div><CalendarCheck aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div><span>Availability stays with the team. Customers get a clear next step instead of an unconfirmed promise.</span></section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createAppointment.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createAppointment.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form appointments-request-form" onSubmit={(event) => { event.preventDefault(); createAppointment.mutate() }}>
      <div><span className="support-panel-kicker">Booking request</span><h2>Capture the customer and service first</h2><p>Record the requested service and preferred time. The backend workflow sends it to the booking team before anyone confirms availability.</p></div>
      <div className="support-control-grid"><label>Customer name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={160} /></label><label>Service requested<input value={service} onChange={(event) => setService(event.target.value)} required maxLength={240} placeholder="Hair appointment, manicure, massage" /></label><label>Preferred date and time<input value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} required maxLength={160} placeholder="Saturday, 11:00 am" /></label><label>Contact number<input type="tel" value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} maxLength={40} placeholder="Optional" /></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{appointmentSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <button className="portal-primary-button" type="submit" disabled={createAppointment.isPending}>{createAppointment.isPending ? 'Creating request' : 'Create appointment request'}</button>
    </form>}

    <section className="support-metric-grid appointments-metrics" aria-label="Appointment metrics"><AppointmentMetric label="Open bookings" value={openAppointments.length} detail="Across all loaded CRM pages" icon={CalendarBlank} /><AppointmentMetric label="Awaiting confirmation" value={awaitingConfirmation.length} detail="Needs staff availability check" icon={Clock} /><AppointmentMetric label="Services requested" value={recordedAppointments} detail="In the selected period" icon={TrendUp} /><AppointmentMetric label="Booking team" value={appointmentQueue ? 'Ready' : 'Not set'} detail={appointmentQueue ? appointmentQueue.name : 'Create the queue below'} icon={UsersThree} /></section>

    <div className="support-detail-grid appointments-content-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Customer and booking support</span><h2>Requests that need attention</h2><p>Open the request to preserve the customer, service, preferred time, and next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>{tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : appointmentTickets.length ? <div className="appointments-request-list">{appointmentTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="appointments-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No appointment requests yet" description="Create a booking request or connect a channel to begin routing salon and service enquiries." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture booking</button> : undefined} />}{tickets.hasNextPage && <button className="portal-secondary-button appointments-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more requests'}</button>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow control</span><h2>{appointmentWorkflow?.name || 'Appointment booking'}</h2><p>Capture the request, route it to the booking team, and confirm the slot before closing the case.</p></div></header>{appointmentWorkflow ? <div className="appointments-step-list">{appointmentWorkflow.definition.steps?.map((step, index) => <div className="appointments-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Availability confirmation and staff resolution'}</small></div><StatusPill value={index === 0 ? 'capture' : 'staff confirmation'} /></div>)}</div> : <PortalEmpty title="Appointments workflow unavailable" description="The backend has not enabled the appointment booking workflow catalogue for this organisation." />}{!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="appointments-setup-callout"><div><strong>Enable the appointments workflow</strong><p>This creates the organisation-scoped workflow from the backend catalogue and keeps availability confirmation with staff.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}{!appointmentQueue && hasScope(crmScopes.queuesManage) && <div className="appointments-setup-callout"><div><strong>Create the booking team queue</strong><p>Route appointment requests to a named queue before accepting new work.</p></div><button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create queue'}</button></div>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked booking requests</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>{!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published appointments workflow to track each booking through confirmation." /> : runs.isLoading ? <PortalLoading label="Loading appointment workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="appointments-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="appointments-run-card" key={run.id}><div className="appointments-run-header"><div><strong>{fields.service || 'Appointment request'}</strong><small>{fields.customer_name || 'Customer not recorded'} · {fields.preferred_time || 'Time not recorded'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="appointments-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="appointments-run-actions">{run.status === 'running' && run.current_step === 'capture_booking' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Request captured</button>}{run.status === 'running' && run.current_step === 'confirm_booking' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'Availability and appointment details require staff confirmation.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Send to booking team</button>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Confirmation or outcome" aria-label={`Confirmation outcome for ${fields.service ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Availability reviewed by the booking team.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record outcome</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create an appointment request after enabling the workflow to begin tracking the booking path." />}</section>
    </main>

    <aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Booking context</span><h2>Make the next step visible</h2></div></header><p>Each request keeps the customer, service, preferred time, contact channel, queue, availability decision, and final outcome together.</p><div className="appointments-context-points"><span><Scissors aria-hidden="true" /> Service and appointment details</span><span><CalendarCheck aria-hidden="true" /> Availability stays with staff</span><span><Phone aria-hidden="true" /> Phone and message follow-up</span></div></section><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Guardrail</span><h2>No unconfirmed promises</h2></div></header><p className="appointments-guardrail"><Warning aria-hidden="true" /> The workflow does not close a booking until an authorised team member confirms the time and service details.</p></section></aside></div>
  </div>
}
