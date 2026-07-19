import { DeliverySystem } from './components/DeliverySystem'
import { Engagements } from './components/Engagements'
import { Footer } from './components/Footer'
import { Governance } from './components/Governance'
import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { OutcomeExplorer } from './components/OutcomeExplorer'
import { ROICalculator } from './components/ROICalculator'

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Nav />
      <main id="main-content">
        <Hero />
        <OutcomeExplorer />
        <ROICalculator />
        <DeliverySystem />
        <Engagements />
        <Governance />
      </main>
      <Footer />
    </>
  )
}

export default App
