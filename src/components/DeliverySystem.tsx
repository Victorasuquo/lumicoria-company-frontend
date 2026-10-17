import { ArrowUpRight, CheckCircle } from '@phosphor-icons/react'
import { approachSteps, salesFormHref } from '../data/site'
import { Reveal } from './Reveal'

export function DeliverySystem() {
  return (
    <section className="section approach-section" id="how-it-works" aria-labelledby="how-it-works-title">
      <div className="page-shell" id="approach">
        <Reveal className="section-heading approach-heading">
          <p className="eyebrow">How it works</p>
          <h2 id="how-it-works-title">From your business knowledge <span>to a helpful conversation.</span></h2>
          <p>
            Three steps to support that sounds like your business and knows when to bring in your team.
          </p>
        </Reveal>

        <div className="approach-steps">
          {approachSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <Reveal className="approach-step" key={step.number} delay={index * 0.08}>
                <div className="approach-step-top">
                  <span className="approach-number">{step.number}</span>
                  <span className="approach-icon"><Icon aria-hidden="true" weight="duotone" /></span>
                </div>
                <p className="eyebrow">{step.eyebrow}</p>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <span className="timing-pill">{step.timing}</span>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="delivery-track">
          <div className="delivery-track-head">
            <div>
              <p className="eyebrow">During a conversation</p>
              <h3>Every request has a next step.</h3>
            </div>
            <span><CheckCircle aria-hidden="true" weight="fill" /> Human handoff when needed</span>
          </div>
          <div className="milestone-grid support-flow-grid">
            {[
              { label: 'A customer gets in touch', detail: 'Through a channel you have configured and enabled.' },
              { label: 'Your agent responds', detail: 'Using approved answers, with the request captured.' },
              { label: 'Your team follows through', detail: 'Review the conversation and take over when needed.' },
            ].map((item) => (
              <div className="milestone" key={item.label}>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <div className="how-it-works-actions"><a className="button button-primary" href={salesFormHref}>Try the demo <ArrowUpRight aria-hidden="true" /></a><a className="text-link" href="#engagements">See plans and pricing <ArrowUpRight aria-hidden="true" /></a></div>
      </div>
    </section>
  )
}
