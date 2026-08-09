import { ArrowsLeftRight, Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { VoiceCollection, VoiceHandoffDestination } from '../../api/voice-types'
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

const DESTINATION_TYPES = ['queue', 'direct', 'external'] as const

export function VoiceHandoffsPage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [destinationType, setDestinationType] = useState<string>(DESTINATION_TYPES[0])
  const [routingSkills, setRoutingSkills] = useState('')
  const [locale, setLocale] = useState('')
  const [capacity, setCapacity] = useState(0)
  const [externalEndpoint, setExternalEndpoint] = useState('')

  const query = useVoiceQuery<VoiceCollection<VoiceHandoffDestination>>(
    ['voice-handoff-destinations'],
    '/voice/handoff-destinations?page_size=100',
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceHandoffDestination>(
        '/voice/handoff-destinations',
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({
            name,
            destination_type: destinationType,
            routing_skills: routingSkills ? routingSkills.split(',').map((s) => s.trim()).filter(Boolean) : [],
            locale: locale || null,
            capacity,
            external_endpoint: externalEndpoint || null,
          }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-handoff-destinations'] })
      setShowCreate(false)
      setName('')
      setDestinationType(DESTINATION_TYPES[0])
      setRoutingSkills('')
      setLocale('')
      setCapacity(0)
      setExternalEndpoint('')
    },
  })

  if (query.isLoading) return <PortalLoading label="Loading handoff destinations" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const destinations = query.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice escalation"
        title="Handoff Destinations"
        description="Manage human agent queues and endpoints for voice call handoffs."
        action={
          hasScope('voice.handoff.manage') ? (
            <button className="portal-primary-button" type="button" onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" /> New destination
            </button>
          ) : undefined
        }
      />

      {showCreate && (
        <div className="portal-voice-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="portal-voice-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create handoff destination</h2>
            {createMutation.error && <p className="portal-voice-form-error">{String(createMutation.error.message)}</p>}
            <div className="portal-voice-form">
              <label>
                <small>Name</small>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Support Queue" />
              </label>
              <label>
                <small>Type</small>
                <select value={destinationType} onChange={(e) => setDestinationType(e.target.value)}>
                  {DESTINATION_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
                </select>
              </label>
              <label>
                <small>Routing skills (comma-separated)</small>
                <input type="text" value={routingSkills} onChange={(e) => setRoutingSkills(e.target.value)} placeholder="billing, returns" />
              </label>
              <label>
                <small>Locale</small>
                <input type="text" value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en-US" />
              </label>
              <label>
                <small>Capacity</small>
                <input type="number" min={0} max={10000} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
              </label>
              {destinationType === 'external' && (
                <label>
                  <small>External endpoint</small>
                  <input type="text" value={externalEndpoint} onChange={(e) => setExternalEndpoint(e.target.value)} placeholder="https://..." />
                </label>
              )}
              <div className="portal-voice-form-actions">
                <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button
                  className="portal-primary-button"
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={!name || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {destinations.length ? (
        <div className="portal-voice-agent-grid">
          {destinations.map((dest) => (
            <Link to={`/portal/voice/handoffs/${dest.id}`} key={dest.id} className="portal-voice-card">
              <div className="portal-voice-card-icon">
                <ArrowsLeftRight aria-hidden="true" weight="duotone" />
              </div>
              <h3>{dest.name}</h3>
              <div className="portal-voice-card-meta">
                <StatusPill value={dest.destination_type} />
                <StatusPill value={dest.status} />
              </div>
              <div className="portal-voice-card-meta">
                {dest.locale && <span className="portal-voice-card-badge">{dest.locale}</span>}
                <span className="portal-voice-card-badge">Capacity: {dest.capacity}</span>
              </div>
              {dest.routing_skills.length > 0 && (
                <div className="portal-voice-card-meta">
                  {dest.routing_skills.map((skill) => (
                    <span key={skill} className="portal-voice-card-badge">{skill}</span>
                  ))}
                </div>
              )}
              <time className="portal-voice-muted">{formatPortalDate(dest.updated_at)}</time>
            </Link>
          ))}
        </div>
      ) : (
        <PortalEmpty
          title="No handoff destinations"
          description="Create a destination to enable human handoffs from your voice agents."
        />
      )}
    </div>
  )
}
