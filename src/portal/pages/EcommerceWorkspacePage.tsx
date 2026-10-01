import {
  ArrowRight,
  CheckCircle,
  ChatCircleDots,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBagOpen,
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
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
  formatPortalDate,
  humanize,
} from '../components/PortalState'

type EcommerceWorkflow = {
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

const ECOMMERCE_CATEGORY = 'ecommerce_order_status'
const ECOMMERCE_WORKFLOW_KEY = 'ecommerce_order_status'
const ecommerceSourceChannels = [
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
  const bytes = new TextEncoder().encode(value.trim())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function EcommerceMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric ecommerce-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function EcommerceWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [orderReference, setOrderReference] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [requestType, setRequestType] = useState('status')
  const [sourceChannel, setSourceChannel] = useState<(typeof ecommerceSourceChannels)[number]['value']>('manual')
  const [paymentReference, setPaymentReference] = useState('')
  const [callbackNumber, setCallbackNumber] = useState('')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'ecommerce', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'ecommerce' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'ecommerce', 'tickets', ECOMMERCE_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: ECOMMERCE_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(
    ['crm', 'ecommerce', 'queues'],
    hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null,
    { enabled: hasScope(crmScopes.queuesRead) },
  )
  const workflows = usePortalQuery<{ items: EcommerceWorkflow[] }>(
    ['crm', 'ecommerce', 'workflow-catalog'],
    hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(
    ['crm', 'ecommerce', 'workflow-templates', 'published'],
    hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'ecommerce', status: 'published', page_size: 100 })}` : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(
    ['crm', 'ecommerce', 'workflow-templates', 'draft'],
    hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'ecommerce', status: 'draft', page_size: 100 })}` : null,
    { enabled: hasScope(crmScopes.workflowsRead) },
  )

  const ecommerceWorkflow = workflows.data?.items.find((workflow) => workflow.key === ECOMMERCE_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === ECOMMERCE_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === ECOMMERCE_WORKFLOW_KEY)
  const ecommerceQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('ecommerce') || queue.name.toLowerCase().includes('order') || queue.name.toLowerCase().includes('retail'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(
    ['crm', 'ecommerce', 'workflow-runs', publishedTemplate?.id],
    publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null,
    { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) },
  )
  const ecommerceTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openTickets = ecommerceTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const orderTeamFollowUps = ecommerceTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const priorityOrders = ecommerceTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const socialOrderRequests = ecommerceTickets.filter((ticket) => ['whatsapp', 'facebook', 'instagram'].includes(ticket.source_channel))

  const invalidateEcommerce = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'ecommerce'] })
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
          ...jsonBody({ key: ECOMMERCE_WORKFLOW_KEY, name: 'Ecommerce order support', vertical: 'ecommerce', version: 1, catalog_key: ECOMMERCE_WORKFLOW_KEY }),
        })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The Ecommerce workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, {
        method: 'POST',
        organizationId: context.organization_id,
        ifMatch: publishETag,
        idempotencyKey: createIdempotencyKey(),
      })
    },
    onSuccess: () => {
      setWorkflowNotice('Ecommerce workflow enabled. New order requests will now open a tracked workflow run.')
      invalidateEcommerce()
    },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', {
        method: 'POST',
        organizationId: context.organization_id,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({ name: 'Ecommerce orders', description: 'Order, delivery, return, and refund requests that need customer care follow-up.', routing_strategy: 'least_loaded' }),
      })
    },
    onSuccess: () => {
      setWorkflowNotice('Ecommerce orders queue created.')
      invalidateEcommerce()
    },
  })

  const createOrderRequest = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!orderReference.trim() || !customerName.trim()) throw new Error('Order reference and customer name are required.')
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
            ...jsonBody({ display_name: customerName.trim(), profile: { workflow: ECOMMERCE_WORKFLOW_KEY } }),
          })).data
        }
      }
      const description = [
        `Order reference: ${orderReference.trim()}`,
        `Customer: ${customerName.trim()}`,
        `Request type: ${requestType.trim()}`,
        paymentReference.trim() ? `Payment reference: ${paymentReference.trim()}` : '',
        callbackNumber.trim() ? 'Callback requested: yes' : '',
      ].filter(Boolean).join('\n')
      const highPriority = ['return', 'refund'].includes(requestType)
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', {
        method: 'POST',
        organizationId: context.organization_id,
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({ subject: `Order ${requestType.trim()} ${orderReference.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: ecommerceQueue?.id ?? null, priority: highPriority ? 'urgent' : 'normal', category: ECOMMERCE_CATEGORY }),
      })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Ticket created. Enable the Ecommerce workflow to start the guided order path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', {
          method: 'POST',
          organizationId: context.organization_id,
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { order_reference: orderReference.trim(), customer_name: customerName.trim(), request_type: requestType.trim(), payment_reference: paymentReference.trim() || undefined } }),
        })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Ticket created, but the workflow could not start: ${error.message}` : 'Ticket created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => {
      setOrderReference('')
      setCustomerName('')
      setRequestType('status')
      setSourceChannel('manual')
      setPaymentReference('')
      setCallbackNumber('')
      setShowCreate(false)
      setWorkflowNotice(result.workflowError || (result.run ? `Order request created and workflow run ${result.run.id} started.` : 'Order request created.'))
      invalidateEcommerce()
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
      invalidateEcommerce()
    },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading Ecommerce workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page ecommerce-page">
    <PortalPageHeader
      eyebrow="Ecommerce operations"
      title="Move order questions to resolution, not another follow-up"
      description="Keep order, delivery, return, and refund requests in one visible queue so customer care can respond with the right context."
      action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New order request</button> : undefined}
    />

    <section className="ecommerce-context-bar">
      <div><ShoppingBagOpen aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div>
      <span>This view reads the Ecommerce workflow category from the CRM. Other support work remains in the main Inbox.</span>
    </section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createOrderRequest.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createOrderRequest.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form ecommerce-request-form" onSubmit={(event) => { event.preventDefault(); createOrderRequest.mutate() }}>
      <div><span className="support-panel-kicker">Order request</span><h2>Capture a customer order question</h2><p>Record the order reference first. The CRM will create the ticket and start the published Ecommerce workflow when one is enabled.</p></div>
      <div className="support-control-grid"><label>Order reference<input value={orderReference} onChange={(event) => setOrderReference(event.target.value)} required maxLength={120} /></label><label>Customer name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={160} /></label><label>Request type<select value={requestType} onChange={(event) => setRequestType(event.target.value)}><option value="status">Order status</option><option value="delivery">Delivery update</option><option value="product">Product question</option><option value="return">Return request</option><option value="refund">Refund request</option></select></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{ecommerceSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <div className="support-control-grid"><label>Payment reference<input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Optional" maxLength={160} /></label><label>Callback number<input value={callbackNumber} onChange={(event) => setCallbackNumber(event.target.value)} placeholder="Optional" maxLength={40} /></label></div>
      <button className="portal-primary-button" type="submit" disabled={createOrderRequest.isPending}>{createOrderRequest.isPending ? 'Creating request' : 'Create order request'}</button>
    </form>}

    <section className="support-metric-grid ecommerce-metrics" aria-label="Ecommerce metrics">
      <EcommerceMetric label="Open order work" value={openTickets.length} detail="Across all loaded CRM pages" icon={ShoppingBagOpen} />
      <EcommerceMetric label="Order team follow-up" value={orderTeamFollowUps.length} detail="Waiting for internal action" icon={UsersThree} />
      <EcommerceMetric label="Priority requests" value={priorityOrders.length} detail="High or urgent open work" icon={Warning} />
      <EcommerceMetric label="Recorded activity" value={report.data?.summary.tickets_total ?? 0} detail="In the selected period" icon={TrendUp} />
      <EcommerceMetric label="Social and WhatsApp" value={socialOrderRequests.length} detail="Loaded order requests" icon={ChatCircleDots} />
    </section>

    <div className="support-detail-grid ecommerce-content-grid">
      <main className="support-detail-main">
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Customer care and fulfilment</span><h2>Order work that needs attention</h2><p>Open the ticket to preserve order context, assign ownership, and record the next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>
          {tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : ecommerceTickets.length ? <div className="ecommerce-request-list">{ecommerceTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="ecommerce-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No order requests yet" description="Create an order request or connect a channel to begin routing ecommerce work." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture request</button> : undefined} />}
          {tickets.hasNextPage && <button className="portal-secondary-button ecommerce-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more requests'}</button>}
        </section>

        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Workflow control</span><h2>{ecommerceWorkflow?.name || 'Ecommerce order support'}</h2><p>Identify the order first, then resolve the request or keep returns and refunds with an authorised staff member.</p></div></header>
          {ecommerceWorkflow ? <div className="ecommerce-step-list">{ecommerceWorkflow.definition.steps?.map((step, index) => <div className="ecommerce-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Order team review and resolution'}</small></div><StatusPill value={index === 0 ? 'capture' : 'team review'} /></div>)}</div> : <PortalEmpty title="Ecommerce workflow unavailable" description="The backend has not enabled the Ecommerce workflow catalogue for this organisation." />}
          {!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="ecommerce-setup-callout"><div><strong>Enable the Ecommerce workflow</strong><p>This creates the organisation scoped workflow from the backend catalogue and publishes it for controlled use.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}
        </section>

        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked requests</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>
          {!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published Ecommerce workflow to track each order request through its steps." /> : runs.isLoading ? <PortalLoading label="Loading Ecommerce workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="ecommerce-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); const needsReview = ['return', 'refund'].includes(fields.request_type); return <article className="ecommerce-run-card" key={run.id}><div className="ecommerce-run-header"><div><strong>{fields.order_reference || run.ticket_id}</strong><small>{fields.customer_name || 'Customer not recorded'} · {fields.request_type ? humanize(fields.request_type) : 'Order request'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="ecommerce-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="ecommerce-run-actions">{run.status === 'running' && run.current_step === 'identify_order' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Order identified</button>}{run.status === 'running' && run.current_step === 'resolve_or_escalate' && needsReview && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'Return or refund review required.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Send to order team</button>}{run.status === 'running' && run.current_step === 'resolve_or_escalate' && !needsReview && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Resolution outcome" aria-label={`Resolution outcome for ${fields.order_reference ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Order request resolved.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Staff outcome" aria-label={`Staff outcome for ${fields.order_reference ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Order team completed the review.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record resolution</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create an order request after enabling the workflow to begin tracking the operational path." />}
        </section>
      </main>

      <aside className="support-detail-side">
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Escalation guardrails</span><h2>Keep order decisions accountable</h2></div></header>
          {ecommerceWorkflow?.escalation_rules?.rules?.length ? <ul className="ecommerce-rule-list">{ecommerceWorkflow.escalation_rules.rules.map((rule, index) => <li key={`${rule.reason}-${index}`}><Warning aria-hidden="true" /><span>{rule.reason}</span></li>)}</ul> : <p className="support-data-note">Returns and refunds should remain with authorised staff.</p>}
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Order queue</span><h2>{ecommerceQueue?.name || 'No order queue found'}</h2></div></header>
          <dl className="support-definition-list"><div><dt>Open visible work</dt><dd>{openTickets.length}</dd></div><div><dt>Waiting for order team</dt><dd>{orderTeamFollowUps.length}</dd></div><div><dt>Current routing</dt><dd>{ecommerceQueue?.routing_strategy ? humanize(ecommerceQueue.routing_strategy) : 'Not configured'}</dd></div></dl>
          {ecommerceQueue ? <Link className="portal-secondary-button" to="/portal/support/queues">Review queue <ArrowRight aria-hidden="true" /></Link> : hasScope(crmScopes.queuesManage) ? <button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create order queue'}</button> : <p className="support-data-note">Ask an administrator to create an Ecommerce orders queue.</p>}
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Customer contact</span><h2>Order calls and messages</h2></div></header>
          <p>Calls, WhatsApp messages, Facebook comments, Instagram messages, email, and website requests can all enter the same order queue when their channel connection is verified.</p>
          <div className="support-action-group"><Link className="portal-secondary-button" to="/portal/support/calls"><Phone aria-hidden="true" /> Open calls</Link><Link className="portal-secondary-button" to="/portal/support/channels"><ChatCircleDots aria-hidden="true" /> Review channels</Link></div>
        </section>
        <section className="portal-panel support-panel">
          <header><div><span className="support-panel-kicker">Order context</span><h2>Keep the whole request together</h2></div></header>
          <p>Each request keeps the order reference, customer, request type, payment reference, queue, workflow state, and final outcome visible to the team.</p>
          <div className="ecommerce-context-points"><span><Package aria-hidden="true" /> Order reference</span><span><UsersThree aria-hidden="true" /> Customer ownership</span><span><ShieldCheck aria-hidden="true" /> Human approval</span></div>
        </section>
      </aside>
    </div>
  </div>
}
