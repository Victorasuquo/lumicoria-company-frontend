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
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Industries', href: '#industries' },
  { label: 'Platform', href: '#platform' },
  { label: 'Company', href: '#company' },
]

export const heroActivity = [
  { time: '09:02', label: 'Customer call received', tone: 'blue' },
  { time: '09:18', label: 'Routine answer provided', tone: 'violet' },
  { time: '09:41', label: 'Staff follow-up created', tone: 'gold' },
]

export const heroOutcomes = [
  'Customer gets a clear answer',
  'Request context stays together',
  'Important issues reach staff',
]

export const proofPoints = [
  { value: 'Voice first', label: 'support for the calls your team cannot answer' },
  { value: 'One record', label: 'for the request, answer, and next action' },
  { value: 'Human-led', label: 'escalation wherever judgment matters' },
  { value: 'Naira ready', label: 'built for the way Nigerian businesses operate' },
]

export const outcomes = [
  {
    id: 'growth',
    label: 'Lead capture',
    title: 'Turn every serious enquiry into a next step.',
    description:
      'Answer calls from campaigns and business listings, capture the customer’s need, and give your team the context to follow up while the interest is still fresh.',
    icon: ChartLineUp,
    result: 'Fewer good enquiries disappear before your team can respond.',
    handles: ['Inbound calls', 'Lead qualification', 'Booking requests', 'Follow-up records'],
    humans: 'Pricing, negotiation, and every important customer conversation.',
    measure: 'Answered enquiries, qualified leads, and follow-up completion.',
  },
  {
    id: 'service',
    label: 'Customer support',
    title: 'Give customers an answer before they give up.',
    description:
      'Give customers clear answers about orders, deliveries, bookings, availability, and policies while complaints and uncertain requests move to the right person with context attached.',
    icon: Headset,
    result: 'Shorter queues and fewer customers repeating themselves.',
    handles: ['Order questions', 'Delivery updates', 'Policy answers', 'Case routing'],
    humans: 'Exceptions, empathy, complaints, and high-stakes decisions.',
    measure: 'Answer rate, response time, and escalation quality.',
  },
  {
    id: 'operations',
    label: 'Bookings and service',
    title: 'Keep bookings moving when your team is busy.',
    description:
      'Handle appointment requests, availability questions, confirmations, and reminders through a dependable support flow that works around the tools your team already uses.',
    icon: Buildings,
    result: 'More completed bookings without adding another front desk shift.',
    handles: ['Availability questions', 'Appointment requests', 'Confirmations', 'Reminder follow-up'],
    humans: 'Sensitive requests, exceptions, and anything outside agreed boundaries.',
    measure: 'Booking completion, response time, and staff workload.',
  },
  {
    id: 'people',
    label: 'After-hours support',
    title: 'Keep your business reachable beyond the desk.',
    description:
      'Give customers a helpful first response after hours and return unresolved work to your team with the details needed for the next morning.',
    icon: UsersThree,
    result: 'Fewer missed opportunities between closing time and opening time.',
    handles: ['After-hours calls', 'Common questions', 'Message taking', 'Callback requests'],
    humans: 'Complaints, urgent matters, and sensitive conversations.',
    measure: 'After-hours answer rate, callback completion, and repeat contacts.',
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
    text: 'Every engagement runs on Lumicoria.ai, so your support workflow can improve without becoming another disconnected tool.',
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
    eyebrow: 'Teach your agent',
    title: 'Your business. Your answers.',
    text: 'Add approved business information, choose the voice and tone, and set the rules for when your team should take over.',
    timing: 'Your knowledge and rules',
  },
  {
    number: '02',
    icon: CirclesFour,
    eyebrow: 'Connect and test',
    title: 'Try it before customers do.',
    text: 'Configure your chosen channels, run test conversations, and review answers and human handoffs. Publish only when you are ready.',
    timing: 'Review before launch',
  },
  {
    number: '03',
    icon: ArrowBendDownRight,
    eyebrow: 'Support your customers',
    title: 'Answer. Capture. Hand off.',
    text: 'Your agent handles routine questions and captures the request. Uncertain or sensitive matters reach your team with the conversation context.',
    timing: 'People stay in control',
  },
]

export const deliveryMilestones = [
  { step: '01', label: 'Create your account', detail: 'Open your workspace and get started' },
  { step: '02', label: 'Set up your organisation', detail: 'Add your team and business details' },
  { step: '03', label: 'Add business knowledge', detail: 'Share approved answers and policies' },
  { step: '04', label: 'Set your support rules', detail: 'Choose when staff should take over' },
  { step: '05', label: 'Create your voice agent', detail: 'Give it a clear role and greeting' },
  { step: '06', label: 'Test the conversations', detail: 'Try common questions and review replies' },
  { step: '07', label: 'Publish when ready', detail: 'Make it available through the agreed channel' },
]

