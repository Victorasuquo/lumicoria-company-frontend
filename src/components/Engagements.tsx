import { ArrowUpRight, Check } from '@phosphor-icons/react'
import { engagements, salesFormHref, voicePricingNote } from '../data/site'
import { Reveal } from './Reveal'

export function Engagements() {
  return (
    <section className="section engagements-section" id="engagements">
      <div className="page-shell">
        <Reveal className="section-heading engagement-heading">
          <p className="eyebrow">Plans and pricing</p>
          <h2>Choose your support plan. <span>Grow at your pace.</span></h2>
          <p>
            One-time setup, a monthly subscription, and voice credits you can track. All prices are in Nigerian naira.
          </p>
        </Reveal>

        <div className="engagement-grid">
          {engagements.map((engagement, index) => (
            <Reveal
              className={engagement.featured ? 'engagement-card featured' : 'engagement-card'}
              key={engagement.name}
              delay={index * 0.06}
            >
              <div className="engagement-card-top">
                <span className="engagement-index">0{index + 1}</span>
                {engagement.featured && <span className="popular-label">More voice credits</span>}
              </div>
              <h3>{engagement.name}</h3>
              <p className="engagement-best">{engagement.bestFor}</p>
              <div className="engagement-meta">
                <div><span>Billing</span><strong>{engagement.duration}</strong></div>
                <div><span>Price</span><strong>{engagement.price}</strong></div>
              </div>
              <ul>
                {engagement.includes.map((item) => (
                  <li key={item}><Check aria-hidden="true" weight="bold" />{item}</li>
                ))}
              </ul>
              {/* A plan you can simply buy sends people into the portal to sign
                  in and subscribe. Setup and Enterprise still need a
                  conversation, so those keep the sales form. */}
              <a
                className={engagement.featured ? 'button button-primary button-block' : 'button button-outline button-block'}
                href={engagement.href ?? salesFormHref}
              >
                {engagement.cta}
                <ArrowUpRight aria-hidden="true" weight="bold" />
              </a>
            </Reveal>
          ))}
        </div>
        <p className="engagement-pricing-note">{voicePricingNote}</p>
      </div>
    </section>
  )
}
