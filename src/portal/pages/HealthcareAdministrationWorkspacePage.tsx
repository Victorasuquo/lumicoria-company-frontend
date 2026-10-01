import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Clock,
  FileText,
  FirstAidKit,
  LockKey,
  Plus,
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

type HealthcareWorkflow = {
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

const HEALTHCARE_CATEGORY = 'healthcare_administration_request'
const HEALTHCARE_WORKFLOW_KEY = 'healthcare_administration_request'
const healthcareSourceChannels = [
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

function HealthcareMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric healthcare-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function HealthcareAdministrationWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [patientReference, setPatientReference] = useState('')
  const [requestType, setRequestType] = useState('appointment')
  const [preferredTime, setPreferredTime] = useState('')
  const [urgency, setUrgency] = useState('routine')
  const [sourceChannel, setSourceChannel] = useState<(typeof healthcareSourceChannels)[number]['value']>('manual')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'healthcare-administration', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'healthcare_administration' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'healthcare-administration', 'tickets', HEALTHCARE_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: HEALTHCARE_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'healthcare-administration', 'queues'], hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null, { enabled: hasScope(crmScopes.queuesRead) })
  const workflows = usePortalQuery<{ items: HealthcareWorkflow[] }>(['crm', 'healthcare-administration', 'workflow-catalog'], hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'healthcare-administration', 'workflow-templates', 'published'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'healthcare_administration', status: 'published', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'healthcare-administration', 'workflow-templates', 'draft'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'healthcare_administration', status: 'draft', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })

  const healthcareWorkflow = workflows.data?.items.find((workflow) => workflow.key === HEALTHCARE_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === HEALTHCARE_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === HEALTHCARE_WORKFLOW_KEY)
  const healthcareQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('healthcare') || queue.name.toLowerCase().includes('patient') || queue.name.toLowerCase().includes('clinic'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'healthcare-administration', 'workflow-runs', publishedTemplate?.id], publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null, { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) })
  const healthcareTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openRequests = healthcareTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const staffReview = healthcareTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const urgentRequests = healthcareTickets.filter((ticket) => ticket.priority === 'urgent' && !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const recordedRequests = report.data?.summary.tickets_total ?? 0

  const invalidateHealthcare = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'healthcare-administration'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ key: HEALTHCARE_WORKFLOW_KEY, name: 'Healthcare administration request', vertical: 'healthcare_administration', version: 1, catalog_key: HEALTHCARE_WORKFLOW_KEY }) })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The healthcare administration workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, { method: 'POST', organizationId: context.organization_id, ifMatch: publishETag, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => { setWorkflowNotice('Healthcare administration workflow enabled. New requests will remain with authorised staff for review.'); invalidateHealthcare() },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: 'Healthcare administration', description: 'Appointments, records, billing, and facility requests for authorised healthcare administration staff.', routing_strategy: 'least_loaded' }) })
    },
    onSuccess: () => { setWorkflowNotice('Healthcare administration queue created.'); invalidateHealthcare() },
  })

  const createHealthcareRequest = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!patientReference.trim() || !requestType.trim() || !urgency.trim()) throw new Error('Patient reference, request type, and urgency are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        customer = (await portalFetch<CRMCustomer>('/crm/customers', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ display_name: `Patient reference ${patientReference.trim()}`, profile: { workflow: HEALTHCARE_WORKFLOW_KEY, patient_reference: patientReference.trim(), urgency: urgency.trim() } }) })).data
      }
      const description = [`Patient reference: ${patientReference.trim()}`, `Request type: ${requestType.trim()}`, `Urgency: ${urgency.trim()}`, preferredTime.trim() ? `Preferred time: ${preferredTime.trim()}` : ''].filter(Boolean).join('\n')
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: `${humanize(requestType)} request for patient reference ${patientReference.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: healthcareQueue?.id ?? null, priority: urgency === 'urgent' ? 'urgent' : 'normal', category: HEALTHCARE_CATEGORY }) })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Administrative request created. Enable the healthcare workflow to start the guarded staff-review path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { patient_reference: patientReference.trim(), request_type: requestType.trim(), preferred_time: preferredTime.trim() || undefined, urgency: urgency.trim() } }) })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Administrative request created, but the workflow could not start: ${error.message}` : 'Administrative request created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => { setPatientReference(''); setRequestType('appointment'); setPreferredTime(''); setUrgency('routine'); setSourceChannel('manual'); setShowCreate(false); setWorkflowNotice(result.workflowError || (result.run ? `Healthcare request created and workflow run ${result.run.id} started.` : 'Healthcare request created.')); invalidateHealthcare() },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, { method: 'POST', organizationId: context.organization_id, ifMatch: `"v${run.version}"`, idempotencyKey: createIdempotencyKey(), ...jsonBody(event) })
    },
    onSuccess: (result) => { setWorkflowNotice(`Healthcare workflow updated: ${humanize(result.data.status)}.`); invalidateHealthcare() },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading healthcare administration workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page healthcare-page">
    <PortalPageHeader eyebrow="Healthcare administration" title="Keep patient requests organised without crossing the clinical line" description="Capture appointment, records, billing, and facility requests, then route every case to authorised staff with the right context and urgency visible." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New administrative request</button> : undefined} />

    <section className="healthcare-context-bar"><div><FirstAidKit aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div><span>Administrative support only. Clinical advice, diagnosis, results, and treatment decisions stay with authorised professionals.</span></section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createHealthcareRequest.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createHealthcareRequest.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form healthcare-request-form" onSubmit={(event) => { event.preventDefault(); createHealthcareRequest.mutate() }}>
      <div><span className="support-panel-kicker">Administrative request</span><h2>Capture the request without exposing clinical details</h2><p>Use the organisation's approved patient reference. Keep medical decisions and sensitive details with authorised staff.</p></div>
      <div className="support-control-grid"><label>Patient reference<input value={patientReference} onChange={(event) => setPatientReference(event.target.value)} required maxLength={160} /></label><label>Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="appointment">Appointment</option><option value="records">Records</option><option value="billing">Billing</option><option value="facility">Facility</option></select></label><label>Urgency<select value={urgency} onChange={(event) => setUrgency(event.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option></select></label><label>Preferred time<input value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} maxLength={160} placeholder="Optional" /></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{healthcareSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <button className="portal-primary-button" type="submit" disabled={createHealthcareRequest.isPending}>{createHealthcareRequest.isPending ? 'Creating request' : 'Create administrative request'}</button>
    </form>}

    <section className="support-metric-grid healthcare-metrics" aria-label="Healthcare administration metrics"><HealthcareMetric label="Open requests" value={openRequests.length} detail="Across all loaded CRM pages" icon={FileText} /><HealthcareMetric label="Staff review" value={staffReview.length} detail="Waiting for authorised action" icon={UsersThree} /><HealthcareMetric label="Urgent requests" value={urgentRequests.length} detail="Open cases marked urgent" icon={Warning} /><HealthcareMetric label="Recorded requests" value={recordedRequests} detail="In the selected period" icon={TrendUp} /></section>

    <div className="support-detail-grid healthcare-content-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Administrative support</span><h2>Requests that need authorised attention</h2><p>Open a case to preserve the reference, request type, urgency, and next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>{tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : healthcareTickets.length ? <div className="healthcare-request-list">{healthcareTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="healthcare-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No administrative requests yet" description="Create a request or connect a channel to begin routing appointment, records, billing, and facility enquiries." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture request</button> : undefined} />}{tickets.hasNextPage && <button className="portal-secondary-button healthcare-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more requests'}</button>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow control</span><h2>{healthcareWorkflow?.name || 'Healthcare administration request'}</h2><p>Capture the administrative need, route it to authorised staff, and record the outcome without providing clinical advice.</p></div></header>{healthcareWorkflow ? <div className="healthcare-step-list">{healthcareWorkflow.definition.steps?.map((step, index) => <div className="healthcare-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Authorised staff review and resolution'}</small></div><StatusPill value={index === 0 ? 'capture' : 'staff review'} /></div>)}</div> : <PortalEmpty title="Healthcare workflow unavailable" description="The backend has not enabled the healthcare administration workflow catalogue for this organisation." />}{!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="healthcare-setup-callout"><div><strong>Enable the healthcare administration workflow</strong><p>This creates the organisation-scoped workflow and keeps every request with authorised staff.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}{!healthcareQueue && hasScope(crmScopes.queuesManage) && <div className="healthcare-setup-callout"><div><strong>Create the administration queue</strong><p>Route new cases to the authorised healthcare administration team before accepting work.</p></div><button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create queue'}</button></div>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked administration requests</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>{!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published healthcare workflow to track each request through staff review." /> : runs.isLoading ? <PortalLoading label="Loading healthcare workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="healthcare-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="healthcare-run-card" key={run.id}><div className="healthcare-run-header"><div><strong>{fields.request_type ? humanize(fields.request_type) : 'Administrative request'}</strong><small>{fields.patient_reference || 'Reference not recorded'} · {fields.urgency ? humanize(fields.urgency) : 'Urgency not recorded'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="healthcare-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="healthcare-run-actions">{run.status === 'running' && run.current_step === 'capture_admin_request' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Request captured</button>}{run.status === 'running' && run.current_step === 'staff_review' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'Authorised healthcare staff review is required.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Send to authorised staff</button>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Administrative outcome" aria-label={`Administrative outcome for ${fields.patient_reference ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Administrative request reviewed by authorised staff.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record outcome</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create an administrative request after enabling the workflow to begin tracking the staff review path." />}</section>
    </main>

    <aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Privacy boundary</span><h2>Administrative support only</h2></div></header><p>Use this workspace for appointments, records, billing, and facility requests. Keep diagnoses, treatment decisions, results, and sensitive clinical details with authorised professionals.</p><div className="healthcare-context-points"><span><LockKey aria-hidden="true" /> Patient references stay controlled</span><span><UsersThree aria-hidden="true" /> Staff review is mandatory</span><span><CalendarBlank aria-hidden="true" /> Appointment timing stays visible</span></div></section><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Guardrail</span><h2>No clinical advice</h2></div></header><p className="healthcare-guardrail"><Warning aria-hidden="true" /> The workflow does not diagnose, interpret results, recommend treatment, or close urgent matters without authorised staff action.</p></section></aside></div>
  </div>
}
