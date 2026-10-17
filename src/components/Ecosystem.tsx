import { useState } from 'react'
import { ArrowUpRight, GlobeHemisphereWest, Pause, PhoneCall, Play, UsersThree, type Icon } from '@phosphor-icons/react'
import { Reveal } from './Reveal'

type EcosystemChannel = { name: string; image?: string; icon?: Icon; color?: string; detail?: string }

const ecosystemChannels: EcosystemChannel[] = [
  { name: 'Phone calls', icon: PhoneCall, color: '#b96816' },
  { name: 'WhatsApp Business', image: 'whatsapp.svg' },
  { name: 'Facebook Pages', image: 'facebook.png' },
  { name: 'Instagram DMs', image: 'instagram.webp' },
  { name: 'TikTok', image: 'tiktok.png', detail: 'Platform example · connection availability varies' },
  { name: 'Email', image: 'gmail.svg', detail: 'Gmail · email example' },
  { name: 'Google Business', image: 'google-business.svg' },
  { name: 'Web enquiries', icon: GlobeHemisphereWest, color: '#087f8c' },
  { name: 'CRM systems', icon: UsersThree, color: '#7544cb' },
  { name: 'Zendesk', image: 'zendesk.svg', detail: 'Helpdesk example · not a connection status' },
  { name: 'HubSpot', image: 'hubspot.png', detail: 'CRM example · not a connection status' },
  { name: 'Salesforce', image: 'salesforce.ico', detail: 'CRM example · not a connection status' },
  { name: 'Zoho CRM', image: 'zoho.ico', detail: 'CRM example · not a connection status' },
  { name: 'Bookings', image: 'calendar.svg', detail: 'Google Calendar · booking tool example' },
  { name: 'Spreadsheets', image: 'sheets.svg', detail: 'Google Sheets · spreadsheet tool example' },
]

export function Ecosystem() {
  const [paused, setPaused] = useState(false)
  const repeatedChannels = [...ecosystemChannels, ...ecosystemChannels]

  return (
    <section className="ecosystem-section" id="ecosystem" aria-labelledby="ecosystem-title">
      <div className="page-shell">
        <Reveal className="ecosystem-heading">
          <p className="eyebrow">Support that follows the customer</p>
          <h2 id="ecosystem-title">Start with a call. <span>Keep the context moving.</span></h2>
          <div>
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
        <div className="ecosystem-track" style={{ animationDuration: `${ecosystemChannels.length * 3.4}s` }}>
          {repeatedChannels.map((channel, index) => (
            <div className="ecosystem-name" key={`${channel.name}-${index}`} aria-hidden={index >= ecosystemChannels.length} title={channel.detail}>
              <span className="ecosystem-channel-icon" aria-hidden="true" style={{ color: channel.color }}>
                {channel.image ? <img src={`/channel-icons/${channel.image}`} alt="" width={40} height={40} decoding="async" /> : channel.icon ? <channel.icon size={38} weight="duotone" /> : null}
              </span>
              {channel.name}
            </div>
          ))}
        </div>
      </div>

      <div className="page-shell ecosystem-note">
        <span>Channel and CRM examples; availability depends on your setup.</span>
        <button type="button" className="ecosystem-motion-toggle" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? 'Resume channel rotation' : 'Pause channel rotation'}>{paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{paused ? 'Resume' : 'Pause'}</button>
        <span>All trademarks belong to their respective owners.</span>
      </div>
    </section>
  )
}
