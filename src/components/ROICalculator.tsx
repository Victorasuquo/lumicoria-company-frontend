import { useMemo, useState } from 'react'
import { ArrowUpRight, Calculator, Info } from '@phosphor-icons/react'
import { contactHref } from '../data/site'
import { Reveal } from './Reveal'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export function ROICalculator() {
  const [hours, setHours] = useState(120)
  const [hourlyCost, setHourlyCost] = useState(65)

  const estimate = useMemo(() => {
    const annualCost = hours * hourlyCost * 52
    return {
      annualCost,
      low: annualCost * 0.3,
      high: annualCost * 0.6,
    }
  }, [hours, hourlyCost])

  return (
    <section className="section section-roi">
      <div className="page-shell roi-layout">
        <Reveal className="roi-copy">
          <p className="section-index">Build the case</p>
          <h2>Know what the workflow costs before you automate it.</h2>
          <p>
            Our Discovery Sprint starts with your numbers. Use this estimate to frame the annual capacity tied up in a repetitive workflow.
          </p>
          <div className="estimate-note">
            <Info aria-hidden="true" weight="fill" />
            <span>This is an illustrative capacity estimate, not a savings guarantee. The 30-60% range comes from the agency operating model.</span>
          </div>
        </Reveal>

        <Reveal className="roi-calculator" delay={0.1}>
          <div className="calculator-head">
            <Calculator aria-hidden="true" weight="duotone" />
            <span>Workflow capacity estimate</span>
          </div>

          <label className="range-control">
            <span>
              Team hours spent each week
              <output>{hours} hours</output>
            </span>
            <input
              type="range"
              min="20"
              max="500"
              step="10"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            />
          </label>

          <label className="range-control">
            <span>
              Fully loaded hourly cost
              <output>{currency.format(hourlyCost)}</output>
            </span>
            <input
              type="range"
              min="20"
              max="180"
              step="5"
              value={hourlyCost}
              onChange={(event) => setHourlyCost(Number(event.target.value))}
            />
          </label>

          <div className="estimate-output" aria-live="polite">
            <div>
              <span>Current annual capacity cost</span>
              <strong>{currency.format(estimate.annualCost)}</strong>
            </div>
            <div>
              <span>Potential capacity recovered</span>
              <strong>{currency.format(estimate.low)}-{currency.format(estimate.high)}</strong>
            </div>
          </div>

          <a className="button button-primary button-block" href={contactHref}>
            Validate the opportunity
            <ArrowUpRight aria-hidden="true" weight="bold" />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
