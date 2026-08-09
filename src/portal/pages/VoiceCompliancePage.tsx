import { PencilSimple, ShieldCheck, ShieldWarning } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { portalFetch, jsonBody } from '../../api/client'
import type { VoiceComplianceProfile, VoiceComplianceProfileUpdatePayload } from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { useVoiceQuery } from '../hooks'
import {
  humanize,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'
import { portalQueryClient } from '../query'

export function VoiceCompliancePage() {
  const { context, hasScope } = usePortalAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<VoiceComplianceProfileUpdatePayload>>({})

  const query = useVoiceQuery<VoiceComplianceProfile>(
    ['voice-compliance'],
    '/voice/compliance-profile',
  )

  const updateMutation = useMutation({
    mutationFn: async (payload: VoiceComplianceProfileUpdatePayload) => {
      if (!context || !query.data) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceComplianceProfile>(
        '/voice/compliance-profile',
        {
          organizationId: context.organization_id,
          method: 'PATCH',
          ifMatch: `W/"${query.data.version}"`,
          ...jsonBody(payload),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-compliance'] })
      setEditing(false)
      setDraft({})
    },
  })

  if (query.isLoading) return <PortalLoading label="Loading compliance profile" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const profile = query.data
  if (!profile) return <PortalLoading label="Loading compliance profile" />

  const canEdit = hasScope('voice.compliance.manage')

  function startEditing() {
    if (!profile) return
    setDraft({
      data_region: profile.data_region as VoiceComplianceProfileUpdatePayload['data_region'],
      default_language: profile.default_language,
      ai_disclosure_required: profile.ai_disclosure_required,
      recording_policy: profile.recording_policy as VoiceComplianceProfileUpdatePayload['recording_policy'],
      transcript_retention_days: profile.transcript_retention_days,
      recording_retention_days: profile.recording_retention_days,
      allowed_call_purposes: profile.allowed_call_purposes,
    })
    setEditing(true)
  }

  function handleSave() {
    updateMutation.mutate(draft as VoiceComplianceProfileUpdatePayload)
  }

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice governance"
        title="Compliance Profile"
        description="Data handling, recording, and disclosure policies for voice operations."
        action={
          canEdit && !editing ? (
            <button className="portal-secondary-button" type="button" onClick={startEditing}>
              <PencilSimple aria-hidden="true" /> Edit
            </button>
          ) : undefined
        }
      />

      {updateMutation.error && <PortalError error={updateMutation.error} title="Failed to update compliance profile" />}

      <section className="portal-panel">
        <header className="portal-voice-compliance-header">
          <ShieldCheck aria-hidden="true" weight="duotone" />
          <div>
            <span>Policy source</span>
            <h2>{humanize(profile.source)}</h2>
          </div>
          <StatusPill value={profile.status} />
        </header>

        <div className="portal-voice-compliance-grid">
          <div>
            <dt>Data Region</dt>
            <dd>
              {editing ? (
                <select
                  value={draft.data_region ?? profile.data_region}
                  onChange={(e) => setDraft({ ...draft, data_region: e.target.value as VoiceComplianceProfileUpdatePayload['data_region'] })}
                >
                  <option value="us">US</option>
                  <option value="eu">EU</option>
                  <option value="uk">UK</option>
                </select>
              ) : (
                (profile.data_region ?? '—').toUpperCase()
              )}
            </dd>
          </div>
          <div>
            <dt>Default Language</dt>
            <dd>
              {editing ? (
                <input
                  type="text"
                  value={draft.default_language ?? profile.default_language ?? ''}
                  onChange={(e) => setDraft({ ...draft, default_language: e.target.value })}
                />
              ) : (
                profile.default_language ?? '—'
              )}
            </dd>
          </div>
          <div>
            <dt>AI Disclosure Required</dt>
            <dd>
              {editing ? (
                <select
                  value={draft.ai_disclosure_required ? 'yes' : 'no'}
                  onChange={(e) => setDraft({ ...draft, ai_disclosure_required: e.target.value === 'yes' })}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              ) : (
                profile.ai_disclosure_required ? 'Yes' : 'No'
              )}
            </dd>
          </div>
          <div>
            <dt>Recording Policy</dt>
            <dd>
              {editing ? (
                <select
                  value={draft.recording_policy ?? profile.recording_policy}
                  onChange={(e) => setDraft({ ...draft, recording_policy: e.target.value as VoiceComplianceProfileUpdatePayload['recording_policy'] })}
                >
                  <option value="disabled">Disabled</option>
                  <option value="explicit_consent">Explicit Consent</option>
                  <option value="preconsented">Preconsented</option>
                </select>
              ) : (
                humanize(profile.recording_policy)
              )}
            </dd>
          </div>
          <div>
            <dt>Transcript Retention</dt>
            <dd>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={draft.transcript_retention_days ?? profile.transcript_retention_days ?? 0}
                  onChange={(e) => setDraft({ ...draft, transcript_retention_days: Number(e.target.value) })}
                />
              ) : (
                `${profile.transcript_retention_days ?? 0} days`
              )}
            </dd>
          </div>
          <div>
            <dt>Recording Retention</dt>
            <dd>
              {editing ? (
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={draft.recording_retention_days ?? profile.recording_retention_days ?? 0}
                  onChange={(e) => setDraft({ ...draft, recording_retention_days: Number(e.target.value) })}
                />
              ) : (
                `${profile.recording_retention_days ?? 0} days`
              )}
            </dd>
          </div>
          <div className="portal-voice-compliance-wide">
            <dt>Allowed Call Purposes</dt>
            <dd>
              {editing ? (
                <input
                  type="text"
                  placeholder="Comma-separated purposes"
                  value={(draft.allowed_call_purposes ?? profile.allowed_call_purposes ?? []).join(', ')}
                  onChange={(e) => setDraft({ ...draft, allowed_call_purposes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              ) : (
                <div className="portal-voice-purpose-pills">
                  {(profile.allowed_call_purposes ?? []).length
                    ? profile.allowed_call_purposes.map((purpose) => (
                        <span key={purpose} className="portal-voice-purpose-pill">{humanize(purpose)}</span>
                      ))
                    : '—'}
                </div>
              )}
            </dd>
          </div>
        </div>

        {editing && (
          <footer className="portal-voice-compliance-actions">
            <div className="portal-voice-stepup-notice-inline">
              <ShieldWarning aria-hidden="true" weight="duotone" />
              <span>Updating the compliance profile requires step-up authentication.</span>
            </div>
            <div>
              <button className="portal-secondary-button" type="button" onClick={() => { setEditing(false); setDraft({}) }}>
                Cancel
              </button>
              <button
                className="portal-primary-button"
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </footer>
        )}
      </section>
    </div>
  )
}
