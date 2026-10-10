import {
  ArrowRight,
  BookOpenText,
  CheckCircle,
  ChatCircleDots,
  ChartLine,
  Code,
  GearSix,
  Lightning,
  Phone,
  PlugsConnected,
  Robot,
  Warning,
  Waveform,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

type CommandCenterResponse = {
  organization: {
    id: string
    name: string
    slug: string
    vertical: string | null
    status: string
  }
  support_profile: {
    id: string
    status: string
    public_slug: string
    display_name: string
    hero_title: string
    primary_color: string
    accent_color: string
    enabled_channels: string[]
  } | null
  metrics: {
    open_tickets: number
    active_conversations: number
    customers: number
    calls_30d: number
    enabled_channels: number
  }
  agents: Array<{
    id: string
    name: string
    category: string
    status: string
    published: boolean
    published_version_id: string | null
    default_language: string
    updated_at: string
    readiness: {
      ready: boolean
      version_id: string | null
      checks: Record<string, string>
      blocking_issues: Array<{ code: string; path: string; message: string }>
    }
  }>
  knowledge_bases: Array<{
    id: string
    name: string
    status: string
    published: boolean
    published_release_id: string | null
    source_count: number
    updated_at: string
  }>
  channels: Array<{
    id: string
    agent_id: string
    type: string
    name: string
    status: string
    provider: string | null
    provider_status: string | null
  }>
  recent_tickets: Array<{
    id: string
    subject: string
    status: string
    priority: string
    source_channel: string
    last_activity_at: string
  }>
  checklist: Array<{
    key: string
    label: string
    status: string
    detail: string
    href: string
  }>
}

function ChecklistIcon({ status }: { status: string }) {
  return status === 'ready'
    ? <CheckCircle aria-hidden="true" weight="fill" />
    : <Warning aria-hidden="true" weight="fill" />
}

function MetricCard({ label, value, detail, icon: Icon }: { label: string; value: number; detail: string; icon: typeof Lightning }) {
  return (
    <article className="command-center-metric">
      <span className="command-center-metric-icon"><Icon aria-hidden="true" weight="duotone" /></span>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
      <small>{detail}</small>
    </article>
  )
}

export function CommandCenterPage() {
  const { hasScope } = usePortalAuth()
  const commandCenter = usePortalQuery<CommandCenterResponse>(
    ['command-center'],
    '/command-center',
  )

  if (commandCenter.isLoading) return <PortalLoading label="Loading command centre" />
  if (commandCenter.error) return <PortalError error={commandCenter.error} onRetry={() => void commandCenter.refetch()} title="Command centre unavailable" />
  if (!commandCenter.data) return <PortalEmpty title="Workspace unavailable" description="The selected organisation could not be loaded." />

  const data = commandCenter.data
  const publicUrl = data.support_profile
    ? `${window.location.origin}/support/${data.support_profile.public_slug}`
    : null

  return (
    <div className="portal-page command-center-page">
      <PortalPageHeader
        eyebrow={`${humanize(data.organization.vertical || 'organisation')} command centre`}
        title={`Run ${data.organization.name} support`}
        description="One live operating view for agents, knowledge, channels, customer work, and the next action that will move the workspace forward."
        action={<Link className="portal-primary-button" to="/portal/support/inbox"><ChatCircleDots aria-hidden="true" /> Open inbox</Link>}
      />

      <section className="command-center-metrics" aria-label="Workspace metrics">
        <MetricCard label="Open tickets" value={data.metrics.open_tickets} detail="Needs a next step" icon={ChatCircleDots} />
        <MetricCard label="Live conversations" value={data.metrics.active_conversations} detail="Currently open" icon={Lightning} />
        <MetricCard label="Voice calls" value={data.metrics.calls_30d} detail="Last 30 days" icon={Phone} />
        <MetricCard label="Enabled channels" value={data.metrics.enabled_channels} detail="Verified workspace entry points" icon={PlugsConnected} />
      </section>

      <div className="command-center-layout">
        <main className="command-center-main">
          <section className="portal-panel command-center-panel command-center-checklist">
            <header>
              <div><span className="support-panel-kicker">Launch path</span><h2>Make this workspace live</h2><p>Each item is calculated from this organisation’s persisted configuration.</p></div>
              <Link to="/portal/support/settings">Open settings <ArrowRight aria-hidden="true" /></Link>
            </header>
            <div className="command-center-checklist-list">
              {data.checklist.map((item) => (
                <Link className={`command-center-checklist-row ${item.status}`} to={item.href} key={item.key}>
                  <span className="command-center-checklist-icon"><ChecklistIcon status={item.status} /></span>
                  <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                  <StatusPill value={item.status === 'ready' ? 'ready' : item.status === 'unknown' ? 'not configured' : 'needs attention'} />
                  <ArrowRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

          <section className="portal-panel command-center-panel">
            <header>
              <div><span className="support-panel-kicker">Voice intelligence</span><h2>Agents in this workspace</h2><p>Every agent below belongs to the selected organisation; nothing is seeded from a fixed customer.</p></div>
              {hasScope('voice.agents.manage') && <Link to="/portal/voice/agents">Manage agents <ArrowRight aria-hidden="true" /></Link>}
            </header>
            {data.agents.length ? (
              <div className="command-center-agent-list">
                {data.agents.map((agent) => (
                  <article className="command-center-agent-row" key={agent.id}>
                    <span className="command-center-agent-icon"><Robot aria-hidden="true" weight="duotone" /></span>
                    <div><strong>{agent.name}</strong><small>{humanize(agent.category)} · {agent.default_language} · Updated {formatPortalDate(agent.updated_at, true)}</small>{agent.readiness.blocking_issues.length > 0 && <small className="command-center-agent-blocker">{agent.readiness.blocking_issues[0].message}</small>}</div>
                    <StatusPill value={agent.published ? 'published' : agent.readiness.ready ? 'ready' : agent.status} />
                    <div className="command-center-row-actions">
                      <Link className="portal-secondary-button" to={`/portal/voice/agents/${agent.id}`}>Configure</Link>
                      {agent.published && <Link className="portal-secondary-button" to={`/portal/voice/playground?agent=${encodeURIComponent(agent.id)}`}>Test</Link>}
                    </div>
                  </article>
                ))}
              </div>
            ) : <PortalEmpty title="No voice agents yet" description="Create the first organisation-owned agent from a published skill pack." action={<Link className="portal-secondary-button" to="/portal/voice/agents">Create agent</Link>} />}
          </section>

          <section className="portal-panel command-center-panel">
            <header>
              <div><span className="support-panel-kicker">Customer work</span><h2>Recent tickets</h2><p>Calls, messages, web chat, and manual requests appear in the same queue.</p></div>
              <Link to="/portal/support/tickets">View all <ArrowRight aria-hidden="true" /></Link>
            </header>
            {data.recent_tickets.length ? (
              <div className="command-center-ticket-list">
                {data.recent_tickets.map((ticket) => <Link className="command-center-ticket-row" to={`/portal/support/tickets/${ticket.id}`} key={ticket.id}><span className={`support-priority support-priority-${ticket.priority}`} /><div><strong>{ticket.subject}</strong><small>{humanize(ticket.source_channel)} · {formatPortalDate(ticket.last_activity_at, true)}</small></div><StatusPill value={ticket.status} /><ArrowRight aria-hidden="true" /></Link>)}
              </div>
            ) : <PortalEmpty title="No customer work yet" description="New requests will appear here when a verified channel receives a message or call." action={<Link className="portal-secondary-button" to="/portal/support/channels">Connect a channel</Link>} />}
          </section>
        </main>

        <aside className="command-center-side">
          <section className="portal-panel command-center-panel command-center-public-card">
            <div className="command-center-public-mark"><Waveform aria-hidden="true" weight="duotone" /></div>
            <span className="support-panel-kicker">Public support experience</span>
            <h2>{data.support_profile?.hero_title || 'Your public support page'}</h2>
            <p>{data.support_profile?.status === 'published' ? 'Customers can reach this organisation through its configured support surface.' : 'Complete the profile, then publish a branded support surface for this organisation.'}</p>
            {publicUrl && <code>{publicUrl}</code>}
            <div className="command-center-card-actions">
              <Link className="portal-primary-button" to="/portal/support/settings">{data.support_profile?.status === 'published' ? 'Manage profile' : 'Finish profile'}</Link>
              {publicUrl && data.support_profile?.status === 'published' && <a className="portal-secondary-button" href={publicUrl} target="_blank" rel="noreferrer">Open page</a>}
            </div>
          </section>

          <section className="portal-panel command-center-panel">
            <header><div><span className="support-panel-kicker">Knowledge and channels</span><h2>Connected foundations</h2></div></header>
            <div className="command-center-foundation-list">
              <Link to="/portal/voice/knowledge"><BookOpenText aria-hidden="true" /><span><strong>{data.knowledge_bases.length} knowledge base{data.knowledge_bases.length === 1 ? '' : 's'}</strong><small>{data.knowledge_bases.filter((item) => item.published).length} published release{data.knowledge_bases.filter((item) => item.published).length === 1 ? '' : 's'}</small></span><ArrowRight aria-hidden="true" /></Link>
              <Link to="/portal/support/channels"><PlugsConnected aria-hidden="true" /><span><strong>{data.channels.length} configured channel{data.channels.length === 1 ? '' : 's'}</strong><small>{data.metrics.enabled_channels} currently enabled</small></span><ArrowRight aria-hidden="true" /></Link>
              <Link to="/portal/voice/analytics"><ChartLine aria-hidden="true" /><span><strong>Operational analytics</strong><small>Calls, outcomes, duration, and cost</small></span><ArrowRight aria-hidden="true" /></Link>
            </div>
          </section>

          <section className="portal-panel command-center-panel command-center-quick-actions">
            <header><div><span className="support-panel-kicker">Quick actions</span><h2>Move faster</h2></div></header>
            <Link to="/portal/voice/playground"><Waveform aria-hidden="true" /> Test a published agent</Link>
            <Link to="/portal/support/inbox"><ChatCircleDots aria-hidden="true" /> Review customer work</Link>
            <Link to="/portal/support/settings"><GearSix aria-hidden="true" /> Configure brand and policy</Link>
            <Link to="/portal/voice/widgets"><Code aria-hidden="true" /> Share a public channel</Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
