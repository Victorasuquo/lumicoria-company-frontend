import { ArrowLeft, Copy, PencilSimple, Pause, Play, ShieldWarning, Warning } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { jsonBody, portalFetch } from '../../api/client'
import type { VoiceWidgetConfig, VoiceWidgetKeyRotation, VoiceWidgetPause } from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { useVoiceQuery } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  humanize,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function VoiceWidgetDetailPage() {
  const { widgetId } = useParams<{ widgetId: string }>()
  const { context, hasScope } = usePortalAuth()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editChannels, setEditChannels] = useState<string[]>([])
  const [editCaptcha, setEditCaptcha] = useState(false)
  const [editContext, setEditContext] = useState(false)
  const [plainKey, setPlainKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)

  const widgetQuery = useVoiceQuery<VoiceWidgetConfig>(
    ['voice-widget', widgetId],
    widgetId ? `/voice/widgets/${widgetId}` : null,
  )

  const widget = widgetQuery.data

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!context || !widget) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceWidgetConfig>(
        `/voice/widgets/${widgetId}`,
        {
          organizationId: context.organization_id,
          method: 'PATCH',
          ifMatch: `W/"${widget.version}"`,
          ...jsonBody({
            display_name: editName,
            channels: editChannels,
            captcha_enabled: editCaptcha,
            customer_context_required: editContext,
          }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-widget', widgetId] })
      setEditing(false)
    },
  })

  const rotateMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceWidgetKeyRotation>(
        `/voice/widgets/${widgetId}/rotate-key`,
        {
          organizationId: context.organization_id,
          method: 'POST',
        },
      )
      return data
    },
    onSuccess: (data) => {
      setPlainKey(data.plain_key)
      setConfirmRotate(false)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-widget', widgetId] })
    },
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceWidgetPause>(
        `/voice/widgets/${widgetId}/pause`,
        {
          organizationId: context.organization_id,
          method: 'POST',
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-widget', widgetId] })
    },
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const { data } = await portalFetch<VoiceWidgetPause>(
        `/voice/widgets/${widgetId}/resume`,
        {
          organizationId: context.organization_id,
          method: 'POST',
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-widget', widgetId] })
    },
  })

  if (widgetQuery.isLoading) return <PortalLoading label="Loading widget" />
  if (widgetQuery.error) return <PortalError error={widgetQuery.error} onRetry={() => void widgetQuery.refetch()} />
  if (!widget) return <PortalError error={new Error('Widget not found.')} title="Not found" />

  function startEditing() {
    if (!widget) return
    setEditName(widget.display_name)
    setEditChannels([...widget.channels])
    setEditCaptcha(widget.captcha_enabled)
    setEditContext(widget.customer_context_required)
    setEditing(true)
  }

  function toggleEditChannel(ch: string) {
    setEditChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  async function copyKey() {
    if (!plainKey) return
    await navigator.clipboard.writeText(plainKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canManage = hasScope('voice.widgets.manage')

  return (
    <div className="portal-page">
      <Link to="/portal/voice/widgets" className="portal-voice-back-link">
        <ArrowLeft aria-hidden="true" /> Widgets
      </Link>

      <PortalPageHeader
        eyebrow="Voice embeds"
        title={widget.display_name}
        description={`Widget for agent ${widget.agent_id}`}
        action={
          canManage && !editing ? (
            <button className="portal-secondary-button" type="button" onClick={startEditing}>
              <PencilSimple aria-hidden="true" /> Edit
            </button>
          ) : undefined
        }
      />

      {(updateMutation.error || rotateMutation.error || pauseMutation.error || resumeMutation.error) && (
        <PortalError
          error={updateMutation.error ?? rotateMutation.error ?? pauseMutation.error ?? resumeMutation.error}
          title="Operation failed"
        />
      )}

      {plainKey && (
        <div className="portal-voice-key-banner">
          <Warning aria-hidden="true" weight="duotone" />
          <div>
            <strong>New API key generated</strong>
            <p>Copy this key now — it will not be shown again. The previous key has been revoked.</p>
            <code className="portal-voice-key-value">{plainKey}</code>
          </div>
          <button className="portal-secondary-button" type="button" onClick={() => void copyKey()}>
            <Copy aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="portal-secondary-button" type="button" onClick={() => setPlainKey(null)}>
            Dismiss
          </button>
        </div>
      )}

      <section className="portal-voice-detail-panel">
        <h3>Configuration</h3>
        {editing ? (
          <div className="portal-voice-form">
            <label>
              <small>Display name</small>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <fieldset>
              <small>Channels</small>
              <label className="portal-voice-checkbox-label">
                <input type="checkbox" checked={editChannels.includes('browser')} onChange={() => toggleEditChannel('browser')} />
                Browser
              </label>
              <label className="portal-voice-checkbox-label">
                <input type="checkbox" checked={editChannels.includes('callback')} onChange={() => toggleEditChannel('callback')} />
                Callback
              </label>
            </fieldset>
            <label className="portal-voice-checkbox-label">
              <input type="checkbox" checked={editCaptcha} onChange={(e) => setEditCaptcha(e.target.checked)} />
              Enable CAPTCHA
            </label>
            <label className="portal-voice-checkbox-label">
              <input type="checkbox" checked={editContext} onChange={(e) => setEditContext(e.target.checked)} />
              Require customer context
            </label>
            <div className="portal-voice-form-actions">
              <button className="portal-secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button>
              <button
                className="portal-primary-button"
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editChannels.length}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <dl className="portal-voice-info-grid">
            <dt>Status</dt>
            <dd><StatusPill value={widget.status} /></dd>
            <dt>Kill switch</dt>
            <dd><StatusPill value={widget.kill_switch} /></dd>
            <dt>Agent</dt>
            <dd className="portal-voice-mono">{widget.agent_id}</dd>
            <dt>Channels</dt>
            <dd>{widget.channels.map((ch) => humanize(ch)).join(', ')}</dd>
            <dt>CAPTCHA</dt>
            <dd>{widget.captcha_enabled ? 'Enabled' : 'Disabled'}</dd>
            <dt>Customer context</dt>
            <dd>{widget.customer_context_required ? 'Required' : 'Optional'}</dd>
            <dt>Key prefix</dt>
            <dd className="portal-voice-mono">{widget.key_prefix ?? '—'}</dd>
            <dt>Updated</dt>
            <dd>{formatPortalDate(widget.updated_at)}</dd>
          </dl>
        )}
      </section>

      <section className="portal-voice-detail-panel">
        <h3>Allowed Origins</h3>
        {widget.origins.length > 0 ? (
          <ul className="portal-voice-origin-list">
            {widget.origins.map((o) => (
              <li key={o.id}>
                <code>{o.origin}</code>
                <StatusPill value={o.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="portal-voice-hint">No origins configured.</p>
        )}
      </section>

      {canManage && (
        <section className="portal-voice-detail-panel">
          <h3>Actions</h3>
          <div className="portal-voice-action-bar">
            {widget.status === 'active' ? (
              <button
                className="portal-secondary-button"
                type="button"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
              >
                <Pause aria-hidden="true" /> {pauseMutation.isPending ? 'Pausing…' : 'Pause widget'}
              </button>
            ) : widget.status === 'paused' ? (
              <button
                className="portal-secondary-button"
                type="button"
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
              >
                <Play aria-hidden="true" /> {resumeMutation.isPending ? 'Resuming…' : 'Resume widget'}
              </button>
            ) : null}

            {confirmRotate ? (
              <div className="portal-voice-stepup-notice-inline">
                <ShieldWarning aria-hidden="true" weight="duotone" />
                <span>Rotating the key revokes the current key immediately.</span>
                <button
                  className="portal-primary-button"
                  type="button"
                  onClick={() => rotateMutation.mutate()}
                  disabled={rotateMutation.isPending}
                >
                  {rotateMutation.isPending ? 'Rotating…' : 'Confirm rotate'}
                </button>
                <button className="portal-secondary-button" type="button" onClick={() => setConfirmRotate(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="portal-secondary-button" type="button" onClick={() => setConfirmRotate(true)}>
                Rotate API key
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
