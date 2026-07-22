import { ArrowUpRight, Check } from '@phosphor-icons/react'
import { contactHref, engagements } from '../data/site'
import { Reveal } from './Reveal'

export function Engagements() {
  return (
    <section className="section engagements-section" id="engagements">
      <div className="page-shell">
        <Reveal className="section-heading engagement-heading">
          <p className="eyebrow">Ways to work together</p>
          <h2>Start at the level of commitment <span>that feels right.</span></h2>
          <p>
            Every engagement has a defined outcome, timeline, and handover. Begin with discovery or move directly into a production build when the workflow is already clear.
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
                {engagement.featured && <span className="popular-label">Most common start</span>}
              </div>
              <h3>{engagement.name}</h3>
              <p className="engagement-best">{engagement.bestFor}</p>
              <div className="engagement-meta">
                <div><span>Timeline</span><strong>{engagement.duration}</strong></div>
                <div><span>Investment</span><strong>{engagement.price}</strong></div>
              </div>
              <ul>
                {engagement.includes.map((item) => (
                  <li key={item}><Check aria-hidden="true" weight="bold" />{item}</li>
                ))}
              </ul>
              <a className={engagement.featured ? 'button button-primary button-block' : 'button button-outline button-block'} href={contactHref}>
                {engagement.cta}
                <ArrowUpRight aria-hidden="true" weight="bold" />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
