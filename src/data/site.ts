import {
  ArrowBendDownRight,
  Briefcase,
  Buildings,
  ChartLineUp,
  ChatsCircle,
  CheckCircle,
  CirclesFour,
  ClockCountdown,
  Headset,
  MagnifyingGlass,
  ShieldCheck,
  Sparkle,
  UsersThree,
  Wrench,
} from '@phosphor-icons/react'

export const navItems = [
  { label: 'Solutions', href: '#solutions' },
  { label: 'Industries', href: '#industries' },
  { label: 'Platform', href: '#platform' },
  { label: 'Company', href: '#company' },
]

export const heroActivity = [
  { time: '09:02', label: 'New lead researched', tone: 'blue' },
  { time: '09:18', label: 'Customer request resolved', tone: 'violet' },
  { time: '09:41', label: 'Invoice exception escalated', tone: 'gold' },
]

export const heroOutcomes = [
  'CRM stays current',
  'Customers get faster answers',
  'Your team keeps the judgment calls',
]

export const proofPoints = [
  { value: '45 days', label: 'target to first production agent' },
  { value: '21+', label: 'agents already in our platform library' },
  { value: '6', label: 'model providers with built-in fallback' },
  { value: 'Human-led', label: 'approval wherever the decision matters' },
]

export const outcomes = [
  {
    id: 'growth',
    label: 'Sales and growth',
    title: 'Create more time for real conversations.',
    description:
      'Let an AI agent handle account research, lead qualification, follow-up, and CRM upkeep so your team can focus on relationships and revenue.',
    icon: ChartLineUp,
    result: 'A fuller pipeline without multiplying the admin around it.',
    handles: ['Account research', 'Lead qualification', 'Follow-up drafts', 'CRM updates'],
    humans: 'Positioning, negotiation, and every important customer conversation.',
    measure: 'Meetings booked, response time, and pipeline coverage.',
  },
  {
    id: 'service',
    label: 'Customer experience',
    title: 'Make fast support still feel personal.',
    description:
      'Give customers immediate, grounded answers while complex or sensitive requests move to the right person with the full context attached.',
    icon: Headset,
    result: 'Shorter queues, faster answers, and more time for high-value support.',
    handles: ['Request triage', 'Knowledge lookup', 'Response drafts', 'Case routing'],
    humans: 'Exceptions, empathy, complaints, and high-stakes decisions.',
    measure: 'First response time, resolution time, and escalation quality.',
  },
  {
    id: 'operations',
    label: 'Business operations',
    title: 'Take recurring admin off the critical path.',
    description:
      'Move documents, status updates, scheduling, and routine checks through a dependable system that works across the tools you already use.',
    icon: Buildings,
    result: 'Fewer handoffs, cleaner operations, and hours returned every week.',
    handles: ['Document review', 'Status updates', 'SLA checks', 'Exception routing'],
    humans: 'Approvals, policy decisions, and anything outside agreed boundaries.',
    measure: 'Cycle time, error volume, and hours recovered.',
  },
  {
    id: 'people',
    label: 'People and knowledge',
    title: 'Help everyone find answers and move faster.',
    description:
      'Turn company knowledge into useful answers, guide onboarding, coordinate recurring people workflows, and keep sensitive decisions with people.',
    icon: UsersThree,
    result: 'Less time searching, smoother onboarding, and fewer repeated questions.',
    handles: ['Knowledge search', 'Onboarding guidance', 'Scheduling', 'Policy questions'],
    humans: 'Hiring decisions, performance matters, and sensitive conversations.',
    measure: 'Time to answer, coordinator load, and employee satisfaction.',
  },
]

export const companyAdvantages = [
  {
    icon: Briefcase,
    title: 'Business problem first',
    text: 'We begin with the cost, delay, or customer friction worth removing. The technology follows the outcome.',
  },
  {
    icon: Wrench,
    title: 'Built on a real platform',
    text: 'Every engagement runs on Lumicoria.ai, so you inherit reusable infrastructure instead of a fragile one-off build.',
  },
  {
    icon: ClockCountdown,
    title: 'Ownership after launch',
    text: 'We monitor, improve, and extend what ships. You are not left with a pilot nobody knows how to operate.',
  },
]

export const approachSteps = [
  {
    number: '01',
    icon: MagnifyingGlass,
    eyebrow: 'Find the right work',
    title: 'Choose one workflow with a visible business result.',
    text: 'We map how the work happens today, what it costs, where judgment is required, and what success should look like.',
    timing: 'Week 1',
  },
  {
    number: '02',
    icon: CirclesFour,
    eyebrow: 'Build and prove it',
    title: 'Create the agent around your systems and your rules.',
    text: 'We connect the tools, test against real examples, and run beside your current process before the agent is allowed to act.',
    timing: 'Weeks 2-5',
  },
  {
    number: '03',
    icon: ArrowBendDownRight,
    eyebrow: 'Launch and improve',
    title: 'Go live gradually, then keep making it better.',
    text: 'We stage the rollout, train your team, monitor outcomes, and improve the system as your business and models change.',
    timing: 'Week 6 onward',
  },
]

