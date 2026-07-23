import { ArrowUpRight, CirclesFour, Cube, ShieldCheck, Stack } from '@phosphor-icons/react'
import { Reveal } from './Reveal'

const platformCapabilities = [
  {
    icon: Cube,
    title: 'Run production agents',
    text: 'Start with a library of 21 agents across documents, support, meetings, research, data, legal review, and operations.',
    visual: (
      <div className="platform-agent-stack" aria-hidden="true">
        <span>Meeting agent</span>
        <span>Document agent</span>
        <span>Customer service</span>
      </div>
    ),
  },
  {
    icon: CirclesFour,
    title: 'Compose in Agent Studio',
    text: 'Arrange typed components into versioned workflows with model routing, retrieval, conditions, integrations, and approvals.',
    visual: (
      <div className="platform-flow-mini" aria-hidden="true">
        <span>Input</span><i /><span>Reason</span><i /><span>Review</span>
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'Operate one shared environment',
    text: 'Keep projects, tasks, documents, knowledge, support, permissions, audit trails, and agent output together.',
    visual: (
      <div className="platform-workspace-mini" aria-hidden="true">
        <span>Projects</span>
        <span>Knowledge</span>
        <span>Audit</span>
        <span>Models</span>
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
            <p className="eyebrow light">The platform underneath every engagement</p>
            <h2>Meet <span>{'{ Lumicoria.ai }'}</span></h2>
            <p>
              Twenty-one production agents. Six model providers. One environment to build, deploy, govern, and improve AI-powered work.
            </p>
            <a href="https://lumicoria.ai" target="_blank" rel="noreferrer" aria-label="Explore Lumicoria.ai">
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </div>

          <div className="platform-operating-map" aria-label="Lumicoria.ai operating environment preview">
            <div className="operating-map-head">
              <span><img src="/brand-mark.png" alt="" /> Lumicoria.ai</span>
              <span>Production environment</span>
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
                <strong>Customer request → reviewed resolution</strong>
                <div className="operating-map-flow">
                  <span>Ticket</span><i /><span>Agent</span><i /><span>Source</span><i /><span>Approval</span>
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
