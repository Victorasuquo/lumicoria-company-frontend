import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Funnel,
  MagnifyingGlass,
  PaperPlaneTilt,
  Phone,
  Plus,
  TrendUp,
  UserCircle,
  UsersThree,
  Warning,
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import {
  analyticsQueryString,
  crmQueryString,
  crmScopes,
  type CRMAnalyticsReport,
  type CRMCollection,
  type CRMConnectorHealth,
  type CRMConnectorSyncResponse,
  type CRMConversation,
  type CRMCustomer,
  type CRMMessage,
  type CRMNotificationDelivery,
  type CRMOperation,
  type CRMQueue,
  type CRMTicket,
  type CRMTicketEvent,
  type CRMWorkflowRun,
  type CRMWorkflowTemplate,
} from '../../api/crm'
import type { VoiceCallRecord, VoiceCollection } from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery, useVoiceQuery } from '../hooks'
import {
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
  formatPortalDate,
  humanize,
} from '../components/PortalState'
import { portalQueryClient } from '../query'

const ticketStatuses = ['open', 'in_progress', 'pending_customer', 'pending_internal', 'escalated', 'resolved', 'closed']
const priorities = ['low', 'normal', 'high', 'urgent']
const channels = ['voice', 'whatsapp', 'facebook', 'instagram', 'email', 'web_chat', 'widget', 'manual']

function SupportAccess({ scope, children }: { scope: string; children: React.ReactNode }) {
  const { hasScope } = usePortalAuth()
  if (!hasScope(scope)) {
    return <PortalEmpty title="Access not granted" description="Your organisation administrator has not enabled this support area for your account." />
  }
  return <>{children}</>
}

function invalidateCRM(organizationId: string | undefined, ...segments: string[]) {
  if (!organizationId) return
  void portalQueryClient.invalidateQueries({ queryKey: ['portal', organizationId, 'crm', ...segments] })
  void portalQueryClient.invalidateQueries({ queryKey: ['portal', organizationId, 'crm'] })
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof TrendUp }) {
  return (
    <article className="support-metric">
      <div className="support-metric-icon"><Icon aria-hidden="true" weight="duotone" /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function CollectionMessage({ isLoading, error, onRetry, emptyTitle, emptyDescription, children }: {
  isLoading: boolean
  error: Error | null
  onRetry?: () => void
  emptyTitle: string
  emptyDescription: string
  children: React.ReactNode
}) {
  if (isLoading) return <PortalLoading label="Loading support work" />
  if (error) return <PortalError error={error} onRetry={onRetry} />
  return children || <PortalEmpty title={emptyTitle} description={emptyDescription} />
}

export function SupportOverviewPage() {
  const { context, hasScope } = usePortalAuth()
  const fromDate = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().slice(0, 10)
  }, [])
  const report = usePortalQuery<CRMAnalyticsReport>(
    ['crm', 'analytics', 'overview', fromDate],
    hasScope(crmScopes.analyticsRead) ? `/crm/analytics/report${analyticsQueryString({ from_date: fromDate })}` : null,
    { enabled: hasScope(crmScopes.analyticsRead) },
  )
  const tickets = usePortalQuery<CRMCollection<CRMTicket>>(
    ['crm', 'tickets', 'overview'],
    hasScope(crmScopes.ticketsRead) ? '/crm/tickets?page_size=8' : null,
    { enabled: hasScope(crmScopes.ticketsRead) },
  )

  return (
    <SupportAccess scope={crmScopes.ticketsRead}>
      <div className="portal-page support-page">
        <PortalPageHeader
          eyebrow="Support workspace"
          title="Keep every customer request moving"
          description="See what needs a reply, what has been handed to a person, and where work is waiting across your organisation."
          action={<Link className="portal-primary-button" to="/portal/support/tickets"><Plus aria-hidden="true" /> New ticket</Link>}
        />
        {report.error && <PortalError error={report.error} onRetry={() => void report.refetch()} title="Support metrics are unavailable" />}
        {report.isLoading ? <PortalLoading label="Loading support metrics" /> : report.data ? (
          <section className="support-metric-grid" aria-label="Support overview metrics">
            <Metric label="Open tickets" value={report.data.summary.open_tickets ?? 0} detail="Current unresolved work" icon={TrendUp} />
            <Metric label="Missed calls" value={report.data.summary.missed_calls ?? 0} detail="From the selected period" icon={Phone} />
            <Metric label="Human handoffs" value={report.data.summary.handoffs ?? 0} detail="Needs staff attention" icon={UsersThree} />
            <Metric label="SLA warnings" value={report.data.summary.sla_warnings ?? 0} detail="Review before they breach" icon={Warning} />
          </section>
        ) : (
          <PortalEmpty title="No support metrics yet" description="Metrics will appear after your organisation receives support activity." />
        )}

        <div className="support-overview-grid">
          <section className="portal-panel support-panel">
            <header><div><span className="support-panel-kicker">Needs attention</span><h2>Recent tickets</h2><p>Open work ordered by the latest activity.</p></div><Link to="/portal/support/inbox">Open inbox <ArrowRight aria-hidden="true" /></Link></header>
            <TicketRows tickets={tickets.data?.items ?? []} />
          </section>
          <section className="portal-panel support-panel">
            <header><div><span className="support-panel-kicker">Operating view</span><h2>Channel mix</h2><p>Where requests are entering your workspace.</p></div></header>
            <div className="support-channel-list">
              {(report.data?.by_channel ?? []).map((item, index) => {
                const channel = String(item.channel ?? item.name ?? `Channel ${index + 1}`)
                const volume = Number(item.total ?? item.count ?? 0)
                return <div className="support-channel-row" key={channel}><span>{humanize(channel)}</span><strong>{volume}</strong><div><i style={{ width: `${Math.min(100, Math.max(4, volume))}%` }} /></div></div>
              })}
              {!report.data?.by_channel?.length && <PortalEmpty title="No channel activity" description="Channel totals will appear when messages and calls are recorded." />}
            </div>
          </section>
        </div>
        {context?.organization_id && report.data && (
          <p className="support-data-note">Reporting period: {formatPortalDate(report.data.from_date)} to {formatPortalDate(report.data.to_date)}. Values come from reconciled CRM source events.</p>
        )}
      </div>
    </SupportAccess>
  )
}

