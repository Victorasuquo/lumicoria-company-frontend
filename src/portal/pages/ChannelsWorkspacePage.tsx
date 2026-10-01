import {
  ArrowRight,
  Broadcast,
  ChatCircleDots,
  EnvelopeSimple,
  FacebookLogo,
  GlobeHemisphereWest,
  InstagramLogo,
  Phone,
  PlugsConnected,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { CRMCollection, CRMConnector } from '../../api/crm'
import type {
  VoiceCollection,
  VoicePhoneNumber,
  VoiceWhatsAppSender,
  VoiceWidgetConfig,
} from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery, useVoiceQuery } from '../hooks'
import {
  formatPortalDate,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  PortalEmpty,
  StatusPill,
  humanize,
} from '../components/PortalState'

type ChannelState = 'connected' | 'degraded' | 'not_configured' | 'server_setup'

type ChannelCardProps = {
  icon: typeof Phone
  label: string
  title: string
  description: string
  state: ChannelState
  detail: string
  action?: { label: string; to: string }
}

function ChannelCard({ icon: Icon, label, title, description, state, detail, action }: ChannelCardProps) {
  return (
    <article className="channel-ops-card">
      <div className="channel-ops-card-topline">
        <span className="channel-ops-icon"><Icon aria-hidden="true" weight="duotone" /></span>
        <StatusPill value={state} />
      </div>
      <span className="support-panel-kicker">{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="channel-ops-card-footer">
        <small>{detail}</small>
        {action && <Link to={action.to}>{action.label} <ArrowRight aria-hidden="true" /></Link>}
      </div>
    </article>
  )
}

function ChannelQueryState({ loading, error, onRetry }: { loading: boolean; error: Error | null; onRetry: () => void }) {
  if (loading) return <PortalLoading label="Checking connected channels" />
  if (error) return <PortalError error={error} onRetry={onRetry} title="Channel status could not be loaded" />
  return null
}

export function ChannelsWorkspacePage() {
  const { hasScope } = usePortalAuth()
  const connectors = usePortalQuery<CRMCollection<CRMConnector>>(
    ['crm', 'channel-operations', 'connectors'],
    hasScope('crm.integrations.read') ? '/crm/connectors?page_size=100' : null,
    { enabled: hasScope('crm.integrations.read') },
  )
  const phoneNumbers = useVoiceQuery<VoiceCollection<VoicePhoneNumber>>(
    ['channel-operations-phone-numbers'],
    hasScope('voice.channel.read') ? '/voice/channels/phone-numbers?page_size=100' : null,
    { enabled: hasScope('voice.channel.read') },
  )
  const whatsapp = useVoiceQuery<VoiceCollection<VoiceWhatsAppSender>>(
    ['channel-operations-whatsapp'],
    hasScope('voice.channel.read') ? '/voice/channels/whatsapp?page_size=100' : null,
    { enabled: hasScope('voice.channel.read') },
  )
  const widgets = useVoiceQuery<VoiceCollection<VoiceWidgetConfig>>(
    ['channel-operations-widgets'],
    hasScope('voice.widgets.read') ? '/voice/widgets?page_size=100' : null,
    { enabled: hasScope('voice.widgets.read') },
  )

  if (!hasScope('crm.integrations.read')) {
    return <PortalEmpty title="Access not granted" description="Your organisation administrator has not enabled channel operations for your account." />
  }

  const connectorItems = connectors.data?.items ?? []
  const connectedPhoneNumbers = (phoneNumbers.data?.items ?? []).filter((item) => ['active', 'connected', 'ready'].includes(item.status))
  const connectedWhatsApp = (whatsapp.data?.items ?? []).filter((item) => item.verified && ['active', 'connected', 'ready'].includes(item.status))
  const activeWidgets = (widgets.data?.items ?? []).filter((item) => item.status === 'active' && item.channels.includes('browser'))
  const helpdesks = connectorItems.filter((item) => item.channel === 'helpdesk')
  const connectorsUnavailable = Boolean(connectors.error)
  const voiceUnavailable = Boolean(phoneNumbers.error)
  const whatsappUnavailable = Boolean(whatsapp.error)
  const widgetsUnavailable = Boolean(widgets.error)

  return (
    <div className="portal-page support-page">
      <PortalPageHeader
        eyebrow="Customer entry points"
        title="Channels"
        description="Bring calls, WhatsApp, social messages, email, and website requests into one support workflow. Each status below comes from the connected services, not sample data."
        action={<Link className="portal-primary-button" to="/portal/support/integrations"><PlugsConnected aria-hidden="true" /> Manage connections</Link>}
      />

      <section className="portal-panel channel-ops-hero">
        <div>
          <span className="support-panel-kicker">One request, one record</span>
          <h2>Social messages should become owned support work.</h2>
          <p>When a verified Meta event arrives, the backend resolves the customer, creates or updates a conversation, and opens support work when follow-up is needed. Staff then see the message beside calls and email instead of searching separate inboxes.</p>
        </div>
        <div className="channel-ops-flow" aria-label="Message workflow">
          <span><Broadcast aria-hidden="true" /> Page message</span>
          <ArrowRight aria-hidden="true" />
          <span><ChatCircleDots aria-hidden="true" /> Conversation</span>
          <ArrowRight aria-hidden="true" />
          <span><PlugsConnected aria-hidden="true" /> Queue and owner</span>
        </div>
      </section>

      <ChannelQueryState loading={connectors.isLoading || phoneNumbers.isLoading || whatsapp.isLoading || widgets.isLoading} error={connectors.error || phoneNumbers.error || whatsapp.error || widgets.error} onRetry={() => { void connectors.refetch(); void phoneNumbers.refetch(); void whatsapp.refetch(); void widgets.refetch() }} />

      {!connectors.isLoading && !phoneNumbers.isLoading && !whatsapp.isLoading && !widgets.isLoading && (
        <section className="channel-ops-grid" aria-label="Channel status">
          <ChannelCard
            icon={Phone}
            label="Voice calls"
            title={voiceUnavailable ? 'Status unavailable' : `${connectedPhoneNumbers.length} active number${connectedPhoneNumbers.length === 1 ? '' : 's'}`}
            description="Inbound calls can be linked to customer records, conversations, missed-call recovery, and human follow-up."
            state={voiceUnavailable ? 'server_setup' : connectedPhoneNumbers.length ? 'connected' : 'not_configured'}
            detail={voiceUnavailable ? 'The voice service did not respond.' : `${phoneNumbers.data?.items.length ?? 0} number${phoneNumbers.data?.items.length === 1 ? '' : 's'} returned by the backend.`}
            action={{ label: 'Open telephony', to: '/portal/voice/telephony' }}
          />
          <ChannelCard
            icon={WhatsappLogo}
            label="WhatsApp Business"
            title={whatsappUnavailable ? 'Status unavailable' : `${connectedWhatsApp.length} verified sender${connectedWhatsApp.length === 1 ? '' : 's'}`}
            description="WhatsApp conversations can join the same customer timeline as calls and staff follow-up."
            state={whatsappUnavailable ? 'server_setup' : connectedWhatsApp.length ? 'connected' : 'not_configured'}
            detail={whatsappUnavailable ? 'The voice service did not respond.' : `${whatsapp.data?.items.length ?? 0} sender${whatsapp.data?.items.length === 1 ? '' : 's'} returned by the backend.`}
            action={{ label: 'Open WhatsApp', to: '/portal/voice/whatsapp' }}
          />
          <ChannelCard
            icon={FacebookLogo}
            label="Facebook Messenger and comments"
            title="Requires verification"
            description="Signed Meta webhooks are implemented for messages, comments, and page events."
            state="server_setup"
            detail="A page connection and webhook credentials must be configured by an administrator before this is live."
            action={{ label: 'Review setup', to: '/portal/support/integrations' }}
          />
          <ChannelCard
            icon={InstagramLogo}
            label="Instagram messages and comments"
            title="Requires verification"
            description="Instagram requests can follow the same conversation and ticket path as other customer messages."
            state="server_setup"
            detail="The backend route is ready, but no live page connection is claimed here."
            action={{ label: 'Review setup', to: '/portal/support/integrations' }}
          />
          <ChannelCard
            icon={EnvelopeSimple}
            label="Email through Resend"
            title="Requires verification"
            description="Inbound email is signed, deduplicated, and projected into CRM conversations when the mailbox is connected."
            state="server_setup"
            detail="Resend webhook and mailbox configuration are server-side requirements."
            action={{ label: 'Review setup', to: '/portal/support/integrations' }}
          />
          <ChannelCard
            icon={GlobeHemisphereWest}
            label="Website chat and voice widget"
            title={widgetsUnavailable ? 'Status unavailable' : `${activeWidgets.length} active widget${activeWidgets.length === 1 ? '' : 's'}`}
            description="Website enquiries can enter through an origin-protected widget and become customer support work."
            state={widgetsUnavailable ? 'server_setup' : activeWidgets.length ? 'connected' : 'not_configured'}
            detail={widgetsUnavailable ? 'The voice service did not respond.' : `${widgets.data?.items.length ?? 0} widget${widgets.data?.items.length === 1 ? '' : 's'} returned by the backend.`}
            action={{ label: 'Open widgets', to: '/portal/voice/widgets' }}
          />
          <ChannelCard
            icon={PlugsConnected}
            label="Helpdesk systems"
            title={connectorsUnavailable ? 'Status unavailable' : `${helpdesks.length} connection${helpdesks.length === 1 ? '' : 's'}`}
            description="Zendesk and Freshdesk connections can sync external tickets while Lumicoria keeps the local support record."
            state={connectorsUnavailable ? 'server_setup' : helpdesks.some((item) => item.status === 'connected') ? 'connected' : helpdesks.length ? 'degraded' : 'not_configured'}
            detail={connectorsUnavailable ? 'The CRM service did not respond.' : helpdesks.length ? helpdesks.map((item) => `${humanize(item.provider)} checked ${formatPortalDate(item.last_health_check_at, true)}`).join(' · ') : 'No helpdesk connection has been returned by the backend.'}
            action={{ label: 'Open integrations', to: '/portal/support/integrations' }}
          />
        </section>
      )}

      <section className="channel-ops-limits">
        <WarningCircle aria-hidden="true" weight="duotone" />
        <div>
          <strong>Connection state is deliberately conservative.</strong>
          <p>Meta and Resend are not shown as live until the server has a verified organization connection and the signed webhook path has been tested. This prevents the portal from promising a channel that can receive a message but cannot route it to the right team.</p>
        </div>
      </section>
    </div>
  )
}
