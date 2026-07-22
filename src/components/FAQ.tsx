import { CaretDown } from '@phosphor-icons/react'
import { faqs } from '../data/site'
import { Reveal } from './Reveal'

export function FAQ() {
  return (
    <section className="section faq-section" id="faq">
      <div className="page-shell faq-layout">
        <Reveal className="faq-heading">
          <p className="eyebrow">Common questions</p>
          <h2>A straightforward answer before <span>the first call.</span></h2>
          <p>If your workflow is unusual, that is exactly what the discovery conversation is for.</p>
        </Reveal>

        <Reveal className="faq-list" delay={0.08}>
          {faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary>
                <span>{faq.question}</span>
                <CaretDown aria-hidden="true" weight="bold" />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
