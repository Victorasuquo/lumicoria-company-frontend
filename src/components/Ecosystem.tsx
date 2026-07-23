import { ArrowUpRight } from '@phosphor-icons/react'
import { Reveal } from './Reveal'

const ecosystemNames = [
  'Google Workspace',
  'Slack',
  'Notion',
  'Salesforce',
  'Stripe',
  'OpenAI',
  'Gemini',
  'Claude',
  'Perplexity',
  'Mistral',
]

export function Ecosystem() {
  const repeatedNames = [...ecosystemNames, ...ecosystemNames]

  return (
    <section className="ecosystem-section" id="ecosystem" aria-labelledby="ecosystem-title">
      <div className="page-shell">
        <Reveal className="ecosystem-heading">
          <p className="eyebrow">Works with your stack</p>
          <h2 id="ecosystem-title">Keep the tools. <span>Improve the work between them.</span></h2>
          <div>
            <p>
              Lumicoria connects model providers, knowledge sources, communication tools, and systems of record so your first agent fits the operation you already run.
            </p>
            <a href="/partners" className="text-link">
              Explore our ecosystem <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </div>
        </Reveal>
      </div>

      <div className="ecosystem-marquee" aria-label="Technology ecosystem">
        <div className="ecosystem-track">
          {repeatedNames.map((name, index) => (
            <div className="ecosystem-name" key={`${name}-${index}`} aria-hidden={index >= ecosystemNames.length}>
              <span className="ecosystem-orbit" aria-hidden="true" />
              {name}
            </div>
          ))}
        </div>
      </div>

      <div className="page-shell ecosystem-note">
        <span>Integration and model compatibility references only.</span>
        <span>All trademarks belong to their respective owners.</span>
      </div>
    </section>
  )
}
