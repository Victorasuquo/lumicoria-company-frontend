import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChatCircleDots,
  PaperPlaneTilt,
  PlugsConnected,
  ShieldCheck,
} from '@phosphor-icons/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { MetaAsset, MetaCollection, MetaConnection, MetaDelivery } from '../../api/social'
import { usePortalAuth } from '../../auth/AuthProvider'
import { ChannelIcon } from '../../components/ChannelIcon'
import { usePortalQuery } from '../hooks'
import { PortalEmpty, PortalError, PortalLoading, PortalPageHeader, StatusPill } from '../components/PortalState'


export function MetaConnectionsPage() {
  const { context, hasScope } = usePortalAuth()
  const [params] = useSearchParams()
  const query = usePortalQuery<MetaCollection<MetaConnection>>(
    ['social', 'meta', 'connections'],
    hasScope('crm.integrations.read') ? '/social/connections' : null,
  )
  const connect = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id) throw new Error('Organisation context is unavailable.')
      const { data } = await portalFetch<{ authorization_url: string }>('/social/meta/connect', { organizationId: context.organization_id })
      window.location.assign(data.authorization_url)
    },
  })
  if (!hasScope('crm.integrations.read')) return <PortalEmpty title="Access not granted" description="Your organisation administrator has not enabled social channel management." />
  if (query.isLoading) return <PortalLoading label="Loading Meta connections" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />
  const connections = query.data?.items ?? []
  return <div className="portal-page support-page">
    <PortalPageHeader eyebrow="Social channel hub" title="Meta connections" description="Connect one organisation to its own WhatsApp, Facebook Page, and Facebook linked Instagram accounts. Provider credentials stay on the server." action={hasScope('crm.integrations.manage') ? <button className="portal-primary-button" type="button" onClick={() => connect.mutate()} disabled={connect.isPending}><PlugsConnected aria-hidden="true" /> {connect.isPending ? 'Opening Meta' : 'Connect Meta account'}</button> : undefined} />
    {params.get('meta') === 'connected' && <div className="support-inline-notice" role="status">Meta connected. Select the Page, Instagram account, or WhatsApp Business Account to activate.</div>}
    {connect.error && <PortalError error={connect.error} title="Meta connection could not start" />}
    <section className="portal-panel support-table-panel">
      {connections.length ? <div className="support-connector-list">{connections.map((connection) => { return <Link className="support-connector-row" to={`/portal/support/channels/meta/${connection.id}`} key={connection.id}><ChannelIcon channel={connection.channel} /><div><span className="support-panel-kicker">{connection.channel}</span><h2>{connection.name}</h2><p>{connection.asset_id ? 'Asset selected' : 'Choose an asset to finish setup'} · {connection.granted_scopes.length} permissions</p></div><StatusPill value={connection.status} /><ArrowRight aria-hidden="true" /></Link> })}</div> : <PortalEmpty title="No Meta account connected" description="Connect Meta to discover the assets that belong to this organisation. Nothing is live until you select an asset and verify the webhook." action={hasScope('crm.integrations.manage') ? <button className="portal-secondary-button" type="button" onClick={() => connect.mutate()}>Connect Meta account</button> : undefined} />}
    </section>
  </div>
}

