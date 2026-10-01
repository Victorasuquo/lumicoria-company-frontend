import {
  ArrowRight,
  CheckCircle,
  Code,
  GearSix,
  Laptop,
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

type SaasWorkflow = {
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

const SAAS_CATEGORY = 'saas_access_issue'
const SAAS_WORKFLOW_KEY = 'saas_access_issue'
const saasSourceChannels = [
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

function SaasMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric saas-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function SaasWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [accountEmail, setAccountEmail] = useState('')
  const [requesterName, setRequesterName] = useState('')
  const [requestType, setRequestType] = useState('access')
  const [impact, setImpact] = useState('medium')
  const [stepsTried, setStepsTried] = useState('')
  const [sourceChannel, setSourceChannel] = useState<(typeof saasSourceChannels)[number]['value']>('manual')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'saas', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'saas' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'saas', 'tickets', SAAS_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: SAAS_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'saas', 'queues'], hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null, { enabled: hasScope(crmScopes.queuesRead) })
  const workflows = usePortalQuery<{ items: SaasWorkflow[] }>(['crm', 'saas', 'workflow-catalog'], hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'saas', 'workflow-templates', 'published'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'saas', status: 'published', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'saas', 'workflow-templates', 'draft'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'saas', status: 'draft', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })

  const saasWorkflow = workflows.data?.items.find((workflow) => workflow.key === SAAS_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === SAAS_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === SAAS_WORKFLOW_KEY)
  const saasQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('saas') || queue.name.toLowerCase().includes('technical') || queue.name.toLowerCase().includes('it'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'saas', 'workflow-runs', publishedTemplate?.id], publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null, { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) })
  const saasTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openTickets = saasTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const technicalFollowUps = saasTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const priorityIssues = saasTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))

  const invalidateSaas = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'saas'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ key: SAAS_WORKFLOW_KEY, name: 'SaaS access and onboarding', vertical: 'saas', version: 1, catalog_key: SAAS_WORKFLOW_KEY }) })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The SaaS workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, { method: 'POST', organizationId: context.organization_id, ifMatch: publishETag, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => { setWorkflowNotice('SaaS support workflow enabled. New account issues will now follow the published technical routing and escalation rules.'); invalidateSaas() },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: 'SaaS technical support', description: 'Onboarding, access, bug, billing, and high impact account requests requiring technical follow-up.', routing_strategy: 'least_loaded' }) })
    },
    onSuccess: () => { setWorkflowNotice('SaaS technical support queue created.'); invalidateSaas() },
  })

  const createSaasRequest = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!accountEmail.trim() || !requestType.trim() || !impact.trim()) throw new Error('Account email, request type, and impact are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        customer = (await portalFetch<CRMCustomer>('/crm/customers', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ display_name: requesterName.trim() || accountEmail.trim(), primary_email: accountEmail.trim(), profile: { workflow: SAAS_WORKFLOW_KEY, impact: impact.trim() } }) })).data
      }
      const description = [`Account email: ${accountEmail.trim()}`, requesterName.trim() ? `Requester: ${requesterName.trim()}` : '', `Request type: ${requestType.trim()}`, `Impact: ${impact.trim()}`, stepsTried.trim() ? `Steps already tried: ${stepsTried.trim()}` : ''].filter(Boolean).join('\n')
      const priority = impact === 'high' || requestType === 'billing' ? 'urgent' : impact === 'medium' ? 'high' : 'normal'
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: `${humanize(requestType)} request for ${accountEmail.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: saasQueue?.id ?? null, priority, category: SAAS_CATEGORY }) })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Ticket created. Enable the SaaS workflow to start the guided technical path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { account_email: accountEmail.trim(), request_type: requestType.trim(), impact: impact.trim(), steps_tried: stepsTried.trim() || undefined } }) })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Ticket created, but the workflow could not start: ${error.message}` : 'Ticket created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => { setAccountEmail(''); setRequesterName(''); setRequestType('access'); setImpact('medium'); setStepsTried(''); setSourceChannel('manual'); setShowCreate(false); setWorkflowNotice(result.workflowError || (result.run ? `SaaS request created and workflow run ${result.run.id} started.` : 'SaaS request created.')); invalidateSaas() },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, { method: 'POST', organizationId: context.organization_id, ifMatch: `"v${run.version}"`, idempotencyKey: createIdempotencyKey(), ...jsonBody(event) })
    },
    onSuccess: (result) => { setWorkflowNotice(`Workflow updated: ${humanize(result.data.status)}.`); invalidateSaas() },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading SaaS workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page saas-page">
    <PortalPageHeader eyebrow="SaaS and IT services" title="Keep technical requests moving without losing the customer context" description="Organise onboarding, access, bug, billing, and service issues so technical teams see the impact, the account, and the next action in one place." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New technical request</button> : undefined} />

    <section className="saas-context-bar"><div><Laptop aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div><span>Account access, high impact incidents, bugs, and billing issues keep their owner and technical follow-up visible.</span></section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createSaasRequest.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createSaasRequest.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form saas-request-form" onSubmit={(event) => { event.preventDefault(); createSaasRequest.mutate() }}>
      <div><span className="support-panel-kicker">Technical request</span><h2>Capture an account issue</h2><p>Record the account email and impact first. The backend workflow keeps high impact, billing, and technical matters with the right team.</p></div>
      <div className="support-control-grid"><label>Account email<input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} required maxLength={240} /></label><label>Requester name<input value={requesterName} onChange={(event) => setRequesterName(event.target.value)} maxLength={160} placeholder="Optional" /></label><label>Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="onboarding">Onboarding</option><option value="access">Account access</option><option value="bug">Bug report</option><option value="billing">Billing or renewal</option></select></label><label>Impact<select value={impact} onChange={(event) => setImpact(event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{saasSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <div className="support-control-grid"><label>Steps already tried<textarea rows={3} value={stepsTried} onChange={(event) => setStepsTried(event.target.value)} placeholder="Optional" maxLength={1000} /></label></div>
      <button className="portal-primary-button" type="submit" disabled={createSaasRequest.isPending}>{createSaasRequest.isPending ? 'Creating request' : 'Create technical request'}</button>
    </form>}

    <section className="support-metric-grid saas-metrics" aria-label="SaaS metrics"><SaasMetric label="Open technical work" value={openTickets.length} detail="Across all loaded CRM pages" icon={Laptop} /><SaasMetric label="Technical follow-up" value={technicalFollowUps.length} detail="Waiting for internal action" icon={UsersThree} /><SaasMetric label="Priority issues" value={priorityIssues.length} detail="High or urgent open work" icon={Warning} /><SaasMetric label="Recorded activity" value={report.data?.summary.tickets_total ?? 0} detail="In the selected period" icon={TrendUp} /></section>

    <div className="support-detail-grid saas-content-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Customer and technical support</span><h2>Requests that need attention</h2><p>Open the ticket to preserve account context, assign ownership, and record the next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>{tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : saasTickets.length ? <div className="saas-request-list">{saasTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="saas-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No technical requests yet" description="Create a technical request or connect a channel to begin routing SaaS work." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture request</button> : undefined} />}{tickets.hasNextPage && <button className="portal-secondary-button saas-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more requests'}</button>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow control</span><h2>{saasWorkflow?.name || 'SaaS access and onboarding'}</h2><p>Understand the issue, route technical follow-up, and keep billing and high impact decisions with the responsible team.</p></div></header>{saasWorkflow ? <div className="saas-step-list">{saasWorkflow.definition.steps?.map((step, index) => <div className="saas-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Technical team follow-up and resolution'}</small></div><StatusPill value={index === 0 ? 'intake' : 'technical review'} /></div>)}</div> : <PortalEmpty title="SaaS workflow unavailable" description="The backend has not enabled the SaaS workflow catalogue for this organisation." />}{!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="saas-setup-callout"><div><strong>Enable the SaaS workflow</strong><p>This creates the organisation-scoped workflow from the backend catalogue and publishes it for controlled use.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked requests</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>{!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published SaaS workflow to track each technical request through intake and review." /> : runs.isLoading ? <PortalLoading label="Loading SaaS workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="saas-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const needsStaff = fields.impact === 'high' || fields.request_type === 'billing'; const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="saas-run-card" key={run.id}><div className="saas-run-header"><div><strong>{fields.account_email || run.ticket_id}</strong><small>{fields.request_type ? humanize(fields.request_type) : 'Technical request'} · {fields.impact ? `${humanize(fields.impact)} impact` : 'Impact not recorded'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="saas-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="saas-run-actions">{run.status === 'running' && run.current_step === 'understand_issue' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Issue understood</button>}{run.status === 'running' && run.current_step === 'technical_follow_up' && needsStaff && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'High impact or billing work requires technical staff review.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Send to technical team</button>}{run.status === 'running' && run.current_step === 'technical_follow_up' && !needsStaff && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Resolution outcome" aria-label={`Resolution outcome for ${fields.account_email ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Technical request resolved.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Staff outcome" aria-label={`Staff outcome for ${fields.account_email ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Technical team completed the review.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create a technical request after enabling the workflow to begin tracking the operational path." />}</section>
    </main><aside className="support-detail-side">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Escalation guardrails</span><h2>Keep technical decisions accountable</h2></div></header>{saasWorkflow?.escalation_rules?.rules?.length ? <ul className="saas-rule-list">{saasWorkflow.escalation_rules.rules.map((rule, index) => <li key={`${rule.reason}-${index}`}><Warning aria-hidden="true" /><span>{rule.reason}</span></li>)}</ul> : <p className="support-data-note">High impact issues and billing matters should remain with technical staff.</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Technical queue</span><h2>{saasQueue?.name || 'No technical queue found'}</h2></div></header><dl className="support-definition-list"><div><dt>Open visible work</dt><dd>{openTickets.length}</dd></div><div><dt>Waiting for technical team</dt><dd>{technicalFollowUps.length}</dd></div><div><dt>Current routing</dt><dd>{saasQueue?.routing_strategy ? humanize(saasQueue.routing_strategy) : 'Not configured'}</dd></div></dl>{saasQueue ? <Link className="portal-secondary-button" to="/portal/support/queues">Review queue <ArrowRight aria-hidden="true" /></Link> : hasScope(crmScopes.queuesManage) ? <button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create technical queue'}</button> : <p className="support-data-note">Ask an administrator to create a SaaS technical support queue.</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Customer contact</span><h2>Requests from every channel</h2></div></header><p>Review phone calls, WhatsApp messages, social enquiries, email, and website requests before linking them to technical work.</p><div className="support-action-group"><Link className="portal-secondary-button" to="/portal/support/calls"><Phone aria-hidden="true" /> Open calls</Link><Link className="portal-secondary-button" to="/portal/support/channels"><GearSix aria-hidden="true" /> Review channels</Link></div></section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Account context</span><h2>Keep the next action visible</h2></div></header><p>Each request keeps the account email, impact, request type, steps tried, source channel, queue, workflow state, and final outcome together.</p><div className="saas-context-points"><span><Code aria-hidden="true" /> Issue and steps already tried</span><span><UsersThree aria-hidden="true" /> Technical ownership</span><span><LockKey aria-hidden="true" /> Controlled access and billing follow-up</span></div></section>
    </aside></div>
  </div>
}
