import { ArrowUpRight } from '@phosphor-icons/react'
import { contactHref, engagements } from '../data/site'
import { Reveal } from './Reveal'

export function Engagements() {
  return (
    <section className="section section-engagements" id="engagements">
      <div className="page-shell">
        <Reveal className="section-intro engagements-intro">
          <p className="section-index">Ways to engage</p>
          <h2>Start at the level of certainty you need.</h2>
          <p>Fixed-fee engagements create a clear buying path from workflow discovery to ongoing operation.</p>
        </Reveal>

        <div className="engagement-list">
          {engagements.map((engagement, index) => (
            <Reveal className="engagement-row" key={engagement.name} delay={index * 0.04} amount={0.35}>
              <div className="engagement-name">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{engagement.name}</h3>
              </div>
              <p>{engagement.description}</p>
              <div className="engagement-terms">
                <span>{engagement.duration}</span>
                <strong>{engagement.price}</strong>
              </div>
              <a href={contactHref} aria-label={`${engagement.cta}: ${engagement.name}`}>
                <span>{engagement.cta}</span>
                <ArrowUpRight aria-hidden="true" weight="bold" />
              </a>
            </Reveal>
          ))}
        </div>
        <p className="pricing-note">Pricing reflects the current productised offer ranges in the Lumicoria.com agency PRD. Final scope is confirmed in writing.</p>
      </div>
    </section>
  )
}
