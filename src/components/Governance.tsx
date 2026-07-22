import { ArrowUpRight, Flask } from '@phosphor-icons/react'
import { contactHref, researchAreas, trustPrinciples } from '../data/site'
import { Reveal } from './Reveal'

export function Governance() {
  return (
    <section className="section trust-section" id="trust">
      <div className="page-shell">
        <Reveal className="trust-intro">
          <div>
            <p className="eyebrow light">Designed for production</p>
            <h2>Give AI the right amount of freedom. <span>Not all of it.</span></h2>
          </div>
          <p>
            Trust is not a promise we add at the end. It is built into how the workflow is designed, tested, released, and owned.
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
            <h3>Research that makes production systems better.</h3>
            <p>
              Our applied research practice focuses on the practical questions that appear after the demo: reliability, evaluation, coordination, oversight, and cost.
            </p>
            <a className="text-link" href={contactHref}>
              Discuss a research engagement <ArrowUpRight aria-hidden="true" weight="bold" />
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
