import { ArrowUpRight, Check, Microphone, Phone, PhoneDisconnect, SpeakerHigh } from '@phosphor-icons/react'
import { Reveal } from './Reveal'
import './useCaseDemos.css'

// Use-case templates. The mockup shows the agent demonstrating one capability;
// the list underneath says what else it does. Name and business appear once, in
// the card header, not again inside the screen.

type Demo = {
  useCase: string
  name: string
  business: string
  clock: string
  says: string
  capabilities: string[]
  href: string
  cta: string
}

const demos: Demo[] = [
  {
    useCase: 'Receptionist',
    name: 'Amara',
    business: 'Harmattan Court Hotel',
    clock: '00:42',
    says: 'That is the Deluxe for Friday, breakfast included.',
    capabilities: [
      'Room types and nightly rates',
      'Reads back an existing reservation',
      'Takes dates for the front desk',
    ],
    href: '/support/harmattan-court/voice',
    cta: 'Talk to Amara',
  },
  {
    useCase: 'Appointment booking',
    name: 'Tunde',
    business: 'Ridgeway Auto Care',
    clock: '01:15',
    says: 'Full service is thirty-five thousand, about six hours.',
    capabilities: [
      'Prices and how long a job takes',
      'Whether a car is ready for collection',
      'Captures vehicle and preferred day',
    ],
    href: '/support/ridgeway-auto/voice',
    cta: 'Talk to Tunde',
  },
  {
    useCase: 'Payment reminder',
    name: 'Nneka',
    business: 'Zuma Interiors',
    clock: '00:28',
    says: 'Invoice two one four, due on the third.',
    capabilities: [
      'What an invoice covers and when it was due',
      'Records a promised payment date',
      'Never asks for a card, PIN or OTP',
    ],
    href: '/support/zuma-interiors/voice',
    cta: 'Take the call',
  },
  {
    useCase: 'Order taking',
    name: 'Chidi',
    business: 'Okaka Stores',
    clock: '00:51',
    says: 'Order OK-1182 has been ready since yesterday.',
    capabilities: [
      'Items, quantities and delivery address',
      'Status of a recent order',
      'Says when it cannot see live stock',
    ],
    href: '/support/okaka-stores/voice',
    cta: 'Talk to Chidi',
  },
]

export function UseCaseDemos() {
  return (
    <section className="section usecase-section" id="use-case-demos" aria-labelledby="use-case-demos-title">
      <div className="page-shell">
        <Reveal className="section-heading">
          <p className="eyebrow">Use case templates</p>
          <h2 id="use-case-demos-title">Hear an agent built <span>for your kind of business.</span></h2>
          <p>Four agents, four jobs. They speak first, and you can interrupt them mid-sentence.</p>
        </Reveal>

        <div className="usecase-grid">
          {demos.map((demo, index) => (
            <Reveal className="usecase-card" key={demo.name} delay={index * 0.08}>
              <p className="eyebrow">{demo.useCase}</p>
              <h3>
                {demo.name}
                <span>{demo.business}</span>
              </h3>

              <div className="usecase-screen" aria-hidden="true">
                <div className="usecase-screen-bar">
                  <span className="usecase-live"><i />On a call</span>
                  <span className="usecase-clock">{demo.clock}</span>
                </div>

                <span className="usecase-ring">
                  <i /><i />
                  <span className="usecase-avatar">{demo.name.charAt(0)}</span>
                </span>

                <span className="usecase-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /></span>

                <p className="usecase-caption">{demo.says}</p>

                <div className="usecase-controls">
                  <span className="usecase-key"><Microphone weight="fill" /></span>
                  <span className="usecase-key is-end"><PhoneDisconnect weight="fill" /></span>
                  <span className="usecase-key"><SpeakerHigh weight="fill" /></span>
                </div>
              </div>

              <ul className="usecase-capabilities">
                {demo.capabilities.map((capability) => (
                  <li key={capability}>
                    <Check aria-hidden="true" weight="bold" />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>

              <a className="button button-primary usecase-cta" href={demo.href}>
                {demo.cta} <Phone aria-hidden="true" weight="fill" />
              </a>
            </Reveal>
          ))}
        </div>

        <div className="usecase-footer">
          <p>All four are fictional businesses, built to demonstrate the product.</p>
          <a className="text-link" href="/support">See every agent <ArrowUpRight aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  )
}
