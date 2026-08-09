import { ArrowRight, ArrowsLeftRight, Ear, MicrophoneStage, Phone, Star, Stop, UserSwitch } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { portalFetch, createIdempotencyKey, jsonBody } from '../../api/client'
import type { VoiceAgentCollection } from '../../api/types'
import type {
  VoiceBrowserSessionResponse,
  VoiceCollection,
  VoiceSessionEvent,
  VoiceSupervisorSession,
  VoiceTranscriptResponse,
} from '../../api/voice-types'
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
import { portalQueryClient } from '../query'

export function VoicePlaygroundPage() {
  const { context, hasScope } = usePortalAuth()
  const organizationId = context?.organization_id

  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [session, setSession] = useState<VoiceBrowserSessionResponse | null>(null)
  const [events, setEvents] = useState<VoiceSessionEvent[]>([])
  const [transcript, setTranscript] = useState<VoiceTranscriptResponse | null>(null)
  const [feedbackRating, setFeedbackRating] = useState(0)
  const [feedbackTags, setFeedbackTags] = useState<string[]>([])
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const agentsQuery = useVoiceQuery<VoiceAgentCollection>(
    ['voice-agents-playground'],
    '/voice/agents?page_size=100&status=published',
  )

  const agents = agentsQuery.data?.items ?? []
  const isSessionActive = session?.session.status === 'active' || session?.session.status === 'initializing'

  const pollSession = useCallback(async () => {
    if (!session || !organizationId) return

    try {
      if (hasScope('voice.sessions.read')) {
        const { data: eventsData } = await portalFetch<VoiceCollection<VoiceSessionEvent>>(
          `/voice/sessions/${session.session.id}/events?page_size=100`,
          { organizationId },
        )
        setEvents(eventsData.items)
      }

      if (hasScope('voice.sessions.transcript.read')) {
        const { data: transcriptData } = await portalFetch<VoiceTranscriptResponse>(
          `/voice/sessions/${session.session.id}/transcript`,
          { organizationId },
        )
        setTranscript(transcriptData)
      }
    } catch {
      // polling errors are non-fatal
    }
  }, [session, organizationId, hasScope])

  useEffect(() => {
    if (isSessionActive) {
      pollRef.current = setInterval(() => void pollSession(), 3000)
      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isSessionActive, pollSession])

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !selectedAgentId) throw new Error('Select an agent first.')
      const { data } = await portalFetch<VoiceBrowserSessionResponse>(
        `/voice/agents/${selectedAgentId}/browser-sessions`,
        {
          organizationId,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ session_type: 'test' }),
        },
      )
      return data
    },
    onSuccess: (data) => {
      setSession(data)
      setEvents([])
      setTranscript(null)
      setFeedbackSubmitted(false)
      setFeedbackRating(0)
      setFeedbackTags([])
      setFeedbackComment('')
    },
  })

  const endMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !session) return
      const { data } = await portalFetch<{ session: VoiceBrowserSessionResponse['session'] }>(
        `/voice/sessions/${session.session.id}/end`,
        {
          organizationId,
          method: 'POST',
          ...jsonBody({ reason: 'user_ended' }),
        },
      )
      return data
    },
    onSuccess: () => {
      if (session) {
        setSession({
          ...session,
          session: { ...session.session, status: 'ended' },
        })
      }
      void pollSession()
    },
  })

  const [supervisorMode, setSupervisorMode] = useState<string | null>(null)
  const [supervisorStatus, setSupervisorStatus] = useState<string | null>(null)
  const [handoffTrigger, setHandoffTrigger] = useState('customer_requested')

  const superviseMutation = useMutation({
    mutationFn: async (mode: 'listen' | 'whisper') => {
      if (!organizationId || !session) throw new Error('No active session.')
      const { data } = await portalFetch<VoiceSupervisorSession>(
        `/voice/sessions/${session.session.id}/supervise`,
        {
          organizationId,
          method: 'POST',
          ...jsonBody({ mode }),
        },
      )
      return data
    },
    onSuccess: (data) => {
      setSupervisorMode(data.mode)
      setSupervisorStatus(data.status)
    },
  })

  const takeOverMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !session) throw new Error('No active session.')
      const { data } = await portalFetch<VoiceSupervisorSession>(
        `/voice/sessions/${session.session.id}/take-over`,
        {
          organizationId,
          method: 'POST',
          ...jsonBody({}),
        },
      )
      return data
    },
    onSuccess: (data) => {
      setSupervisorMode('takeover')
      setSupervisorStatus(data.status)
    },
  })

  const returnControlMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !session) throw new Error('No active session.')
      const { data } = await portalFetch<VoiceSupervisorSession>(
        `/voice/sessions/${session.session.id}/return-control`,
        {
          organizationId,
          method: 'POST',
          ...jsonBody({}),
        },
      )
      return data
    },
    onSuccess: () => {
      setSupervisorMode(null)
      setSupervisorStatus(null)
    },
  })

  const handoffMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !session) throw new Error('No active session.')
      await portalFetch(
        `/voice/sessions/${session.session.id}/handoff`,
        {
          organizationId,
          method: 'POST',
          ...jsonBody({ trigger_type: handoffTrigger }),
        },
      )
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId || !session) return
      await portalFetch(
        `/voice/sessions/${session.session.id}/feedback`,
        {
          organizationId,
          method: 'POST',
          ...jsonBody({
            rating: feedbackRating || null,
            tags: feedbackTags.length ? feedbackTags : null,
            comment: feedbackComment || null,
          }),
        },
      )
    },
    onSuccess: () => {
      setFeedbackSubmitted(true)
    },
  })

  if (agentsQuery.isLoading) return <PortalLoading label="Loading voice agents" />
  if (agentsQuery.error) return <PortalError error={agentsQuery.error} onRetry={() => void agentsQuery.refetch()} />

  const feedbackTagOptions = ['accurate', 'natural', 'fast', 'helpful', 'confusing', 'slow', 'incorrect', 'robotic']

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice platform"
        title="Playground"
        description="Test your published voice agents in a browser session."
      />

      <div className="portal-voice-playground">
        <section className="portal-voice-playground-controls">
          <div className="portal-voice-detail-panel">
            <h3>Agent</h3>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              disabled={isSessionActive}
            >
              <option value="">Select an agent…</option>
              {agents.map((agent) => (
                <option value={agent.id} key={agent.id}>{agent.name}</option>
              ))}
            </select>

            {!session && (
              <button
                className="portal-primary-button"
                type="button"
                onClick={() => startMutation.mutate()}
                disabled={!selectedAgentId || startMutation.isPending}
              >
                <MicrophoneStage aria-hidden="true" weight="duotone" />
                {startMutation.isPending ? 'Starting…' : 'Start Session'}
              </button>
            )}

            {isSessionActive && (
              <button
                className="portal-primary-button portal-voice-stop-button"
                type="button"
                onClick={() => endMutation.mutate()}
                disabled={endMutation.isPending}
              >
                <Stop aria-hidden="true" weight="duotone" />
                {endMutation.isPending ? 'Ending…' : 'End Session'}
              </button>
            )}

            {startMutation.error && (
              <p className="portal-voice-mutation-error">{String(startMutation.error.message)}</p>
            )}
          </div>

          {session && (
            <div className="portal-voice-detail-panel">
              <h3>Session</h3>
              <dl className="portal-voice-info-grid">
                <dt>Status</dt>
                <dd><span className={`portal-voice-session-status ${isSessionActive ? 'is-active' : ''}`} /> {humanize(session.session.status)}</dd>
                <dt>Provider</dt>
                <dd>{session.connection.provider}</dd>
                <dt>Room</dt>
                <dd className="portal-voice-mono">{session.connection.room_name}</dd>
                <dt>Participant</dt>
                <dd className="portal-voice-mono">{session.connection.participant_identity}</dd>
                <dt>Started</dt>
                <dd>{session.session.started_at ? formatPortalDate(session.session.started_at, true) : '—'}</dd>
                {session.session.end_reason && (
                  <><dt>End reason</dt><dd>{humanize(session.session.end_reason)}</dd></>
                )}
              </dl>
            </div>
          )}

          {session && isSessionActive && hasScope('voice.sessions.supervise') && (
            <div className="portal-voice-detail-panel portal-voice-supervisor-panel">
              <h3>Supervisor</h3>
              {(superviseMutation.error || takeOverMutation.error || returnControlMutation.error || handoffMutation.error) && (
                <p className="portal-voice-mutation-error">
                  {String((superviseMutation.error ?? takeOverMutation.error ?? returnControlMutation.error ?? handoffMutation.error)?.message)}
                </p>
              )}
              {!supervisorMode && (
                <div className="portal-voice-action-bar">
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => superviseMutation.mutate('listen')}
                    disabled={superviseMutation.isPending}
                  >
                    <Ear aria-hidden="true" weight="duotone" /> Listen
                  </button>
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => superviseMutation.mutate('whisper')}
                    disabled={superviseMutation.isPending}
                  >
                    <MicrophoneStage aria-hidden="true" weight="duotone" /> Whisper
                  </button>
                </div>
              )}
              {supervisorMode && supervisorMode !== 'takeover' && (
                <div className="portal-voice-action-bar">
                  <span className="portal-voice-card-badge">{humanize(supervisorMode)}</span>
                  <button
                    className="portal-primary-button"
                    type="button"
                    onClick={() => takeOverMutation.mutate()}
                    disabled={takeOverMutation.isPending}
                  >
                    <UserSwitch aria-hidden="true" weight="duotone" /> Take Over
                  </button>
                </div>
              )}
              {supervisorMode === 'takeover' && (
                <div className="portal-voice-action-bar">
                  <span className="portal-voice-card-badge">Controlling session</span>
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => returnControlMutation.mutate()}
                    disabled={returnControlMutation.isPending}
                  >
                    Return Control
                  </button>
                </div>
              )}
              {hasScope('voice.sessions.handoff') && (
                <div className="portal-voice-action-bar">
                  <select value={handoffTrigger} onChange={(e) => setHandoffTrigger(e.target.value)}>
                    <option value="customer_requested">Customer requested</option>
                    <option value="low_confidence">Low confidence</option>
                    <option value="regulated_topic">Regulated topic</option>
                    <option value="emergency_topic">Emergency</option>
                  </select>
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => handoffMutation.mutate()}
                    disabled={handoffMutation.isPending}
                  >
                    <ArrowsLeftRight aria-hidden="true" /> Handoff
                  </button>
                </div>
              )}
            </div>
          )}

          {session && !isSessionActive && !feedbackSubmitted && hasScope('voice.sessions.feedback') && (
            <div className="portal-voice-detail-panel">
              <h3>Feedback</h3>
              <div className="portal-voice-feedback">
                <div className="portal-voice-star-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={feedbackRating >= n ? 'is-filled' : ''}
                      onClick={() => setFeedbackRating(n)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    >
                      <Star weight={feedbackRating >= n ? 'fill' : 'regular'} />
                    </button>
                  ))}
                </div>
                <div className="portal-voice-tag-row">
                  {feedbackTagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`portal-voice-tag ${feedbackTags.includes(tag) ? 'is-selected' : ''}`}
                      onClick={() =>
                        setFeedbackTags((prev) =>
                          prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                        )
                      }
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Additional comments…"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  rows={3}
                />
                <button
                  className="portal-primary-button"
                  type="button"
                  onClick={() => feedbackMutation.mutate()}
                  disabled={feedbackMutation.isPending}
                >
                  {feedbackMutation.isPending ? 'Submitting…' : 'Submit Feedback'}
                </button>
                {feedbackMutation.error && (
                  <p className="portal-voice-mutation-error">{String(feedbackMutation.error.message)}</p>
                )}
              </div>
            </div>
          )}

          {feedbackSubmitted && (
            <div className="portal-voice-detail-panel">
              <p className="portal-voice-feedback-thanks">Feedback submitted. Thank you.</p>
            </div>
          )}
        </section>

        <section className="portal-voice-playground-feed">
          {transcript && transcript.turns.length > 0 && (
            <div className="portal-voice-detail-panel">
              <h3>Transcript</h3>
              <div className="portal-voice-transcript">
                {transcript.turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={`portal-voice-turn portal-voice-segment-${turn.speaker}`}
                  >
                    <span className="portal-voice-turn-speaker">{humanize(turn.speaker)}</span>
                    <p>{turn.transcript}</p>
                    <time>{formatPortalDate(turn.started_at, true)}</time>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="portal-voice-detail-panel">
              <h3>Events</h3>
              <ul className="portal-voice-event-list">
                {events.map((event) => (
                  <li key={event.id}>
                    <span className="portal-voice-event-type">{humanize(event.event_type)}</span>
                    <span className="portal-voice-event-actor">{humanize(event.actor_type)}</span>
                    <time>{formatPortalDate(event.created_at, true)}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!session && (
            <div className="portal-voice-detail-panel">
              <PortalEmpty
                title="No active session"
                description="Select a published agent and start a session to begin testing."
              />
            </div>
          )}

          {session && !transcript?.turns.length && !events.length && isSessionActive && (
            <div className="portal-voice-detail-panel">
              <PortalLoading label="Waiting for session activity…" />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
