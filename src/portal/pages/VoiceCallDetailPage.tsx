import { ArrowLeft, Play, Record } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { portalFetch, createIdempotencyKey, jsonBody } from '../../api/client'
import type {
  VoiceCallRecord,
  VoiceCallTranscript,
  VoiceRetrievalTrace,
  VoiceCallToolExecution,
  VoiceCallActionItem,
  VoiceCallEvaluation,
  VoiceHandoffAttempt,
  VoiceRecordingAccess,
  VoiceCollection,
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

export function VoiceCallDetailPage() {
  const { callId } = useParams<{ callId: string }>()
  const { context, hasScope } = usePortalAuth()

  const callQuery = useVoiceQuery<VoiceCallRecord>(
    ['voice-call', callId],
    callId ? `/voice/calls/${callId}` : null,
  )

  const transcriptQuery = useVoiceQuery<VoiceCallTranscript>(
    ['voice-call-transcript', callId],
    callId ? `/voice/calls/${callId}/transcript?page_size=200` : null,
  )

  const retrievalsQuery = useVoiceQuery<VoiceCollection<VoiceRetrievalTrace>>(
    ['voice-call-retrievals', callId],
    callId ? `/voice/calls/${callId}/retrievals?page_size=100` : null,
  )

  const toolExecsQuery = useVoiceQuery<VoiceCollection<VoiceCallToolExecution>>(
    ['voice-call-tool-executions', callId],
    callId ? `/voice/calls/${callId}/tool-executions?page_size=100` : null,
  )

  const actionItemsQuery = useVoiceQuery<VoiceCollection<VoiceCallActionItem>>(
    ['voice-call-action-items', callId],
    callId ? `/voice/calls/${callId}/action-items?page_size=100` : null,
  )

  const evalsQuery = useVoiceQuery<VoiceCollection<VoiceCallEvaluation>>(
    ['voice-call-evaluations', callId],
    callId ? `/voice/calls/${callId}/evaluations?page_size=50` : null,
  )

  const callData = callQuery.data
  const handoffQuery = useVoiceQuery<VoiceHandoffAttempt>(
    ['voice-call-handoff', callData?.session_id],
    callData?.session_id ? `/voice/sessions/${callData.session_id}/handoff` : null,
    { enabled: Boolean(callData?.session_id) },
  )

  const completeItemMutation = useMutation({
    mutationFn: async (item: VoiceCallActionItem) => {
      const { data } = await portalFetch<VoiceCallActionItem>(
        `/voice/calls/${callId}/action-items/${item.id}`,
        {
          organizationId: context!.organization_id,
          method: 'PATCH',
          ifMatch: `W/"${item.version}"`,
          ...jsonBody({ status: 'completed' }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({
        queryKey: ['portal', context!.organization_id, 'voice-call-action-items', callId],
      })
    },
  })

  const recordingMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceRecordingAccess>(
        `/voice/calls/${callId}/recording-access`,
        {
          organizationId: context!.organization_id,
          method: 'POST',
          ...jsonBody({ purpose: 'review' }),
        },
      )
      return data
    },
    onSuccess: (data) => {
      window.open(data.download_url, '_blank', 'noopener')
    },
  })

  const reprocessMutation = useMutation({
    mutationFn: async () => {
      await portalFetch<unknown>(
        `/voice/calls/${callId}/reprocess`,
        {
          organizationId: context!.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({}),
        },
      )
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({
        queryKey: ['portal', context!.organization_id, 'voice-call', callId],
      })
    },
  })

  if (!callId) return <PortalEmpty title="No call selected" description="Select a call to view its details." />
  if (callQuery.isLoading) return <PortalLoading label="Loading call" />
  if (callQuery.error) return <PortalError error={callQuery.error} onRetry={() => void callQuery.refetch()} />

  const call = callQuery.data!
  const segments = transcriptQuery.data?.segments ?? []
  const retrievals = retrievalsQuery.data?.items ?? []
  const toolExecs = toolExecsQuery.data?.items ?? []
  const actionItems = actionItemsQuery.data?.items ?? []
  const evals = evalsQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <Link to="/portal/voice/analytics" className="portal-voice-back">
        <ArrowLeft size={16} /> Analytics
      </Link>

      <PortalPageHeader
        eyebrow="Voice call"
        title={call.summary || `Call ${call.id.slice(0, 12)}…`}
        description={
          <span className="portal-voice-detail-meta">
            <StatusPill value={call.direction} />
            <StatusPill value={call.status} />
            <span>{call.duration_seconds}s</span>
            <span>{call.disposition ? humanize(call.disposition) : '—'}</span>
          </span>
        }
      />

      <div className="portal-voice-call-header">
        <div className="portal-voice-detail-grid">
          <div>
            <small>Started</small>
            <p>{formatPortalDate(call.started_at, true)}</p>
          </div>
          <div>
            <small>Ended</small>
            <p>{formatPortalDate(call.ended_at, true)}</p>
          </div>
          <div>
            <small>Primary intent</small>
            <p>{call.primary_intent ? humanize(call.primary_intent) : '—'}</p>
          </div>
          <div>
            <small>Resolution</small>
            <p>{call.resolution_status ? <StatusPill value={call.resolution_status} /> : '—'}</p>
          </div>
          <div>
            <small>Language</small>
            <p>{call.language}</p>
          </div>
          <div>
            <small>Processing</small>
            <p><StatusPill value={call.processing_status} /></p>
          </div>
        </div>

        <div className="portal-voice-call-actions">
          {hasScope('voice.call.recording.read') && (
            <button
              type="button"
              className="portal-secondary-button"
              onClick={() => recordingMutation.mutate()}
              disabled={recordingMutation.isPending}
            >
              <Record size={16} /> {recordingMutation.isPending ? 'Loading…' : 'Access Recording'}
            </button>
          )}
          {hasScope('voice.call.start') && (
            <button
              type="button"
              className="portal-secondary-button"
              onClick={() => reprocessMutation.mutate()}
              disabled={reprocessMutation.isPending}
            >
              <Play size={16} /> {reprocessMutation.isPending ? 'Reprocessing…' : 'Reprocess'}
            </button>
          )}
        </div>
        {recordingMutation.error && <p className="portal-voice-form-error">{String(recordingMutation.error)}</p>}
        {reprocessMutation.error && <p className="portal-voice-form-error">{String(reprocessMutation.error)}</p>}
      </div>

      <div className="portal-voice-call-detail">
        {/* Transcript — main column */}
        <section className="portal-voice-transcript">
          <h3>Transcript</h3>
          {transcriptQuery.isLoading && <PortalLoading label="Loading transcript" />}
          {transcriptQuery.error && <PortalError error={transcriptQuery.error} onRetry={() => void transcriptQuery.refetch()} />}
          {!transcriptQuery.isLoading && !transcriptQuery.error && (
            segments.length > 0 ? (
              <ol className="portal-voice-segment-list">
                {segments.map((seg) => (
                  <li key={seg.id} className={`portal-voice-segment portal-voice-segment-${seg.speaker}`}>
                    <div className="portal-voice-segment-header">
                      <strong>{humanize(seg.speaker)}</strong>
                      <time>{formatPortalDate(seg.started_at, true)}</time>
                      {seg.redacted && <span className="portal-voice-redacted-badge">Redacted</span>}
                    </div>
                    <p>{seg.text}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <PortalEmpty title="Transcript not available" description="The transcript may still be processing." />
            )
          )}
        </section>

        {/* Side panels */}
        <div className="portal-voice-call-side">
          {/* Retrievals */}
          <section className="portal-voice-detail-panel">
            <h3>Knowledge Retrievals <span className="portal-voice-count">{retrievals.length}</span></h3>
            {retrievalsQuery.isLoading && <PortalLoading label="Loading" />}
            {retrievals.length > 0 ? (
              <ul className="portal-voice-item-list">
                {retrievals.map((r) => (
                  <li key={r.id}>
                    <div className="portal-voice-detail-grid">
                      <div>
                        <small>Reference</small>
                        <p><code>{r.retrieval_reference.slice(0, 16)}…</code></p>
                      </div>
                      <div>
                        <small>Confidence</small>
                        <p>{r.top_confidence != null ? `${(r.top_confidence * 100).toFixed(0)}%` : '—'}</p>
                      </div>
                      <div>
                        <small>Latency</small>
                        <p>{r.latency_ms != null ? `${r.latency_ms}ms` : '—'}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !retrievalsQuery.isLoading && <p className="portal-voice-hint">No retrievals recorded.</p>
            )}
          </section>

          {/* Tool Executions */}
          <section className="portal-voice-detail-panel">
            <h3>Tool Executions <span className="portal-voice-count">{toolExecs.length}</span></h3>
            {toolExecsQuery.isLoading && <PortalLoading label="Loading" />}
            {toolExecs.length > 0 ? (
              <ul className="portal-voice-item-list">
                {toolExecs.map((te) => (
                  <li key={te.id}>
                    <div className="portal-voice-detail-grid">
                      <div>
                        <small>Tool</small>
                        <p><code>{te.tool_id ? te.tool_id.slice(0, 12) + '…' : '—'}</code></p>
                      </div>
                      <div>
                        <small>Outcome</small>
                        <p><StatusPill value={te.outcome} /></p>
                      </div>
                      <div>
                        <small>Latency</small>
                        <p>{te.latency_ms != null ? `${te.latency_ms}ms` : '—'}</p>
                      </div>
                      {te.safe_error_code && (
                        <div>
                          <small>Error</small>
                          <p><code>{te.safe_error_code}</code></p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !toolExecsQuery.isLoading && <p className="portal-voice-hint">No tool executions recorded.</p>
            )}
          </section>

          {/* Action Items */}
          <section className="portal-voice-detail-panel">
            <h3>Action Items <span className="portal-voice-count">{actionItems.length}</span></h3>
            {actionItemsQuery.isLoading && <PortalLoading label="Loading" />}
            {actionItems.length > 0 ? (
              <ul className="portal-voice-item-list">
                {actionItems.map((item) => (
                  <li key={item.id}>
                    <div className="portal-voice-action-item">
                      <div>
                        <strong>{item.title}</strong>
                        {item.description && <p>{item.description.length > 120 ? item.description.slice(0, 120) + '…' : item.description}</p>}
                        <span className="portal-voice-detail-meta">
                          <StatusPill value={item.status} />
                          <span>{humanize(item.owner_type)}</span>
                          {item.due_at && <span>Due {formatPortalDate(item.due_at)}</span>}
                        </span>
                      </div>
                      {hasScope('voice.call.start') && item.status !== 'completed' && (
                        <button
                          type="button"
                          className="portal-secondary-button"
                          onClick={() => completeItemMutation.mutate(item)}
                          disabled={completeItemMutation.isPending}
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !actionItemsQuery.isLoading && <p className="portal-voice-hint">No action items recorded.</p>
            )}
            {completeItemMutation.error && <p className="portal-voice-form-error">{String(completeItemMutation.error)}</p>}
          </section>

          {/* Evaluations */}
          <section className="portal-voice-detail-panel">
            <h3>Evaluations <span className="portal-voice-count">{evals.length}</span></h3>
            {evalsQuery.isLoading && <PortalLoading label="Loading" />}
            {evals.length > 0 ? (
              <ul className="portal-voice-item-list">
                {evals.map((ev) => (
                  <li key={ev.id}>
                    <div className="portal-voice-detail-grid">
                      <div>
                        <small>Suite</small>
                        <p>{ev.suite_key}</p>
                      </div>
                      <div>
                        <small>Status</small>
                        <p><StatusPill value={ev.status} /></p>
                      </div>
                      <div>
                        <small>Score</small>
                        <p>{ev.score_percent}%</p>
                      </div>
                      <div>
                        <small>Date</small>
                        <p>{formatPortalDate(ev.created_at)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !evalsQuery.isLoading && <p className="portal-voice-hint">No evaluations recorded.</p>
            )}
          </section>

          {/* Handoff */}
          {handoffQuery.data && (
            <section className="portal-voice-detail-panel">
              <h3>Handoff</h3>
              <div className="portal-voice-detail-grid">
                <div>
                  <small>Trigger</small>
                  <p>{humanize(handoffQuery.data.trigger_type)}</p>
                </div>
                <div>
                  <small>Status</small>
                  <p><StatusPill value={handoffQuery.data.status} /></p>
                </div>
                <div>
                  <small>Transfer</small>
                  <p>{handoffQuery.data.warm_transfer ? 'Warm' : 'Cold'}</p>
                </div>
                <div>
                  <small>Wait</small>
                  <p>{handoffQuery.data.wait_seconds}s</p>
                </div>
                {handoffQuery.data.failure_reason && (
                  <div>
                    <small>Failure</small>
                    <p>{handoffQuery.data.failure_reason}</p>
                  </div>
                )}
                {handoffQuery.data.connected_at && (
                  <div>
                    <small>Connected</small>
                    <p>{formatPortalDate(handoffQuery.data.connected_at, true)}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
