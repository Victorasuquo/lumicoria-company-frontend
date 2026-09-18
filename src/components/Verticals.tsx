import {
  ArrowRight,
  Briefcase,
  Buildings,
  ShoppingBag,
  Truck,
  UsersThree,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { salesFormHref } from '../data/site'
import { Reveal } from './Reveal'

const verticals = [
  {
    id: 'logistics',
    tab: 'Logistics',
    title: 'Logistics and delivery teams',
    description: 'Answer shipment questions, capture delivery issues, and return exceptions to dispatch staff with the customer context intact.',
    buyer: 'For operations and support leads',
    phase: 'Starting market',
    image: '/generated/africa/industries/logistics-operations-africa.png',
    icon: Truck,
    workflows: ['Delivery status', 'Service coverage', 'Exception follow-up'],
  },
  {
    id: 'commerce',
    tab: 'Online retail',
    title: 'Online retailers and fulfilment teams',
    description: 'Keep order questions, payment concerns, returns, and post-purchase calls moving without making customers start again.',
    buyer: 'For founders and customer experience leads',
    phase: 'Starting market',
    image: '/generated/africa/industries/commerce-africa.png',
    icon: ShoppingBag,
    workflows: ['Order status', 'Returns triage', 'Lead capture'],
  },
  {
    id: 'hospitality',
    tab: 'Hotels and hospitality',
    title: 'Hotels and hospitality teams',
    description: 'Answer availability questions, capture booking requests, and give the front desk a clear record of every guest follow-up.',
    buyer: 'For hotel managers and guest-service leads',
    phase: 'Starting market',
    image: '/generated/africa/illustrations/hospitality-front-desk-africa.png',
    icon: Buildings,
    workflows: ['Room enquiries', 'Booking requests', 'Guest follow-up'],
  },
  {
    id: 'appointments',
    tab: 'Appointments',
    title: 'Clinics, salons, and appointment businesses',
    description: 'Make it easier for customers to ask questions, request a time, confirm an appointment, and reach a person when needed.',
    buyer: 'For practice, service, and front-desk managers',
    phase: 'Expansion market',
    image: '/generated/africa/illustrations/hospitality-front-desk-africa.png',
    icon: UsersThree,
    workflows: ['Availability questions', 'Appointment requests', 'Reminders'],
  },
  {
    id: 'services',
    tab: 'Professional services',
    title: 'Professional and service businesses',
    description: 'Capture new enquiries, answer approved questions, and route serious requests to the right person with the details already recorded.',
    buyer: 'For owners and client-service leads',
    phase: 'Expansion market',
    image: '/generated/africa/industries/professional-services-africa.png',
    icon: Briefcase,
    workflows: ['New enquiries', 'Service questions', 'Callback requests'],
  },
  {
    id: 'healthcare',
    tab: 'Healthcare administration',
    title: 'Healthcare administration teams',
    description: 'Handle routine appointment and service questions while sensitive health matters and clinical decisions remain with qualified staff.',
    buyer: 'For clinic and practice administrators',
    phase: 'Expansion market',
    image: '/generated/africa/illustrations/hospitality-front-desk-africa.png',
    icon: UsersThree,
    workflows: ['Appointment enquiries', 'Confirmations', 'Human escalation'],
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
            We begin with businesses where missed calls become lost orders, delayed bookings, or unresolved customer issues. The workflow changes by industry, but the outcome stays clear.
          </p>
          <div className="verticals-intro-actions">
            <a className="button button-primary" href={salesFormHref} target="_blank" rel="noreferrer">
              Talk to our team <ArrowRight aria-hidden="true" weight="bold" />
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
