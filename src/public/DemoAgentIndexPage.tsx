import { ArrowUpRight, Phone } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { portalApiOrigin, portalBasePath } from '../api/client'
import './rebecca.css'

// One page to hand a reviewer, so a demo does not depend on remembering four
// slugs. Rebecca is listed first and separately: she is the real product's own
// agent, the other four are fictional businesses.

type Agent = {
  slug: string
  agent_name: string
  business_name: string
  category: string
  hero_description: string
  outbound: boolean
  is_demonstration: boolean
}

export function DemoAgentIndexPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [available, setAvailable] = useState<boolean | null>(null)
  const [codeRequired, setCodeRequired] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    document.title = 'Voice agents | Lumicoria'
    fetch(`${portalApiOrigin}${portalBasePath}/public/demo-agents`, { signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('The demo agents are unavailable.'); return response.json() })
      .then(data => {
        setAgents(Array.isArray(data.agents) ? data.agents : [])
        setAvailable(Boolean(data.available))
        setCodeRequired(Boolean(data.access_code_required))
      })
      .catch(reason => { if (!controller.signal.aborted) { setAvailable(false); setError(reason.message) } })
    return () => controller.abort()
  }, [])

  return <div className="rebecca-page">
    <header className="rebecca-nav">
      <a href="/" aria-label="Lumicoria homepage"><img src="/brand-mark.png" alt="" />Lumicoria</a>
      <a href="/">Back to Lumicoria <ArrowUpRight size={16} /></a>
    </header>
    <main className="rebecca-main">
      <section className="rebecca-stage is-standalone" aria-label="Lumicoria voice agents">
        <div className="rebecca-atmosphere" aria-hidden="true"><span /><span /></div>
        <div className="rebecca-stage-topline">
          <span>Voice demos</span>
          <span>Nigerian English · Browser voice</span>
        </div>
        <div className="demo-index">
          <h1>Talk to a <em>voice agent.</em></h1>
          <p className="rebecca-stage-lede">
            Each one answers for a different business and a different job. They speak first,
            you can interrupt them, and the transcript appears as you talk.
          </p>
          {codeRequired && <p className="rebecca-inline-message">The business demos need an access code. Ask the Lumicoria team for one.</p>}
          {error && <p className="rebecca-inline-message is-error" role="alert">{error}</p>}

          <ul className="demo-agent-grid">
            <li className="demo-agent-card is-primary">
              <span className="demo-agent-role">Sales qualification</span>
              <h2>Rebecca</h2>
              <p className="demo-agent-business">Lumicoria</p>
              <p>Ask about the support platform, or leave your details for a follow-up from the team.</p>
              <a className="rebecca-primary" href="/support/lumicoria/voice">Talk to Rebecca <Phone size={17} weight="fill" /></a>
            </li>
            {agents.map(agent => <li key={agent.slug} className="demo-agent-card">
              <span className="demo-agent-role">{agent.category.replace(/_/g, ' ')}</span>
              <h2>{agent.agent_name}</h2>
              <p className="demo-agent-business">
                {agent.business_name}
                {agent.is_demonstration && <small>Fictional business</small>}
              </p>
              <p>{agent.hero_description}</p>
              <a className="rebecca-primary" href={`/support/${agent.slug}/voice`}>
                {agent.outbound ? 'Take the call' : `Talk to ${agent.agent_name}`} <Phone size={17} weight="fill" />
              </a>
            </li>)}
          </ul>

          {available === false && <p className="rebecca-inline-message">Voice is unavailable right now. <a href="/portal/request-access">Leave a request instead.</a></p>}
          <p className="rebecca-privacy">
            Harmattan Court Hotel, Ridgeway Auto Care, Zuma Interiors and Okaka Stores are fictional
            businesses created by Lumicoria to demonstrate the product. They are not customers, and
            nothing said on these calls books, charges or changes anything.
          </p>
        </div>
      </section>
    </main>
  </div>
}
