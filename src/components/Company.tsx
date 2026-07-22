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
            <h2>We are the team that gets AI <span>out of the pilot.</span></h2>
          </div>
          <div className="company-intro-copy">
            <p>
              Lumicoria is building the operating environment where people and AI agents work together. Our company combines a production platform with a delivery team, so you get the speed of software and the ownership of an expert partner.
            </p>
            <span><GlobeHemisphereWest aria-hidden="true" weight="duotone" /> Distributed delivery across the United States, United Kingdom, European Union, and Africa.</span>
          </div>
        </Reveal>

        <div className="company-model">
          <Reveal className="company-arm company-arm-services" delay={0.08}>
            <span className="company-arm-index">01</span>
            <div className="company-arm-icon"><img src="/brand-mark.png" alt="" /></div>
            <p className="eyebrow light">Lumicoria.com</p>
            <h3>We build and run it with you.</h3>
            <p>
              Strategy, workflow design, production agent delivery, change support, and ongoing improvement from one accountable team.
            </p>
            <a href="#engagements" className="text-link light-link">
              Explore our engagements <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </Reveal>

          <Reveal className="company-arm company-arm-platform" delay={0.16}>
            <span className="company-arm-index">02</span>
            <div className="company-arm-icon"><Stack aria-hidden="true" weight="duotone" /></div>
            <p className="eyebrow light">Lumicoria.ai</p>
            <h3>The platform underneath every deployment.</h3>
            <p>
              A model-flexible environment for building, connecting, governing, observing, and improving production AI agents.
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
