import {
  ChartLineUp,
  ChatsCircle,
  CirclesFour,
  ClockCountdown,
  Factory,
  Handshake,
  Headset,
  ShieldCheck,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react'

export const navItems = [
  { label: 'What we build', href: '#work' },
  { label: 'Delivery', href: '#delivery' },
  { label: 'Engagements', href: '#engagements' },
  { label: 'Research', href: '#research' },
]

export const outcomes = [
  {
    id: 'revenue',
    label: 'Revenue operations',
    title: 'Move qualified prospects into real conversations.',
    description:
      'Agents research accounts, qualify leads, prepare outreach, book meetings, and keep the CRM current without replacing the human conversation.',
    icon: ChartLineUp,
    tasks: ['Account research', 'Lead qualification', 'Follow-up routing'],
    measures: ['Meetings booked', 'Response time', 'Pipeline coverage'],
    systems: ['HubSpot', 'Salesforce', 'Google Workspace'],
  },
  {
    id: 'operations',
    label: 'Business operations',
    title: 'Turn repetitive process work into a governed system.',
    description:
      'Agents read invoices, route exceptions, create tasks, watch service levels, and write back to the systems your operations team already uses.',
    icon: Factory,
    tasks: ['Document extraction', 'Exception routing', 'SLA monitoring'],
    measures: ['Cycle time', 'Error volume', 'Hours recovered'],
    systems: ['ERP', 'Email', 'Shared storage'],
  },
  {
    id: 'service',
    label: 'Customer operations',
    title: 'Handle the routine. Escalate what needs judgment.',
    description:
      'Agents classify requests, ground responses in your knowledge base, draft replies, and move high-stakes cases to the right person.',
    icon: Headset,
    tasks: ['Request triage', 'Grounded response', 'Escalation'],
    measures: ['First response', 'Resolution time', 'Override rate'],
    systems: ['Support desk', 'Knowledge base', 'Slack'],
  },
  {
    id: 'people',
    label: 'People operations',
    title: 'Make hiring and onboarding easier to run responsibly.',
    description:
      'Agents support screening, scheduling, onboarding, and internal questions with explicit approval gates and bias-aware controls.',
    icon: UsersThree,
    tasks: ['Blind review', 'Interview scheduling', 'Onboarding'],
    measures: ['Time to offer', 'Coordinator load', 'Override rate'],
    systems: ['ATS', 'Calendar', 'Team chat'],
  },
]

export const deliverySteps = [
  {
    week: 'Week 1',
    title: 'Discover',
    description: 'Map the current workflow, define the business metric, and confirm data access.',
  },
  {
    week: 'Week 2',
    title: 'Design',
    description: 'Write the agent specification, integration plan, approval gates, and acceptance criteria.',
  },
  {
    week: 'Week 3',
    title: 'Build',
    description: 'Configure the agent on Lumicoria.ai, connect systems, and instrument every run.',
  },
  {
    week: 'Week 4',
    title: 'Shadow test',
    description: 'Run beside the human process on real data without taking action, then compare outputs.',
  },
  {
    week: 'Week 5',
    title: 'Stage',
    description: 'Release a controlled share of the workload with explicit human approval boundaries.',
  },
  {
    week: 'Week 6',
    title: 'Deploy',
    description: 'Move into production, deliver the runbook, train the team, and begin hardening.',
  },
]

export const engagements = [
  {
    name: 'Discovery and Design Sprint',
    duration: '2-4 weeks',
    price: '$7.5k-$15k',
    description: 'Process audit, opportunity roadmap, ROI model, quick-win prototype, and build recommendation.',
    cta: 'Start with discovery',
  },
  {
    name: 'Production Agent Build',
    duration: '6-10 weeks',
    price: '$35k-$85k',
    description: 'A deployed agent, integrations, monitoring dashboard, runbook, team training, and post-launch support.',
    cta: 'Build one agent',
  },
  {
    name: 'Workflow Orchestration',
    duration: '12-20 weeks',
    price: '$90k-$200k',
    description: 'Three to five coordinated agents, enterprise integrations, governance, and change planning.',
    cta: 'Orchestrate a workflow',
  },
  {
    name: 'Optimisation Retainer',
    duration: 'Monthly',
    price: '$4k-$25k',
    description: 'Performance review, tuning, incident response, cost control, new features, and executive reporting.',
    cta: 'Operate what ships',
  },
]

export const guardrails = [
  {
    icon: ShieldCheck,
    title: 'Approval by decision risk',
    text: 'Critical decisions always require a person. Lower-risk actions earn autonomy through evidence.',
  },
  {
    icon: ClockCountdown,
    title: 'Shadow testing first',
    text: 'The agent runs beside the current process before it is allowed to take production action.',
  },
  {
    icon: ChatsCircle,
    title: 'Clear escalation paths',
    text: 'Low-confidence outputs and failed integrations move to a named human owner instead of disappearing.',
  },
  {
    icon: CirclesFour,
    title: 'Observable by default',
    text: 'Runs, costs, latency, overrides, and drift signals are visible from the first production day.',
  },
]

export const researchAreas = [
  { icon: Sparkle, label: 'Agent reliability and evaluation' },
  { icon: CirclesFour, label: 'Multi-agent coordination' },
  { icon: ShieldCheck, label: 'Human oversight and AI safety' },
  { icon: Handshake, label: 'Task-specialised model research' },
]

export const contactHref =
  'mailto:hello@lumicoria.ai?subject=Lumicoria.com%20Discovery%20Call&body=Hello%20Lumicoria%20team%2C%0A%0AI%20would%20like%20to%20discuss%20a%20workflow%20for%20automation.%0A%0ACompany%3A%0AWorkflow%3A%0ACurrent%20team%20or%20hours%20involved%3A%0ATimeline%3A'
