import { ArrowRight, Check, HandPalm, Target } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { outcomes } from '../data/site'
import { Reveal } from './Reveal'

export function OutcomeExplorer() {
  const [activeId, setActiveId] = useState(outcomes[0].id)
  const prefersReducedMotion = useReducedMotion()
  const active = outcomes.find((outcome) => outcome.id === activeId) ?? outcomes[0]
  const ActiveIcon = active.icon

  return (
    <section className="section solutions-section" id="solutions">
      <div className="page-shell">
        <Reveal className="section-heading solutions-heading">
          <p className="eyebrow">What we build</p>
          <h2>Start with the work. <span>Not the technology.</span></h2>
          <p>
            The best AI projects begin with a visible business problem. Choose the area where your team is losing the most time, speed, or customer attention.
          </p>
        </Reveal>

        <div className="solution-tabs" role="tablist" aria-label="Business areas">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon
            const isActive = outcome.id === activeId
            return (
              <button
                key={outcome.id}
                className={isActive ? 'solution-tab active' : 'solution-tab'}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`solution-${outcome.id}`}
                onClick={() => setActiveId(outcome.id)}
              >
                <Icon aria-hidden="true" weight={isActive ? 'fill' : 'regular'} />
                <span>{outcome.label}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="solution-view"
            id={`solution-${active.id}`}
            role="tabpanel"
            key={active.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="solution-story">
              <span className="solution-icon"><ActiveIcon aria-hidden="true" weight="duotone" /></span>
              <h3>{active.title}</h3>
              <p>{active.description}</p>
              <a href="#approach" className="text-link">
                See how we deliver it <ArrowRight aria-hidden="true" weight="bold" />
              </a>
            </div>

            <div className="solution-details">
              <div className="solution-result">
                <span className="detail-icon"><Target aria-hidden="true" weight="duotone" /></span>
                <div>
                  <span className="stage-label">The business result</span>
                  <strong>{active.result}</strong>
                </div>
              </div>

              <div className="solution-columns">
                <div>
                  <span className="stage-label">The agent can handle</span>
                  <ul>
                    {active.handles.map((item) => (
                      <li key={item}><Check aria-hidden="true" weight="bold" />{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="stage-label">People stay responsible for</span>
                  <p className="human-boundary"><HandPalm aria-hidden="true" weight="duotone" />{active.humans}</p>
                  <span className="measure-line">Measured by: {active.measure}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}