function TicketRows({ tickets }: { tickets: CRMTicket[] }) {
  if (!tickets.length) return <PortalEmpty title="No tickets yet" description="New calls, messages, and manual requests will appear here." action={<Link className="portal-secondary-button" to="/portal/support/tickets"><Plus aria-hidden="true" /> Create ticket</Link>} />
  return <div className="support-ticket-rows">{tickets.map((ticket) => <Link to={`/portal/support/tickets/${ticket.id}`} className="support-ticket-row" key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} aria-label={`${ticket.priority} priority`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · Updated {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={ticket.status} /><ArrowRight aria-hidden="true" /></Link>)}</div>
}

export function SupportInboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const query = { search: searchParams.get('search'), status: searchParams.get('status'), priority: searchParams.get('priority'), source_channel: searchParams.get('channel'), page_size: 50 }
  const tickets = usePortalQuery<CRMCollection<CRMTicket>>(['crm', 'inbox', query], `/crm/tickets${crmQueryString(query)}`)
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
  return (
    <SupportAccess scope={crmScopes.ticketsRead}>
      <div className="portal-page support-page">
        <PortalPageHeader eyebrow="Support workspace" title="Inbox" description="One working list for calls, messages, and requests that still need a clear next step." action={<Link className="portal-primary-button" to="/portal/support/tickets"><Plus aria-hidden="true" /> New ticket</Link>} />
        <section className="portal-panel support-filter-panel">
          <form className="support-filter-bar" onSubmit={(event) => { event.preventDefault(); updateFilter('search', search.trim()) }}>
            <label className="support-search"><MagnifyingGlass aria-hidden="true" /><span className="sr-only">Search tickets</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests or subjects" /></label>
            <label><span className="sr-only">Filter by status</span><select value={searchParams.get('status') ?? ''} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{ticketStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label>
            <label><span className="sr-only">Filter by channel</span><select value={searchParams.get('channel') ?? ''} onChange={(event) => updateFilter('channel', event.target.value)}><option value="">All channels</option>{channels.map((channel) => <option key={channel} value={channel}>{humanize(channel)}</option>)}</select></label>
            <label><span className="sr-only">Filter by priority</span><select value={searchParams.get('priority') ?? ''} onChange={(event) => updateFilter('priority', event.target.value)}><option value="">All priorities</option>{priorities.map((priority) => <option key={priority} value={priority}>{humanize(priority)}</option>)}</select></label>
            <button className="portal-secondary-button" type="submit"><Funnel aria-hidden="true" /> Apply</button>
          </form>
        </section>
        <section className="portal-panel support-table-panel">
          <header><div><span className="support-panel-kicker">Live queue</span><h2>{tickets.data?.items.length ?? 0} visible tickets</h2><p>Use the filters to focus on the work your team can act on now.</p></div></header>
          <CollectionMessage isLoading={tickets.isLoading} error={tickets.error} onRetry={() => void tickets.refetch()} emptyTitle="Inbox is clear" emptyDescription="There are no tickets matching these filters."><TicketRows tickets={tickets.data?.items ?? []} /></CollectionMessage>
        </section>
      </div>
    </SupportAccess>
  )
}

export function SupportTicketsPage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState('manual')
  const tickets = usePortalQuery<CRMCollection<CRMTicket>>(['crm', 'tickets', 'all'], '/crm/tickets?page_size=100')
  const createTicket = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMTicket>('/crm/tickets', { organizationId: context.organization_id, method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ subject, description, source_channel: channel, priority: 'normal' }) })
    },
    onSuccess: () => { setSubject(''); setDescription(''); setShowCreate(false); invalidateCRM(context?.organization_id, 'tickets') },
  })
  return (
    <SupportAccess scope={crmScopes.ticketsRead}>
      <div className="portal-page support-page">
        <PortalPageHeader eyebrow="Support records" title="Tickets" description="Track ownership, urgency, customer replies, and the final outcome for every request." action={hasScope(crmScopes.ticketsManage) ? <button className="portal-primary-button" type="button" onClick={() => setShowCreate((current) => !current)}><Plus aria-hidden="true" /> New ticket</button> : undefined} />
        {showCreate && hasScope(crmScopes.ticketsManage) && <form className="portal-panel support-create-form" onSubmit={(event) => { event.preventDefault(); if (subject.trim() && description.trim()) createTicket.mutate() }}><div><span className="support-panel-kicker">Manual request</span><h2>Start a ticket</h2><p>Use this for a request that did not arrive through a connected channel.</p></div><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={300} /></label><label>What needs to happen?<textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={4} /></label><label>Source channel<select value={channel} onChange={(event) => setChannel(event.target.value)}>{channels.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}</select></label>{createTicket.error && <PortalError error={createTicket.error} /> }<button className="portal-primary-button" disabled={createTicket.isPending} type="submit">{createTicket.isPending ? 'Creating ticket' : 'Create ticket'}</button></form>}
        <section className="portal-panel support-table-panel"><header><div><span className="support-panel-kicker">All support records</span><h2>{tickets.data?.items.length ?? 0} tickets</h2><p>Open a record to change ownership, reply, escalate, or resolve it.</p></div></header><CollectionMessage isLoading={tickets.isLoading} error={tickets.error} onRetry={() => void tickets.refetch()} emptyTitle="No tickets yet" emptyDescription="Create a ticket manually or connect a support channel to begin."><TicketRows tickets={tickets.data?.items ?? []} /></CollectionMessage></section>
      </div>
    </SupportAccess>
  )
}