export function MetaConnectionDetailPage() {
  const { connectionId } = useParams()
  const { context, hasScope } = usePortalAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const connection = usePortalQuery<MetaConnection>(['social', 'meta', 'connection', connectionId], connectionId ? `/social/connections/${connectionId}` : null)
  const assets = usePortalQuery<{ connection_id: string; assets: MetaAsset[] }>(['social', 'meta', 'assets', connectionId], connectionId ? `/social/connections/${connectionId}/assets` : null)
  const health = usePortalQuery<{ status: string; provider_reachable: boolean; webhook_subscribed: boolean; error_code?: string | null }>(['social', 'meta', 'health', connectionId], connectionId ? `/social/connections/${connectionId}/health` : null)
  const activate = useMutation({
    mutationFn: async (asset: MetaAsset) => {
      if (!context?.organization_id || !connectionId) throw new Error('Organisation context is unavailable.')
      const channel = asset.asset_type === 'facebook_page' ? 'facebook' : asset.asset_type === 'instagram_professional' ? 'instagram' : 'whatsapp'
      const { data } = await portalFetch<MetaConnection>(`/social/connections/${connectionId}/activate`, { organizationId: context.organization_id, method: 'POST', ...jsonBody({ channel, asset_id: asset.id, page_id: asset.page_id, instagram_account_id: asset.instagram_account_id, waba_id: asset.waba_id, phone_number_id: asset.phone_number_id, ai_auto_reply: false, actionable_comments: true }), idempotencyKey: createIdempotencyKey() })
      return data
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'social'] }) },
  })
  const disconnect = useMutation({
    mutationFn: async () => { if (!context?.organization_id || !connectionId) throw new Error('Organisation context is unavailable.'); const { data } = await portalFetch<MetaConnection>(`/social/connections/${connectionId}/disconnect`, { organizationId: context.organization_id, method: 'POST', idempotencyKey: createIdempotencyKey() }); return data },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'social'] }) },
  })
  if (connection.isLoading || assets.isLoading) return <PortalLoading label="Loading Meta setup" />
  if (connection.error || assets.error || !connection.data) return <PortalError error={connection.error || assets.error || new Error('Connection not found.')} onRetry={() => { void connection.refetch(); void assets.refetch() }} />
  const current = connection.data
  const grouped = assets.data?.assets ?? []
  return <div className="portal-page support-page">
    <button className="support-back-link" type="button" onClick={() => navigate('/portal/support/channels/meta')}><ArrowLeft aria-hidden="true" /> Back to Meta connections</button>
    <PortalPageHeader eyebrow="Meta connection" title={current.name} description="Choose the customer-facing asset for this organisation. The selected asset determines where events are routed." action={hasScope('crm.integrations.manage') ? <button className="portal-secondary-button" type="button" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Disconnect</button> : undefined} />
    <div className="support-detail-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Connection health</span><h2>{health.data?.provider_reachable ? 'Provider reachable' : 'Verification required'}</h2></div><StatusPill value={health.data?.status || current.status} /></header><p>{health.data?.webhook_subscribed ? 'Webhook subscription is active.' : 'Activate an asset to subscribe its webhook.'}</p>{health.data?.error_code && <p className="support-inline-notice">Provider error: {health.data.error_code}</p>}</section>
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Available assets</span><h2>Select one asset to activate</h2></div></header><div className="support-workflow-grid">{grouped.map((asset) => { return <article className="support-workflow-card" key={asset.id}><ChannelIcon channel={asset.asset_type} size={28} /><span className="support-panel-kicker">{asset.asset_type.replaceAll('_', ' ')}</span><h2>{asset.name || asset.id}</h2><p>Provider ID is kept for routing and is never exposed as a credential.</p>{hasScope('crm.integrations.manage') && <button className="portal-primary-button" type="button" onClick={() => activate.mutate(asset)} disabled={activate.isPending}>{activate.isPending ? 'Activating' : 'Activate asset'}</button>}</article> })}</div>{!grouped.length && <PortalEmpty title="No selectable assets" description="Meta did not return a Page, linked Instagram Professional account, or WhatsApp Business Account for this login." />}</section>
    </main><aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Safety</span><h2><ShieldCheck aria-hidden="true" /> Human control</h2></div></header><p>Automatic replies remain off until the organisation explicitly enables them. Complaints, refunds, payments, uncertain answers, and sensitive matters stay with staff.</p><ul className="support-scope-list"><li><span>Permissions received</span><CheckCircle aria-hidden="true" /></li><li><span>{current.granted_scopes.length} Meta scopes</span><CheckCircle aria-hidden="true" /></li></ul></section></aside></div>
    {activate.error && <PortalError error={activate.error} title="Asset activation failed" />}
  </div>
}

