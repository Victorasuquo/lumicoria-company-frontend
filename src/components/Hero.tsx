import { ArrowDown, ArrowUpRight, Check, Pulse } from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { contactHref, deliverySteps } from '../data/site'

export function Hero() {
  const prefersReducedMotion = useReducedMotion()

  const enter = (delay: number) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y: 26 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <section className="hero" id="top">
      <div className="hero-grid page-shell">
        <div className="hero-copy">
          <motion.p className="hero-kicker" {...enter(0.08)}>
            Lumicoria.com <span>AI delivery and applied research</span>
          </motion.p>
          <motion.h1 {...enter(0.16)}>
            Production AI agents. <span>Delivered in weeks.</span>
          </motion.h1>
          <motion.p className="hero-lede" {...enter(0.24)}>
            We design, deploy, and operate agents for sales, operations, and customer workflows. Every build is measured against a business result and runs on Lumicoria.ai.
          </motion.p>
          <motion.div className="hero-actions" {...enter(0.32)}>
            <a className="button button-primary" href={contactHref}>
              Book a discovery call
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
            <a className="button button-secondary" href="#delivery">
              See the delivery system
              <ArrowDown aria-hidden="true" weight="bold" />
            </a>
          </motion.div>
          <motion.p className="hero-note" {...enter(0.4)}>
            Fixed scope. Explicit success criteria. Human approval where the decision matters.
          </motion.p>
        </div>

        <motion.div
          className="delivery-blueprint"
          initial={prefersReducedMotion ? false : { opacity: 0, x: 34, rotate: 1.5 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="blueprint-head">
            <div>
              <span className="system-label">Production path</span>
              <strong>One agent, live in six weeks</strong>
            </div>
            <div className="live-signal">
              <Pulse aria-hidden="true" weight="fill" />
              Governed build
            </div>
          </div>

          <div className="blueprint-body">
            <div className="blueprint-steps" role="list" aria-label="Six-week delivery sequence">
              {deliverySteps.map((step, index) => (
                <motion.div
                  className="blueprint-step"
                  key={step.title}
                  role="listitem"
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.48 + index * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <span>{step.week.replace('Week ', 'W')}</span>
                  <b>{step.title}</b>
                  <Check aria-hidden="true" weight="bold" />
                </motion.div>
              ))}
            </div>

            <div className="blueprint-control">
              <span className="system-label">Release control</span>
              <div className="control-line">
                <span>Shadow mode</span>
                <b>Required</b>
              </div>
              <div className="control-line">
                <span>Human approval</span>
                <b>Risk-based</b>
              </div>
              <div className="control-line">
                <span>Rollback path</span>
                <b>Documented</b>
              </div>
            </div>
          </div>

          <div className="blueprint-foot">
            <span>Built on Lumicoria.ai</span>
            <span>Observable from day one</span>
          </div>
        </motion.div>
      </div>

      <div className="proof-rail" aria-label="Lumicoria platform facts">
        <div className="page-shell proof-rail-inner">
          <div><strong>21</strong><span>production agents in the platform library</span></div>
          <div><strong>6</strong><span>model providers with routing and fallback</span></div>
          <div><strong>3</strong><span>supported vector-store backends</span></div>
          <div><strong>45 days</strong><span>target from signature to production</span></div>
        </div>
      </div>
    </section>
  )
}