export function SupportTicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const { context, hasScope } = usePortalAuth()
  const ticket = usePortalQuery<CRMTicket>(['crm', 'ticket', ticketId], ticketId ? `/crm/tickets/${ticketId}` : null)
  const events = usePortalQuery<CRMCollection<CRMTicketEvent>>(['crm', 'ticket-events', ticketId], ticketId ? `/crm/tickets/${ticketId}/events?page_size=100` : null, { enabled: Boolean(ticketId) && hasScope(crmScopes.auditRead) })
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'queues', 'ticket-detail'], '/crm/queues?page_size=100', { enabled: hasScope(crmScopes.queuesRead) })
  const [reply, setReply] = useState('')
  const updateTicket = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => portalFetch<CRMTicket>(`/crm/tickets/${ticketId}`, { organizationId: context?.organization_id, method: 'PATCH', ifMatch: ticket.data ? `"v${ticket.data.version}"` : undefined, idempotencyKey: createIdempotencyKey(), ...jsonBody(payload) }),
    onSuccess: () => invalidateCRM(context?.organization_id, 'ticket', ticketId ?? '', 'tickets'),
  })
  const assignTicket = useMutation({
    mutationFn: async (queueId: string) => portalFetch<CRMTicket>(`/crm/tickets/${ticketId}/assignment`, { organizationId: context?.organization_id, method: 'POST', ifMatch: ticket.data ? `"v${ticket.data.version}"` : undefined, idempotencyKey: createIdempotencyKey(), ...jsonBody({ queue_id: queueId || null }) }),
    onSuccess: () => invalidateCRM(context?.organization_id, 'ticket', ticketId ?? ''),
  })
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!ticket.data?.conversation_id) throw new Error('This ticket has no conversation to reply to.')
      return portalFetch<CRMMessage>(`/crm/conversations/${ticket.data.conversation_id}/messages`, { organizationId: context?.organization_id, method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ direction: 'outbound', author_type: 'operator', author_id: context?.principal_id, body: reply.trim() }) })
    },
    onSuccess: () => { setReply(''); invalidateCRM(context?.organization_id, 'ticket', ticketId ?? '', 'conversation') },
  })
  if (ticket.isLoading) return <PortalLoading label="Loading ticket" />
  if (ticket.error) return <PortalError error={ticket.error} onRetry={() => void ticket.refetch()} />
  if (!ticket.data) return <PortalEmpty title="Ticket not found" description="This ticket may have been removed or is outside your organisation." />
  const currentTicket = ticket.data
  return <SupportAccess scope={crmScopes.ticketsRead}><div className="portal-page support-page"><button className="support-back-link" type="button" onClick={() => navigate(-1)}><ArrowLeft aria-hidden="true" /> Back to tickets</button><PortalPageHeader eyebrow={`Ticket ${currentTicket.id}`} title={currentTicket.subject} description={currentTicket.description} action={<StatusPill value={currentTicket.status} />} /><div className="support-detail-grid"><main className="support-detail-main"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Ticket controls</span><h2>Move the request forward</h2></div></header><div className="support-control-grid"><label>Status<select value={currentTicket.status} disabled={!hasScope(crmScopes.ticketsManage)} onChange={(event) => updateTicket.mutate({ status: event.target.value })}>{ticketStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label><label>Priority<select value={currentTicket.priority} disabled={!hasScope(crmScopes.ticketsManage)} onChange={(event) => updateTicket.mutate({ priority: event.target.value })}>{priorities.map((priority) => <option key={priority} value={priority}>{humanize(priority)}</option>)}</select></label><label>Queue<select value={currentTicket.queue_id ?? ''} disabled={!hasScope(crmScopes.queuesManage)} onChange={(event) => assignTicket.mutate(event.target.value)}><option value="">Unassigned queue</option>{queues.data?.items.map((queue) => <option key={queue.id} value={queue.id}>{queue.name}</option>)}</select></label></div>{(updateTicket.error || assignTicket.error) && <PortalError error={updateTicket.error || assignTicket.error} />}</section><ConversationPanel ticket={currentTicket} reply={reply} setReply={setReply} sendReply={sendReply} canReply={hasScope(crmScopes.messagesManage)} /><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Audit trail</span><h2>Ticket events</h2></div></header>{events.isLoading ? <PortalLoading label="Loading ticket history" /> : events.error ? <PortalError error={events.error} onRetry={() => void events.refetch()} /> : <div className="support-event-list">{events.data?.items.map((event) => <div key={event.id}><span className="support-event-dot" /><div><strong>{humanize(event.event_type)}</strong><small>{event.from_status ? `${humanize(event.from_status)} to ${humanize(event.to_status)}` : 'Recorded action'} · {formatPortalDate(event.created_at, true)}</small></div></div>)}</div>}</section></main><aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Request details</span><h2>Ownership</h2></div></header><dl className="support-definition-list"><div><dt>Channel</dt><dd>{humanize(currentTicket.source_channel)}</dd></div><div><dt>Customer</dt><dd>{currentTicket.customer_id ? <Link to={`/portal/support/customers/${currentTicket.customer_id}`}>{currentTicket.customer_id}</Link> : 'Not matched'}</dd></div><div><dt>Queue</dt><dd>{currentTicket.queue_id || 'Not assigned'}</dd></div><div><dt>Owner</dt><dd>{currentTicket.assignee_id || 'Not assigned'}</dd></div><div><dt>Last activity</dt><dd>{formatPortalDate(currentTicket.last_activity_at, true)}</dd></div><div><dt>Resolution</dt><dd>{currentTicket.resolution_reason || 'Not resolved'}</dd></div></dl></section></aside></div></div></SupportAccess>
}

