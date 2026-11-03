import { CheckCircle, Plus } from '@phosphor-icons/react'
import { ChannelIcon } from '../../components/ChannelIcon'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type {
  VoiceCollection,
  VoiceWhatsAppEligibility,
  VoiceWhatsAppPermission,
  VoiceWhatsAppSender,
} from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { useVoiceQuery } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function VoiceWhatsAppPage() {
  const { context, hasScope } = usePortalAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [countryCode, setCountryCode] = useState('')

  const [expandedSenderId, setExpandedSenderId] = useState<string | null>(null)
  const [permPhone, setPermPhone] = useState('')
  const [permTemplate, setPermTemplate] = useState('')
  const [permReason, setPermReason] = useState('')

  const sendersQuery = useVoiceQuery<VoiceCollection<VoiceWhatsAppSender>>(
    ['voice-whatsapp-senders'],
    '/voice/channels/whatsapp?page_size=100',
  )

  const eligibilityQuery = useVoiceQuery<VoiceWhatsAppEligibility>(
    ['voice-whatsapp-eligibility', expandedSenderId],
    expandedSenderId ? `/voice/channels/whatsapp/${expandedSenderId}/eligibility` : null,
  )

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceWhatsAppSender>(
        '/voice/channels/whatsapp',
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({
            phone_number: phoneNumber,
            display_name: displayName,
            waba_id: wabaId || null,
            country_code: countryCode.toUpperCase(),
          }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-whatsapp-senders'] })
      setShowRegister(false)
      setPhoneNumber('')
      setDisplayName('')
      setWabaId('')
      setCountryCode('')
    },
  })

  const permissionMutation = useMutation({
    mutationFn: async () => {
      if (!context || !expandedSenderId) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceWhatsAppPermission>(
        `/voice/channels/whatsapp/${expandedSenderId}/permission-requests`,
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({
            customer_phone: permPhone,
            template_id: permTemplate || null,
            reason: permReason || null,
          }),
        },
      )
      return data
    },
    onSuccess: () => {
      setPermPhone('')
      setPermTemplate('')
      setPermReason('')
    },
  })

  if (sendersQuery.isLoading) return <PortalLoading label="Loading WhatsApp senders" />
  if (sendersQuery.error) return <PortalError error={sendersQuery.error} onRetry={() => void sendersQuery.refetch()} />

  const senders = sendersQuery.data?.items ?? []
  const canManage = hasScope('voice.channel.manage')

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice channels"
        title="WhatsApp Business"
        description="Register WhatsApp Business senders, check eligibility, and request calling permissions."
        action={
          canManage ? (
            <button className="portal-primary-button" type="button" onClick={() => setShowRegister(true)}>
              <Plus aria-hidden="true" /> Register sender
            </button>
          ) : undefined
        }
      />

      {showRegister && (
        <div className="portal-voice-modal-backdrop" onClick={() => setShowRegister(false)}>
          <div className="portal-voice-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Register WhatsApp sender</h2>
            {registerMutation.error && <p className="portal-voice-form-error">{String(registerMutation.error.message)}</p>}
            <div className="portal-voice-form">
              <label>
                <small>Phone number</small>
                <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1234567890" />
              </label>
              <label>
                <small>Display name</small>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Support Line" />
              </label>
              <label>
                <small>WABA ID (optional)</small>
                <input type="text" value={wabaId} onChange={(e) => setWabaId(e.target.value)} />
              </label>
              <label>
                <small>Country code (2-letter)</small>
                <input type="text" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} placeholder="US" maxLength={2} />
              </label>
              <div className="portal-voice-form-actions">
                <button className="portal-secondary-button" type="button" onClick={() => setShowRegister(false)}>Cancel</button>
                <button
                  className="portal-primary-button"
                  type="button"
                  onClick={() => registerMutation.mutate()}
                  disabled={!phoneNumber || !displayName || !countryCode || registerMutation.isPending}
                >
                  {registerMutation.isPending ? 'Registering…' : 'Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {senders.length ? (
        <section className="wa-senders-section" aria-labelledby="wa-senders-title">
          <header className="wa-senders-heading">
            <div>
              <h2 id="wa-senders-title">Registered senders</h2>
              <p>Select a sender to review country eligibility or request calling permission.</p>
            </div>
            <span className="wa-sender-count">{senders.length} {senders.length === 1 ? 'sender' : 'senders'}</span>
          </header>

          <div className="wa-sender-list">
            {senders.map((sender) => {
              const isExpanded = expandedSenderId === sender.id
              const detailsId = `whatsapp-sender-details-${sender.id}`

              return (
                <article className={`wa-sender-card${isExpanded ? ' is-expanded' : ''}`} key={sender.id}>
                  <div className="wa-sender-summary">
                    <div className="wa-sender-identity">
                      <span className="wa-sender-icon"><ChannelIcon channel="whatsapp" size={25} /></span>
                      <div>
                        <strong>{sender.phone_number}</strong>
                        <span>{sender.display_name} <span className="wa-sender-country">· {sender.country_code}</span></span>
                      </div>
                    </div>

                    <div className="wa-sender-status">
                      <StatusPill value={sender.status} />
                      {sender.verified ? (
                        <span className="portal-voice-verified"><CheckCircle aria-hidden="true" weight="fill" /> Verified</span>
                      ) : (
                        <span className="wa-sender-pending">Verification pending</span>
                      )}
                    </div>

                    <div className="wa-sender-updated">
                      <span>Last updated</span>
                      <strong>{formatPortalDate(sender.updated_at)}</strong>
                    </div>

                    <div className="wa-sender-actions">
                      <a
                        className="portal-secondary-button wa-chat-now"
                        href="http://wa.me/+14155238886?text=join%20rocky-body"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Chat now
                      </a>
                      <button
                        className="portal-secondary-button wa-sender-toggle"
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={detailsId}
                        onClick={() => setExpandedSenderId(isExpanded ? null : sender.id)}
                      >
                        {isExpanded ? 'Hide details' : 'View details'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="wa-sender-details" id={detailsId}>
                      <section className="wa-eligibility" aria-labelledby={`${detailsId}-eligibility`}>
                        <div className="wa-detail-heading">
                          <div>
                            <h3 id={`${detailsId}-eligibility`}>Calling eligibility</h3>
                            <p>Availability depends on the sender’s country and capability.</p>
                          </div>
                          <span className="wa-country-tag">{sender.country_code}</span>
                        </div>
                        {eligibilityQuery.isLoading && <PortalLoading label="Checking eligibility" />}
                        {eligibilityQuery.error && <PortalError error={eligibilityQuery.error} title="Eligibility check failed" onRetry={() => void eligibilityQuery.refetch()} />}
                        {eligibilityQuery.data && (
                          <div className="wa-eligibility-table-wrap">
                            <table className="wa-eligibility-table">
                              <thead>
                                <tr><th scope="col">Capability</th><th scope="col">Access</th><th scope="col">Reason</th></tr>
                              </thead>
                              <tbody>
                                {eligibilityQuery.data.entries.map((entry, index) => (
                                  <tr key={`${entry.country_code}-${entry.capability}-${index}`}>
                                    <td>{humanize(entry.capability)}</td>
                                    <td><StatusPill value={entry.allowed ? 'allowed' : 'blocked'} /></td>
                                    <td>{entry.reason || 'No restriction reported'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {!eligibilityQuery.data.entries.length && <p className="wa-empty-note">No eligibility results are available for this sender yet.</p>}
                          </div>
                        )}
                      </section>

                      {canManage && (
                        <section className="wa-permission" aria-labelledby={`${detailsId}-permission`}>
                          <div className="wa-detail-heading">
                            <div>
                              <h3 id={`${detailsId}-permission`}>Request calling permission</h3>
                              <p>Submit a customer number and optional provider details.</p>
                            </div>
                          </div>
                          {permissionMutation.error && <p className="portal-voice-form-error" role="alert">{String(permissionMutation.error.message)}</p>}
                          {permissionMutation.isSuccess && <p className="portal-voice-hint" role="status">Permission request submitted.</p>}
                          <div className="wa-permission-form">
                            <label>
                              <span>Customer phone</span>
                              <input type="tel" value={permPhone} onChange={(event) => setPermPhone(event.target.value)} placeholder="+234 800 000 0000" autoComplete="tel" />
                            </label>
                            <label>
                              <span>Template ID <small>Optional</small></span>
                              <input type="text" value={permTemplate} onChange={(event) => setPermTemplate(event.target.value)} />
                            </label>
                            <label className="wa-permission-reason">
                              <span>Reason <small>Optional</small></span>
                              <input type="text" value={permReason} onChange={(event) => setPermReason(event.target.value)} />
                            </label>
                            <div className="wa-permission-actions">
                              <button
                                className="portal-primary-button"
                                type="button"
                                onClick={() => permissionMutation.mutate()}
                                disabled={!permPhone.trim() || permissionMutation.isPending}
                              >
                                {permissionMutation.isPending ? 'Requesting…' : 'Submit request'}
                              </button>
                            </div>
                          </div>
                        </section>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <PortalEmpty
          title="No WhatsApp senders"
          description="Register a WhatsApp Business sender to enable voice calling over WhatsApp."
        />
      )}
    </div>
  )
}
