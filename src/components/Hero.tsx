import {
  ArrowDown,
  ArrowUpRight,
  Check,
  CheckCircle,
  Lightning,
  Sparkle,
} from '@phosphor-icons/react'
import { motion, useReducedMotion } from 'motion/react'
import { contactHref, heroActivity, heroOutcomes, proofPoints } from '../data/site'

export function Hero() {
  const prefersReducedMotion = useReducedMotion()

  const enter = (delay: number) => ({
    initial: prefersReducedMotion ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <section className="hero" id="top">
      <div className="page-shell hero-shell">
        <motion.div
          className="hero-media"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.82, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            className="hero-media-image"
            src="/lumicoria-hero-v2.jpg"
            alt=""
            fetchPriority="high"
          />
          <div className="hero-media-overlay" aria-hidden="true" />

          <div className="hero-copy">
            <motion.p className="eyebrow hero-eyebrow" {...enter(0.06)}>
              <Sparkle aria-hidden="true" weight="fill" />
              AI delivery for growing companies
            </motion.p>

            <motion.h1 {...enter(0.14)}>
              Give your team back the hours <span>AI can handle.</span>
            </motion.h1>

            <motion.p className="hero-lede" {...enter(0.22)}>
              Lumicoria turns repeatable work across sales, customer experience, finance, and operations into reliable AI systems, so your people can focus on customers, decisions, and growth.
            </motion.p>

            <motion.div className="hero-actions" {...enter(0.3)}>
              <a className="button button-white" href={contactHref}>
                Talk to our team
                <ArrowUpRight aria-hidden="true" weight="bold" />
              </a>
              <a className="button hero-secondary-button" href="#solutions">
                See what we build
                <ArrowDown aria-hidden="true" weight="bold" />
              </a>
            </motion.div>

            <motion.div className="hero-reassurance" {...enter(0.38)}>
              <span><Check aria-hidden="true" weight="bold" /> Start with one workflow</span>
              <span><Check aria-hidden="true" weight="bold" /> See value in weeks</span>
              <span><Check aria-hidden="true" weight="bold" /> Keep human control</span>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          className="hero-stage"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 34, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
          aria-label="An example day of work coordinated by Lumicoria"
        >
          <div className="stage-shine" aria-hidden="true" />
          <div className="stage-topline">
            <span>Today with Lumicoria</span>
            <span className="stage-live"><i /> Working across your business</span>
          </div>

          <div className="stage-grid">
            <div className="activity-panel glass-panel">
              <span className="stage-label">Work handled</span>
              <div className="activity-list">
                {heroActivity.map((item, index) => (
                  <motion.div
                    className="activity-item"
                    key={item.label}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.5 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className={`activity-dot ${item.tone}`}><CheckCircle aria-hidden="true" weight="fill" /></span>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.time}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="stage-core" aria-hidden="true">
              <motion.div
                className="core-orbit core-orbit-outer"
                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="core-orbit core-orbit-inner"
                animate={prefersReducedMotion ? undefined : { rotate: -360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              />
              <div className="core-mark">
                <img src="/brand-mark.png" alt="" />
              </div>
              <span className="core-caption">Lumicoria coordinates the work</span>
            </div>

            <div className="outcome-panel glass-panel">
              <span className="stage-label">Your team gets back</span>
              <div className="outcome-list">
                {heroOutcomes.map((outcome, index) => (
                  <motion.div
                    key={outcome}
                    initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.56 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Lightning aria-hidden="true" weight="fill" />
                    <span>{outcome}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="stage-footer">
            <span>Built around your rules</span>
            <span>Connected to your tools</span>
            <span>Measured against a business result</span>
          </div>
        </motion.div>
      </div>

      <div className="proof-strip">
        <div className="page-shell proof-grid">
          {proofPoints.map((point) => (
            <div className="proof-point" key={point.label}>
              <strong>{point.value}</strong>
              <span>{point.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
