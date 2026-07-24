import { jsonBody, portalFetch } from './client'
import type {
  InvitationAcceptance,
  PortalContext,
  PortalPermissions,
  PortalSession,
  PublicInvitation,
} from './types'

export function getPortalSession() {
  return portalFetch<PortalSession>('/auth/session')
}

export function createPortalSession(
  identityToken: string,
  organizationId: string,
  rememberMe: boolean,
) {
  return portalFetch<PortalSession>('/auth/session', {
    method: 'POST',
    identityToken,
    ...jsonBody({
      organization_id: organizationId,
      portal_host: null,
      remember_me: rememberMe,
    }),
  })
}

export function deletePortalSession() {
  return portalFetch<void>('/auth/session', { method: 'DELETE' })
}

export function getPortalContext(options: {
  organizationId?: string | null
  identityToken?: string
} = {}) {
  return portalFetch<PortalContext>('/auth/context', options)
}

export function getPortalPermissions(organizationId: string) {
  return portalFetch<PortalPermissions>('/auth/permissions', { organizationId })
}

export function switchPortalContext(organizationId: string) {
  return portalFetch<PortalContext>('/auth/context/switch', {
    method: 'POST',
    organizationId,
    ...jsonBody({ organization_id: organizationId, portal_host: null }),
  })
}

export function requestPasswordReset(email: string) {
  return portalFetch<{ accepted: boolean }>('/auth/password/reset-link', {
    method: 'POST',
    ...jsonBody({ email }),
  })
}

export function inspectInvitation(invitationToken: string) {
  return portalFetch<PublicInvitation>(
    `/public/invitations/${encodeURIComponent(invitationToken)}`,
  )
}

export function acceptInvitation(invitationToken: string, identityToken: string) {
  return portalFetch<InvitationAcceptance>(
    `/public/invitations/${encodeURIComponent(invitationToken)}/accept`,
    { method: 'POST', identityToken },
  )
}
