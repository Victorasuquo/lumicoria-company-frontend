import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  GraduationCap,
  LockKey,
  Phone,
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

type EducationWorkflow = {
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

const EDUCATION_CATEGORY = 'education_admissions_enquiry'
const EDUCATION_WORKFLOW_KEY = 'education_admissions_enquiry'
const educationSourceChannels = [
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

function EducationMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric education-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function EducationWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [applicantName, setApplicantName] = useState('')
  const [programme, setProgramme] = useState('')
  const [requestType, setRequestType] = useState('admissions')
  const [applicationReference, setApplicationReference] = useState('')
  const [sourceChannel, setSourceChannel] = useState<(typeof educationSourceChannels)[number]['value']>('manual')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'education', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'education' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'education', 'tickets', EDUCATION_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: EDUCATION_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'education', 'queues'], hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null, { enabled: hasScope(crmScopes.queuesRead) })
  const workflows = usePortalQuery<{ items: EducationWorkflow[] }>(['crm', 'education', 'workflow-catalog'], hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'education', 'workflow-templates', 'published'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'education', status: 'published', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'education', 'workflow-templates', 'draft'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'education', status: 'draft', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })

  const educationWorkflow = workflows.data?.items.find((workflow) => workflow.key === EDUCATION_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === EDUCATION_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === EDUCATION_WORKFLOW_KEY)
  const educationQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('education') || queue.name.toLowerCase().includes('admission') || queue.name.toLowerCase().includes('student'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'education', 'workflow-runs', publishedTemplate?.id], publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null, { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) })
  const educationTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openTickets = educationTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const staffFollowUps = educationTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const priorityRequests = educationTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))

  const invalidateEducation = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'education'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ key: EDUCATION_WORKFLOW_KEY, name: 'Education admissions enquiry', vertical: 'education', version: 1, catalog_key: EDUCATION_WORKFLOW_KEY }) })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The Education workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, { method: 'POST', organizationId: context.organization_id, ifMatch: publishETag, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => { setWorkflowNotice('Education admissions workflow enabled. New enquiries will now follow the published routing and staff review rules.'); invalidateEducation() },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: 'Education admissions', description: 'Admissions, application status, timetable, programme, and fee enquiries requiring school staff follow-up.', routing_strategy: 'least_loaded' }) })
    },
    onSuccess: () => { setWorkflowNotice('Education admissions queue created.'); invalidateEducation() },
  })

  const createEducationRequest = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!applicantName.trim() || !programme.trim()) throw new Error('Applicant name and programme are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        customer = (await portalFetch<CRMCustomer>('/crm/customers', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ display_name: applicantName.trim(), profile: { workflow: EDUCATION_WORKFLOW_KEY, programme: programme.trim() } }) })).data
      }
      const description = [`Applicant name: ${applicantName.trim()}`, `Programme: ${programme.trim()}`, `Request type: ${requestType.trim()}`, applicationReference.trim() ? `Application reference: ${applicationReference.trim()}` : ''].filter(Boolean).join('\n')
      const priority = ['application_status', 'fees'].includes(requestType) ? 'high' : 'normal'
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: `${humanize(requestType)} enquiry for ${programme.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: educationQueue?.id ?? null, priority, category: EDUCATION_CATEGORY }) })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Ticket created. Enable the Education workflow to start the guided admissions path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { applicant_name: applicantName.trim(), programme: programme.trim(), request_type: requestType.trim(), application_reference: applicationReference.trim() || undefined } }) })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Ticket created, but the workflow could not start: ${error.message}` : 'Ticket created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => { setApplicantName(''); setProgramme(''); setRequestType('admissions'); setApplicationReference(''); setSourceChannel('manual'); setShowCreate(false); setWorkflowNotice(result.workflowError || (result.run ? `Education enquiry created and workflow run ${result.run.id} started.` : 'Education enquiry created.')); invalidateEducation() },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, { method: 'POST', organizationId: context.organization_id, ifMatch: `"v${run.version}"`, idempotencyKey: createIdempotencyKey(), ...jsonBody(event) })
    },
    onSuccess: (result) => { setWorkflowNotice(`Workflow updated: ${humanize(result.data.status)}.`); invalidateEducation() },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading Education workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page education-page">
    <PortalPageHeader eyebrow="Education operations" title="Keep every applicant enquiry moving" description="Organise admissions, programme, application status, timetable, and fee questions so applicants receive a clear next step and school staff keep ownership." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New education enquiry</button> : undefined} />

    <section className="education-context-bar"><div><GraduationCap aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div><span>Application references and programme context stay with the CRM ticket while fee and status records remain with authorised school staff.</span></section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createEducationRequest.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createEducationRequest.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form education-request-form" onSubmit={(event) => { event.preventDefault(); createEducationRequest.mutate() }}>
      <div><span className="support-panel-kicker">Education enquiry</span><h2>Capture an applicant request</h2><p>Record the applicant and programme first. The backend workflow routes application and fee questions to school staff where confirmation is required.</p></div>
      <div className="support-control-grid"><label>Applicant name<input value={applicantName} onChange={(event) => setApplicantName(event.target.value)} required maxLength={160} /></label><label>Programme<input value={programme} onChange={(event) => setProgramme(event.target.value)} required maxLength={160} placeholder="Course or programme" /></label><label>Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="admissions">Admissions</option><option value="application_status">Application status</option><option value="timetable">Timetable or class question</option><option value="fees">Fees or payment question</option></select></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{educationSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <div className="support-control-grid"><label>Application reference<input value={applicationReference} onChange={(event) => setApplicationReference(event.target.value)} placeholder="Optional" maxLength={160} /></label></div>
      <button className="portal-primary-button" type="submit" disabled={createEducationRequest.isPending}>{createEducationRequest.isPending ? 'Creating enquiry' : 'Create education enquiry'}</button>
    </form>}

    <section className="support-metric-grid education-metrics" aria-label="Education metrics"><EducationMetric label="Open enquiries" value={openTickets.length} detail="Across all loaded CRM pages" icon={GraduationCap} /><EducationMetric label="Staff follow-up" value={staffFollowUps.length} detail="Waiting for school action" icon={UsersThree} /><EducationMetric label="Priority requests" value={priorityRequests.length} detail="High or urgent open work" icon={Warning} /><EducationMetric label="Recorded activity" value={report.data?.summary.tickets_total ?? 0} detail="In the selected period" icon={TrendUp} /></section>

    <div className="support-detail-grid education-content-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Admissions and student support</span><h2>Enquiries that need attention</h2><p>Open the ticket to preserve applicant context, assign ownership, and record the next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>{tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : educationTickets.length ? <div className="education-request-list">{educationTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="education-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No education enquiries yet" description="Create an education enquiry or connect a channel to begin routing admissions work." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture enquiry</button> : undefined} />}{tickets.hasNextPage && <button className="portal-secondary-button education-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more enquiries'}</button>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow control</span><h2>{educationWorkflow?.name || 'Education admissions enquiry'}</h2><p>Capture the applicant, programme, and request type, then route records and fees to authorised school staff.</p></div></header>{educationWorkflow ? <div className="education-step-list">{educationWorkflow.definition.steps?.map((step, index) => <div className="education-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'School staff follow-up and resolution'}</small></div><StatusPill value={index === 0 ? 'capture' : 'staff review'} /></div>)}</div> : <PortalEmpty title="Education workflow unavailable" description="The backend has not enabled the Education workflow catalogue for this organisation." />}{!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="education-setup-callout"><div><strong>Enable the Education workflow</strong><p>This creates the organisation-scoped workflow from the backend catalogue and publishes it for controlled use.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked enquiries</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>{!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published Education workflow to track each enquiry through intake and staff review." /> : runs.isLoading ? <PortalLoading label="Loading Education workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="education-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const needsStaff = ['application_status', 'fees'].includes(fields.request_type); const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="education-run-card" key={run.id}><div className="education-run-header"><div><strong>{fields.applicant_name || run.ticket_id}</strong><small>{fields.programme || 'Programme not recorded'} · {fields.request_type ? humanize(fields.request_type) : 'Education enquiry'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="education-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="education-run-actions">{run.status === 'running' && run.current_step === 'capture_admission_request' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: needsStaff ? 'action' : 'action', action: needsStaff ? 'request_human' : 'complete_step', reason: needsStaff ? 'Application status or fee confirmation requires school staff.' : undefined } })} disabled={applyWorkflowEvent.isPending}>{needsStaff ? <><UsersThree aria-hidden="true" /> Send to admissions team</> : <><CheckCircle aria-hidden="true" /> Request captured</>}</button>}{run.status === 'running' && run.current_step === 'staff_follow_up' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Staff outcome" aria-label={`Staff outcome for ${fields.applicant_name ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'School staff completed the follow-up.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Staff outcome" aria-label={`Staff outcome for ${fields.applicant_name ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Admissions follow-up completed.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create an education enquiry after enabling the workflow to begin tracking the operational path." />}</section>
    </main><aside className="support-detail-side">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Escalation guardrails</span><h2>Keep school decisions accountable</h2></div></header>{educationWorkflow?.escalation_rules?.rules?.length ? <ul className="education-rule-list">{educationWorkflow.escalation_rules.rules.map((rule, index) => <li key={`${rule.reason}-${index}`}><Warning aria-hidden="true" /><span>{rule.reason}</span></li>)}</ul> : <p className="support-data-note">Application status and fee enquiries should remain with authorised school staff.</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Admissions queue</span><h2>{educationQueue?.name || 'No admissions queue found'}</h2></div></header><dl className="support-definition-list"><div><dt>Open visible work</dt><dd>{openTickets.length}</dd></div><div><dt>Waiting for staff</dt><dd>{staffFollowUps.length}</dd></div><div><dt>Current routing</dt><dd>{educationQueue?.routing_strategy ? humanize(educationQueue.routing_strategy) : 'Not configured'}</dd></div></dl>{educationQueue ? <Link className="portal-secondary-button" to="/portal/support/queues">Review queue <ArrowRight aria-hidden="true" /></Link> : hasScope(crmScopes.queuesManage) ? <button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create admissions queue'}</button> : <p className="support-data-note">Ask an administrator to create an Education admissions queue.</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Applicant contact</span><h2>Questions from every channel</h2></div></header><p>Review phone calls, WhatsApp messages, social enquiries, email, and website requests before linking them to admissions work.</p><div className="support-action-group"><Link className="portal-secondary-button" to="/portal/support/calls"><Phone aria-hidden="true" /> Open calls</Link><Link className="portal-secondary-button" to="/portal/support/channels"><BookOpenText aria-hidden="true" /> Review channels</Link></div></section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Applicant context</span><h2>Keep the next step visible</h2></div></header><p>Each enquiry keeps the applicant, programme, application reference, source channel, queue, workflow state, and final outcome together.</p><div className="education-context-points"><span><BookOpenText aria-hidden="true" /> Programme and application reference</span><span><UsersThree aria-hidden="true" /> Staff ownership</span><span><LockKey aria-hidden="true" /> Controlled fee and status follow-up</span></div></section>
    </aside></div>
  </div>
}
