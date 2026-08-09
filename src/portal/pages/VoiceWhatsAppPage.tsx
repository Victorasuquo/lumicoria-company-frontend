import { CheckCircle, Plus, WhatsappLogo } from '@phosphor-icons/react'
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
        <section className="portal-panel">
          <div className="portal-voice-phone-table">
            <div className="portal-voice-phone-table-header">
              <span>Phone</span>
              <span>Display Name</span>
              <span>Country</span>
              <span>Status</span>
              <span>Verified</span>
              <span>Updated</span>
            </div>
            {senders.map((sender) => (
              <div key={sender.id}>
                <div
                  className={`portal-voice-phone-table-row ${expandedSenderId === sender.id ? 'is-expanded' : ''}`}
                  onClick={() => setExpandedSenderId(expandedSenderId === sender.id ? null : sender.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="portal-voice-phone-number">
                    <WhatsappLogo aria-hidden="true" weight="duotone" />
                    {sender.phone_number}
                  </span>
                  <span>{sender.display_name}</span>
                  <span>{sender.country_code}</span>
                  <span><StatusPill value={sender.status} /></span>
                  <span>
                    {sender.verified ? (
                      <span className="portal-voice-verified"><CheckCircle aria-hidden="true" weight="fill" /> Verified</span>
                    ) : (
                      'Pending'
                    )}
                  </span>
                  <span>{formatPortalDate(sender.updated_at)}</span>
                </div>

                {expandedSenderId === sender.id && (
                  <div className="portal-voice-whatsapp-expanded">
                    <div className="portal-voice-detail-panel">
                      <h3>Eligibility</h3>
                      {eligibilityQuery.isLoading && <PortalLoading label="Checking eligibility" />}
                      {eligibilityQuery.error && <PortalError error={eligibilityQuery.error} title="Eligibility check failed" />}
                      {eligibilityQuery.data && (
                        <div className="portal-voice-eligibility-table">
                          <div className="portal-voice-phone-table-header">
                            <span>Country</span>
                            <span>Capability</span>
                            <span>Allowed</span>
                            <span>Reason</span>
                          </div>
                          {eligibilityQuery.data.entries.map((entry, i) => (
                            <div key={i} className="portal-voice-phone-table-row">
                              <span>{entry.country_code}</span>
                              <span>{humanize(entry.capability)}</span>
                              <span><StatusPill value={entry.allowed ? 'allowed' : 'blocked'} /></span>
                              <span>{entry.reason ?? '—'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="portal-voice-detail-panel">
                        <h3>Request Permission</h3>
                        {permissionMutation.error && <p className="portal-voice-form-error">{String(permissionMutation.error.message)}</p>}
                        {permissionMutation.isSuccess && <p className="portal-voice-hint">Permission request submitted.</p>}
                        <div className="portal-voice-form">
                          <label>
                            <small>Customer phone</small>
                            <input type="text" value={permPhone} onChange={(e) => setPermPhone(e.target.value)} placeholder="+1234567890" />
                          </label>
                          <label>
                            <small>Template ID (optional)</small>
                            <input type="text" value={permTemplate} onChange={(e) => setPermTemplate(e.target.value)} />
                          </label>
                          <label>
                            <small>Reason (optional)</small>
                            <input type="text" value={permReason} onChange={(e) => setPermReason(e.target.value)} />
                          </label>
                          <div className="portal-voice-form-actions">
                            <button
                              className="portal-primary-button"
                              type="button"
                              onClick={() => permissionMutation.mutate()}
                              disabled={!permPhone || permissionMutation.isPending}
                            >
                              {permissionMutation.isPending ? 'Requesting…' : 'Request permission'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
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
