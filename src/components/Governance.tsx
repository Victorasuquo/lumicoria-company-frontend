import { ArrowUpRight, Check } from '@phosphor-icons/react'
import { contactHref, guardrails, researchAreas } from '../data/site'
import { Reveal } from './Reveal'

export function Governance() {
  return (
    <>
      <section className="section section-governance">
        <div className="page-shell">
          <Reveal className="governance-heading">
            <p className="section-index">Production governance</p>
            <h2>Built to survive the moment the demo ends.</h2>
            <p>Reliability is designed into the workflow, release plan, and operating model before the first production run.</p>
          </Reveal>

          <div className="guardrail-grid">
            {guardrails.map((guardrail, index) => {
              const Icon = guardrail.icon
              return (
                <Reveal className="guardrail" key={guardrail.title} delay={index * 0.05}>
                  <Icon aria-hidden="true" weight="duotone" />
                  <div>
                    <h3>{guardrail.title}</h3>
                    <p>{guardrail.text}</p>
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal className="control-matrix">
            <div className="matrix-heading">
              <span className="system-label">Decision control</span>
              <strong>Autonomy follows risk</strong>
            </div>
            <div className="matrix-row">
              <span>Routine routing and internal notifications</span>
              <b>95-100% autonomous</b>
              <Check aria-hidden="true" weight="bold" />
            </div>
            <div className="matrix-row">
              <span>Drafts and scheduled communications</span>
              <b>70-95% autonomous</b>
              <Check aria-hidden="true" weight="bold" />
            </div>
            <div className="matrix-row">
              <span>Pricing, offers, and public content</span>
              <b>Human approval required</b>
              <Check aria-hidden="true" weight="bold" />
            </div>
            <div className="matrix-row">
              <span>Credit, hiring, contracts, public statements</span>
              <b>100% human approval</b>
              <Check aria-hidden="true" weight="bold" />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section-research" id="research">
        <div className="page-shell research-layout">
          <Reveal className="research-copy">
            <p className="section-index">Applied research</p>
            <h2>Hard delivery problems become reusable knowledge.</h2>
            <p>
              Lumicoria.com hosts the applied research practice for Lumicoria Inc. Work from customer engagements feeds evaluation methods, coordination patterns, and the platform roadmap.
            </p>
            <a className="text-link" href={contactHref}>
              Discuss a research engagement
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </Reveal>

          <div className="research-list">
            {researchAreas.map((area, index) => {
              const Icon = area.icon
              return (
                <Reveal className="research-row" key={area.label} delay={index * 0.05} amount={0.5}>
                  <Icon aria-hidden="true" weight="duotone" />
                  <span>{area.label}</span>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
