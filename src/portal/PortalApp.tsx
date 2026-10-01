import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { RequirePortalSession } from '../auth/RequirePortalSession'
import { RequireAdminSession } from '../auth/RequireAdminSession'
import { AdminLayout } from './AdminLayout'
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
const VoiceAgentsPage = lazy(() => import('./pages/VoiceAgentsPage').then(({ VoiceAgentsPage: Page }) => ({ default: Page })))
const VoiceAgentDetailPage = lazy(() => import('./pages/VoiceAgentDetailPage').then(({ VoiceAgentDetailPage: Page }) => ({ default: Page })))
const VoiceKnowledgePage = lazy(() => import('./pages/VoiceKnowledgePage').then(({ VoiceKnowledgePage: Page }) => ({ default: Page })))
const VoiceKnowledgeDetailPage = lazy(() => import('./pages/VoiceKnowledgeDetailPage').then(({ VoiceKnowledgeDetailPage: Page }) => ({ default: Page })))
const VoiceToolsPage = lazy(() => import('./pages/VoiceToolsPage').then(({ VoiceToolsPage: Page }) => ({ default: Page })))
const VoiceToolDetailPage = lazy(() => import('./pages/VoiceToolDetailPage').then(({ VoiceToolDetailPage: Page }) => ({ default: Page })))
const VoiceTelephonyPage = lazy(() => import('./pages/VoiceTelephonyPage').then(({ VoiceTelephonyPage: Page }) => ({ default: Page })))
const VoiceAnalyticsPage = lazy(() => import('./pages/VoiceAnalyticsPage').then(({ VoiceAnalyticsPage: Page }) => ({ default: Page })))
const VoiceCallDetailPage = lazy(() => import('./pages/VoiceCallDetailPage').then(({ VoiceCallDetailPage: Page }) => ({ default: Page })))
const VoicePlaygroundPage = lazy(() => import('./pages/VoicePlaygroundPage').then(({ VoicePlaygroundPage: Page }) => ({ default: Page })))
const VoiceCompliancePage = lazy(() => import('./pages/VoiceCompliancePage').then(({ VoiceCompliancePage: Page }) => ({ default: Page })))
const VoiceHandoffsPage = lazy(() => import('./pages/VoiceHandoffsPage').then(({ VoiceHandoffsPage: Page }) => ({ default: Page })))
const VoiceHandoffDetailPage = lazy(() => import('./pages/VoiceHandoffDetailPage').then(({ VoiceHandoffDetailPage: Page }) => ({ default: Page })))
const VoiceWidgetsPage = lazy(() => import('./pages/VoiceWidgetsPage').then(({ VoiceWidgetsPage: Page }) => ({ default: Page })))
const VoiceWidgetDetailPage = lazy(() => import('./pages/VoiceWidgetDetailPage').then(({ VoiceWidgetDetailPage: Page }) => ({ default: Page })))
const VoiceWhatsAppPage = lazy(() => import('./pages/VoiceWhatsAppPage').then(({ VoiceWhatsAppPage: Page }) => ({ default: Page })))
const SupportOverviewPage = lazy(() => import('./pages/SupportPages').then(({ SupportOverviewPage: Page }) => ({ default: Page })))
const SupportInboxPage = lazy(() => import('./pages/SupportPages').then(({ SupportInboxPage: Page }) => ({ default: Page })))
const SupportTicketsPage = lazy(() => import('./pages/SupportPages').then(({ SupportTicketsPage: Page }) => ({ default: Page })))
const SupportTicketDetailPage = lazy(() => import('./pages/SupportPages').then(({ SupportTicketDetailPage: Page }) => ({ default: Page })))
const SupportCustomersPage = lazy(() => import('./pages/SupportPages').then(({ SupportCustomersPage: Page }) => ({ default: Page })))
const SupportCustomerDetailPage = lazy(() => import('./pages/SupportPages').then(({ SupportCustomerDetailPage: Page }) => ({ default: Page })))
const SupportConversationsPage = lazy(() => import('./pages/SupportPages').then(({ SupportConversationsPage: Page }) => ({ default: Page })))
const SupportCallsPage = lazy(() => import('./pages/SupportPages').then(({ SupportCallsPage: Page }) => ({ default: Page })))
const ChannelsWorkspacePage = lazy(() => import('./pages/ChannelsWorkspacePage').then(({ ChannelsWorkspacePage: Page }) => ({ default: Page })))
const SupportNotificationsPage = lazy(() => import('./pages/SupportPages').then(({ SupportNotificationsPage: Page }) => ({ default: Page })))
const SupportQueuesPage = lazy(() => import('./pages/SupportPages').then(({ SupportQueuesPage: Page }) => ({ default: Page })))
const SupportAnalyticsPage = lazy(() => import('./pages/SupportPages').then(({ SupportAnalyticsPage: Page }) => ({ default: Page })))
const SupportIntegrationsPage = lazy(() => import('./pages/SupportPages').then(({ SupportIntegrationsPage: Page }) => ({ default: Page })))
const SupportWorkflowsPage = lazy(() => import('./pages/SupportPages').then(({ SupportWorkflowsPage: Page }) => ({ default: Page })))
const SupportWorkflowDetailPage = lazy(() => import('./pages/SupportPages').then(({ SupportWorkflowDetailPage: Page }) => ({ default: Page })))
const SupportSettingsPage = lazy(() => import('./pages/SupportPages').then(({ SupportSettingsPage: Page }) => ({ default: Page })))
const HospitalityWorkspacePage = lazy(() => import('./pages/HospitalityWorkspacePage').then(({ HospitalityWorkspacePage: Page }) => ({ default: Page })))
const LogisticsWorkspacePage = lazy(() => import('./pages/LogisticsWorkspacePage').then(({ LogisticsWorkspacePage: Page }) => ({ default: Page })))
const EcommerceWorkspacePage = lazy(() => import('./pages/EcommerceWorkspacePage').then(({ EcommerceWorkspacePage: Page }) => ({ default: Page })))
const TelecomWorkspacePage = lazy(() => import('./pages/TelecomWorkspacePage').then(({ TelecomWorkspacePage: Page }) => ({ default: Page })))
const EducationWorkspacePage = lazy(() => import('./pages/EducationWorkspacePage').then(({ EducationWorkspacePage: Page }) => ({ default: Page })))
const SaasWorkspacePage = lazy(() => import('./pages/SaasWorkspacePage').then(({ SaasWorkspacePage: Page }) => ({ default: Page })))
const AppointmentsWorkspacePage = lazy(() => import('./pages/AppointmentsWorkspacePage').then(({ AppointmentsWorkspacePage: Page }) => ({ default: Page })))
const HealthcareAdministrationWorkspacePage = lazy(() => import('./pages/HealthcareAdministrationWorkspacePage').then(({ HealthcareAdministrationWorkspacePage: Page }) => ({ default: Page })))
const ProfessionalServicesWorkspacePage = lazy(() => import('./pages/ProfessionalServicesWorkspacePage').then(({ ProfessionalServicesWorkspacePage: Page }) => ({ default: Page })))
const AdminOverviewPage = lazy(() => import('./pages/AdminPages').then(({ AdminOverviewPage: Page }) => ({ default: Page })))
const AdminOrganizationsPage = lazy(() => import('./pages/AdminPages').then(({ AdminOrganizationsPage: Page }) => ({ default: Page })))
const AdminOrganizationDetailPage = lazy(() => import('./pages/AdminPages').then(({ AdminOrganizationDetailPage: Page }) => ({ default: Page })))
const AdminTemplatesPage = lazy(() => import('./pages/AdminPages').then(({ AdminTemplatesPage: Page }) => ({ default: Page })))
const AdminOnboardingPage = lazy(() => import('./pages/AdminPages').then(({ AdminOnboardingPage: Page }) => ({ default: Page })))
const AdminOnboardingDraftPage = lazy(() => import('./pages/AdminPages').then(({ AdminOnboardingDraftPage: Page }) => ({ default: Page })))
const AdminDraftsPage = lazy(() => import('./pages/AdminPages').then(({ AdminDraftsPage: Page }) => ({ default: Page })))
const AdminCommunicationsPage = lazy(() => import('./pages/AdminPages').then(({ AdminCommunicationsPage: Page }) => ({ default: Page })))
const AdminAdministratorsPage = lazy(() => import('./pages/AdminPages').then(({ AdminAdministratorsPage: Page }) => ({ default: Page })))
const AdminAuditPage = lazy(() => import('./pages/AdminPages').then(({ AdminAuditPage: Page }) => ({ default: Page })))
const AdminSettingsPage = lazy(() => import('./pages/AdminPages').then(({ AdminSettingsPage: Page }) => ({ default: Page })))
const AdminIdentityPage = lazy(() => import('./pages/AdminPages').then(({ AdminIdentityPage: Page }) => ({ default: Page })))
const AdminOperationsPage = lazy(() => import('./pages/AdminPages').then(({ AdminOperationsPage: Page }) => ({ default: Page })))
const ClientCommunicationsPage = lazy(() => import('./pages/AdminPages').then(({ ClientCommunicationsPage: Page }) => ({ default: Page })))
const ClientCommunicationThreadPage = lazy(() => import('./pages/AdminPages').then(({ ClientCommunicationThreadPage: Page }) => ({ default: Page })))

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
              <Route element={<RequireAdminSession />}>
                <Route element={<AdminLayout />}>
                  <Route path="/portal/admin" element={<AdminOverviewPage />} />
                  <Route path="/portal/admin/organizations" element={<AdminOrganizationsPage />} />
                  <Route path="/portal/admin/organizations/:organizationId" element={<AdminOrganizationDetailPage />} />
                  <Route path="/portal/admin/onboarding/new" element={<AdminOnboardingPage />} />
                  <Route path="/portal/admin/onboarding/drafts" element={<AdminDraftsPage />} />
                  <Route path="/portal/admin/onboarding/drafts/:draftId" element={<AdminOnboardingDraftPage />} />
                  <Route path="/portal/admin/templates" element={<AdminTemplatesPage />} />
                  <Route path="/portal/admin/communications" element={<AdminCommunicationsPage />} />
                  <Route path="/portal/admin/administrators" element={<AdminAdministratorsPage />} />
                  <Route path="/portal/admin/audit" element={<AdminAuditPage />} />
                  <Route path="/portal/admin/operations" element={<AdminOperationsPage />} />
                  <Route path="/portal/admin/settings" element={<AdminSettingsPage />} />
                  <Route path="/portal/admin/identity" element={<AdminIdentityPage />} />
                </Route>
              </Route>
              <Route element={<RequirePortalSession />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<DashboardPage />} />
                  <Route path="/portal/milestones" element={<MilestonesPage />} />
                  <Route path="/portal/onboarding" element={<OnboardingPage />} />
                  <Route path="/portal/status-reports" element={<StatusReportsPage />} />
                  <Route path="/portal/deliverables" element={<DeliverablesPage />} />
                  <Route path="/portal/reviews" element={<ReviewsPage />} />
                  <Route path="/portal/notifications" element={<NotificationsPage />} />
                  <Route path="/portal/communications" element={<ClientCommunicationsPage />} />
                  <Route path="/portal/communications/:threadId" element={<ClientCommunicationThreadPage />} />
                  <Route path="/portal/team" element={<TeamPage />} />
                  <Route path="/portal/settings" element={<SettingsPage />} />
                  <Route path="/portal/audit" element={<AuditPage />} />
                  <Route path="/portal/voice/agents" element={<VoiceAgentsPage />} />
                  <Route path="/portal/voice/agents/:agentId" element={<VoiceAgentDetailPage />} />
                  <Route path="/portal/voice/knowledge" element={<VoiceKnowledgePage />} />
                  <Route path="/portal/voice/knowledge/:knowledgeBaseId" element={<VoiceKnowledgeDetailPage />} />
                  <Route path="/portal/voice/tools" element={<VoiceToolsPage />} />
                  <Route path="/portal/voice/tools/:toolId" element={<VoiceToolDetailPage />} />
                  <Route path="/portal/voice/telephony" element={<VoiceTelephonyPage />} />
                  <Route path="/portal/voice/analytics" element={<VoiceAnalyticsPage />} />
                  <Route path="/portal/voice/calls/:callId" element={<VoiceCallDetailPage />} />
                  <Route path="/portal/voice/handoffs" element={<VoiceHandoffsPage />} />
                  <Route path="/portal/voice/handoffs/:destinationId" element={<VoiceHandoffDetailPage />} />
                  <Route path="/portal/voice/widgets" element={<VoiceWidgetsPage />} />
                  <Route path="/portal/voice/widgets/:widgetId" element={<VoiceWidgetDetailPage />} />
                  <Route path="/portal/voice/whatsapp" element={<VoiceWhatsAppPage />} />
                  <Route path="/portal/voice/playground" element={<VoicePlaygroundPage />} />
                  <Route path="/portal/voice/compliance" element={<VoiceCompliancePage />} />
                  <Route path="/portal/support" element={<SupportOverviewPage />} />
                  <Route path="/portal/support/hospitality" element={<HospitalityWorkspacePage />} />
                  <Route path="/portal/support/logistics" element={<LogisticsWorkspacePage />} />
                  <Route path="/portal/support/ecommerce" element={<EcommerceWorkspacePage />} />
                  <Route path="/portal/support/telecom" element={<TelecomWorkspacePage />} />
                  <Route path="/portal/support/education" element={<EducationWorkspacePage />} />
                  <Route path="/portal/support/saas" element={<SaasWorkspacePage />} />
                  <Route path="/portal/support/appointments" element={<AppointmentsWorkspacePage />} />
                  <Route path="/portal/support/healthcare" element={<HealthcareAdministrationWorkspacePage />} />
                  <Route path="/portal/support/professional-services" element={<ProfessionalServicesWorkspacePage />} />
                  <Route path="/portal/support/inbox" element={<SupportInboxPage />} />
                  <Route path="/portal/support/tickets" element={<SupportTicketsPage />} />
                  <Route path="/portal/support/tickets/:ticketId" element={<SupportTicketDetailPage />} />
                  <Route path="/portal/support/customers" element={<SupportCustomersPage />} />
                  <Route path="/portal/support/customers/:customerId" element={<SupportCustomerDetailPage />} />
                  <Route path="/portal/support/conversations" element={<SupportConversationsPage />} />
                  <Route path="/portal/support/calls" element={<SupportCallsPage />} />
                  <Route path="/portal/support/channels" element={<ChannelsWorkspacePage />} />
                  <Route path="/portal/support/notifications" element={<SupportNotificationsPage />} />
                  <Route path="/portal/support/queues" element={<SupportQueuesPage />} />
                  <Route path="/portal/support/analytics" element={<SupportAnalyticsPage />} />
                  <Route path="/portal/support/integrations" element={<SupportIntegrationsPage />} />
                  <Route path="/portal/support/workflows" element={<SupportWorkflowsPage />} />
                  <Route path="/portal/support/workflows/:workflowId" element={<SupportWorkflowDetailPage />} />
                  <Route path="/portal/support/settings" element={<SupportSettingsPage />} />
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
