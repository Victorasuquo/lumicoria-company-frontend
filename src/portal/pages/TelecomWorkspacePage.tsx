import {
  ArrowRight,
  CellSignalFull,
  CheckCircle,
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

type TelecomWorkflow = {
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

const TELECOM_CATEGORY = 'telecom_account_support'
const TELECOM_WORKFLOW_KEY = 'telecom_account_support'
const telecomSourceChannels = [
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

function formatPhoneHashInput(value: string) {
  const cleaned = value.trim()
  return `${cleaned.startsWith('+') ? '+' : ''}••••••${cleaned.slice(-4)}`
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.trim()))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function TelecomMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric telecom-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function TelecomWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [subscriberReference, setSubscriberReference] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [requestType, setRequestType] = useState('plan')
  const [verificationStatus, setVerificationStatus] = useState('not_verified')
  const [callbackNumber, setCallbackNumber] = useState('')
  const [sourceChannel, setSourceChannel] = useState<(typeof telecomSourceChannels)[number]['value']>('manual')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'telecom', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'telecom' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'telecom', 'tickets', TELECOM_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: TELECOM_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'telecom', 'queues'], hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null, { enabled: hasScope(crmScopes.queuesRead) })
  const workflows = usePortalQuery<{ items: TelecomWorkflow[] }>(['crm', 'telecom', 'workflow-catalog'], hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'telecom', 'workflow-templates', 'published'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'telecom', status: 'published', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'telecom', 'workflow-templates', 'draft'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'telecom', status: 'draft', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })

  const telecomWorkflow = workflows.data?.items.find((workflow) => workflow.key === TELECOM_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === TELECOM_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === TELECOM_WORKFLOW_KEY)
  const telecomQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('telecom') || queue.name.toLowerCase().includes('account') || queue.name.toLowerCase().includes('subscriber'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'telecom', 'workflow-runs', publishedTemplate?.id], publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null, { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) })
  const telecomTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openTickets = telecomTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const verificationFollowUps = telecomTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const priorityIssues = telecomTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))

  const invalidateTelecom = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'telecom'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ key: TELECOM_WORKFLOW_KEY, name: 'Telecom account support', vertical: 'telecom', version: 1, catalog_key: TELECOM_WORKFLOW_KEY }) })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The Telecom workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, { method: 'POST', organizationId: context.organization_id, ifMatch: publishETag, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => { setWorkflowNotice('Telecom workflow enabled. New account requests will now follow verification and staff escalation rules.'); invalidateTelecom() },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: 'Telecom account support', description: 'Subscriber, outage, SIM, plan, balance, and complaint requests requiring controlled follow-up.', routing_strategy: 'least_loaded' }) })
    },
    onSuccess: () => { setWorkflowNotice('Telecom account support queue created.'); invalidateTelecom() },
  })

  const createAccountRequest = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!subscriberReference.trim() || !customerName.trim()) throw new Error('Subscriber reference and customer name are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        if (callbackNumber.trim()) {
          customer = (await portalFetch<CRMCustomer>('/crm/customers/resolve', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ identity_type: 'phone', identity_key_hash: await sha256(callbackNumber), display_name: customerName.trim(), masked_value: formatPhoneHashInput(callbackNumber), verified: false }) })).data
        } else {
          customer = (await portalFetch<CRMCustomer>('/crm/customers', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ display_name: customerName.trim(), profile: { workflow: TELECOM_WORKFLOW_KEY } }) })).data
        }
      }
      const description = [`Subscriber reference: ${subscriberReference.trim()}`, `Customer: ${customerName.trim()}`, `Request type: ${requestType.trim()}`, `Verification status: ${verificationStatus}`, callbackNumber.trim() ? 'Callback requested: yes' : ''].filter(Boolean).join('\n')
      const sensitive = ['sim', 'complaint', 'outage'].includes(requestType)
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: `Subscriber ${requestType.trim()} ${subscriberReference.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: telecomQueue?.id ?? null, priority: sensitive || verificationStatus === 'not_verified' ? 'urgent' : 'normal', category: TELECOM_CATEGORY }) })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Ticket created. Enable the Telecom workflow to start the guarded account path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { subscriber_reference: subscriberReference.trim(), request_type: requestType.trim(), verification_status: verificationStatus, callback_number: callbackNumber.trim() || undefined } }) })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Ticket created, but the workflow could not start: ${error.message}` : 'Ticket created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => { setSubscriberReference(''); setCustomerName(''); setRequestType('plan'); setVerificationStatus('not_verified'); setCallbackNumber(''); setSourceChannel('manual'); setShowCreate(false); setWorkflowNotice(result.workflowError || (result.run ? `Account request created and workflow run ${result.run.id} started.` : 'Account request created.')); invalidateTelecom() },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, { method: 'POST', organizationId: context.organization_id, ifMatch: `"v${run.version}"`, idempotencyKey: createIdempotencyKey(), ...jsonBody(event) })
    },
    onSuccess: (result) => { setWorkflowNotice(`Workflow updated: ${humanize(result.data.status)}.`); invalidateTelecom() },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading Telecom workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page telecom-page">
    <PortalPageHeader eyebrow="Telecom operations" title="Handle subscriber requests without losing control of account access" description="Keep verification, plan questions, outages, SIM requests, and complaints in one visible queue while sensitive decisions stay with authorised staff." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New account request</button> : undefined} />

    <section className="telecom-context-bar"><div><CellSignalFull aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div><span>Subscriber references and verification state are kept with the CRM ticket. Sensitive requests are not treated as routine replies.</span></section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createAccountRequest.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createAccountRequest.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form telecom-request-form" onSubmit={(event) => { event.preventDefault(); createAccountRequest.mutate() }}>
      <div><span className="support-panel-kicker">Subscriber request</span><h2>Capture an account support request</h2><p>Record the subscriber reference and verification state first. The backend workflow decides when staff must take over.</p></div>
      <div className="support-control-grid"><label>Subscriber reference<input value={subscriberReference} onChange={(event) => setSubscriberReference(event.target.value)} required maxLength={120} /></label><label>Customer name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={160} /></label><label>Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="plan">Plan question</option><option value="balance">Balance question</option><option value="outage">Service outage</option><option value="sim">SIM or account change</option><option value="complaint">Complaint</option></select></label><label>Verification status<select value={verificationStatus} onChange={(event) => setVerificationStatus(event.target.value)}><option value="not_verified">Not verified</option><option value="verified">Verified</option></select></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{telecomSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <div className="support-control-grid"><label>Callback number<input value={callbackNumber} onChange={(event) => setCallbackNumber(event.target.value)} placeholder="Optional" maxLength={40} /></label></div>
      <button className="portal-primary-button" type="submit" disabled={createAccountRequest.isPending}>{createAccountRequest.isPending ? 'Creating request' : 'Create account request'}</button>
    </form>}

    <section className="support-metric-grid telecom-metrics" aria-label="Telecom metrics"><TelecomMetric label="Open account work" value={openTickets.length} detail="Across all loaded CRM pages" icon={CellSignalFull} /><TelecomMetric label="Verification follow-up" value={verificationFollowUps.length} detail="Waiting for internal action" icon={UsersThree} /><TelecomMetric label="Priority issues" value={priorityIssues.length} detail="High or urgent open work" icon={Warning} /><TelecomMetric label="Recorded activity" value={report.data?.summary.tickets_total ?? 0} detail="In the selected period" icon={TrendUp} /></section>

    <div className="support-detail-grid telecom-content-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Subscriber care</span><h2>Account work that needs attention</h2><p>Open the ticket to preserve subscriber context, assign ownership, and record the next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>{tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : telecomTickets.length ? <div className="telecom-request-list">{telecomTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="telecom-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No account requests yet" description="Create a subscriber request or connect a channel to begin routing telecom work." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture request</button> : undefined} />}{tickets.hasNextPage && <button className="portal-secondary-button telecom-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more requests'}</button>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow control</span><h2>{telecomWorkflow?.name || 'Telecom account support'}</h2><p>Verify the subscriber first, then keep account changes, SIM matters, outages, and complaints with the right staff member.</p></div></header>{telecomWorkflow ? <div className="telecom-step-list">{telecomWorkflow.definition.steps?.map((step, index) => <div className="telecom-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Authorised staff review and resolution'}</small></div><StatusPill value={index === 0 ? 'verification' : 'staff review'} /></div>)}</div> : <PortalEmpty title="Telecom workflow unavailable" description="The backend has not enabled the Telecom workflow catalogue for this organisation." />}{!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="telecom-setup-callout"><div><strong>Enable the Telecom workflow</strong><p>This creates the organisation-scoped workflow from the backend catalogue and publishes it for controlled use.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked requests</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>{!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published Telecom workflow to track each account request through verification and staff review." /> : runs.isLoading ? <PortalLoading label="Loading Telecom workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="telecom-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const sensitive = ['sim', 'complaint', 'outage'].includes(fields.request_type); const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="telecom-run-card" key={run.id}><div className="telecom-run-header"><div><strong>{fields.subscriber_reference || run.ticket_id}</strong><small>{fields.request_type ? humanize(fields.request_type) : 'Account request'} · {fields.verification_status ? humanize(fields.verification_status) : 'Verification not recorded'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="telecom-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="telecom-run-actions">{run.status === 'running' && run.current_step === 'verify_subscriber' && fields.verification_status === 'verified' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Subscriber verified</button>}{run.status === 'running' && run.current_step === 'verify_subscriber' && fields.verification_status !== 'verified' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'Subscriber verification is required before account support.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Send to account team</button>}{run.status === 'running' && run.current_step === 'handle_request' && sensitive && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'This request requires authorised telecom staff.' } })} disabled={applyWorkflowEvent.isPending}><LockKey aria-hidden="true" /> Require staff review</button>}{run.status === 'running' && run.current_step === 'handle_request' && !sensitive && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Resolution outcome" aria-label={`Resolution outcome for ${fields.subscriber_reference ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Account request resolved.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Staff outcome" aria-label={`Staff outcome for ${fields.subscriber_reference ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Staff review completed.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create an account request after enabling the workflow to begin tracking the operational path." />}</section>
    </main><aside className="support-detail-side">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Escalation guardrails</span><h2>Protect subscriber decisions</h2></div></header>{telecomWorkflow?.escalation_rules?.rules?.length ? <ul className="telecom-rule-list">{telecomWorkflow.escalation_rules.rules.map((rule, index) => <li key={`${rule.reason}-${index}`}><Warning aria-hidden="true" /><span>{rule.reason}</span></li>)}</ul> : <p className="support-data-note">Unverified identity, SIM changes, complaints, and outages should remain with authorised staff.</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Account queue</span><h2>{telecomQueue?.name || 'No account queue found'}</h2></div></header><dl className="support-definition-list"><div><dt>Open visible work</dt><dd>{openTickets.length}</dd></div><div><dt>Verification follow-up</dt><dd>{verificationFollowUps.length}</dd></div><div><dt>Current routing</dt><dd>{telecomQueue?.routing_strategy ? humanize(telecomQueue.routing_strategy) : 'Not configured'}</dd></div></dl>{telecomQueue ? <Link className="portal-secondary-button" to="/portal/support/queues">Review queue <ArrowRight aria-hidden="true" /></Link> : hasScope(crmScopes.queuesManage) ? <button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create account queue'}</button> : <p className="support-data-note">Ask an administrator to create a Telecom account support queue.</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Customer contact</span><h2>Calls and messages</h2></div></header><p>Review phone calls, WhatsApp messages, social enquiries, email, and website requests before linking them to subscriber work.</p><div className="support-action-group"><Link className="portal-secondary-button" to="/portal/support/calls"><Phone aria-hidden="true" /> Open calls</Link><Link className="portal-secondary-button" to="/portal/support/channels"><CellSignalFull aria-hidden="true" /> Review channels</Link></div></section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Identity control</span><h2>Verification stays visible</h2></div></header><p>Subscriber references are recorded for routing, but account changes and sensitive issues remain subject to the organisation's verification and access rules.</p><div className="telecom-context-points"><span><LockKey aria-hidden="true" /> Verification before account action</span><span><UsersThree aria-hidden="true" /> Staff ownership for sensitive work</span><span><ShieldCheck aria-hidden="true" /> Auditable outcome</span></div></section>
    </aside></div>
  </div>
}