function ConversationPanel({ ticket, reply, setReply, sendReply, canReply }: { ticket: CRMTicket; reply: string; setReply: (value: string) => void; sendReply: { mutate: () => void; isPending: boolean; error: Error | null }; canReply: boolean }) {
  const conversation = usePortalQuery<CRMConversation>(['crm', 'conversation', ticket.conversation_id], ticket.conversation_id ? `/crm/conversations/${ticket.conversation_id}` : null, { enabled: Boolean(ticket.conversation_id) })
  const timeline = usePortalQuery<{ conversation: CRMConversation; messages: CRMMessage[]; tickets: CRMTicket[]; ticket_events: CRMTicketEvent[] }>(['crm', 'conversation-timeline', ticket.conversation_id], ticket.conversation_id ? `/crm/conversations/${ticket.conversation_id}/timeline?page_size=100` : null, { enabled: Boolean(ticket.conversation_id) })
  return <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Customer context</span><h2>{conversation.data?.subject || 'Conversation'}</h2><p>{conversation.data ? `${humanize(conversation.data.channel)} conversation` : 'No conversation is linked to this ticket.'}</p></div></header>{timeline.isLoading ? <PortalLoading label="Loading conversation" /> : timeline.error ? <PortalError error={timeline.error} onRetry={() => void timeline.refetch()} /> : <div className="support-message-list">{timeline.data?.messages.map((message) => <article className={`support-message support-message-${message.direction}`} key={message.id}><div><strong>{humanize(message.author_type)}</strong><small>{formatPortalDate(message.occurred_at, true)}</small></div><p>{message.body}</p></article>)}{!timeline.data?.messages.length && <PortalEmpty title="No messages yet" description="Messages from connected channels will appear here." />}</div>}{canReply && ticket.conversation_id && <form className="support-reply-form" onSubmit={(event) => { event.preventDefault(); if (reply.trim()) sendReply.mutate() }}><label><span className="sr-only">Reply to customer</span><textarea rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a clear next step for the customer" /></label><button className="portal-primary-button" type="submit" disabled={sendReply.isPending || !reply.trim()}><PaperPlaneTilt aria-hidden="true" /> {sendReply.isPending ? 'Sending' : 'Send reply'}</button>{sendReply.error && <PortalError error={sendReply.error} />}</form>}</section>
}

export function SupportCustomersPage() {
  const [search, setSearch] = useState('')
  const customers = usePortalQuery<CRMCollection<CRMCustomer>>(['crm', 'customers', search], `/crm/customers${crmQueryString({ search, page_size: 100 })}`)
  return <SupportAccess scope={crmScopes.customersRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Customer records" title="Customers" description="See the people behind the requests, their communication history, and what still needs attention." /><section className="portal-panel support-table-panel"><div className="support-inline-search"><label className="support-search"><MagnifyingGlass aria-hidden="true" /><span className="sr-only">Search customers</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" /></label></div><CollectionMessage isLoading={customers.isLoading} error={customers.error} onRetry={() => void customers.refetch()} emptyTitle="No customers yet" emptyDescription="Customers will appear when your team receives a request or creates a record."><div className="support-customer-list">{customers.data?.items.map((customer) => <Link className="support-customer-row" to={`/portal/support/customers/${customer.id}`} key={customer.id}><span className="support-avatar"><UserCircle aria-hidden="true" weight="duotone" /></span><div><strong>{customer.display_name}</strong><small>{customer.primary_email || 'No email recorded'} · Updated {formatPortalDate(customer.updated_at, true)}</small></div><StatusPill value={customer.status} /><ArrowRight aria-hidden="true" /></Link>)}</div></CollectionMessage></section></div></SupportAccess>
}

export function SupportConversationsPage() {
  const conversations = usePortalQuery<CRMCollection<CRMConversation>>(['crm', 'conversations'], '/crm/conversations?page_size=100')
  return <SupportAccess scope={crmScopes.conversationsRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Customer context" title="Conversations" description="Follow the request across its original channel and the work created from it." /><section className="portal-panel support-table-panel"><CollectionMessage isLoading={conversations.isLoading} error={conversations.error} onRetry={() => void conversations.refetch()} emptyTitle="No conversations yet" emptyDescription="Connected calls, messages, and manual requests will create conversation records."><div className="support-conversation-list">{conversations.data?.items.map((conversation) => <Link className="support-conversation-row" to={conversation.customer_id ? `/portal/support/customers/${conversation.customer_id}` : '/portal/support/inbox'} key={conversation.id}><div><span className="support-panel-kicker">{humanize(conversation.channel)}</span><strong>{conversation.subject || 'Customer conversation'}</strong><small>{humanize(conversation.status)} · Last activity {formatPortalDate(conversation.last_message_at || conversation.updated_at, true)}</small></div><ArrowRight aria-hidden="true" /></Link>)}</div></CollectionMessage></section></div></SupportAccess>
}

export function SupportCallsPage() {
  const { hasScope } = usePortalAuth()
  const calls = useVoiceQuery<VoiceCollection<VoiceCallRecord>>(['support-calls'], hasScope('voice.call.read') ? '/voice/calls?page_size=100' : null, { enabled: hasScope('voice.call.read') })
  return <SupportAccess scope="voice.call.read"><div className="portal-page support-page"><PortalPageHeader eyebrow="Voice operations" title="Calls" description="Review completed calls, their outcomes, and the support work created after a conversation." action={<Link className="portal-secondary-button" to="/portal/voice/analytics"><TrendUp aria-hidden="true" /> Voice analytics</Link>} /><section className="portal-panel support-table-panel"><CollectionMessage isLoading={calls.isLoading} error={calls.error} onRetry={() => void calls.refetch()} emptyTitle="No completed calls" emptyDescription="Completed calls will appear here when the voice service records them."><div className="support-call-list">{calls.data?.items.map((call) => <Link className="support-call-row" to={`/portal/voice/calls/${call.id}`} key={call.id}><span className="support-call-icon"><Phone aria-hidden="true" weight="duotone" /></span><div><strong>{humanize(call.primary_intent || call.disposition || 'Support call')}</strong><small>{humanize(call.direction)} · {formatPortalDate(call.started_at, true)} · {call.duration_seconds}s</small></div><StatusPill value={call.status} /><ArrowRight aria-hidden="true" /></Link>)}</div></CollectionMessage></section></div></SupportAccess>
}

export function SupportChannelsPage() {
  const connectors = usePortalQuery<{ items: Array<{ id: string; name: string; provider: string; channel: string; status: string; last_health_check_at: string | null }> }>(['crm', 'channels'], '/crm/connectors?page_size=100')
  const channelRows = ['voice', 'whatsapp', 'facebook', 'instagram', 'email', 'web_chat', 'widget']
  return <SupportAccess scope={crmScopes.integrationsRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Customer entry points" title="Channels" description="See which customer-facing channels are connected and where a request may need attention." /><section className="portal-panel support-table-panel"><div className="support-channel-card-grid">{channelRows.map((channel) => { const matches = connectors.data?.items.filter((connector) => connector.channel === channel) ?? []; return <article className="support-channel-card" key={channel}><div><span className="support-panel-kicker">{humanize(channel)}</span><h2>{matches.length ? matches[0].name : 'Not connected'}</h2><p>{matches.length ? `${humanize(matches[0].provider)} · Last check ${formatPortalDate(matches[0].last_health_check_at, true)}` : 'Connect this channel when your team is ready to receive requests here.'}</p></div><StatusPill value={matches.length ? matches[0].status : 'not_configured'} /></article> })}</div></section></div></SupportAccess>
}

export function SupportNotificationsPage() {
  const { context, hasScope } = usePortalAuth()
  const deliveries = usePortalQuery<{ items: CRMNotificationDelivery[] }>(['crm', 'notification-deliveries'], '/crm/notifications/deliveries?page_size=100')
  const retry = useMutation({
    mutationFn: async (deliveryId: string) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<unknown>(`/crm/notifications/deliveries/${deliveryId}/retry`, {
        method: 'POST',
        organizationId: context.organization_id,
        idempotencyKey: createIdempotencyKey(),
      })
    },
    onSuccess: () => invalidateCRM(context?.organization_id, 'notification-deliveries'),
  })
  return <SupportAccess scope={crmScopes.notificationsRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Team alerts" title="Notifications" description="Review CRM delivery status without exposing private provider payloads." /><section className="portal-panel support-table-panel"><CollectionMessage isLoading={deliveries.isLoading} error={deliveries.error} onRetry={() => void deliveries.refetch()} emptyTitle="No CRM deliveries yet" emptyDescription="Notification delivery records will appear as support events are routed to your team."><div className="support-notification-list">{deliveries.data?.items.map((delivery) => <div className="support-notification-row" key={delivery.id}><div><strong>{humanize(delivery.event_type)}</strong><small>{humanize(delivery.channel)} · {formatPortalDate(delivery.created_at, true)} · {delivery.attempts} attempt{delivery.attempts === 1 ? '' : 's'}</small></div><StatusPill value={delivery.status} /><span>{delivery.last_error_code || ''}</span>{hasScope(crmScopes.notificationsManage) && ['failed', 'dead_letter'].includes(delivery.status) && <button className="portal-secondary-button" type="button" onClick={() => retry.mutate(delivery.id)} disabled={retry.isPending}>Retry</button>}</div>)}</div></CollectionMessage>{retry.error && <PortalError error={retry.error} title="Notification retry failed" />}</section></div></SupportAccess>
}

export function SupportWorkflowDetailPage() {
  const { workflowId } = useParams()
  const { context, hasScope } = usePortalAuth()
  const workflow = usePortalQuery<{ items: Array<{ key: string; name: string; vertical: string; definition: Record<string, unknown>; escalation_rules: Record<string, unknown> }> }>(['crm', 'workflow-catalog', workflowId], '/crm/workflows/catalog')
  const templates = usePortalQuery<{ items: CRMWorkflowTemplate[] }>(['crm', 'workflow-templates', workflowId], '/crm/workflows/templates?status=published&page_size=100', { enabled: hasScope(crmScopes.workflowsRead) })
  const runs = usePortalQuery<{ items: CRMWorkflowRun[] }>(['crm', 'workflow-runs', workflowId], '/crm/workflows/runs?page_size=50', { enabled: hasScope(crmScopes.workflowsRead) })
  const [runNotice, setRunNotice] = useState<string | null>(null)
  const entry = workflow.data?.items.find((item) => item.key === workflowId)
  const template = templates.data?.items.find((item) => item.key === workflowId)
  const startRun = useMutation({
    mutationFn: async () => {
      if (!context || !template) throw new Error('A published organisation workflow is required before starting a run.')
      return portalFetch<CRMWorkflowRun>('/crm/workflows/runs', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ template_id: template.id, fields: {} }) })
    },
    onSuccess: (result) => { setRunNotice(`Workflow run ${result.data.id} started.`); invalidateCRM(context?.organization_id, 'workflow-runs') },
  })
  if (workflow.isLoading) return <PortalLoading label="Loading workflow" />
  if (workflow.error) return <PortalError error={workflow.error} onRetry={() => void workflow.refetch()} />
  if (!entry) return <PortalEmpty title="Workflow not found" description="This workflow is not available in the current organisation catalogue." />
  return <SupportAccess scope={crmScopes.workflowsRead}><div className="portal-page support-page"><Link className="support-back-link" to="/portal/support/workflows"><ArrowLeft aria-hidden="true" /> Back to workflows</Link><PortalPageHeader eyebrow={humanize(entry.vertical)} title={entry.name} description="A structured path for recurring work, with approved steps and clear human escalation." action={hasScope(crmScopes.workflowsManage) ? <button className="portal-primary-button" type="button" onClick={() => startRun.mutate()} disabled={startRun.isPending || !template}>{startRun.isPending ? 'Starting run' : template ? 'Start controlled run' : 'Publish a template to run'}</button> : undefined} /><div className="support-detail-grid"><main className="support-detail-main"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Workflow definition</span><h2>Required steps</h2></div></header><pre className="support-json-view">{JSON.stringify(entry.definition, null, 2)}</pre></section><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Recent runs</span><h2>{runs.data?.items.length ?? 0} recorded runs</h2></div></header>{runs.isLoading ? <PortalLoading label="Loading workflow runs" /> : runs.error ? <PortalError error={runs.error} onRetry={() => void runs.refetch()} /> : runs.data?.items.filter((run) => !template || run.template_id === template.id).map((run) => <div className="support-event-list" key={run.id}><div><span className="support-event-dot" /><div><strong>{humanize(run.status)}</strong><small>{run.current_step || 'Waiting for first step'} · {formatPortalDate(run.created_at, true)}</small></div></div></div>)}</section></main><aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Human control</span><h2>Escalation rules</h2></div></header><pre className="support-json-view">{JSON.stringify(entry.escalation_rules, null, 2)}</pre></section></aside></div>{(startRun.error || runNotice) && <div className="support-inline-notice" role="status">{startRun.error ? startRun.error.message : runNotice}</div>}</div></SupportAccess>
}

export function SupportCustomerDetailPage() {
  const { customerId } = useParams()
  const customer = usePortalQuery<CRMCustomer>(['crm', 'customer', customerId], customerId ? `/crm/customers/${customerId}` : null)
  const timeline = usePortalQuery<{ customer: CRMCustomer; conversations: CRMConversation[]; tickets: CRMTicket[] }>(['crm', 'customer-timeline', customerId], customerId ? `/crm/customers/${customerId}/timeline?page_size=100` : null, { enabled: Boolean(customerId) })
  if (customer.isLoading) return <PortalLoading label="Loading customer" />
  if (customer.error) return <PortalError error={customer.error} onRetry={() => void customer.refetch()} />
  if (!customer.data) return <PortalEmpty title="Customer not found" description="This customer may have been removed or is outside your organisation." />
  return <SupportAccess scope={crmScopes.customersRead}><div className="portal-page support-page"><Link className="support-back-link" to="/portal/support/customers"><ArrowLeft aria-hidden="true" /> Back to customers</Link><PortalPageHeader eyebrow="Customer record" title={customer.data.display_name} description="Customer history and current support work in one place." action={<StatusPill value={customer.data.status} />} /><div className="support-detail-grid"><main className="support-detail-main"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Open work</span><h2>{timeline.data?.tickets.length ?? 0} tickets</h2></div></header><TicketRows tickets={timeline.data?.tickets ?? []} /></section><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Conversations</span><h2>{timeline.data?.conversations.length ?? 0} conversations</h2></div></header><div className="support-conversation-list">{timeline.data?.conversations.map((conversation) => <div key={conversation.id}><strong>{conversation.subject || 'Customer conversation'}</strong><small>{humanize(conversation.channel)} · {humanize(conversation.status)} · {formatPortalDate(conversation.last_message_at || conversation.updated_at, true)}</small></div>)}</div></section></main><aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Contact record</span><h2>Details</h2></div></header><dl className="support-definition-list"><div><dt>Email</dt><dd>{customer.data.primary_email || 'Not recorded'}</dd></div><div><dt>Phone</dt><dd>{customer.data.profile.phone_masked ? String(customer.data.profile.phone_masked) : 'Protected'}</dd></div><div><dt>Created</dt><dd>{formatPortalDate(customer.data.created_at)}</dd></div><div><dt>Last updated</dt><dd>{formatPortalDate(customer.data.updated_at, true)}</dd></div></dl></section></aside></div></div></SupportAccess>
}

export function SupportQueuesPage() {
  const queues = usePortalQuery<CRMCollection<CRMQueue>>(['crm', 'queues'], '/crm/queues?page_size=100')
  return <SupportAccess scope={crmScopes.queuesRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Team operations" title="Queues" description="Organise ownership around the work your team is responsible for." /><section className="portal-panel support-table-panel"><CollectionMessage isLoading={queues.isLoading} error={queues.error} onRetry={() => void queues.refetch()} emptyTitle="No queues configured" emptyDescription="Create queues for dispatch, bookings, customer care, or any team that owns follow-up."><div className="support-queue-grid">{queues.data?.items.map((queue) => <article className="support-queue-card" key={queue.id}><div><span className="support-panel-kicker">{humanize(queue.routing_strategy)}</span><h2>{queue.name}</h2><p>{queue.description || 'No description provided.'}</p></div><StatusPill value={queue.active ? 'active' : 'inactive'} /><small>Updated {formatPortalDate(queue.updated_at, true)}</small></article>)}</div></CollectionMessage></section></div></SupportAccess>
}

export function SupportAnalyticsPage() {
  const { context, hasScope } = usePortalAuth()
  const defaultFromDate = useMemo(() => { const date = new Date(); date.setDate(date.getDate() - 30); return date.toISOString().slice(0, 10) }, [])
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10))
  const [channel, setChannel] = useState('')
  const [vertical, setVertical] = useState('')
  const [operationId, setOperationId] = useState<string | null>(null)
  const filters = { from_date: fromDate, to_date: toDate, channel: channel || null, vertical: vertical || null }
  const report = usePortalQuery<CRMAnalyticsReport>(['crm', 'analytics', fromDate, toDate, channel, vertical], `/crm/analytics/report${analyticsQueryString(filters)}`)
  const operation = usePortalQuery<CRMOperation>(['crm', 'analytics-operation', operationId], operationId ? `/operations/${operationId}` : null, { enabled: Boolean(operationId), refetchInterval: (query) => ['succeeded', 'failed', 'cancelled'].includes(query.state.data?.status ?? '') ? false : 2000 })
  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'json') => {
      if (!context) throw new Error('Organisation context is unavailable.')
      const { data } = await portalFetch<CRMOperation>('/crm/analytics/exports', { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey(), ...jsonBody({ format, filters }) })
      return data
    },
    onSuccess: (data) => setOperationId(data.id),
  })
  const downloadExport = () => {
    const content = operation.data?.result?.content
    if (!content) return
    const format = String(operation.data?.result?.format || 'csv')
    const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content, null, 2)], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `lumicoria-support-${fromDate}-${toDate}.${format}`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return <SupportAccess scope={crmScopes.analyticsRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Operations" title="Analytics" description="Understand where requests enter, how work moves, and where people still need to step in." action={hasScope(crmScopes.analyticsExport) ? <div className="support-action-group"><button className="portal-secondary-button" type="button" onClick={() => exportMutation.mutate('csv')} disabled={exportMutation.isPending}>Export CSV</button><button className="portal-secondary-button" type="button" onClick={() => exportMutation.mutate('json')} disabled={exportMutation.isPending}>Export JSON</button></div> : undefined} /><section className="portal-panel support-panel"><div className="support-filter-bar"><label>From<input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label><label>To<input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label><label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="">All channels</option>{channels.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label><label>Vertical<input value={vertical} onChange={(event) => setVertical(event.target.value)} placeholder="All verticals" /></label></div><header><div><span className="support-panel-kicker">{fromDate} to {toDate}</span><h2>Support performance</h2><p>Reported from reconciled CRM source events.</p></div></header><CollectionMessage isLoading={report.isLoading} error={report.error} onRetry={() => void report.refetch()} emptyTitle="No analytics yet" emptyDescription="Analytics will appear after support activity is recorded."><div className="support-metric-grid support-metric-grid-inline">{Object.entries(report.data?.summary ?? {}).slice(0, 8).map(([key, value]) => <Metric key={key} label={humanize(key)} value={value} detail="Selected reporting period" icon={TrendUp} />)}</div><div className="support-data-table"><h3>By channel</h3>{report.data?.by_channel.map((item, index) => <div key={String(item.channel ?? index)}><span>{humanize(String(item.channel ?? 'Unknown'))}</span><strong>{String(item.total ?? item.count ?? 0)}</strong></div>)}</div></CollectionMessage>{(exportMutation.error || operation.error) && <PortalError error={exportMutation.error || operation.error} title="Analytics export failed" />}{operation.data && <div className="support-operation-status"><strong>Export {humanize(operation.data.status)}</strong><span>{operation.data.progress}% complete</span>{operation.data.status === 'succeeded' && <button className="portal-secondary-button" type="button" onClick={downloadExport}>Download export</button>}</div>}</section></div></SupportAccess>
}