export const engagements = [
  {
    name: 'One-time setup',
    slug: 'voice-support-setup',
    bestFor: 'Prepare your workspace, approved answers, and first voice-support workflow.',
    duration: 'Once per workspace',
    price: '₦500,000',
    includes: ['Workspace and agent configuration', 'Business knowledge preparation', 'Human handoff and escalation setup', 'Testing and onboarding before launch'],
    cta: 'Talk to our team',
  },
  {
    name: 'Starter',
    slug: 'controlled-support-launch',
    bestFor: 'Start with a focused support workflow and a smaller monthly voice allowance.',
    duration: 'Monthly subscription',
    price: '₦30,000 / month',
    includes: ['19,000 monthly voice credits', 'Equivalent to 30 browser + 10 phone minutes', 'Approved answers and human escalation', 'Shared conversation records and follow-up'],
    cta: 'Choose Starter',
    href: '/portal',
  },
  {
    name: 'Growth',
    slug: 'support-operations',
    bestFor: 'Run a busier support workflow with more monthly credits for customer calls.',
    duration: 'Monthly subscription',
    price: '₦100,000 / month',
    includes: ['90,000 monthly voice credits', 'Equivalent to 100 browser + 60 phone minutes', 'Approved answers and human escalation', 'Shared conversation records and follow-up'],
    cta: 'Choose Growth',
    href: '/portal',
    featured: true,
  },
  {
    name: 'Enterprise',
    slug: 'managed-support-improvement',
    bestFor: 'Agree a support configuration and commercial terms around your organisation’s requirements.',
    duration: 'Agreed in your quote',
    price: 'Custom pricing',
    includes: ['Scoped channels and integrations', 'Agreed voice allowance and usage rates', 'Organisation-specific workflow requirements', 'Implementation and support terms agreed upfront'],
    cta: 'Talk to our team',
  },
]

export const voicePricingNote = 'Setup is separate from the subscription. Included voice credits form one shared monthly balance, not separate minute quotas: 1 credit = ₦1; browser voice uses 300 credits/minute and phone voice uses 1,000 credits/minute. Additional usage needs credit top-ups. Phone-number costs and any additional provider charges are confirmed separately. Final pricing and availability are confirmed before activation.'

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
    question: 'What does Lumicoria help with?',
    answer:
      'Lumicoria helps businesses answer routine customer calls, capture missed enquiries, and keep follow-up visible. We start with voice support and connect the request to the people and tools already running the business.',
  },
  {
    question: 'How is voice support different from a basic IVR?',
    answer:
      'A basic IVR sends callers through fixed menu options. Lumicoria is designed to understand routine requests, use the business information you approve, record what happened, and return exceptions to your team with context.',
  },
  {
    question: 'What kinds of calls can Lumicoria handle?',
    answer:
      'Common starting points include order and delivery questions, booking requests, availability, service coverage, approved policies, lead capture, callbacks, and after-hours messages. The first workflow is chosen around your business and its boundaries.',
  },
  {
    question: 'Will Lumicoria replace our support team?',
    answer:
      'No. The goal is to reduce repetitive work and increase the capacity of your team. People remain responsible for complaints, refunds, disputes, sensitive requests, and decisions that need judgment.',
  },
  {
    question: 'Can customers speak in Nigerian languages?',
    answer:
      'We can design the workspace and support flow around the language your customers use. Nigerian English is the starting point, with Yoruba and other local language support handled according to the agreed workflow and testing plan.',
  },
  {
    question: 'Can Lumicoria work with our existing systems?',
    answer:
      'Yes. We begin with the information and tools your team already uses. We confirm access, handoff rules, error handling, and ownership before connecting the support workflow to your operation.',
  },
]

export const researchAreas = [
  'Clear answers from approved business information',
  'Human oversight for complaints and exceptions',
  'Reliable call records and follow-up ownership',
  'Practical support workflows for Nigerian businesses',
]

export const contactHref =
  'mailto:hello@lumicoria.ai?subject=Lumicoria.com%20Discovery%20Call&body=Hello%20Lumicoria%20team%2C%0A%0AI%20would%20like%20to%20discuss%20a%20workflow%20for%20automation.%0A%0ACompany%3A%0AWorkflow%3A%0ACurrent%20team%20or%20hours%20involved%3A%0ATimeline%3A'

export const salesFormHref = '/support/lumicoria/voice'
