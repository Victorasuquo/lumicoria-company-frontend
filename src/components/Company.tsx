import { ArrowUpRight, GlobeHemisphereWest, Stack } from '@phosphor-icons/react'
import { companyAdvantages } from '../data/site'
import { Reveal } from './Reveal'

export function Company() {
  return (
    <section className="section company-section" id="company">
      <div className="page-shell">
        <Reveal className="company-intro">
          <div>
            <p className="eyebrow light">About Lumicoria</p>
            <h2>We help businesses make support <span>easier to run.</span></h2>
          </div>
          <div className="company-intro-copy">
            <p>
              Lumicoria helps Nigerian businesses answer customers consistently, protect staff time, and keep follow-up visible. We combine a voice support service with a client workspace and an accountable team that helps it improve.
            </p>
            <span><GlobeHemisphereWest aria-hidden="true" weight="duotone" /> Built for Nigerian operations, with a path to wider African teams.</span>
          </div>
        </Reveal>

        <div className="company-model">
          <Reveal className="company-arm company-arm-services" delay={0.08}>
            <span className="company-arm-index">01</span>
            <div className="company-arm-icon"><img src="/brand-mark.png" alt="" /></div>
            <p className="eyebrow light">Lumicoria.com</p>
            <h3>Support designed around your business.</h3>
            <p>
              We map the calls your team receives, prepare the approved answers, set the handoff rules, and stay close as the workflow becomes part of daily work.
            </p>
            <a href="#engagements" className="text-link light-link">
              See how we work <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </Reveal>

          <Reveal className="company-arm company-arm-platform" delay={0.16}>
            <span className="company-arm-index">02</span>
            <div className="company-arm-icon"><Stack aria-hidden="true" weight="duotone" /></div>
            <p className="eyebrow light">Lumicoria.ai</p>
            <h3>The workspace behind every conversation.</h3>
            <p>
              Lumicoria.ai gives your team one place for approved knowledge, call records, human handoffs, permissions, and support reporting.
            </p>
            <a href="https://lumicoria.ai" className="text-link light-link" target="_blank" rel="noreferrer">
              Visit Lumicoria.ai <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </Reveal>
        </div>

        <div className="company-advantages">
          {companyAdvantages.map((item, index) => {
            const Icon = item.icon
            return (
              <Reveal className="company-advantage" key={item.title} delay={index * 0.07}>
                <Icon aria-hidden="true" weight="duotone" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal className="mission-line">
          <span>Our mission</span>
          <p>Build the environment where humans and AI agents do meaningful work together, reliably, safely, and with a measurable outcome.</p>
        </Reveal>
      </div>
    </section>
  )
}