export function SupportIntegrationsPage() {
  const { context, hasScope } = usePortalAuth()
  const connectors = usePortalQuery<{ items: Array<{ id: string; name: string; provider: string; channel: string; status: string; credential_configured: boolean; last_health_check_at: string | null; version: number }> }>(['crm', 'connectors'], '/crm/connectors?page_size=100')
  const health = useMutation({
    mutationFn: async (id: string) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMConnectorHealth>(`/crm/connectors/${id}/health`, { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => invalidateCRM(context?.organization_id, 'connectors'),
  })
  const sync = useMutation({
    mutationFn: async (id: string) => {
      if (!context) throw new Error('Organisation context is unavailable.')
      return portalFetch<CRMConnectorSyncResponse>(`/crm/connectors/${id}/sync`, { method: 'POST', organizationId: context.organization_id, idempotencyKey: createIdempotencyKey() })
    },
    onSuccess: () => invalidateCRM(context?.organization_id, 'connectors'),
  })
  return <SupportAccess scope={crmScopes.integrationsRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Connected systems" title="Integrations" description="See which systems are connected, what they can do, and where synchronisation needs attention." /><section className="portal-panel support-table-panel"><CollectionMessage isLoading={connectors.isLoading} error={connectors.error} onRetry={() => void connectors.refetch()} emptyTitle="No integrations connected" emptyDescription="Connect a helpdesk or communication provider when your organisation is ready."><div className="support-connector-list">{connectors.data?.items.map((connector) => <article className="support-connector-row" key={connector.id}><div><span className="support-panel-kicker">{humanize(connector.channel)}</span><h2>{connector.name}</h2><p>{humanize(connector.provider)} · {connector.credential_configured ? 'Credentials configured' : 'Credentials required'}</p></div><StatusPill value={connector.status} />{hasScope(crmScopes.integrationsManage) && <div className="support-action-group"><button className="portal-secondary-button" type="button" onClick={() => health.mutate(connector.id)} disabled={health.isPending}>Check health</button><button className="portal-secondary-button" type="button" onClick={() => sync.mutate(connector.id)} disabled={sync.isPending}>Sync</button></div>}</article>)}</div></CollectionMessage>{(health.error || sync.error) && <PortalError error={health.error || sync.error} title="Integration action failed" />}</section></div></SupportAccess>
}

export function SupportWorkflowsPage() {
  const workflows = usePortalQuery<{ items: Array<{ key: string; name: string; vertical: string; definition: Record<string, unknown>; escalation_rules: Record<string, unknown> }> }>(['crm', 'workflow-catalog'], '/crm/workflows/catalog')
  return <SupportAccess scope={crmScopes.workflowsRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Guided work" title="Workflows" description="Use reviewed paths for recurring requests while keeping sensitive decisions with your team." /><section className="portal-panel support-table-panel"><CollectionMessage isLoading={workflows.isLoading} error={workflows.error} onRetry={() => void workflows.refetch()} emptyTitle="No workflow catalogue available" emptyDescription="Workflow templates will appear when the CRM release is enabled for this organisation."><div className="support-workflow-grid">{workflows.data?.items.map((workflow) => <article className="support-workflow-card" key={workflow.key}><span className="support-panel-kicker">{humanize(workflow.vertical)}</span><h2>{workflow.name}</h2><p>Structured intake, approved information, and clear escalation rules for this work.</p><Link className="portal-secondary-button" to={`/portal/support/workflows/${workflow.key}`}>View workflow <ArrowRight aria-hidden="true" /></Link></article>)}</div></CollectionMessage></section></div></SupportAccess>
}

export function SupportSettingsPage() {
  const { hasScope } = usePortalAuth()
  return <SupportAccess scope={crmScopes.auditRead}><div className="portal-page support-page"><PortalPageHeader eyebrow="Support controls" title="Settings" description="Review the controls that shape access, retention, notifications, and connected systems." /><div className="support-settings-grid"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Organisation policy</span><h2>Human control</h2></div></header><p>Replies, escalations, recordings, and sensitive requests follow the organisation policy returned by the backend.</p><Link className="portal-secondary-button" to="/portal/settings">Open organisation settings <ArrowRight aria-hidden="true" /></Link></section><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Permissions</span><h2>Current access</h2></div></header><ul className="support-scope-list">{Object.values(crmScopes).map((scope) => <li key={scope}><span>{scope}</span><CheckCircle aria-label={hasScope(scope) ? 'Granted' : 'Not granted'} weight={hasScope(scope) ? 'fill' : 'regular'} /></li>)}</ul></section></div></div></SupportAccess>
}
