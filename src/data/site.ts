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
    eyebrow: 'Start with your account',
    title: 'Create your workspace and organisation.',
    text: 'Set up your team, business details, and the customer-support area you want to improve first.',
    timing: 'A few minutes',
  },
  {
    number: '02',
    icon: CirclesFour,
    eyebrow: 'Teach it your business',
    title: 'Add the answers and rules your customers need.',
    text: 'Provide approved information such as opening hours, services, delivery areas, booking details, and when staff should take over.',
    timing: 'Your information',
  },
  {
    number: '03',
    icon: ArrowBendDownRight,
    eyebrow: 'Test, then publish',
    title: 'Try real questions before customers hear it.',
    text: 'Run test conversations, review the responses, and publish when the experience matches your standards.',
    timing: 'When ready',
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
    name: 'Voice Support Setup',
    bestFor: 'You want to choose the first call workflow and prepare it around your business rules.',
    duration: '2-4 weeks',
    price: '₦10m to ₦20m',
    includes: ['Support workflow review', 'Approved answer library', 'Call and escalation design', 'Launch recommendation'],
    cta: 'Talk to our team',
  },
  {
    name: 'Controlled Support Launch',
    bestFor: 'You have a clear customer-support problem and want to introduce voice support carefully.',
    duration: '6-10 weeks',
    price: '₦45m to ₦100m',
    includes: ['Voice workflow configuration', 'Business knowledge setup', 'Human handoff testing', 'Team training and support'],
    cta: 'Talk to our team',
    featured: true,
  },
  {
    name: 'Support Operations',
    bestFor: 'Your customer support spans calls, WhatsApp, email, bookings, and more than one team.',
    duration: '12-20 weeks',
    price: '₦120m to ₦300m',
    includes: ['Connected support channels', 'Escalation ownership', 'Reporting and review', 'Ongoing workflow improvement'],
    cta: 'Talk to our team',
  },
  {
    name: 'Managed Support Improvement',
    bestFor: 'You want a partner to monitor support quality and improve the workflow after launch.',
    duration: 'Monthly',
    price: '₦5m to ₦30m / month',
    includes: ['Quality and outcome review', 'Knowledge updates', 'Escalation and issue review', 'Monthly support reporting'],
    cta: 'Talk to our team',
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

export const salesFormHref = 'https://forms.gle/JpJDuSzAEVJH8Md19'
