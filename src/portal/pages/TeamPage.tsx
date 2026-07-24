import { IdentificationCard, UsersThree } from '@phosphor-icons/react'
import type { ApiCollection, TeamMember } from '../../api/types'
import { usePortalQuery, useSelectedEngagement } from '../hooks'
import {
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function TeamPage() {
  const { engagement, engagementId } = useSelectedEngagement()
  const query = usePortalQuery<ApiCollection<TeamMember>>(
    ['team-members', engagementId],
    engagementId ? `/engagements/${engagementId}/team-members?page_size=100` : null,
  )

  if (!engagementId) return <PortalEmpty title="No engagement selected" description="Select an engagement to view its team." />
  if (query.isLoading) return <PortalLoading label="Loading engagement team" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const members = query.data?.items ?? []
  const grouped = members.reduce<Record<string, TeamMember[]>>((groups, member) => {
    groups[member.party] = [...(groups[member.party] ?? []), member]
    return groups
  }, {})

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="People and ownership"
        title="Engagement team"
        description={`The people accountable for delivery and decisions across ${engagement?.name || 'this engagement'}.`}
        action={<span className="portal-header-stat"><strong>{members.length}</strong> members</span>}
      />
      {members.length ? (
        <section className="portal-team-groups">
          {Object.entries(grouped).map(([party, partyMembers]) => (
            <div key={party}>
              <header><UsersThree aria-hidden="true" weight="duotone" /><h2>{humanize(party)}</h2></header>
              <div className="portal-team-grid">
                {partyMembers?.map((member) => (
                  <article key={member.id}>
                    <div>{member.display_name.slice(0, 1).toUpperCase()}</div>
                    <h3>{member.display_name}</h3>
                    <p><IdentificationCard aria-hidden="true" /> {humanize(member.role)}</p>
                    <StatusPill value={member.status} />
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <PortalEmpty title="No team members are visible" description="The engagement team directory will appear after assignments are published." />
      )}
    </div>
  )
}
