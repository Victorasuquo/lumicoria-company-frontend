import { Reveal } from './Reveal'

const businesses = [
  { name: 'Delia Clothings & More', logo: 'delia-clothings-and-more.png', className: 'delia' },
  { name: 'Enoexplore', logo: 'enoexplore.png', className: 'enoexplore' },
  { name: 'Kycura', logo: 'kycura.png', className: 'kycura' },
  { name: 'Limitless', logo: 'limitless.png', className: 'limitless' },
  { name: 'Queska', logo: 'queska.png', className: 'queska' },
  { name: 'Talent Port', logo: 'talent-port.png', className: 'talent-port' },
  { name: 'Boiflok', logo: 'boiflok.png', className: 'boiflok' },
]

export function EngagementStories() {
  return (
    <section className="section stories-section" id="stories" aria-labelledby="stories-title">
      <div className="page-shell">
        <Reveal className="stories-heading business-logo-heading">
          <h2 id="stories-title">Businesses building <span>with Lumicoria.</span></h2>
        </Reveal>
        <ul className="business-logo-grid" aria-label="Businesses using Lumicoria">
          {businesses.map((business) => (
            <li className={`business-logo-item business-logo-item--${business.className}`} key={business.name}>
              <img src={`/business-logos/${business.logo}`} alt={business.name} loading="lazy" decoding="async" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
