import { ArrowUpRight } from '@phosphor-icons/react'
import { contactHref, navItems } from '../data/site'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-shell">
        <div className="footer-cta">
          <p className="eyebrow light">Your first useful step</p>
          <h2>Bring us one workflow that is costing your team time.</h2>
          <p>We will help you understand what is worth automating, what should stay human, and the fastest responsible path to production.</p>
          <a className="button button-white" href={contactHref}>
            Talk to Lumicoria
            <ArrowUpRight aria-hidden="true" weight="bold" />
          </a>
        </div>

        <div className="footer-main">
          <a className="footer-brand" href="#top" aria-label="Lumicoria.com home">
            <img src="/brand-mark.png" alt="" />
            <span>Lumicoria</span>
          </a>

          <div className="footer-nav">
            <div>
              <span>Explore</span>
              {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
            </div>
            <div>
              <span>Lumicoria</span>
              <a href="https://lumicoria.ai" target="_blank" rel="noreferrer">Lumicoria.ai</a>
              <a href="#research">Applied research</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <span>Start a conversation</span>
              <a href={contactHref}>hello@lumicoria.ai</a>
              <p>Tell us the workflow, team, and result you want to improve.</p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Lumicoria Inc.</span>
          <span>AI delivery, platform, and applied research.</span>
        </div>
      </div>
    </footer>
  )
}
