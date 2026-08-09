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

export type VoiceAgent = ApiSchemas['VoiceAgentResponse']
export type VoiceAgentCreate = ApiSchemas['VoiceAgentCreate']
export type VoiceAgentUpdate = ApiSchemas['VoiceAgentUpdate']
export type VoiceAgentVersion = ApiSchemas['VoiceAgentVersionResponse']
export type VoiceAgentVersionCreate = ApiSchemas['VoiceAgentVersionCreate']
export type VoiceAgentVersionCollection = ApiSchemas['VoiceAgentVersionCollection']
export type VoiceAgentCollection = ApiSchemas['VoiceCollection_VoiceAgentResponse_']
export type VoiceSkillPack = ApiSchemas['VoiceSkillPackResponse']
export type VoiceSkillPackDetail = ApiSchemas['VoiceSkillPackDetailResponse']
export type VoiceSkillPackVersion = ApiSchemas['VoiceSkillPackVersionResponse']
export type VoiceSkillPackCollection = ApiSchemas['VoiceCollection_VoiceSkillPackResponse_']
export type VoiceComplianceProfile = ApiSchemas['VoiceComplianceProfileResponse']
export type VoiceComplianceProfileUpdatePayload = ApiSchemas['VoiceComplianceProfileUpdate']

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