type SocialTimeline = {
  conversation: { id: string; channel: string; subject: string | null; status: string; external_thread_id: string | null }
  messages: Array<{ id: string; direction: string; author_type: string; body: string; occurred_at: string; provider: string | null }>
  tickets: Array<{ id: string; subject: string; status: string; priority: string }>
}

export function MetaConversationPage() {
  const { conversationId } = useParams()
  const { context, hasScope } = usePortalAuth()
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const timeline = usePortalQuery<SocialTimeline>(
    ['social', 'conversation', conversationId],
    conversationId ? `/crm/conversations/${conversationId}/timeline` : null,
  )
  const reply = useMutation({
    mutationFn: async () => {
      if (!context?.organization_id || !conversationId || !body.trim()) throw new Error('Write a reply before sending.')
      const { data } = await portalFetch<MetaDelivery>(`/social/conversations/${conversationId}/messages`, {
        organizationId: context.organization_id,
        method: 'POST',
        ...jsonBody({ body: body.trim() }),
        idempotencyKey: createIdempotencyKey(),
      })
      return data
    },
    onSuccess: () => {
      setBody('')
      void queryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'social', 'conversation', conversationId] })
    },
  })
  if (timeline.isLoading) return <PortalLoading label="Loading conversation" />
  if (timeline.error || !timeline.data) return <PortalError error={timeline.error || new Error('Conversation not found.')} onRetry={() => void timeline.refetch()} />
  const current = timeline.data
  const isMetaConversation = ['facebook', 'instagram', 'whatsapp'].includes(current.conversation.channel)
  return <div className="portal-page support-page">
    <Link className="support-back-link" to="/portal/support/inbox"><ArrowLeft aria-hidden="true" /> Back to inbox</Link>
    <PortalPageHeader eyebrow={`${current.conversation.channel} conversation`} title={current.conversation.subject || 'Customer conversation'} description="Keep the customer context, ticket, ownership, and provider delivery state together." action={<StatusPill value={current.conversation.status} />} />
    <div className="support-detail-grid"><main className="support-detail-main">
      <section className="portal-panel support-panel"><header><div><span className="support-panel-kicker"><ChatCircleDots aria-hidden="true" /> Message history</span><h2>{current.messages.length} messages</h2></div></header><div className="support-message-list">{current.messages.map((message) => <article className={`support-message ${message.direction === 'outbound' ? 'support-message-outbound' : ''}`} key={message.id}><div><strong>{message.author_type}</strong><small>{new Date(message.occurred_at).toLocaleString()}</small></div><p>{message.body}</p></article>)}</div>{isMetaConversation && hasScope('crm.messages.manage') && <form className="support-reply-form" onSubmit={(event) => { event.preventDefault(); reply.mutate() }}><label><span className="sr-only">Reply</span><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply using the connected Meta channel" rows={4} /></label><button className="portal-primary-button" type="submit" disabled={reply.isPending || !body.trim()}><PaperPlaneTilt aria-hidden="true" /> {reply.isPending ? 'Queueing reply' : 'Send reply'}</button></form>}{!isMetaConversation && <p>Replies for this channel continue through its configured provider workspace.</p>}{reply.error && <PortalError error={reply.error} title="Reply could not be queued" />}{reply.data && <div className="support-inline-notice" role="status">Reply queued. Delivery status: {reply.data.status}.</div>}</section>
    </main><aside className="support-detail-side"><section className="portal-panel support-panel"><header><div><span className="support-panel-kicker">Linked work</span><h2>Ticket and delivery</h2></div></header>{current.tickets.map((ticket) => <div className="support-event-list" key={ticket.id}><div><span className="support-event-dot" /><div><strong>{ticket.subject}</strong><small>{ticket.status} · {ticket.priority} priority</small></div></div></div>)}<p>Provider delivery updates are reconciled into each outbound message record.</p></section></aside></div>
  </div>
}
