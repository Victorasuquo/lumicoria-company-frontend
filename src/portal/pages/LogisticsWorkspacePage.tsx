import {
  ArrowRight,
  CheckCircle,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  TrendUp,
  Truck,
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
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
  formatPortalDate,
  humanize,
} from '../components/PortalState'

type LogisticsWorkflow = {
  key: string
  name: string
  vertical: string
  definition: {
    fields?: Array<{ key: string; label: string; required?: boolean; type?: string; options?: string[] }>
    steps?: Array<{ key: string; label: string; required_fields?: string[]; actions?: string[] }>
  }
  escalation_rules: { rules?: Array<{ condition?: string; reason: string; field?: string; value?: string }> }
}

type WorkflowRunResult = {
  ticket: CRMTicket
  run: CRMWorkflowRun | null
  workflowError: string | null
}

const LOGISTICS_CATEGORY = 'logistics_delivery_exception'
const LOGISTICS_WORKFLOW_KEY = 'logistics_delivery_exception'

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
  const bytes = new TextEncoder().encode(value.trim())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function LogisticsMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric logistics-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function LogisticsWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [shipmentReference, setShipmentReference] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [issue, setIssue] = useState('delayed')
  const [lastKnownStatus, setLastKnownStatus] = useState('')
  const [callbackNumber, setCallbackNumber] = useState('')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'logistics', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'logistics' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'logistics', 'tickets', LOGISTICS_CATEGORY],
    initialPageParam: null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: LOGISTICS_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(
    ['crm', 'logistics', 'queues'],
    hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null,
    { enabled: hasScope(crmScopes.queuesRead) },
  )
  const workflows = usePortalQuery<{ items: LogisticsWorkflow[] }>(
    ['crm', 'logistics', 'workflow-catalog'],
    hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(
    ['crm', 'logistics', 'workflow-templates', 'published'],
    hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'logistics', status: 'published', page_size: 100 })}` : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(
    ['crm', 'logistics', 'workflow-templates', 'draft'],
    hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'logistics', status: 'draft', page_size: 100 })}` : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )

  const logisticsWorkflow = workflows.data?.items.find((workflow) => workflow.key === LOGISTICS_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === LOGISTICS_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === LOGISTICS_WORKFLOW_KEY)
  const logisticsQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('logistics') || queue.name.toLowerCase().includes('exception') || queue.name.toLowerCase().includes('dispatch'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(
    ['crm', 'logistics', 'workflow-runs', publishedTemplate?.id],
    publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null,
    { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) },
  )
  const logisticsTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openTickets = logisticsTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const dispatchFollowUps = logisticsTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const priorityExceptions = logisticsTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))

  const invalidateLogistics = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'logistics'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', {
          method: 'POST',
          organizationId: context.organization_id,
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ key: LOGISTICS_WORKFLOW_KEY, name: 'Logistics delivery exception', vertical: 'logistics', version: 1, catalog_key: LOGISTICS_WORKFLOW_KEY }),
        })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The logistics workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, {
        method: 'POST',
        organizationId: context.organization_id,
        ifMatch: publishETag,
        idempotencyKey: createIdempotencyKey(),
      })
    },
    onSuccess: () => {
      setWorkflowNotice('Logistics workflow enabled. New delivery exceptions will now open a tracked workflow run.')
      invalidateLogistics()
    },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', {
        method: 'POST',
        organizationId: context.organization_id,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({ name: 'Logistics exceptions', description: 'Delivery issues that need dispatch review and customer follow-up.', routing_strategy: 'least_loaded' }),
      })
    },
    onSuccess: () => {
      setWorkflowNotice('Logistics exceptions queue created.')
      invalidateLogistics()
    },
  })

  const createException = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!shipmentReference.trim() || !issue.trim() || !customerName.trim()) throw new Error('Shipment reference, customer name, and delivery issue are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        if (callbackNumber.trim()) {
          customer = (await portalFetch<CRMCustomer>('/crm/customers/resolve', {
            method: 'POST',
            organizationId: context.organization_id,
            idempotencyKey: createIdempotencyKey(),
            ...jsonBody({ identity_type: 'phone', identity_key_hash: await sha256(callbackNumber), display_name: customerName.trim(), masked_value: formatPhoneHashInput(callbackNumber), verified: false }),
          })).data
        } else {
          customer = (await portalFetch<CRMCustomer>('/crm/customers', {
            method: 'POST',
            organizationId: context.organization_id,
            idempotencyKey: createIdempotencyKey(),
            ...jsonBody({ display_name: customerName.trim(), profile: { workflow: LOGISTICS_WORKFLOW_KEY } }),
          })).data
        }
      }
      const description = [
        `Shipment reference: ${shipmentReference.trim()}`,
        `Customer: ${customerName.trim()}`,
        `Delivery issue: ${issue.trim()}`,
        lastKnownStatus.trim() ? `Last known status: ${lastKnownStatus.trim()}` : '',
        callbackNumber.trim() ? 'Callback requested: yes' : '',
      ].filter(Boolean).join('\n')
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', {
        method: 'POST',
        organizationId: context.organization_id,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({ subject: `Delivery exception ${shipmentReference.trim()}`, description, source_channel: 'manual', customer_id: customer?.id ?? null, queue_id: logisticsQueue?.id ?? null, priority: /lost|damaged|refund|compensation/i.test(issue) ? 'urgent' : 'high', category: LOGISTICS_CATEGORY }),
      })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Ticket created. Enable the logistics workflow to start the guided exception path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', {
          method: 'POST',
          organizationId: context.organization_id,
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { shipment_reference: shipmentReference.trim(), customer_name: customerName.trim(), issue: issue.trim(), last_known_status: lastKnownStatus.trim() || undefined, callback_number: callbackNumber.trim() || undefined } }),
        })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Ticket created, but the workflow could not start: ${error.message}` : 'Ticket created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => {
      setShipmentReference('')
      setCustomerName('')
      setIssue('delayed')
      setLastKnownStatus('')
      setCallbackNumber('')
      setShowCreate(false)
      setWorkflowNotice(result.workflowError || (result.run ? `Exception created and workflow run ${result.run.id} started.` : 'Exception created.'))
      invalidateLogistics()
    },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, {
        method: 'POST',
        organizationId: context.organization_id,
        ifMatch: `"v${run.version}"`,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody(event),
      })
    },
    onSuccess: (result) => {
      setWorkflowNotice(`Workflow updated: ${humanize(result.data.status)}.`)
      invalidateLogistics()
    },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading logistics workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page logistics-page">
    <PortalPageHeader
      eyebrow="Logistics operations"
      title="Resolve delivery exceptions before they become repeat calls"
      description="Capture shipment problems, keep dispatch follow-up visible, and give customers a clear next step without losing the original request."
      action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New delivery exception</button> : undefined}
    />

    <section className="logistics-context-bar">
      <div><Truck aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div>
      <span>This view reads the logistics workflow category from the CRM. Other support work remains in the main Inbox.</span>
    </section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createException.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createException.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form logistics-request-form" onSubmit={(event) => { event.preventDefault(); createException.mutate() }}>
      <div><span className="support-panel-kicker">Delivery exception</span><h2>Capture a shipment problem</h2><p>Record the reference and customer context first. The CRM will create the ticket and start the published logistics workflow when one is enabled.</p></div>
      <div className="support-control-grid"><label>Shipment reference<input value={shipmentReference} onChange={(event) => setShipmentReference(event.target.value)} required maxLength={120} /></label><label>Customer name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={160} /></label><label>Delivery issue<select value={issue} onChange={(event) => setIssue(event.target.value)}><option value="delayed">Delayed</option><option value="lost or damaged">Lost or damaged</option><option value="address change">Address change</option><option value="refund or compensation">Refund or compensation</option><option value="proof of delivery">Proof of delivery</option><option value="other">Other</option></select></label></div>
      <div className="support-control-grid"><label>Last known status<input value={lastKnownStatus} onChange={(event) => setLastKnownStatus(event.target.value)} placeholder="In transit, out for delivery, delivered" maxLength={160} /></label><label>Callback number<input value={callbackNumber} onChange={(event) => setCallbackNumber(event.target.value)} placeholder="Optional" maxLength={40} /></label></div>
      <button className="portal-primary-button" type="submit" disabled={createException.isPending}>{createException.isPending ? 'Creating exception' : 'Create exception'}</button>
    </form>}

    <section className="support-metric-grid logistics-metrics" aria-label="Logistics metrics">
      <LogisticsMetric label="Open exceptions" value={openTickets.length} detail="Across all loaded CRM pages" icon={Truck} />
      <LogisticsMetric label="Dispatch follow-up" value={dispatchFollowUps.length} detail="Waiting for internal action" icon={UsersThree} />
      <LogisticsMetric label="Priority exceptions" value={priorityExceptions.length} detail="High or urgent open work" icon={Warning} />
      <LogisticsMetric label="Recorded activity" value={report.data?.summary.tickets_total ?? 0} detail="In the selected period" icon={TrendUp} />
    </section>

    <div className="support-detail-grid logistics-content-grid">
      <main className="support-detail-main">
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Dispatch and customer care</span><h2>Delivery work that needs attention</h2><p>Open the ticket to preserve shipment context, assign ownership, and record the next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>
          {tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : logisticsTickets.length ? <div className="logistics-exception-list">{logisticsTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="logistics-exception-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No logistics exceptions yet" description="Create a delivery exception or connect a channel to begin routing shipment work." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture exception</button> : undefined} />}
          {tickets.hasNextPage && <button className="portal-secondary-button logistics-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more exceptions'}</button>}
        </section>

        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Workflow control</span><h2>{logisticsWorkflow?.name || 'Logistics delivery exception'}</h2><p>Use the published workflow to capture the shipment, route dispatch work, and record the final human outcome.</p></div></header>
          {logisticsWorkflow ? <div className="logistics-step-list">{logisticsWorkflow.definition.steps?.map((step, index) => <div className="logistics-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Dispatch review and resolution'}</small></div><StatusPill value={index === 0 ? 'capture' : 'dispatch review'} /></div>)}</div> : <PortalEmpty title="Logistics workflow unavailable" description="The backend has not enabled the logistics workflow catalogue for this organisation." />}
          {!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="logistics-setup-callout"><div><strong>Enable the logistics workflow</strong><p>This creates the organisation scoped workflow from the backend catalogue and publishes it for controlled use.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}
        </section>

        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked exceptions</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>
          {!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published logistics workflow to track each exception through its steps." /> : runs.isLoading ? <PortalLoading label="Loading logistics workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="logistics-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required as string[] : []; const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="logistics-run-card" key={run.id}><div className="logistics-run-header"><div><strong>{fields.shipment_reference ? String(fields.shipment_reference) : run.ticket_id}</strong><small>{fields.customer_name ? String(fields.customer_name) : 'Customer not recorded'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="logistics-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="logistics-run-actions">{run.status === 'running' && run.current_step === 'identify_shipment' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Shipment identified</button>}{run.status === 'running' && run.current_step === 'dispatch_follow_up' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'Dispatch follow-up required.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Send to dispatch</button>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Resolution outcome" aria-label={`Resolution outcome for ${fields.shipment_reference ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Dispatch follow-up completed.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create a delivery exception after enabling the workflow to begin tracking the operational path." />}
        </section>
      </main>

      <aside className="support-detail-side">
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Escalation guardrails</span><h2>Keep exceptions accountable</h2></div></header>
          {logisticsWorkflow?.escalation_rules?.rules?.length ? <ul className="logistics-rule-list">{logisticsWorkflow.escalation_rules.rules.map((rule, index) => <li key={`${rule.reason}-${index}`}><Warning aria-hidden="true" /><span>{rule.reason}</span></li>)}</ul> : <p className="support-data-note">Lost, damaged, refund, and compensation cases should remain with authorised staff.</p>}
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Dispatch queue</span><h2>{logisticsQueue?.name || 'No dispatch queue found'}</h2></div></header>
          <dl className="support-definition-list"><div><dt>Open visible work</dt><dd>{openTickets.length}</dd></div><div><dt>Waiting for dispatch</dt><dd>{dispatchFollowUps.length}</dd></div><div><dt>Current routing</dt><dd>{logisticsQueue?.routing_strategy ? humanize(logisticsQueue.routing_strategy) : 'Not configured'}</dd></div></dl>
          {logisticsQueue ? <Link className="portal-secondary-button" to="/portal/support/queues">Review queue <ArrowRight aria-hidden="true" /></Link> : hasScope(crmScopes.queuesManage) ? <button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create dispatch queue'}</button> : <p className="support-data-note">Ask an administrator to create a logistics exceptions queue.</p>}
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Customer contact</span><h2>Missed delivery calls</h2></div></header>
          <p>Review voice calls and link a callback or customer conversation to the delivery exception that needs follow-up.</p>
          <Link className="portal-secondary-button" to="/portal/support/calls"><Phone aria-hidden="true" /> Open calls</Link>
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Package context</span><h2>One place for dispatch</h2></div></header>
          <p>Each exception keeps the shipment reference, customer, current status, callback request, queue, workflow state, and final outcome together.</p>
          <div className="logistics-context-points"><span><Package aria-hidden="true" /> Shipment reference</span><span><UsersThree aria-hidden="true" /> Customer ownership</span><span><ShieldCheck aria-hidden="true" /> Human approval</span></div>
        </section>
      </aside>
    </div>
  </div>
}
