import { useState } from 'react'
import { ArrowRight, CheckCircle, Circle } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { deliverySteps } from '../data/site'
import { Reveal } from './Reveal'

export function DeliverySystem() {
  const [activeStep, setActiveStep] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const active = deliverySteps[activeStep]

  return (
    <section className="section section-delivery" id="delivery">
      <div className="page-shell delivery-layout">
        <Reveal className="delivery-copy">
          <p className="section-index">The delivery system</p>
          <h2>Every week has a decision, an owner, and an exit test.</h2>
          <p>
            The six-week build framework moves from process truth to controlled production. The agent earns autonomy in stages.
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              className="active-step-copy"
              key={active.title}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span>{active.week}</span>
              <h3>{active.title}</h3>
              <p>{active.description}</p>
            </motion.div>
          </AnimatePresence>

          <div className="delivery-commitments">
            <p><CheckCircle aria-hidden="true" weight="fill" />Written success criteria</p>
            <p><CheckCircle aria-hidden="true" weight="fill" />Documented rollback path</p>
            <p><CheckCircle aria-hidden="true" weight="fill" />Thirty-day hardening window</p>
          </div>
        </Reveal>

        <Reveal className="delivery-timeline" delay={0.1}>
          {deliverySteps.map((step, index) => {
            const isActive = index === activeStep
            const isComplete = index < activeStep
            return (
              <button
                className={isActive ? 'timeline-step is-active' : 'timeline-step'}
                key={step.title}
                type="button"
                onClick={() => setActiveStep(index)}
                onMouseEnter={() => setActiveStep(index)}
                aria-pressed={isActive}
              >
                <span className="timeline-marker">
                  {isComplete ? <CheckCircle aria-hidden="true" weight="fill" /> : <Circle aria-hidden="true" weight={isActive ? 'fill' : 'regular'} />}
                </span>
                <span className="timeline-meta">{step.week}</span>
                <strong>{step.title}</strong>
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
