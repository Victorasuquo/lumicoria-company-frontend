import {
  ArrowRight,
  Briefcase,
  Code,
  MegaphoneSimple,
  ShoppingBag,
  Truck,
  UsersThree,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { contactHref } from '../data/site'
import { Reveal } from './Reveal'

const verticals = [
  {
    id: 'saas',
    tab: 'SaaS + technology',
    title: 'B2B SaaS and technology companies',
    description: 'Turn account research, qualification, follow-up, and CRM maintenance into one governed revenue workflow.',
    buyer: 'For founders and revenue leaders',
    phase: 'Current focus',
    image: '/industries/b2b-saas.jpg',
    icon: Code,
    workflows: ['Outbound research', 'Lead triage', 'CRM hygiene'],
  },
  {
    id: 'agency',
    tab: 'Marketing agencies',
    title: 'Marketing and creative agencies',
    description: 'Recover billable capacity by coordinating lead intake, campaign reporting, content repurposing, and client handoffs.',
    buyer: 'For agency founders and account leaders',
    phase: 'Current focus',
    image: '/industries/marketing-agencies.jpg',
    icon: MegaphoneSimple,
    workflows: ['Lead intake', 'Campaign reporting', 'Content operations'],
  },
  {
    id: 'logistics',
    tab: 'Logistics + operations',
    title: 'Logistics and operations-heavy businesses',
    description: 'Move invoices, dispatch updates, SLA checks, and exceptions through one visible operating flow.',
    buyer: 'For COOs and operations leaders',
    phase: 'Current focus',
    image: '/industries/logistics-operations.jpg',
    icon: Truck,
    workflows: ['Invoice processing', 'Dispatch updates', 'SLA monitoring'],
  },
  {
    id: 'people',
    tab: 'People operations',
    title: 'People, recruiting, and knowledge teams',
    description: 'Coordinate screening, scheduling, onboarding, and policy questions while keeping sensitive decisions with people.',
    buyer: 'For people and talent leaders',
    phase: 'Adjacent capability',
    image: '/industries/people-operations.jpg',
    icon: UsersThree,
    workflows: ['Candidate screening', 'Interview scheduling', 'Onboarding'],
  },
  {
    id: 'commerce',
    tab: 'Commerce',
    title: 'E-commerce and customer operations',
    description: 'Keep order questions, returns, customer support, and post-purchase communication moving around the clock.',
    buyer: 'For commerce and CX leaders',
    phase: 'Adjacent capability',
    image: '/industries/commerce.jpg',
    icon: ShoppingBag,
    workflows: ['Order status', 'Returns triage', 'Customer support'],
  },
  {
    id: 'professional',
    tab: 'Professional services',
    title: 'Professional and advisory services',
    description: 'Make client intake, document collection, status reporting, and deliverable handoff feel like one connected service.',
    buyer: 'For managing partners and delivery leads',
    phase: 'Adjacent capability',
    image: '/industries/professional-services.jpg',
    icon: Briefcase,
    workflows: ['Client onboarding', 'Document intake', 'Status reporting'],
  },
]

export function Verticals() {
  const [activeId, setActiveId] = useState(verticals[0].id)
  const prefersReducedMotion = useReducedMotion()
  const active = verticals.find((vertical) => vertical.id === activeId) ?? verticals[0]
  const ActiveIcon = active.icon

  return (
    <section className="section verticals-section" id="industries">
      <div className="page-shell verticals-layout">
        <Reveal className="verticals-intro">
          <p className="eyebrow">Industry focus</p>
          <h2>Built around the work <span>inside your industry.</span></h2>
          <p>
            We begin where repeated work, fragmented systems, and human judgment meet. These are the markets where Lumicoria is concentrating delivery patterns first.
          </p>
          <div className="verticals-intro-actions">
            <a className="button button-primary" href={contactHref}>
              Discuss your workflow <ArrowRight aria-hidden="true" weight="bold" />
            </a>
            <a className="text-link" href="/industries">
              View all industry work <ArrowRight aria-hidden="true" weight="bold" />
            </a>
          </div>
        </Reveal>

        <div className="verticals-showcase">
          <div className="vertical-tabs" role="tablist" aria-label="Industries">
            {verticals.map((vertical) => (
              <button
                className={vertical.id === activeId ? 'vertical-tab active' : 'vertical-tab'}
                key={vertical.id}
                type="button"
                role="tab"
                aria-selected={vertical.id === activeId}
                aria-controls={`vertical-${vertical.id}`}
                onClick={() => setActiveId(vertical.id)}
              >
                {vertical.tab}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              className="vertical-card"
              id={`vertical-${active.id}`}
              role="tabpanel"
              key={active.id}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, x: -18 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            >
              <img src={active.image} alt="" />
              <div className="vertical-card-shade" />
              <div className="vertical-card-copy">
                <div className="vertical-card-meta">
                  <span><ActiveIcon aria-hidden="true" weight="duotone" />{active.phase}</span>
                  <span>{active.buyer}</span>
                </div>
                <h3>{active.title}</h3>
                <p>{active.description}</p>
              </div>
              <div className="vertical-workflows">
                {active.workflows.map((workflow) => <span key={workflow}>{workflow}</span>)}
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
