import { ArrowUpRight, Flask } from '@phosphor-icons/react'
import { researchAreas, salesFormHref, trustPrinciples } from '../data/site'
import { Reveal } from './Reveal'

export function Governance() {
  return (
    <section className="section trust-section" id="trust">
      <div className="page-shell">
        <Reveal className="trust-intro">
          <div>
            <p className="eyebrow light">Designed for production</p>
            <h2>Give customers a quick answer. <span>Keep judgment with people.</span></h2>
          </div>
          <p>
            Support should feel helpful and accountable. Routine questions can move quickly, while complaints, uncertainty, and sensitive decisions reach your team.
          </p>
        </Reveal>

        <div className="trust-grid">
          {trustPrinciples.map((principle, index) => {
            const Icon = principle.icon
            return (
              <Reveal className="trust-item" key={principle.title} delay={index * 0.06}>
                <span className="trust-icon"><Icon aria-hidden="true" weight="duotone" /></span>
                <span className="trust-number">0{index + 1}</span>
                <h3>{principle.title}</h3>
                <p>{principle.text}</p>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="research-panel" id="research">
          <div className="research-copy">
            <span className="research-icon"><Flask aria-hidden="true" weight="duotone" /></span>
            <p className="eyebrow">Applied AI research</p>
            <h3>Better support starts with better information.</h3>
            <p>
              We help teams keep their answers current, review what customers ask, and improve the support workflow as the business changes.
            </p>
            <a className="text-link" href={salesFormHref} target="_blank" rel="noreferrer">
              Talk to our team <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </div>
          <div className="research-list">
            {researchAreas.map((area, index) => (
              <div key={area}><span>0{index + 1}</span><p>{area}</p></div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
