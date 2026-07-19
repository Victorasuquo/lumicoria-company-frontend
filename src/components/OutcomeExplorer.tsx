import { useState } from 'react'
import { ArrowRight, CheckCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { outcomes } from '../data/site'
import { Reveal } from './Reveal'

export function OutcomeExplorer() {
  const [activeId, setActiveId] = useState(outcomes[0].id)
  const prefersReducedMotion = useReducedMotion()
  const active = outcomes.find((item) => item.id === activeId) ?? outcomes[0]
  const Icon = active.icon

  return (
    <section className="section section-work" id="work">
      <div className="page-shell">
        <Reveal className="section-intro">
          <p className="section-index">What we build</p>
          <h2>Start with the work that is already costing you.</h2>
          <p>We choose a workflow with a measurable baseline, then build the agent around the operating reality of your team.</p>
        </Reveal>

        <Reveal className="outcome-explorer" delay={0.08}>
          <div className="outcome-tabs" role="tablist" aria-label="Agent workflow categories">
            {outcomes.map((outcome) => {
              const OutcomeIcon = outcome.icon
              const isActive = outcome.id === activeId
              return (
                <button
                  key={outcome.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`outcome-${outcome.id}`}
                  className={isActive ? 'outcome-tab is-active' : 'outcome-tab'}
                  onClick={() => setActiveId(outcome.id)}
                >
                  <OutcomeIcon aria-hidden="true" weight={isActive ? 'fill' : 'regular'} />
                  <span>{outcome.label}</span>
                  <ArrowRight aria-hidden="true" weight="bold" />
                </button>
              )
            })}
          </div>

          <div className="outcome-panel-wrap">
            <AnimatePresence mode="wait">
              <motion.article
                className="outcome-panel"
                id={`outcome-${active.id}`}
                key={active.id}
                role="tabpanel"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="outcome-heading">
                  <Icon aria-hidden="true" weight="duotone" />
                  <div>
                    <h3>{active.title}</h3>
                    <p>{active.description}</p>
                  </div>
                </div>

                <div className="outcome-detail-grid">
                  <div>
                    <span className="system-label">Work handled</span>
                    {active.tasks.map((item) => (
                      <p key={item}><CheckCircle aria-hidden="true" weight="fill" />{item}</p>
                    ))}
                  </div>
                  <div>
                    <span className="system-label">Measure</span>
                    {active.measures.map((item) => (
                      <p key={item}><CheckCircle aria-hidden="true" weight="fill" />{item}</p>
                    ))}
                  </div>
                  <div>
                    <span className="system-label">Connect</span>
                    {active.systems.map((item) => (
                      <p key={item}><CheckCircle aria-hidden="true" weight="fill" />{item}</p>
                    ))}
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
