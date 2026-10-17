import { lazy, Suspense, useEffect } from 'react'
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

const PortalApp = lazy(() => import('./portal/PortalApp').then(({ PortalApp: Portal }) => ({
  default: Portal,
})))
const PublicWidgetPage = lazy(() => import('./public/PublicWidgetPage').then(({ PublicWidgetPage: Page }) => ({
  default: Page,
})))
const PublicSupportPage = lazy(() => import('./public/PublicSupportPage').then(({ PublicSupportPage: Page }) => ({
  default: Page,
})))
const RebeccaPage = lazy(() => import('./public/RebeccaPage').then(({ RebeccaPage: Page }) => ({ default: Page })))

function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const isHome = path === '/'
  const isPortal = path === '/portal' || path.startsWith('/portal/')
  const isPublicWidget = path.startsWith('/chat/') || path.startsWith('/widget/') || path.startsWith('/voice/widget/')
  const widgetKey = isPublicWidget ? decodeURIComponent(path.split('/').filter(Boolean).at(-1) ?? '') : ''
  const supportSegments = path.split('/').filter(Boolean)
  const isPublicSupport = supportSegments[0] === 'support' && Boolean(supportSegments[1])
  const supportSlug = isPublicSupport ? decodeURIComponent(supportSegments[1]) : ''
  const supportView = isPublicSupport ? supportSegments[2] : undefined
  const supportArticleSlug = supportView === 'help' && supportSegments[3] ? decodeURIComponent(supportSegments[3]) : undefined
  const supportTicketId = supportView === 'status' && supportSegments[3] ? decodeURIComponent(supportSegments[3]) : undefined

  useEffect(() => {
    if (!isHome || !window.location.hash) return

    const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
    if (!target) return

    window.requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }))
  }, [isHome])

  if (isPortal) {
    return (
      <Suspense fallback={<div className="portal-route-loader">Loading client portal…</div>}>
        <PortalApp />
      </Suspense>
    )
  }

  if (isPublicWidget && widgetKey) {
    return (
      <Suspense fallback={<div className="public-widget-loader">Loading support…</div>}>
        <PublicWidgetPage widgetKey={widgetKey} />
      </Suspense>
    )
  }

  if (isPublicSupport) {
    if (supportSlug === (import.meta.env.VITE_REBECCA_SUPPORT_SLUG || 'lumicoria') && supportView === 'voice') {
      return <Suspense fallback={<div className="public-widget-loader">Loading Rebecca…</div>}><RebeccaPage /></Suspense>
    }
    return (
      <Suspense fallback={<div className="public-widget-loader">Loading support…</div>}>
        <PublicSupportPage slug={supportSlug} view={supportView} articleSlug={supportArticleSlug} ticketId={supportTicketId} />
      </Suspense>
    )
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Nav />
      <main id="main-content">
        {isHome ? (
          <>
            <Hero />
            <Ecosystem />
            <DeliverySystem />
            <OutcomeExplorer />
            <Verticals />
            <Company />
            <MeetPlatform />
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
