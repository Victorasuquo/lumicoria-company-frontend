import { ArrowRight, Buildings } from '@phosphor-icons/react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePortalAuth } from '../../auth/AuthProvider'
import { PortalError, PortalLoading, humanize } from '../components/PortalState'

export function OrganizationPickerPage() {
  const { chooseOrganization, destinations, status, switchOrganization } = usePortalAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (status === 'loading') return <PortalLoading />
  if (status === 'unauthenticated') return <Navigate to="/portal/login" replace />

  async function choose(organizationId: string) {
    setBusyId(organizationId)
    setError(null)
    try {
      if (status === 'choosing-organization') await chooseOrganization(organizationId)
      else await switchOrganization(organizationId)
      navigate('/portal', { replace: true })
    } catch (caught) {
      setError(caught)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="portal-picker-page">
      <a className="portal-auth-brand" href="/">
        <img src="/brand-mark.png" alt="" />
        Lumicoria
      </a>
      <section>
        <span className="portal-auth-kicker">Choose a workspace</span>
        <h1>Where are you working today?</h1>
        <p>Your account has access to more than one company portal.</p>
        {error ? <PortalError error={error} /> : null}
        <div className="portal-destination-list">
          {destinations.map((destination) => (
            <button
              type="button"
              onClick={() => void choose(destination.organization_id)}
              disabled={busyId === destination.organization_id}
              key={destination.organization_id}
            >
              <Buildings aria-hidden="true" weight="duotone" />
              <span>
                <strong>{destination.display_name}</strong>
                <small>{humanize(destination.role)} · {destination.engagement_ids.length} engagement{destination.engagement_ids.length === 1 ? '' : 's'}</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
