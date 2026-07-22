import { CheckCircle } from '@phosphor-icons/react'
import { approachSteps, deliveryMilestones } from '../data/site'
import { Reveal } from './Reveal'

export function DeliverySystem() {
  return (
    <section className="section approach-section" id="approach">
      <div className="page-shell">
        <Reveal className="section-heading approach-heading">
          <p className="eyebrow">How it works</p>
          <h2>A clear path from business problem <span>to working system.</span></h2>
          <p>
            You do not need a year-long transformation programme. We start narrow, prove value with real work, and expand from evidence.
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
              <p className="eyebrow">The first six weeks</p>
              <h3>Built to earn trust before autonomy.</h3>
            </div>
            <span><CheckCircle aria-hidden="true" weight="fill" /> 45-day production target</span>
          </div>
          <div className="milestone-grid">
            {deliveryMilestones.map((item) => (
              <div className="milestone" key={item.week}>
                <span>Week {item.week}</span>
                <strong>{item.label}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
