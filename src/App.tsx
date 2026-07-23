import { useEffect } from 'react'
import { Company } from './components/Company'
import { ContentPage } from './components/ContentPage'
import { DeliverySystem } from './components/DeliverySystem'
import { Ecosystem } from './components/Ecosystem'
import { Engagements } from './components/Engagements'
import { EngagementStories } from './components/EngagementStories'
import { FAQ } from './components/FAQ'
import { Footer } from './components/Footer'
import { Governance } from './components/Governance'
import { Hero } from './components/Hero'
import { MeetPlatform } from './components/MeetPlatform'
import { Nav } from './components/Nav'
import { OutcomeExplorer } from './components/OutcomeExplorer'
import { Verticals } from './components/Verticals'

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isHome = path === '/'

  useEffect(() => {
    if (!isHome || !window.location.hash) return

    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
    if (!target) return

    window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }))
  }, [isHome])

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Nav />
      <main id="main-content">
        {isHome ? (
          <>
            <Hero />
            <Ecosystem />
            <OutcomeExplorer />
            <Verticals />
            <Company />
            <MeetPlatform />
            <DeliverySystem />
            <Engagements />
            <EngagementStories />
            <Governance />
            <FAQ />
          </>
        ) : (
          <ContentPage path={path} />
        )}
      </main>
      <Footer />
    </>
  )
}

export default App
