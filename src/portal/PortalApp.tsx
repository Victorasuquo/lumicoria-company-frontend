import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { RequirePortalSession } from '../auth/RequirePortalSession'
import { PortalLayout } from './PortalLayout'
import { PortalLoading } from './components/PortalState'
import { portalQueryClient } from './query'
import './portal.css'

const AuditPage = lazy(() => import('./pages/AuditPage').then(({ AuditPage: Page }) => ({ default: Page })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(({ DashboardPage: Page }) => ({ default: Page })))
const DeliverablesPage = lazy(() => import('./pages/DeliverablesPage').then(({ DeliverablesPage: Page }) => ({ default: Page })))
const InvitationPage = lazy(() => import('./pages/InvitationPage').then(({ InvitationPage: Page }) => ({ default: Page })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(({ LoginPage: Page }) => ({ default: Page })))
const MilestonesPage = lazy(() => import('./pages/MilestonesPage').then(({ MilestonesPage: Page }) => ({ default: Page })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(({ NotificationsPage: Page }) => ({ default: Page })))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(({ OnboardingPage: Page }) => ({ default: Page })))
const OrganizationPickerPage = lazy(() => import('./pages/OrganizationPickerPage').then(({ OrganizationPickerPage: Page }) => ({ default: Page })))
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then(({ ReviewsPage: Page }) => ({ default: Page })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(({ SettingsPage: Page }) => ({ default: Page })))
const StatusReportsPage = lazy(() => import('./pages/StatusReportsPage').then(({ StatusReportsPage: Page }) => ({ default: Page })))
const TeamPage = lazy(() => import('./pages/TeamPage').then(({ TeamPage: Page }) => ({ default: Page })))

export function PortalApp() {
  useEffect(() => {
    const previousTitle = document.title
    const existingRobots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const previousRobots = existingRobots?.content
    const robots = existingRobots ?? document.createElement('meta')

    if (!existingRobots) {
      robots.name = 'robots'
      document.head.appendChild(robots)
    }

    document.title = 'Client Portal | Lumicoria'
    robots.content = 'noindex, nofollow'

    return () => {
      document.title = previousTitle
      if (existingRobots && previousRobots) {
        robots.content = previousRobots
      } else {
        robots.remove()
      }
    }
  }, [])

  return (
    <QueryClientProvider client={portalQueryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PortalLoading />}>
            <Routes>
              <Route path="/portal/login" element={<LoginPage />} />
              <Route path="/portal/invitations/:token" element={<InvitationPage />} />
              <Route path="/portal/organizations" element={<OrganizationPickerPage />} />
              <Route element={<RequirePortalSession />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<DashboardPage />} />
                  <Route path="/portal/milestones" element={<MilestonesPage />} />
                  <Route path="/portal/onboarding" element={<OnboardingPage />} />
                  <Route path="/portal/status-reports" element={<StatusReportsPage />} />
                  <Route path="/portal/deliverables" element={<DeliverablesPage />} />
                  <Route path="/portal/reviews" element={<ReviewsPage />} />
                  <Route path="/portal/notifications" element={<NotificationsPage />} />
                  <Route path="/portal/team" element={<TeamPage />} />
                  <Route path="/portal/settings" element={<SettingsPage />} />
                  <Route path="/portal/audit" element={<AuditPage />} />
                </Route>
              </Route>
              <Route path="/portal/*" element={<Navigate to="/portal" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
