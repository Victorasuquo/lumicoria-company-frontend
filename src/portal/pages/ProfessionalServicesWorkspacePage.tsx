import {
  ArrowRight,
  Briefcase,
  CheckCircle,
  ChatCircleDots,
  Clock,
  EnvelopeSimple,
  Globe,
  Handshake,
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

type ProfessionalServicesWorkflow = {
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

const PROFESSIONAL_SERVICES_CATEGORY = 'professional_services_lead_follow_up'
const PROFESSIONAL_SERVICES_WORKFLOW_KEY = 'professional_services_lead_follow_up'
const leadSourceChannels = [
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

function ProfessionalServicesMetric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return <article className="support-metric professional-services-metric"><div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

function getRunFields(run: CRMWorkflowRun): Record<string, string> {
  const fields = run.state?.fields
  if (!fields || typeof fields !== 'object') return {}
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)]))
}

export function ProfessionalServicesWorkspacePage() {
  const { context, hasScope } = usePortalAuth()
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [showCreate, setShowCreate] = useState(false)
  const [contactName, setContactName] = useState('')
  const [serviceInterest, setServiceInterest] = useState('')
  const [leadSource, setLeadSource] = useState('')
  const [preferredFollowUp, setPreferredFollowUp] = useState('')
  const [sourceChannel, setSourceChannel] = useState<(typeof leadSourceChannels)[number]['value']>('manual')
  const [workflowNotice, setWorkflowNotice] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({})

  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'professional-services', 'analytics', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate, vertical: 'professional_services' })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = useInfiniteQuery({
    queryKey: ['portal', context?.organization_id, 'crm', 'professional-services', 'tickets', PROFESSIONAL_SERVICES_CATEGORY],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const query = crmQueryString({ category: PROFESSIONAL_SERVICES_CATEGORY, page_size: 50, page_after: pageParam })
      const { data } = await portalFetch<CRMCollection<CRMTicket>>(`/crm/tickets${query}`, { organizationId: context.organization_id })
      return data
    },
    getNextPageParam: (lastPage) => lastPage.page.has_more ? lastPage.page.next_cursor ?? undefined : undefined,
    enabled: Boolean(context?.organization_id && hasScope(crmScopes.ticketsRead)),
  })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'professional-services', 'queues'], hasScope(crmScopes.queuesRead) ? '/crm/queues?page_size=100' : null, { enabled: hasScope(crmScopes.queuesRead) })
  const workflows = usePortalQuery<{ items: ProfessionalServicesWorkflow[] }>(['crm', 'professional-services', 'workflow-catalog'], hasScope(crmScopes.workflowsRead) ? '/crm/workflows/catalog' : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const publishedTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'professional-services', 'workflow-templates', 'published'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'professional_services', status: 'published', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })
  const draftTemplates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'professional-services', 'workflow-templates', 'draft'], hasScope(crmScopes.workflowsRead) ? `/crm/workflows/templates${crmQueryString({ vertical: 'professional_services', status: 'draft', page_size: 100 })}` : null, { enabled: hasScope(crmScopes.workflowsRead) })

  const professionalServicesWorkflow = workflows.data?.items.find((workflow) => workflow.key === PROFESSIONAL_SERVICES_WORKFLOW_KEY)
  const publishedTemplate = publishedTemplates.data?.items.find((template) => template.key === PROFESSIONAL_SERVICES_WORKFLOW_KEY)
  const draftTemplate = draftTemplates.data?.items.find((template) => template.key === PROFESSIONAL_SERVICES_WORKFLOW_KEY)
  const leadQueue = queues.data?.items.find((queue) => queue.name.toLowerCase().includes('professional') || queue.name.toLowerCase().includes('lead') || queue.name.toLowerCase().includes('sales'))
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'professional-services', 'workflow-runs', publishedTemplate?.id], publishedTemplate ? `/crm/workflows/runs${crmQueryString({ template_id: publishedTemplate.id, page_size: 100 })}` : null, { enabled: Boolean(publishedTemplate && hasScope(crmScopes.workflowsRead)) })
  const leadTickets = useMemo(() => tickets.data?.pages.flatMap((page) => page.items) ?? [], [tickets.data?.pages])
  const runsByTicket = useMemo(() => new Map((runs.data?.items ?? []).filter((run) => run.ticket_id).map((run) => [run.ticket_id as string, run])), [runs.data?.items])
  const openLeads = leadTickets.filter((ticket) => !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const followUpsDue = leadTickets.filter((ticket) => ['pending_internal', 'escalated'].includes(ticket.status))
  const priorityLeads = leadTickets.filter((ticket) => ['urgent', 'high'].includes(ticket.priority) && !['resolved', 'closed', 'cancelled'].includes(ticket.status))
  const recordedLeads = report.data?.summary.tickets_total ?? 0

  const invalidateProfessionalServices = () => {
    if (!context?.organization_id) return
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm', 'professional-services'] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', context.organization_id, 'crm'] })
  }

  const enableWorkflow = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      let template = draftTemplate
      let publishETag = template ? `"v${template.revision}"` : null
      if (!template) {
        const created = await portalFetch<CRMWorkflowTemplate>('/crm/workflows/templates', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ key: PROFESSIONAL_SERVICES_WORKFLOW_KEY, name: 'Professional services lead follow-up', vertical: 'professional_services', version: 1, catalog_key: PROFESSIONAL_SERVICES_WORKFLOW_KEY }) })
        template = created.data
        publishETag = created.response.headers.get('ETag') ?? `"v${template.revision}"`
      }
      if (!publishETag) throw new Error('The professional services workflow draft could not be prepared.')
      return portalFetch<CRMWorkflowTemplate>(`/crm/workflows/templates/${template.id}/publish`, { method: 'POST', organizationId: context.organization_id, ifMatch: publishETag, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => { setWorkflowNotice('Professional services workflow enabled. New leads will now keep qualification and staff follow-up visible.'); invalidateProfessionalServices() },
  })

  const createQueue = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMQueue>('/crm/queues', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: 'Professional services leads', description: 'New service enquiries and qualified leads requiring a clear owner and staff follow-up.', routing_strategy: 'least_loaded' }) })
    },
    onSuccess: () => { setWorkflowNotice('Professional services lead queue created.'); invalidateProfessionalServices() },
  })

  const createLead = useMutation<WorkflowRunResult, Error, void>({
    mutationFn: async () => {
      if (!context) throw new Error('Organisation context is unavailable.')
      if (!contactName.trim() || !serviceInterest.trim()) throw new Error('Contact name and service interest are required.')
      let customer: CRMCustomer | null = null
      if (hasScope(crmScopes.customersManage)) {
        customer = (await portalFetch<CRMCustomer>('/crm/customers', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ display_name: contactName.trim(), profile: { workflow: PROFESSIONAL_SERVICES_WORKFLOW_KEY, service_interest: serviceInterest.trim(), lead_source: leadSource.trim() || undefined } }) })).data
      }
      const description = [`Contact: ${contactName.trim()}`, `Service interest: ${serviceInterest.trim()}`, leadSource.trim() ? `Lead source: ${leadSource.trim()}` : '', preferredFollowUp.trim() ? `Preferred follow-up: ${preferredFollowUp.trim()}` : ''].filter(Boolean).join('\n')
      const ticket = (await portalFetch<CRMTicket>('/crm/tickets', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject: `${serviceInterest.trim()} enquiry from ${contactName.trim()}`, description, source_channel: sourceChannel, customer_id: customer?.id ?? null, queue_id: leadQueue?.id ?? null, priority: 'normal', category: PROFESSIONAL_SERVICES_CATEGORY }) })).data
      if (!publishedTemplate) return { ticket, run: null, workflowError: 'Lead created. Enable the professional services workflow to start the guided follow-up path.' }
      try {
        const run = (await portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: publishedTemplate.id, ticket_id: ticket.id, fields: { contact_name: contactName.trim(), service_interest: serviceInterest.trim(), source: leadSource.trim() || undefined, preferred_follow_up: preferredFollowUp.trim() || undefined } }) })).data
        return { ticket, run, workflowError: null }
      } catch (error) {
        return { ticket, run: null, workflowError: error instanceof Error ? `Lead created, but the workflow could not start: ${error.message}` : 'Lead created, but the workflow could not start.' }
      }
    },
    onSuccess: (result) => { setContactName(''); setServiceInterest(''); setLeadSource(''); setPreferredFollowUp(''); setSourceChannel('manual'); setShowCreate(false); setWorkflowNotice(result.workflowError || (result.run ? `Lead created and workflow run ${result.run.id} started.` : 'Lead created.')); invalidateProfessionalServices() },
  })

  const applyWorkflowEvent = useMutation({
    mutationFn: async ({ run, event }: { run: CRMWorkflowRun; event: Record<string, unknown> }) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMWorkflowRun>(`/crm/workflows/runs/${run.id}/events`, { method: 'POST', organizationId: context.organization_id, ifMatch: `"v${run.version}"`, idempotencyKey: createIdempotencyKey(), ...jsonBody(event) })
    },
    onSuccess: (result) => { setWorkflowNotice(`Lead workflow updated: ${humanize(result.data.status)}.`); invalidateProfessionalServices() },
  })

  if (report.isLoading || workflows.isLoading || publishedTemplates.isLoading || tickets.isLoading) return <PortalLoading label="Loading professional services workspace" />
  if (report.error && !tickets.data) return <PortalError error={report.error} onRetry={() => void report.refetch()} />

  return <div className="portal-page support-page professional-services-page">
    <PortalPageHeader eyebrow="Professional services" title="Turn every serious enquiry into an owned next step" description="Capture service interest from calls, messages, referrals, and your website, then keep qualification and follow-up visible until a person takes over." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New service enquiry</button> : undefined} />

    <section className="professional-services-context-bar"><div><Briefcase aria-hidden="true" weight="duotone" /><label>Reporting from<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label></div><span>Consulting, legal, accounting, marketing, technology, and other service enquiries keep their source and next action together.</span></section>

    {(workflowNotice || enableWorkflow.error || createQueue.error || createLead.error || applyWorkflowEvent.error) && <div className="support-inline-notice" role="status">{workflowNotice || enableWorkflow.error?.message || createQueue.error?.message || createLead.error?.message || applyWorkflowEvent.error?.message}</div>}

    {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form professional-services-request-form" onSubmit={(event) => { event.preventDefault(); createLead.mutate() }}>
      <div><span className="support-panel-kicker">Service enquiry</span><h2>Capture the request and the reason to follow up</h2><p>Record what the person is looking for and when they would like to hear from the team. A staff member owns the next conversation.</p></div>
      <div className="support-control-grid"><label>Contact name<input value={contactName} onChange={(event) => setContactName(event.target.value)} required maxLength={160} /></label><label>Service interest<input value={serviceInterest} onChange={(event) => setServiceInterest(event.target.value)} required maxLength={240} placeholder="Tax advisory, legal review, implementation" /></label><label>Lead source<input value={leadSource} onChange={(event) => setLeadSource(event.target.value)} maxLength={160} placeholder="Referral, advert, website, event" /></label><label>Preferred follow-up<input value={preferredFollowUp} onChange={(event) => setPreferredFollowUp(event.target.value)} maxLength={160} placeholder="Optional" /></label><label>Entry channel<select value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value as typeof sourceChannel)}>{leadSourceChannels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label></div>
      <button className="portal-primary-button" type="submit" disabled={createLead.isPending}>{createLead.isPending ? 'Creating enquiry' : 'Create service enquiry'}</button>
    </form>}

    <section className="support-metric-grid professional-services-metrics" aria-label="Professional services metrics"><ProfessionalServicesMetric label="Open enquiries" value={openLeads.length} detail="Across all loaded CRM pages" icon={ChatCircleDots} /><ProfessionalServicesMetric label="Follow-up due" value={followUpsDue.length} detail="Waiting for staff action" icon={Clock} /><ProfessionalServicesMetric label="Priority enquiries" value={priorityLeads.length} detail="High or urgent open work" icon={Warning} /><ProfessionalServicesMetric label="Recorded enquiries" value={recordedLeads} detail="In the selected period" icon={TrendUp} /></section>

    <div className="support-detail-grid professional-services-content-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Lead and enquiry support</span><h2>Requests that need attention</h2><p>Open the enquiry to preserve the service interest, source, owner, and next action.</p></div><Link className="portal-secondary-button" to="/portal/support/inbox">Open main Inbox <ArrowRight aria-hidden="true" /></Link></header>{tickets.error ? <PortalError error={tickets.error} onRetry={() => void tickets.refetch()} /> : leadTickets.length ? <div className="professional-services-request-list">{leadTickets.map((ticket) => { const run = runsByTicket.get(ticket.id); return <Link className="professional-services-request-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={run ? humanize(run.status) : humanize(ticket.status)} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No service enquiries yet" description="Create a service enquiry or connect a channel to begin routing professional services leads." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(true)}><Plus aria-hidden="true" /> Capture enquiry</button> : undefined} />}{tickets.hasNextPage && <button className="portal-secondary-button professional-services-load-more" type="button" onClick={() => void tickets.fetchNextPage()} disabled={tickets.isFetchingNextPage}>{tickets.isFetchingNextPage ? 'Loading more' : 'Load more enquiries'}</button>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow control</span><h2>{professionalServicesWorkflow?.name || 'Professional services lead follow-up'}</h2><p>Understand the request, assign ownership, and schedule the next staff conversation.</p></div></header>{professionalServicesWorkflow ? <div className="professional-services-step-list">{professionalServicesWorkflow.definition.steps?.map((step, index) => <div className="professional-services-step" key={step.key}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.label}</strong><small>{step.required_fields?.length ? `Required: ${step.required_fields.map(humanize).join(', ')}` : 'Staff follow-up and resolution'}</small></div><StatusPill value={index === 0 ? 'qualification' : 'staff follow-up'} /></div>)}</div> : <PortalEmpty title="Professional services workflow unavailable" description="The backend has not enabled the professional services workflow catalogue for this organisation." />}{!publishedTemplate && hasScope(crmScopes.workflowsManage) && <div className="professional-services-setup-callout"><div><strong>Enable the professional services workflow</strong><p>This creates the organisation-scoped workflow and keeps every lead linked to a clear next step.</p></div><button className="portal-primary-button" type="button" onClick={() => enableWorkflow.mutate()} disabled={enableWorkflow.isPending}>{enableWorkflow.isPending ? 'Enabling workflow' : draftTemplate ? 'Publish workflow' : 'Enable workflow'}</button></div>}{!leadQueue && hasScope(crmScopes.queuesManage) && <div className="professional-services-setup-callout"><div><strong>Create the lead queue</strong><p>Route new enquiries to a named professional services team before accepting work.</p></div><button className="portal-secondary-button" type="button" onClick={() => createQueue.mutate()} disabled={createQueue.isPending}>{createQueue.isPending ? 'Creating queue' : 'Create queue'}</button></div>}</section>

      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Live workflow runs</span><h2>{runs.data?.items.length ?? 0} tracked service enquiries</h2><p>Progress comes from the CRM workflow run, not a local status label.</p></div></header>{!publishedTemplate ? <PortalEmpty title="Workflow runs are not enabled" description="Enable the published professional services workflow to track qualification and follow-up." /> : runs.isLoading ? <PortalLoading label="Loading professional services workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.length ? <div className="professional-services-run-list">{runs.data.items.filter((run) => run.ticket_id).map((run) => { const fields = getRunFields(run); const missing = Array.isArray(run.state?.missing_required) ? run.state.missing_required : []; const canResolve = missing.length === 0 && ['running', 'waiting_human'].includes(run.status); return <article className="professional-services-run-card" key={run.id}><div className="professional-services-run-header"><div><strong>{fields.service_interest || 'Service enquiry'}</strong><small>{fields.contact_name || 'Contact not recorded'} · {fields.preferred_follow_up || 'Follow-up time not recorded'} · {run.current_step ? humanize(run.current_step) : 'No current step'}</small></div><StatusPill value={humanize(run.status)} /></div>{run.state?.escalation_reason && <p className="professional-services-run-warning"><Warning aria-hidden="true" /> {String(run.state.escalation_reason)}</p>}{missing.length > 0 && <p className="support-data-note">Missing: {missing.map(humanize).join(', ')}</p>}<div className="professional-services-run-actions">{run.status === 'running' && run.current_step === 'qualify_request' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'complete_step' } })} disabled={applyWorkflowEvent.isPending}><CheckCircle aria-hidden="true" /> Request understood</button>}{run.status === 'running' && run.current_step === 'schedule_follow_up' && <button className="portal-secondary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'action', action: 'request_human', reason: 'Professional services follow-up requires staff ownership.' } })} disabled={applyWorkflowEvent.isPending}><UsersThree aria-hidden="true" /> Assign staff follow-up</button>}{run.status === 'waiting_human' && canResolve && <><input value={resolutionNotes[run.id] ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [run.id]: event.target.value }))} placeholder="Follow-up outcome" aria-label={`Follow-up outcome for ${fields.service_interest ?? run.id}`} /><button className="portal-primary-button" type="button" onClick={() => applyWorkflowEvent.mutate({ run, event: { event_type: 'human_resolution', outcome: resolutionNotes[run.id]?.trim() || 'Staff follow-up completed.' } })} disabled={applyWorkflowEvent.isPending}><ShieldCheck aria-hidden="true" /> Record outcome</button></>}{['completed', 'cancelled'].includes(run.status) && <span className="support-data-note">Completed {run.completed_at ? formatPortalDate(run.completed_at, true) : 'without a timestamp'}</span>}</div></article> })}</div> : <PortalEmpty title="No workflow runs yet" description="Create a service enquiry after enabling the workflow to begin tracking the follow-up path." />}</section>
    </main>

    <aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Commercial context</span><h2>Make the next conversation count</h2></div></header><p>Each enquiry keeps the contact, service interest, source, preferred follow-up, queue, owner, and final outcome together.</p><div className="professional-services-context-points"><span><Handshake aria-hidden="true" /> Serious enquiries and referrals</span><span><Globe aria-hidden="true" /> Lead source stays visible</span><span><EnvelopeSimple aria-hidden="true" /> Follow-up stays with the team</span><span><Phone aria-hidden="true" /> Calls and messages share context</span></div></section><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Operating rule</span><h2>No lead left without an owner</h2></div></header><p className="professional-services-guardrail"><Warning aria-hidden="true" /> The workflow does not treat a captured enquiry as a completed sale. A team member owns the next conversation and records the outcome.</p></section></aside></div>
  </div>
}
