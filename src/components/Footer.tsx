import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react'
import { contactHref, navItems } from '../data/site'
import { Reveal } from './Reveal'

export function Footer() {
  return (
    <footer className="footer">
      <div className="page-shell">
        <Reveal className="final-cta">
          <div>
            <p className="section-index">Bring one workflow</p>
            <h2>We will help you decide if it is worth automating.</h2>
          </div>
          <div className="final-cta-action">
            <p>Share the process, the people involved, and the result you want. We will map the next useful step.</p>
            <a className="button button-primary" href={contactHref}>
              Book a discovery call
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </div>
        </Reveal>

        <div className="footer-main">
          <div className="footer-brand">
            <a className="brand" href="#top" aria-label="Lumicoria.com home">
              <img src="/brand-mark.png" alt="" />
              <span>Lumicoria.com</span>
            </a>
            <p>The enterprise delivery and applied research arm of Lumicoria Inc.</p>
          </div>
          <div className="footer-links">
            <div>
              <span className="system-label">Explore</span>
              {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            </div>
            <div>
              <span className="system-label">Lumicoria</span>
              <a href="https://lumicoria.ai">Lumicoria.ai <ArrowRight aria-hidden="true" /></a>
              <a href="mailto:hello@lumicoria.ai">hello@lumicoria.ai</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Lumicoria Inc.</span>
          <span>Production AI agents, delivered and operated.</span>
        </div>
      </div>
    </footer>
  )
}
