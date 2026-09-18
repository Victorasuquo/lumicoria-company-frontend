import { ArrowUpRight } from '@phosphor-icons/react'
import { Reveal } from './Reveal'

const ecosystemNames = [
  'Phone calls',
  'WhatsApp Business',
  'Facebook Pages',
  'Instagram DMs',
  'Email',
  'Google Business',
  'Web enquiries',
  'CRM systems',
  'Bookings',
  'Spreadsheets',
]

export function Ecosystem() {
  const repeatedNames = [...ecosystemNames, ...ecosystemNames]

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

      <div className="ecosystem-marquee" aria-label="Customer support channels and tools">
        <div className="ecosystem-track">
          {repeatedNames.map((name, index) => (
            <div className="ecosystem-name" key={`${name}-${index}`} aria-hidden={index >= ecosystemNames.length}>
              <span className="ecosystem-orbit" aria-hidden="true" />
              {name}
            </div>
          ))}
        </div>
      </div>

      <div className="page-shell ecosystem-note">
        <span>Bring the channels and tools your team already uses.</span>
        <span>All trademarks belong to their respective owners.</span>
      </div>
    </section>
  )
}
