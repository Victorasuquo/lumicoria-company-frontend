import { ArrowRight, Check, Play } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Reveal } from './Reveal'

const stories = [
  {
    id: 'saas',
    label: 'B2B SaaS',
    statement: 'The revenue team should spend its week talking to qualified buyers—not researching accounts and repairing CRM records.',
    person: 'Representative SaaS founder',
    role: 'Illustrative engagement blueprint',
    image: '/stories/saas-founder.jpg',
    challenge: 'Manual prospect research, qualification, follow-up, and CRM upkeep fragment the seller’s day.',
    shape: 'Outbound research agent + lead triage + CRM integration + human approval at outreach.',
    change: 'A measurable path toward more selling time and a CRM the team can trust.',
  },
  {
    id: 'agency',
    label: 'Agency operations',
    statement: 'Account managers should create client value—not lose margin to reporting, content repurposing, and internal handoffs.',
    person: 'Representative agency leader',
    role: 'Illustrative engagement blueprint',
    image: '/stories/agency-leader.jpg',
    challenge: 'Recurring campaign administration absorbs time that should remain billable and client-facing.',
    shape: 'Lead intake + campaign reporting + content operations coordinated through reviewed agents.',
    change: 'A clearer operating rhythm with more capacity protected for client work.',
  },
  {
    id: 'logistics',
    label: 'Logistics',
    statement: 'Operations leaders should manage the exceptions—not chase every invoice, dispatch update, and SLA by hand.',
    person: 'Representative operations leader',
    role: 'Illustrative engagement blueprint',
    image: '/stories/operations-leader.jpg',
    challenge: 'Invoices, dispatch events, and service exceptions move through disconnected queues and inboxes.',
    shape: 'Document extraction + dispatch tasking + SLA monitoring + named exception owners.',
    change: 'A visible operations flow where people intervene only when judgment is required.',
  },
]

export function EngagementStories() {
  const [activeId, setActiveId] = useState(stories[0].id)
  const prefersReducedMotion = useReducedMotion()
  const active = stories.find((story) => story.id === activeId) ?? stories[0]

  return (
    <section className="section stories-section" id="stories">
      <div className="page-shell">
        <Reveal className="stories-heading">
          <div>
            <p className="eyebrow">Engagement stories</p>
            <h2>Proof should be specific. <span>And honest.</span></h2>
          </div>
          <p>
            Public customer stories will appear only with client approval. Until then, these representative blueprints show the problems, delivery shapes, and operating changes Lumicoria is built to own—without dressing examples up as testimonials.
          </p>
        </Reveal>

        <div className="story-tabs" role="tablist" aria-label="Representative engagement stories">
          {stories.map((story) => (
            <button
              className={story.id === activeId ? 'story-tab active' : 'story-tab'}
              type="button"
              role="tab"
              aria-selected={story.id === activeId}
              aria-controls={`story-${story.id}`}
              onClick={() => setActiveId(story.id)}
              key={story.id}
            >
              {story.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            className="story-panel"
            id={`story-${active.id}`}
            role="tabpanel"
            key={active.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="story-copy">
              <span className="story-disclosure"><Check aria-hidden="true" weight="bold" /> Representative engagement · not a customer testimonial</span>
              <h3>{active.statement}</h3>
              <div className="story-blueprint">
                <div><span>The operating problem</span><p>{active.challenge}</p></div>
                <div><span>What we would build</span><p>{active.shape}</p></div>
                <div><span>The intended change</span><p>{active.change}</p></div>
              </div>
              <a className="button button-primary" href="/case-studies">
                Explore engagement blueprints <ArrowRight aria-hidden="true" weight="bold" />
              </a>
              <div className="story-person">
                <span>{active.person}</span>
                <small>{active.role}</small>
              </div>
            </div>

            <div className="story-media">
              <img src={active.image} alt="" />
              <div className="story-media-shade" />
              <div className="story-play">
                <span><Play aria-hidden="true" weight="fill" /></span>
                Preview the workflow
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  )
}
