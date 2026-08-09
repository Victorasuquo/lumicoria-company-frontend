import { Phone, ShieldWarning } from '@phosphor-icons/react'
import type { VoiceCollection, VoicePhoneNumber } from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { useVoiceQuery } from '../hooks'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function VoiceTelephonyPage() {
  const { hasScope } = usePortalAuth()
  const query = useVoiceQuery<VoiceCollection<VoicePhoneNumber>>(
    ['voice-phone-numbers'],
    '/voice/channels/phone-numbers?page_size=100',
  )

  if (query.isLoading) return <PortalLoading label="Loading phone numbers" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const numbers = query.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice channels"
        title="Telephony"
        description="Phone numbers and call routing for your voice agents."
        action={<span className="portal-header-stat"><strong>{numbers.length}</strong> number{numbers.length !== 1 ? 's' : ''}</span>}
      />

      {hasScope('voice.channel.manage') && (
        <section className="portal-panel portal-voice-stepup-notice">
          <ShieldWarning aria-hidden="true" weight="duotone" />
          <div>
            <strong>Elevated authentication required</strong>
            <p>Creating or updating phone numbers requires step-up authentication. Contact your portal administrator to provision new numbers.</p>
          </div>
        </section>
      )}

      {numbers.length ? (
        <section className="portal-panel">
          <div className="portal-voice-phone-table">
            <div className="portal-voice-phone-table-header">
              <span>Display Number</span>
              <span>Country</span>
              <span>Capability</span>
              <span>Status</span>
              <span>Agent</span>
              <span>Provider</span>
              <span>Updated</span>
            </div>
            {numbers.map((number) => (
              <div key={number.id} className="portal-voice-phone-table-row">
                <span className="portal-voice-phone-number">
                  <Phone aria-hidden="true" weight="duotone" />
                  {number.display_number}
                </span>
                <span>{number.country_code}</span>
                <span><StatusPill value={number.capability} /></span>
                <span><StatusPill value={number.status} /></span>
                <span className="portal-voice-truncated">{number.agent_id}</span>
                <span>{humanize(number.provider)}</span>
                <span>{formatPortalDate(number.updated_at)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <PortalEmpty
          title="No phone numbers assigned"
          description="Phone numbers will appear here once they have been provisioned for your voice agents."
        />
      )}
    </div>
  )
}
