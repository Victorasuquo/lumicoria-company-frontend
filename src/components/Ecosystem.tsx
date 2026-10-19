import { useState } from 'react'
import { ArrowUpRight, GlobeHemisphereWest, Pause, PhoneCall, Play, type Icon } from '@phosphor-icons/react'
import { Reveal } from './Reveal'
import { ChannelConversationDemo } from './ChannelConversationDemo'

type EcosystemChannel = { name: string; image?: string; icon?: Icon; color?: string; detail?: string }

const ecosystemChannels: EcosystemChannel[] = [
  { name: 'Phone calls', icon: PhoneCall, color: '#b96816' },
  { name: 'Twilio', image: 'twilio.png', detail: 'Telephony provider · availability depends on your setup' },
  { name: 'Telnyx', image: 'telnyx.ico', detail: 'Telephony provider · availability depends on your setup' },
  { name: 'WhatsApp Business', image: 'whatsapp.svg' },
  { name: 'Facebook Pages', image: 'facebook.png' },
  { name: 'Instagram DMs', image: 'instagram.webp' },
  { name: 'TikTok', image: 'tiktok.png', detail: 'Platform example · connection availability varies' },
  { name: 'X', image: 'x.ico', detail: 'Social platform example · connection availability varies' },
  { name: 'Email', image: 'gmail.svg', detail: 'Gmail · email example' },
  { name: 'Resend', image: 'resend.ico', detail: 'Email provider · availability depends on your setup' },
  { name: 'Google Business', image: 'google-business.svg' },
  { name: 'Web enquiries', icon: GlobeHemisphereWest, color: '#087f8c' },
]

const ecosystemTools: EcosystemChannel[] = [
  { name: 'Zendesk', image: 'zendesk.svg', detail: 'Helpdesk example · not a connection status' },
  { name: 'HubSpot', image: 'hubspot.png', detail: 'CRM example · not a connection status' },
  { name: 'Salesforce', image: 'salesforce.ico', detail: 'CRM example · not a connection status' },
  { name: 'Zoho CRM', image: 'zoho.ico', detail: 'CRM example · not a connection status' },
  { name: 'Pipedrive', image: 'pipedrive.ico', detail: 'CRM example · not a connection status' },
  { name: 'monday CRM', image: 'monday.png', detail: 'CRM example · not a connection status' },
  { name: 'Bookings', image: 'calendar.svg', detail: 'Google Calendar · booking tool example' },
  { name: 'Spreadsheets', image: 'sheets.svg', detail: 'Google Sheets · spreadsheet tool example' },
]

export function Ecosystem() {
  const [paused, setPaused] = useState(false)
  const rows = [
    { name: 'Customer support channels', channels: ecosystemChannels, reverse: false },
    { name: 'CRM and business tools', channels: ecosystemTools, reverse: true },
  ]

  return (
    <section className="ecosystem-section" id="ecosystem" aria-labelledby="ecosystem-title">
      <div className="page-shell">
        <Reveal className="ecosystem-heading">
          <div className="ecosystem-visual"><ChannelConversationDemo /></div>
          <div className="ecosystem-intro">
            <p className="eyebrow">Support that follows the customer</p>
            <h2 id="ecosystem-title">Start with a call. <span>Keep the context moving.</span></h2>
          </div>
          <div className="ecosystem-copy">
            <p>
              Voice is the first response. WhatsApp, email, web chat, and your existing business tools keep the same request moving when a person needs to step in.
            </p>
            <a href="/partners" className="text-link">
              See the support flow <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </div>
        </Reveal>
      </div>

      <div className={`ecosystem-marquee${paused ? ' is-paused' : ''}`} aria-label="Customer support channels and tools">
        {rows.map(row => (
          <div className="ecosystem-lane" key={row.name} role="region" aria-label={row.name} tabIndex={0}>
            <div className={`ecosystem-track${row.reverse ? ' ecosystem-track--reverse' : ''}`} style={{ animationDuration: `${row.channels.length * 3.4}s` }}>
              {[...row.channels, ...row.channels].map((channel, index) => (
                <div className="ecosystem-name" key={`${channel.name}-${index}`} aria-hidden={index >= row.channels.length} title={channel.detail}>
                  <span className="ecosystem-channel-icon" aria-hidden="true" style={{ color: channel.color }}>
                    {channel.image ? <img src={`/channel-icons/${channel.image}`} alt="" width={40} height={40} decoding="async" /> : channel.icon ? <channel.icon size={38} weight="duotone" /> : null}
                  </span>
                  {channel.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="page-shell ecosystem-note">
        <span>Channel and CRM examples; availability depends on your setup.</span>
        <button type="button" className="ecosystem-motion-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Resume channel rotation' : 'Pause channel rotation'}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{paused ? 'Resume' : 'Pause'}</button>
        <span>All trademarks belong to their respective owners.</span>
      </div>
    </section>
  )
}
