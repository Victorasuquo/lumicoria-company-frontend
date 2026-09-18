import { ArrowUpRight, CirclesFour, Cube, ShieldCheck, Stack } from '@phosphor-icons/react'
import { Reveal } from './Reveal'

const platformCapabilities = [
  {
    icon: Cube,
    title: 'Answer routine calls',
    text: 'Give customers clear answers about orders, deliveries, bookings, availability, and approved business policies.',
    visual: (
      <div className="platform-agent-stack" aria-hidden="true">
        <span>Customer support</span>
        <span>Delivery enquiries</span>
        <span>Booking requests</span>
      </div>
    ),
  },
  {
    icon: CirclesFour,
    title: 'Keep people in the loop',
    text: 'Set clear boundaries for complaints, refunds, disputes, and any request that needs a member of staff to decide.',
    visual: (
      <div className="platform-flow-mini" aria-hidden="true">
        <span>Call</span><i /><span>Answer</span><i /><span>Handoff</span>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'See what still needs attention',
    text: 'Give managers a shared view of calls, unresolved requests, next actions, and the quality of customer follow-up.',
    visual: (
      <div className="platform-workspace-mini" aria-hidden="true">
        <span>Calls</span>
        <span>Follow-up</span>
        <span>Knowledge</span>
        <span>Reports</span>
      </div>
    ),
  },
]

export function MeetPlatform() {
  return (
    <section className="section meet-platform-section" id="platform">
      <div className="page-shell">
        <Reveal className="platform-hero-card">
          <div className="platform-hero-glow" aria-hidden="true" />
          <div className="platform-hero-copy">
            <p className="eyebrow light">The workspace behind your support team</p>
            <h2>Meet <span>{'{ Lumicoria.ai }'}</span></h2>
            <p>
              One place to prepare approved answers, manage voice support, preserve context, and keep every important follow-up visible.
            </p>
            <a href="https://lumicoria.ai" target="_blank" rel="noreferrer" aria-label="Explore Lumicoria.ai">
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </div>

          <div className="platform-operating-map" aria-label="Lumicoria.ai operating environment preview">
            <div className="operating-map-head">
              <span><img src="/brand-mark.png" alt="" /> Lumicoria.ai</span>
                <span>Support workspace</span>
            </div>
            <div className="operating-map-body">
              <div className="operating-map-sidebar">
                <span className="active"><Stack aria-hidden="true" />Workspace</span>
                <span>Agents</span>
                <span>Knowledge</span>
                <span>Governance</span>
              </div>
              <div className="operating-map-canvas">
                <div className="operating-map-kicker">Active workflow</div>
                <strong>Customer call → accountable follow-up</strong>
                <div className="operating-map-flow">
                  <span>Call</span><i /><span>Answer</span><i /><span>Staff</span><i /><span>Outcome</span>
                </div>
                <div className="operating-map-stats">
                  <div><span>Model route</span><strong>Automatic fallback</strong></div>
                  <div><span>Human gate</span><strong>Required</strong></div>
                  <div><span>Audit trail</span><strong>Complete</strong></div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="platform-capability-grid">
          {platformCapabilities.map((capability, index) => {
            const Icon = capability.icon
            return (
              <Reveal className="platform-capability" delay={index * 0.08} key={capability.title}>
                <div className="platform-capability-head">
                  <Icon aria-hidden="true" weight="duotone" />
                  <ArrowUpRight aria-hidden="true" weight="bold" />
                </div>
                <h3>{capability.title}</h3>
                <p>{capability.text}</p>
                {capability.visual}
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
