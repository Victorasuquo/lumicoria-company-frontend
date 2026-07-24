import type { components } from './generated/schema'

export type ApiSchemas = components['schemas']
export type PortalContext = ApiSchemas['RequestContextResponse']
export type PortalPermissions = ApiSchemas['PermissionsResponse']
export type PortalSession = ApiSchemas['PortalSessionResponse']
export type PortalDestination = ApiSchemas['PortalDestinationResponse']
export type Organization = ApiSchemas['OrganizationResponse']
export type Engagement = ApiSchemas['EngagementResponse']
export type EngagementDashboard = ApiSchemas['EngagementDashboardResponse']
export type EngagementHealth = ApiSchemas['EngagementHealthResponse']
export type TimelineItem = ApiSchemas['TimelineItem']
export type NextAction = ApiSchemas['NextAction']
export type PendingApproval = ApiSchemas['PendingApproval']
export type OnboardingProgress = ApiSchemas['OnboardingProgressResponse']
export type OnboardingChecklist = ApiSchemas['OnboardingChecklistResponse']
export type ChecklistItem = ApiSchemas['ChecklistItemResponse']
export type Milestone = ApiSchemas['MilestoneResponse']
export type StatusReport = ApiSchemas['StatusReportResponse']
export type StatusReportVersion = ApiSchemas['StatusReportVersionResponse']
export type Deliverable = ApiSchemas['DeliverableResponse']
export type ReviewCycle = ApiSchemas['ReviewCycleResponse']
export type TeamMember = ApiSchemas['TeamMemberResponse']
export type Membership = ApiSchemas['MembershipResponse']
export type PortalNotification = ApiSchemas['PortalNotificationResponse']
export type AuditEvent = ApiSchemas['AuditEventResponse']
export type PublicInvitation = ApiSchemas['PublicInvitationResponse']
export type InvitationAcceptance = ApiSchemas['InvitationAcceptanceResponse']
export type DownloadAuthorization = ApiSchemas['DownloadAuthorizationResponse']

export type ApiCollection<T> = {
  items: T[]
  page: {
    next_cursor?: string | null
    has_more?: boolean
  }
  meta: {
    request_id?: string
    generated_at?: string
  }
}