export const deliveryMilestones = [
  { week: '01', label: 'Discover', detail: 'Workflow, economics, data, owners' },
  { week: '02', label: 'Design', detail: 'Agent behaviour, integrations, controls' },
  { week: '03', label: 'Build', detail: 'Configuration, connections, measurement' },
  { week: '04', label: 'Shadow', detail: 'Real work, no production actions yet' },
  { week: '05', label: 'Stage', detail: 'Controlled workload, human approvals' },
  { week: '06', label: 'Launch', detail: 'Production, training, ongoing support' },
]

export const engagements = [
  {
    name: 'Discovery Sprint',
    bestFor: 'You know AI could help, but need to find the right place to start.',
    duration: '2-4 weeks',
    price: '$7.5k-$15k',
    includes: ['Workflow opportunity map', 'Business case and ROI model', 'Working quick-win prototype', 'Production recommendation'],
    cta: 'Start with discovery',
  },
  {
    name: 'Production Agent Build',
    bestFor: 'You have one clear workflow and want it operating in production.',
    duration: '6-10 weeks',
    price: '$35k-$85k',
    includes: ['Production-ready agent', 'Business system integrations', 'Testing and monitoring', 'Runbook, training, and support'],
    cta: 'Build the first agent',
    featured: true,
  },
  {
    name: 'Workflow Orchestration',
    bestFor: 'The outcome depends on several teams, systems, or coordinated agents.',
    duration: '12-20 weeks',
    price: '$90k-$200k',
    includes: ['Three to five coordinated agents', 'Enterprise integration design', 'Governance and change planning', 'Three months of optimisation'],
    cta: 'Transform a workflow',
  },
  {
    name: 'Optimisation Retainer',
    bestFor: 'You want ongoing ownership, improvement, and expansion after launch.',
    duration: 'Monthly',
    price: '$4k-$25k / month',
    includes: ['Performance and quality review', 'Tuning and model updates', 'Incident response and cost control', 'Executive outcome reporting'],
    cta: 'Operate what ships',
  },
]

export const trustPrinciples = [
  {
    icon: ShieldCheck,
    title: 'People keep the important decisions',
    text: 'High-risk actions always require approval. Autonomy expands only when evidence supports it.',
  },
  {
    icon: CheckCircle,
    title: 'Real work is tested before launch',
    text: 'The agent runs beside the existing process so we can compare outcomes before it acts for customers or teams.',
  },
  {
    icon: ChatsCircle,
    title: 'Every exception has an owner',
    text: 'Low confidence, missing data, and system failures move to a named person with the context needed to act.',
  },
  {
    icon: Sparkle,
    title: 'Quality keeps improving',
    text: 'We monitor outcomes, cost, speed, overrides, and drift so the system gets better after deployment.',
  },
]

export const faqs = [
  {
    question: 'What exactly does Lumicoria.com do?',
    answer:
      'Lumicoria.com is the delivery, consulting, and applied research arm of Lumicoria Inc. We design, build, launch, and operate AI agents for companies that want the outcome without assembling an internal AI platform team.',
  },
  {
    question: 'How is Lumicoria.com different from Lumicoria.ai?',
    answer:
      'Lumicoria.ai is the platform where agents are built and operated. Lumicoria.com is the expert team that uses that platform to deliver a complete business outcome for you. Every services engagement is built on Lumicoria.ai.',
  },
  {
    question: 'What should we automate first?',
    answer:
      'The best first workflow is repetitive, expensive enough to matter, measurable, and safe to introduce gradually. Sales research, customer request triage, document processing, reporting, and internal knowledge are common starting points.',
  },
  {
    question: 'Will this replace our team?',
    answer:
      'The goal is to remove repetitive work and increase the capacity of your team. People remain responsible for judgment, relationships, exceptions, and sensitive decisions. We design those boundaries with you before launch.',
  },
  {
    question: 'Can Lumicoria work with our existing systems?',
    answer:
      'Yes. We design around the tools and systems of record your company already uses. Integration scope, access, error handling, and ownership are confirmed during discovery before the production build begins.',
  },
  {
    question: 'How quickly can we launch?',
    answer:
      'A focused production agent targets a six-week delivery path, with a standing target of 45 days from signature to production. Larger multi-agent workflows typically take 12 to 20 weeks.',
  },
]

export const researchAreas = [
  'Reliable agents and practical evaluation',
  'Human oversight and responsible autonomy',
  'Multi-agent coordination across real workflows',
  'Smaller specialised models for cost and quality',
]

export const contactHref =
  'mailto:hello@lumicoria.ai?subject=Lumicoria.com%20Discovery%20Call&body=Hello%20Lumicoria%20team%2C%0A%0AI%20would%20like%20to%20discuss%20a%20workflow%20for%20automation.%0A%0ACompany%3A%0AWorkflow%3A%0ACurrent%20team%20or%20hours%20involved%3A%0ATimeline%3A'
