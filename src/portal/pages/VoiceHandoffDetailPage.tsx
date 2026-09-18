import { ArrowLeft, PencilSimple, Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { VoiceAgentCollection } from '../../api/types'
import type {
  VoiceCollection,
  VoiceHandoffDestination,
  VoiceHandoffPolicy,
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

const TRIGGER_TYPES = [
  'customer_requested',
  'low_confidence',
  'repeated_misunderstanding',
  'identity_verification_failed',
  'policy_exception',
  'tool_failure',
  'regulated_topic',
  'emergency_topic',
] as const

const SELECTION_MODES = ['skill_match', 'round_robin', 'priority', 'specific'] as const

export function VoiceHandoffDetailPage() {
  const { destinationId } = useParams<{ destinationId: string }>()
  const { context, hasScope } = usePortalAuth()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSkills, setEditSkills] = useState('')
  const [editLocale, setEditLocale] = useState('')
  const [editCapacity, setEditCapacity] = useState(0)
  const [editStatus, setEditStatus] = useState('')
  const [editEndpoint, setEditEndpoint] = useState('')

  const [showPolicyCreate, setShowPolicyCreate] = useState(false)
  const [policyAgentId, setPolicyAgentId] = useState('')
  const [policyTrigger, setPolicyTrigger] = useState<string>(TRIGGER_TYPES[0])
  const [policyPriority, setPolicyPriority] = useState(50)
  const [policySelection, setPolicySelection] = useState<string>(SELECTION_MODES[0])
  const [policyFallback, setPolicyFallback] = useState('ticket')
  const [policyWarm, setPolicyWarm] = useState(true)
  const [policyEnabled, setPolicyEnabled] = useState(true)

  const destinationsQuery = useVoiceQuery<VoiceCollection<VoiceHandoffDestination>>(
    ['voice-handoff-destinations'],
    '/voice/handoff-destinations?page_size=100',
  )

  const policiesQuery = useVoiceQuery<VoiceCollection<VoiceHandoffPolicy>>(
    ['voice-handoff-policies'],
    '/voice/handoff-policies?page_size=100',
  )

  const agentsQuery = useVoiceQuery<VoiceAgentCollection>(
    ['voice-agents-for-policy'],
    showPolicyCreate ? '/voice/agents?page_size=100' : null,
  )

  const destination = destinationsQuery.data?.items.find((d) => d.id === destinationId) ?? null
  const policies = (policiesQuery.data?.items ?? []).filter((p) => p.destination_id === destinationId)

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!context || !destination) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceHandoffDestination>(
        `/voice/handoff-destinations/${destinationId}`,
        {
          organizationId: context.organization_id,
          method: 'PATCH',
          ifMatch: `"v${destination.version}"`,
          ...jsonBody({
            name: editName || undefined,
            routing_skills: editSkills ? editSkills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
            locale: editLocale || undefined,
            capacity: editCapacity,
            status: editStatus || undefined,
            external_endpoint: editEndpoint || undefined,
          }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-handoff-destinations'] })
      setEditing(false)
    },
  })

  const createPolicyMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceHandoffPolicy>(
        '/voice/handoff-policies',
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({
            agent_id: policyAgentId,
            trigger_type: policyTrigger,
            priority: policyPriority,
            destination_selection: policySelection,
            destination_id: destinationId,
            fallback_mode: policyFallback,
            warm_transfer: policyWarm,
            enabled: policyEnabled,
          }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-handoff-policies'] })
      setShowPolicyCreate(false)
      setPolicyAgentId('')
      setPolicyTrigger(TRIGGER_TYPES[0])
      setPolicyPriority(50)
      setPolicySelection(SELECTION_MODES[0])
      setPolicyFallback('ticket')
      setPolicyWarm(true)
      setPolicyEnabled(true)
    },
  })

  if (destinationsQuery.isLoading) return <PortalLoading label="Loading destination" />
  if (destinationsQuery.error) return <PortalError error={destinationsQuery.error} onRetry={() => void destinationsQuery.refetch()} />
  if (!destination) return <PortalError error={new Error('Destination not found.')} title="Not found" />

  function startEditing() {
    if (!destination) return
    setEditName(destination.name)
    setEditSkills(destination.routing_skills.join(', '))
    setEditLocale(destination.locale ?? '')
    setEditCapacity(destination.capacity)
    setEditStatus(destination.status)
    setEditEndpoint(destination.external_endpoint ?? '')
    setEditing(true)
  }

  const canManage = hasScope('voice.handoff.manage')

  return (
    <div className="portal-page">
      <Link to="/portal/voice/handoffs" className="portal-voice-back-link">
        <ArrowLeft aria-hidden="true" /> Handoff destinations
      </Link>

      <PortalPageHeader
        eyebrow="Voice escalation"
        title={destination.name}
        description={`${humanize(destination.destination_type)} destination`}
        action={
          canManage && !editing ? (
            <button className="portal-secondary-button" type="button" onClick={startEditing}>
              <PencilSimple aria-hidden="true" /> Edit
            </button>
          ) : undefined
        }
      />

      {updateMutation.error && <PortalError error={updateMutation.error} title="Failed to update" />}

      <section className="portal-voice-detail-panel">
        <h3>Details</h3>
        {editing ? (
          <div className="portal-voice-form">
            <label>
              <small>Name</small>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label>
              <small>Routing skills</small>
              <input type="text" value={editSkills} onChange={(e) => setEditSkills(e.target.value)} placeholder="billing, returns" />
            </label>
            <label>
              <small>Locale</small>
              <input type="text" value={editLocale} onChange={(e) => setEditLocale(e.target.value)} />
            </label>
            <label>
              <small>Capacity</small>
              <input type="number" min={0} max={10000} value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} />
            </label>
            <label>
              <small>Status</small>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            {destination.destination_type === 'external' && (
              <label>
                <small>External endpoint</small>
                <input type="text" value={editEndpoint} onChange={(e) => setEditEndpoint(e.target.value)} />
              </label>
            )}
            <div className="portal-voice-form-actions">
              <button className="portal-secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button>
              <button
                className="portal-primary-button"
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <dl className="portal-voice-info-grid">
            <dt>Type</dt>
            <dd><StatusPill value={destination.destination_type} /></dd>
            <dt>Status</dt>
            <dd><StatusPill value={destination.status} /></dd>
            <dt>Locale</dt>
            <dd>{destination.locale ?? '—'}</dd>
            <dt>Capacity</dt>
            <dd>{destination.capacity}</dd>
            <dt>Routing skills</dt>
            <dd>{destination.routing_skills.length ? destination.routing_skills.join(', ') : '—'}</dd>
            {destination.external_endpoint && (
              <>
                <dt>External endpoint</dt>
                <dd className="portal-voice-mono">{destination.external_endpoint}</dd>
              </>
            )}
            <dt>Updated</dt>
            <dd>{formatPortalDate(destination.updated_at)}</dd>
          </dl>
        )}
      </section>

      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Handoff Policies</h3>
          {canManage && (
            <button className="portal-secondary-button" type="button" onClick={() => setShowPolicyCreate(!showPolicyCreate)}>
              <Plus aria-hidden="true" /> Add policy
            </button>
          )}
        </div>

        {showPolicyCreate && (
          <div className="portal-voice-form-inset">
            {createPolicyMutation.error && <p className="portal-voice-form-error">{String(createPolicyMutation.error.message)}</p>}
            <label>
              <small>Agent</small>
              <select value={policyAgentId} onChange={(e) => setPolicyAgentId(e.target.value)}>
                <option value="">Select agent…</option>
                {(agentsQuery.data?.items ?? []).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label>
              <small>Trigger type</small>
              <select value={policyTrigger} onChange={(e) => setPolicyTrigger(e.target.value)}>
                {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
              </select>
            </label>
            <label>
              <small>Priority (1–100)</small>
              <input type="number" min={1} max={100} value={policyPriority} onChange={(e) => setPolicyPriority(Number(e.target.value))} />
            </label>
            <label>
              <small>Destination selection</small>
              <select value={policySelection} onChange={(e) => setPolicySelection(e.target.value)}>
                {SELECTION_MODES.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}
              </select>
            </label>
            <label>
              <small>Fallback mode</small>
              <select value={policyFallback} onChange={(e) => setPolicyFallback(e.target.value)}>
                <option value="ticket">Ticket</option>
                <option value="callback">Callback</option>
              </select>
            </label>
            <label className="portal-voice-checkbox-label">
              <input type="checkbox" checked={policyWarm} onChange={(e) => setPolicyWarm(e.target.checked)} />
              Warm transfer
            </label>
            <label className="portal-voice-checkbox-label">
              <input type="checkbox" checked={policyEnabled} onChange={(e) => setPolicyEnabled(e.target.checked)} />
              Enabled
            </label>
            <div className="portal-voice-form-actions">
              <button className="portal-secondary-button" type="button" onClick={() => setShowPolicyCreate(false)}>Cancel</button>
              <button
                className="portal-primary-button"
                type="button"
                onClick={() => createPolicyMutation.mutate()}
                disabled={!policyAgentId || createPolicyMutation.isPending}
              >
                {createPolicyMutation.isPending ? 'Creating…' : 'Create policy'}
              </button>
            </div>
          </div>
        )}

        {policiesQuery.isLoading ? (
          <PortalLoading label="Loading policies" />
        ) : policies.length ? (
          <div className="portal-voice-item-list">
            {policies.map((policy) => (
              <div key={policy.id} className="portal-voice-item-list-row">
                <div>
                  <strong>{humanize(policy.trigger_type)}</strong>
                  <span className="portal-voice-muted"> — Priority {policy.priority}</span>
                </div>
                <div className="portal-voice-card-meta">
                  <StatusPill value={policy.enabled ? 'enabled' : 'disabled'} />
                  <StatusPill value={policy.destination_selection} />
                  <span className="portal-voice-card-badge">{policy.warm_transfer ? 'Warm' : 'Cold'}</span>
                  <span className="portal-voice-card-badge">{humanize(policy.fallback_mode)}</span>
                </div>
                <time className="portal-voice-muted">{formatPortalDate(policy.updated_at)}</time>
              </div>
            ))}
          </div>
        ) : (
          <PortalEmpty
            title="No policies"
            description="Add a policy to define when agents should hand off to this destination."
          />
        )}
      </section>
    </div>
  )
}
