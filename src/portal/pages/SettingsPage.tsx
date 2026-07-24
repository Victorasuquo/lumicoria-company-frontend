import { Buildings, Fingerprint, Key, ShieldCheck } from '@phosphor-icons/react'
import type { ApiCollection, Membership, Organization } from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { usePortalQuery } from '../hooks'
import {
  formatPortalDate,
  humanize,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function SettingsPage() {
  const { context, hasScope, session } = usePortalAuth()
  const organizationId = context?.organization_id
  const organizationQuery = usePortalQuery<Organization>(
    ['organization', organizationId],
    organizationId ? `/organizations/${organizationId}` : null,
  )
  const membershipsQuery = usePortalQuery<ApiCollection<Membership>>(
    ['memberships', organizationId],
    organizationId ? `/organizations/${organizationId}/memberships?page_size=100` : null,
    { enabled: hasScope('portal.members.manage') },
  )

  if (organizationQuery.isLoading) return <PortalLoading label="Loading portal settings" />
  if (organizationQuery.error) return <PortalError error={organizationQuery.error} onRetry={() => void organizationQuery.refetch()} />

  const organization = organizationQuery.data
  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Workspace administration"
        title="Settings"
        description="Organization identity, session assurance, permissions, and client portal membership."
      />
      <section className="portal-settings-grid">
        <article className="portal-panel portal-organization-profile">
          <header><Buildings aria-hidden="true" weight="duotone" /><div><span>Organization</span><h2>{organization?.name}</h2></div><StatusPill value={organization?.status} /></header>
          <dl>
            <div><dt>Workspace ID</dt><dd>{organization?.id}</dd></div>
            <div><dt>Data region</dt><dd>{humanize(organization?.data_region)}</dd></div>
            <div><dt>Identity tenant</dt><dd>{organization?.identity_tenant_id || 'Default identity tenant'}</dd></div>
            <div><dt>Updated</dt><dd>{formatPortalDate(organization?.updated_at, true)}</dd></div>
          </dl>
        </article>
        <article className="portal-panel portal-session-profile">
          <header><ShieldCheck aria-hidden="true" weight="duotone" /><div><span>Current session</span><h2>{humanize(session?.assurance_level)}</h2></div></header>
          <dl>
            <div><dt><Fingerprint aria-hidden="true" /> Principal</dt><dd>{context?.principal_id}</dd></div>
            <div><dt><Key aria-hidden="true" /> Expires</dt><dd>{formatPortalDate(session?.expires_at, true)}</dd></div>
            <div><dt>Engagement grants</dt><dd>{context?.engagement_ids.length ?? 0}</dd></div>
            <div><dt>Effective scopes</dt><dd>{context?.scopes.length ?? 0}</dd></div>
          </dl>
        </article>
      </section>
      <section className="portal-panel portal-permissions-panel">
        <header><div><h2>Your permissions</h2><p>These controls shape visible navigation and actions. The API remains authoritative.</p></div></header>
        <div className="portal-scope-cloud">
          {context?.scopes.map((scope) => <span key={scope}>{scope}</span>)}
        </div>
      </section>
      {hasScope('portal.members.manage') && (
        <section className="portal-panel portal-memberships-panel">
          <header><div><h2>Portal memberships</h2><p>Active organization access visible to portal administrators.</p></div></header>
          {membershipsQuery.error ? <PortalError error={membershipsQuery.error} /> : (
            <div className="portal-membership-table">
              {membershipsQuery.data?.items.map((membership) => (
                <div key={membership.id}>
                  <span>{membership.principal_id}</span>
                  <strong>{humanize(membership.role)}</strong>
                  <small>{membership.engagement_ids.length} engagement grants</small>
                  <StatusPill value={membership.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
