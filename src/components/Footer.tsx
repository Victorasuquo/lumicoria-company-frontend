import { ArrowUpRight } from '@phosphor-icons/react'
import { contactHref } from '../data/site'

const serviceLinks = [
  ['Discovery sprint', '/services/discovery-sprint'],
  ['Production agent build', '/services/production-agent-build'],
  ['Workflow orchestration', '/services/workflow-orchestration'],
  ['Optimisation retainer', '/services/optimisation-retainer'],
]

const outcomeLinks = [
  ['Sales and growth', '/solutions/sales-growth'],
  ['Customer experience', '/solutions/customer-experience'],
  ['Business operations', '/solutions/business-operations'],
  ['People and knowledge', '/solutions/people-knowledge'],
]

const footerGroups = [
  {
    title: 'Company',
    links: [
      ['About Lumicoria', '/company'],
      ['Responsible AI', '/responsible-ai'],
      ['Applied research', '/research'],
      ['Engagement evidence', '/case-studies'],
    ],
  },
  {
    title: 'Delivery',
    links: [
      ['Industries', '/industries'],
      ['How it works', '/how-it-works'],
      ['Ways to engage', '/engagements'],
      ['Frequently asked', '/faq'],
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      ['Partners', '/partners'],
      ['Explore Lumicoria.ai', 'https://lumicoria.ai'],
    ],
  },
  {
    title: 'Legal',
    links: [
      ['Privacy policy', '/privacy'],
      ['Terms of service', '/terms'],
      ['Acceptable use', '/acceptable-use'],
      ['Security', '/security'],
    ],
  },
  {
    title: 'Contact',
    links: [
      ['Start a discovery call', contactHref],
      ['hello@lumicoria.ai', contactHref],
    ],
  },
]

function FooterLink({ label, href }: { label: string; href: string }) {
  const external = href.startsWith('http')

  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
      {label}
      {external && <ArrowUpRight aria-hidden="true" weight="bold" />}
    </a>
  )
}

export function Footer() {
  return (
    <footer className="site-footer" id="footer">
      <div className="footer-aura">
        <div className="page-shell footer-statement">
          <h2>
            <span>Built for</span>
            <span>real work.</span>
          </h2>

          <div className="footer-statement-side">
            <p>Human where it matters.</p>
            <span>AI systems shaped around your people, rules, and business results.</span>
          </div>
        </div>

        <div className="page-shell footer-contact-rail">
          <div>
            <span className="footer-rail-label">Have a workflow in mind?</span>
            <p>Tell us where the work slows down.</p>
          </div>
          <a href={contactHref}>
            Start a conversation
            <ArrowUpRight aria-hidden="true" weight="bold" />
          </a>
        </div>
      </div>

      <div className="page-shell footer-mega">
        <section className="footer-directory-row footer-services-row" aria-labelledby="footer-services-title">
          <h3 id="footer-services-title">What we do</h3>

          <div className="footer-directory-groups footer-service-groups">
            <div className="footer-link-group">
              <span>Services</span>
              {serviceLinks.map(([label, href]) => <FooterLink key={label} label={label} href={href} />)}
            </div>
            <div className="footer-link-group">
              <span>Outcomes</span>
              {outcomeLinks.map(([label, href]) => <FooterLink key={label} label={label} href={href} />)}
            </div>
          </div>

          <aside className="footer-feature-card">
            <span>Start with one useful result</span>
            <p>We find the right workflow, prove the value, and stay accountable after launch.</p>
            <a href={contactHref}>
              Talk to Lumicoria
              <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </aside>
        </section>

        <section className="footer-directory-row footer-explore-row" aria-labelledby="footer-explore-title">
          <h3 id="footer-explore-title">Explore</h3>
          <div className="footer-directory-groups footer-explore-groups">
            {footerGroups.map((group) => (
              <div className="footer-link-group" key={group.title}>
                <span>{group.title}</span>
                {group.links.map(([label, href]) => <FooterLink key={label} label={label} href={href} />)}
              </div>
            ))}
          </div>
        </section>

        <div className="footer-legal">
          <span>© {new Date().getFullYear()} Lumicoria Inc.</span>
          <div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/acceptable-use">Acceptable use</a>
            <a href="/security">Security</a>
          </div>
        </div>
      </div>

      <a className="page-shell footer-signature" href="/" aria-label="Back to Lumicoria.com">
        <img src="/brand-mark.png" alt="" />
        <span>Lumicoria</span>
      </a>
    </footer>
  )
}
