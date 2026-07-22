import { Company } from './components/Company'
import { DeliverySystem } from './components/DeliverySystem'
import { Engagements } from './components/Engagements'
import { FAQ } from './components/FAQ'
import { Footer } from './components/Footer'
import { Governance } from './components/Governance'
import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { OutcomeExplorer } from './components/OutcomeExplorer'

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Nav />
      <main id="main-content">
        <Hero />
        <OutcomeExplorer />
        <Company />
        <DeliverySystem />
        <Engagements />
        <Governance />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}

export default App
