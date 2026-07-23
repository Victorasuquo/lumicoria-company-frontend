import { ArrowLeft, ArrowUpRight, CheckCircle, EnvelopeSimple } from '@phosphor-icons/react'
import { useEffect } from 'react'
import { contactHref, engagements, outcomes } from '../data/site'
import { Reveal } from './Reveal'

type PageSection = {
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

type PageDefinition = {
  eyebrow: string
  title: string
  lede: string
  status?: string
  sections: PageSection[]
  ctaTitle?: string
  ctaText?: string
}

const staticPages: Record<string, PageDefinition> = {
  '/company': {
    eyebrow: 'Company',
    title: 'One company. A delivery practice and a production platform.',
    lede: 'Lumicoria Inc. builds the environment where humans and AI agents do meaningful work together—and the expert practice that helps companies move into it.',
    sections: [
      {
        title: 'Lumicoria.com',
        paragraphs: ['Our enterprise delivery, consulting, and applied research practice takes responsibility for a business workflow from discovery through production operation.'],
        bullets: ['Workflow discovery and business-case design', 'Production agent delivery', 'Multi-agent orchestration', 'Ongoing optimisation and managed AI operations'],
      },
      {
        title: 'Lumicoria.ai',
        paragraphs: ['Our multi-tenant agent platform is the operating environment underneath every engagement. It brings agents, knowledge, model routing, integrations, governance, and shared work into one place.'],
      },
      {
        title: 'The flywheel',
        paragraphs: ['Every delivery engagement hardens the platform. Reusable connectors, evaluation patterns, workflow components, and controls return to Lumicoria.ai so the next deployment starts from a stronger foundation.'],
      },
    ],
  },
  '/responsible-ai': {
    eyebrow: 'Responsible AI',
    title: 'Useful autonomy begins with clear boundaries.',
    lede: 'Lumicoria designs every deployment around named owners, observable behaviour, staged autonomy, and human control wherever judgment or risk matters.',
    sections: [
      {
        title: 'Human authority',
        bullets: ['High-risk actions require explicit approval', 'Every exception has a named human owner', 'Autonomy expands only when production evidence supports it', 'People can pause, override, or retire a workflow'],
      },
      {
        title: 'Evaluation before action',
        paragraphs: ['Agents are tested against representative examples and run beside the current process before they receive production authority. Success criteria are agreed with the operating owner before launch.'],
      },
      {
        title: 'Evidence after launch',
        bullets: ['Agent runs and model routes remain traceable', 'Overrides and escalations are reviewed', 'Latency, cost, quality, and drift are monitored', 'Material changes return through evaluation before release'],
      },
    ],
  },
  '/research': {
    eyebrow: 'Applied AI research',
    title: 'Research that improves systems already doing real work.',
    lede: 'Lumicoria’s applied research practice focuses on the gap between a convincing demo and a dependable production system.',
    sections: [
      { title: 'Agent reliability and evaluation', paragraphs: ['Methods for measuring whether agents remain grounded, useful, and consistent as models, prompts, data, and workflows change.'] },
      { title: 'Human oversight and responsible autonomy', paragraphs: ['Practical control patterns for approvals, escalation, exception ownership, and the gradual expansion of agent authority.'] },
      { title: 'Multi-agent coordination', paragraphs: ['Handoff, delegation, shared-memory, and orchestration patterns for work that crosses several systems and operating teams.'] },
      { title: 'Smaller specialised models', paragraphs: ['Task-focused model research intended to improve cost, latency, and reliability where a frontier model is unnecessary.'] },
    ],
    ctaTitle: 'Bring us a hard production problem.',
    ctaText: 'Research engagements can be commissioned independently or attached to a broader Lumicoria.com delivery programme.',
  },
  '/faq': {
    eyebrow: 'Frequently asked',
    title: 'Straight answers before the first call.',
    lede: 'The short version of how Lumicoria works, what an engagement includes, and where people remain in control.',
    sections: [
      { title: 'What does Lumicoria.com do?', paragraphs: ['We design, build, launch, and operate AI agents for companies that want a measurable outcome without assembling an internal agent-platform team.'] },
      { title: 'How is it different from Lumicoria.ai?', paragraphs: ['Lumicoria.ai is the platform. Lumicoria.com is the team that uses that platform to deliver a complete business outcome for you.'] },
      { title: 'How quickly can we launch?', paragraphs: ['A focused production agent follows a six-week delivery path, with a standing target of roughly 45 days from signature to production. Larger orchestrations take longer.'] },
      { title: 'Will this replace our team?', paragraphs: ['The goal is to remove repeated administrative work and increase team capacity. People keep relationships, exceptions, sensitive decisions, and accountable judgment.'] },
    ],
  },
  '/how-it-works': {
    eyebrow: 'Delivery system',
    title: 'From one expensive workflow to production in six deliberate steps.',
    lede: 'The delivery sequence is designed to reduce implementation risk without turning the project into an endless pilot.',
    sections: [
      { title: '01 — Discover', paragraphs: ['Map the current workflow, economics, data, owners, systems, and success measure.'] },
      { title: '02 — Design', paragraphs: ['Specify agent behaviour, integrations, human controls, test cases, and failure handling.'] },
      { title: '03 — Build', paragraphs: ['Configure the workflow on Lumicoria.ai and connect the agreed systems and knowledge.'] },
      { title: '04 — Shadow', paragraphs: ['Run against real work without production action and compare the output with human ground truth.'] },
      { title: '05 — Stage', paragraphs: ['Release a controlled share of the workload with explicit review gates.'] },
      { title: '06 — Launch', paragraphs: ['Move into production, train the team, monitor the result, and begin ongoing improvement.'] },
    ],
  },
  '/engagements': {
    eyebrow: 'Ways to engage',
    title: 'A defined starting point for every level of certainty.',
    lede: 'Begin with a workflow question, a production build, a multi-agent programme, or ongoing ownership of agents already in operation.',
    sections: engagements.map((engagement) => ({
      title: `${engagement.name} · ${engagement.duration}`,
      paragraphs: [engagement.bestFor, `Typical investment: ${engagement.price}.`],
      bullets: engagement.includes,
    })),
  },
  '/industries': {
    eyebrow: 'Industries',
    title: 'Delivery patterns shaped around how the work actually moves.',
    lede: 'Lumicoria concentrates first on markets where recurring operational work is measurable, connected to clear systems, and safe to introduce through staged autonomy.',
    sections: [
      { title: 'B2B SaaS and technology', bullets: ['Outbound research and qualification', 'Follow-up and CRM maintenance', 'Customer request routing', 'Knowledge and document workflows'] },
      { title: 'Marketing agencies', bullets: ['Lead intake', 'Campaign reporting', 'Content repurposing', 'Client handoff and status communication'] },
      { title: 'Logistics and operations', bullets: ['Invoice and manifest processing', 'Dispatch tasking', 'SLA monitoring', 'Exception escalation'] },
      { title: 'Adjacent capabilities', paragraphs: ['People operations, e-commerce, professional services, healthcare administration, financial operations, and real-estate workflows are approached with the same evidence-first delivery model.'] },
    ],
  },
  '/partners': {
    eyebrow: 'Partners and ecosystem',
    title: 'A partner model built around delivery quality—not logo collecting.',
    lede: 'Lumicoria works across the model providers, workplace tools, and systems of record customers already use while developing a certified implementation network for regional delivery.',
    sections: [
      { title: 'Technology ecosystem', bullets: ['Model-provider routing and fallback', 'Workplace and knowledge integrations', 'CRM, support, billing, and communication systems', 'Connector architecture for customer-specific systems'] },
      { title: 'Implementation partners', paragraphs: ['Lumicoria’s planned implementation network is designed for consultancies and digital agencies that want to deliver governed agents on Lumicoria.ai without building the platform layer themselves.'] },
      { title: 'What partnership requires', bullets: ['Documented delivery standards', 'Security and access discipline', 'Evaluation before production', 'Named ownership after launch'] },
    ],
    ctaTitle: 'Interested in building with Lumicoria?',
    ctaText: 'Tell us where you operate, the clients you serve, and the delivery capability you want to develop.',
  },
  '/case-studies': {
    eyebrow: 'Engagement evidence',
    title: 'Customer proof, published only when it is verifiable.',
    lede: 'Lumicoria will not invent customer logos, quotes, or outcome statistics. Public case studies will appear here when an engagement is complete and the customer has approved the evidence.',
    status: 'Public case-study library in development',
    sections: [
      { title: 'What every published case study will include', bullets: ['The original operating problem', 'The systems and workflow involved', 'Where people remained in control', 'The measured result and evaluation method', 'What changed after production launch'] },
      { title: 'Representative blueprint: SaaS revenue operations', paragraphs: ['Outbound research, lead triage, follow-up, and CRM updates coordinated into a reviewed revenue workflow. This is an engagement pattern, not a customer testimonial.'] },
      { title: 'Representative blueprint: agency operations', paragraphs: ['Lead intake, campaign reporting, and content operations connected to protect billable capacity. This is an engagement pattern, not a customer testimonial.'] },
      { title: 'Representative blueprint: logistics operations', paragraphs: ['Invoice extraction, dispatch tasking, SLA monitoring, and named exception ownership. This is an engagement pattern, not a customer testimonial.'] },
    ],
  },
  '/privacy': {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    lede: 'This policy explains what information Lumicoria.com may collect, why we use it, and the choices available to visitors and prospective customers.',
    status: 'Effective July 23, 2026',
    sections: [
      { title: 'Information we collect', bullets: ['Information you send through email or a discovery request', 'Business contact details and correspondence', 'Basic technical and usage data such as device, browser, referring page, and site interactions', 'Information required to protect the website and prevent abuse'] },
      { title: 'How we use information', bullets: ['Respond to enquiries and provide requested information', 'Evaluate and operate prospective or active business relationships', 'Maintain, secure, and improve the website', 'Meet legal, accounting, and compliance obligations'] },
      { title: 'Sharing and processors', paragraphs: ['We may use service providers for hosting, analytics, communication, security, and business operations. They receive only the information needed to perform their services and are expected to protect it. We do not sell personal information.'] },
      { title: 'Retention and security', paragraphs: ['We retain information only for as long as it remains reasonably necessary for the purpose collected, contractual obligations, dispute resolution, security, or law. We use administrative, technical, and organisational safeguards appropriate to the nature of the information.'] },
      { title: 'Your choices and rights', paragraphs: ['Depending on where you live, you may have rights to access, correct, delete, restrict, or object to certain processing. Contact legal@lumicoria.ai to make a request.'] },
      { title: 'International processing and updates', paragraphs: ['Lumicoria operates across several regions. Information may be processed outside your country with appropriate safeguards. We may update this policy and will publish the effective date on this page.'] },
    ],
  },
  '/terms': {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    lede: 'These terms govern use of the Lumicoria.com website. Separate written agreements govern paid consulting, delivery, research, and Lumicoria.ai services.',
    status: 'Effective July 23, 2026',
    sections: [
      { title: 'Using this website', paragraphs: ['You may use this website for lawful business evaluation and communication. You may not interfere with its operation, attempt unauthorised access, misrepresent your identity, or use its content to violate law or another person’s rights.'] },
      { title: 'No engagement created', paragraphs: ['Website content, email exchanges, and introductory discussions do not create a consulting, fiduciary, agency, partnership, or customer relationship. An engagement begins only when the parties sign a written agreement.'] },
      { title: 'Information and availability', paragraphs: ['Website information is provided for general business information and may change. We do not promise that every described capability, timeline, region, integration, or service will be available for every prospective customer.'] },
      { title: 'Intellectual property', paragraphs: ['Lumicoria owns or licenses the website, brand assets, text, design, software, and other materials. You may not copy, modify, distribute, reverse engineer, or create derivative commercial materials except as permitted by law or written permission.'] },
      { title: 'Disclaimers and liability', paragraphs: ['To the extent permitted by law, the website is provided without implied warranties. Lumicoria is not liable for indirect, incidental, special, consequential, or punitive loss arising only from use of this public website.'] },
      { title: 'Governing documents and contact', paragraphs: ['If you purchase services, the signed order form, statement of work, data-processing terms, and master agreement control over these website terms. Questions may be sent to legal@lumicoria.ai.'] },
    ],
  },
  '/acceptable-use': {
    eyebrow: 'Legal',
    title: 'Acceptable Use Policy',
    lede: 'This policy describes uses that are not permitted on Lumicoria public surfaces or in services governed by an agreement that incorporates this policy.',
    status: 'Effective July 23, 2026',
    sections: [
      { title: 'Illegal or harmful activity', bullets: ['Violating law or another person’s rights', 'Facilitating violence, exploitation, abuse, or credible threats', 'Creating or distributing malware', 'Fraud, impersonation, phishing, or deceptive manipulation'] },
      { title: 'Unauthorised access and disruption', bullets: ['Attempting to bypass security or access controls', 'Scanning or testing systems without written permission', 'Interfering with service availability', 'Using automated traffic that creates unreasonable load'] },
      { title: 'High-impact decisions', paragraphs: ['You may not use Lumicoria services to make fully automated decisions in employment, housing, credit, healthcare, insurance, legal services, or similarly consequential areas without lawful authority, appropriate human review, and the safeguards required by your agreement and applicable law.'] },
      { title: 'Data and content responsibility', paragraphs: ['You must have the rights and permissions required for data, instructions, and content you provide. Sensitive data may be used only where the applicable service agreement expressly permits it and required security controls are active.'] },
      { title: 'Enforcement', paragraphs: ['We may investigate suspected violations and restrict or suspend affected access when reasonably necessary to protect people, customers, systems, or legal obligations. Contractual notice and remedy terms apply where an executed agreement provides them.'] },
    ],
  },
  '/security': {
    eyebrow: 'Trust and security',
    title: 'Security is part of the operating model.',
    lede: 'Lumicoria approaches security through tenant isolation, scoped access, observable agent behaviour, controlled integrations, and evidence that follows work into production.',
    sections: [
      { title: 'Platform foundations', bullets: ['Organisation-level tenant isolation', 'Role and permission boundaries', 'Scoped integration credentials', 'Encrypted transport and managed storage controls', 'Metered, observable execution'] },
      { title: 'Agent controls', bullets: ['Human approval gates', 'Versioned workflow configuration', 'Model routing and fallback policies', 'Evaluation before production authority', 'Run history and exception ownership'] },
      { title: 'Operational practice', bullets: ['Documented delivery and access plans', 'Least-privilege implementation', 'Incident triage and escalation', 'Ongoing monitoring and quality review', 'Customer-specific runbooks'] },
      { title: 'Compliance posture', paragraphs: ['SOC 2 Type II observation is underway. Security, privacy, residency, and regulated-work requirements are confirmed during discovery and documented in the applicable agreement before deployment.'] },
      { title: 'Report a concern', paragraphs: ['Send security concerns to security@lumicoria.ai. Include enough detail for us to understand and reproduce the issue, but do not include customer data or exploit systems beyond what is necessary to demonstrate the concern.'] },
    ],
  },
}

const servicePages = Object.fromEntries(
  engagements.map((engagement) => {
    const slug = engagement.name.toLowerCase().replaceAll(' ', '-')
    return [
      `/services/${slug}`,
      {
        eyebrow: 'Service',
        title: engagement.name,
        lede: engagement.bestFor,
        status: `${engagement.duration} · ${engagement.price}`,
        sections: [
          { title: 'What is included', bullets: engagement.includes },
          { title: 'How the work begins', paragraphs: ['We confirm the operating owner, the workflow, the systems involved, the human decisions inside it, and the measure that will define success.'] },
          { title: 'What you leave with', paragraphs: ['A defined business outcome, documented ownership, and a clear next operating step—not a technology demonstration with no path to production.'] },
        ],
      } satisfies PageDefinition,
    ]
  }),
)

const solutionPages = Object.fromEntries(
  outcomes.map((outcome) => [
    `/solutions/${outcome.id === 'growth' ? 'sales-growth' : outcome.id === 'service' ? 'customer-experience' : outcome.id === 'operations' ? 'business-operations' : 'people-knowledge'}`,
    {
      eyebrow: 'Solution',
      title: outcome.title,
      lede: outcome.description,
      sections: [
        { title: 'The business result', paragraphs: [outcome.result] },
        { title: 'What the agent can handle', bullets: outcome.handles },
        { title: 'Where people remain responsible', paragraphs: [outcome.humans] },
        { title: 'How the result is measured', paragraphs: [outcome.measure] },
      ],
    } satisfies PageDefinition,
  ]),
)

const pages: Record<string, PageDefinition> = {
  ...staticPages,
  ...servicePages,
  ...solutionPages,
}

export function ContentPage({ path }: { path: string }) {
  const page = pages[path] ?? {
    eyebrow: 'Page not found',
    title: 'This page does not exist yet.',
    lede: 'Return to Lumicoria.com or start a conversation with our team.',
    sections: [],
  }

  useEffect(() => {
    document.title = `${page.title} | Lumicoria`
  }, [page.title])

  return (
    <div className="content-page" id="top">
      <section className="content-page-hero">
        <div className="page-shell">
          <Reveal className="content-page-hero-grid">
            <div>
              <a className="content-back-link" href="/"><ArrowLeft aria-hidden="true" weight="bold" />Lumicoria.com</a>
              <p className="eyebrow">{page.eyebrow}</p>
              <h1>{page.title}</h1>
            </div>
            <div className="content-page-lede">
              {page.status && <span>{page.status}</span>}
              <p>{page.lede}</p>
              <a className="button button-primary" href={contactHref}>
                Talk to our team <ArrowUpRight aria-hidden="true" weight="bold" />
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="content-page-body">
        <div className="page-shell content-page-sections">
          {page.sections.map((section, index) => (
            <Reveal className="content-page-section" delay={Math.min(index * 0.04, 0.2)} key={section.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h2>{section.title}</h2>
                {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}><CheckCircle aria-hidden="true" weight="duotone" />{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="content-page-close">
        <div className="page-shell">
          <Reveal className="content-page-close-card">
            <EnvelopeSimple aria-hidden="true" weight="duotone" />
            <div>
              <p className="eyebrow light">{page.ctaTitle ? 'Next step' : 'Start a conversation'}</p>
              <h2>{page.ctaTitle ?? 'Bring us one workflow worth improving.'}</h2>
              <p>{page.ctaText ?? 'Tell us what the work costs today, where it slows down, and what a useful result would change.'}</p>
            </div>
            <a className="button button-white" href={contactHref}>
              hello@lumicoria.ai <ArrowUpRight aria-hidden="true" weight="bold" />
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
