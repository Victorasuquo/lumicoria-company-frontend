import { ArrowRight, Check, Play } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Reveal } from './Reveal'

const stories = [
  {
    id: 'retail',
    label: 'Online retail',
    statement: 'A customer should not have to call three times to find out where an order is.',
    person: 'Representative online retail team',
    role: 'Illustrative engagement blueprint',
    image: '/generated/africa/industries/commerce-africa.png',
    challenge: 'Order questions and returns arrive through calls and messages while staff are packing, dispatching, and selling.',
    shape: 'Voice answers for routine order questions, with unresolved requests recorded for staff follow-up.',
    change: 'Customers get a clear next step and staff start follow-up with the context already in front of them.',
  },
  {
    id: 'hospitality',
    label: 'Hospitality',
    statement: 'A guest enquiry should reach the right person before the room or booking is lost.',
    person: 'Representative hospitality team',
    role: 'Illustrative engagement blueprint',
    image: '/generated/africa/illustrations/hospitality-front-desk-africa.png',
    challenge: 'Front-desk teams answer the same availability and booking questions while managing guests already on site.',
    shape: 'Voice support for routine enquiries, booking capture, and a clear handoff for requests the front desk must decide.',
    change: 'More enquiries are captured without asking the team to sound less human.',
  },
  {
    id: 'logistics',
    label: 'Logistics',
    statement: 'Dispatch staff should solve delivery exceptions—not repeat the same status update all day.',
    person: 'Representative logistics team',
    role: 'Illustrative engagement blueprint',
    image: '/generated/africa/illustrations/bike-courier-africa.png',
    challenge: 'Customers call for delivery updates while dispatch teams are coordinating riders, routes, and exceptions.',
    shape: 'A voice workflow for delivery status, service coverage, and named human follow-up when something has gone wrong.',
    change: 'Customers receive a useful answer and exceptions become visible work instead of another missed call.',
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
            These representative blueprints show how voice support can fit real businesses. They are examples, not customer testimonials.
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
              <span className="story-disclosure"><Check aria-hidden="true" weight="bold" /> Representative scenario · not a customer testimonial</span>
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
