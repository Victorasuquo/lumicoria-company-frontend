import { ArrowLeft, Code, Copy, PencilSimple, Pause, Play } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { jsonBody, portalApiOrigin, portalFetch } from '../../api/client'
import type { VoiceWidgetConfig, VoiceWidgetPause } from '../../api/voice-types'
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
  const [editingOrigins, setEditingOrigins] = useState(false)
  const [editOrigins, setEditOrigins] = useState('')
  const [urlCopied, setUrlCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)

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
          ifMatch: `"v${widget.version}"`,
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

  const originsMutation = useMutation({
    mutationFn: async () => {
      if (!context || !widget) throw new Error('Context unavailable.')
      const origins = editOrigins
        .split('\n')
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => ({ origin }))
      if (!origins.length) throw new Error('At least one allowed origin is required.')
      const { data } = await portalFetch<VoiceWidgetConfig>(
        `/voice/widgets/${widgetId}/origins`,
        {
          organizationId: context.organization_id,
          method: 'PUT',
          ifMatch: `"v${widget.version}"`,
          ...jsonBody({ origins }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-widget', widgetId] })
      setEditingOrigins(false)
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

  function publicWidgetUrl(): string {
    return `${window.location.origin}/chat/${encodeURIComponent(widget?.id ?? '')}`
  }

  function embedSnippet(): string {
    const publicOrigin = window.location.origin
    const apiOrigin = portalApiOrigin || publicOrigin
    return `<script src="${publicOrigin}/lumicoria-widget.js" data-widget-id="${widget?.id ?? 'YOUR_WIDGET_ID'}" data-public-url="${publicOrigin}" data-api-origin="${apiOrigin}" defer></script>`
  }

  async function copyPublicUrl() {
    await navigator.clipboard.writeText(publicWidgetUrl())
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(embedSnippet())
    setSnippetCopied(true)
    setTimeout(() => setSnippetCopied(false), 2000)
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

      {(updateMutation.error || pauseMutation.error || resumeMutation.error || originsMutation.error) && (
        <PortalError
          error={updateMutation.error ?? pauseMutation.error ?? resumeMutation.error ?? originsMutation.error}
          title="Operation failed"
        />
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
            <dt>Updated</dt>
            <dd>{formatPortalDate(widget.updated_at)}</dd>
          </dl>
        )}
      </section>

      <section className="portal-voice-detail-panel">
        <h3>Allowed Origins</h3>
        {editingOrigins ? (
          <div className="portal-voice-form">
            <p className="portal-voice-hint">Add the exact website origins that may load this widget. Use one origin per line, without a page path.</p>
            <textarea
              rows={4}
              value={editOrigins}
              onChange={(event) => setEditOrigins(event.target.value)}
              placeholder="http://127.0.0.1:5173\nhttps://your-company.com"
            />
            <div className="portal-voice-form-actions">
              <button className="portal-secondary-button" type="button" onClick={() => setEditingOrigins(false)}>Cancel</button>
              <button className="portal-primary-button" type="button" onClick={() => originsMutation.mutate()} disabled={originsMutation.isPending}>
                {originsMutation.isPending ? 'Saving…' : 'Save origins'}
              </button>
            </div>
          </div>
        ) : widget.origins.length > 0 ? (
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
        {canManage && !editingOrigins && (
          <button
            className="portal-secondary-button"
            type="button"
            onClick={() => {
              setEditOrigins(widget.origins.filter((origin) => origin.status === 'active').map((origin) => origin.origin).join('\n'))
              setEditingOrigins(true)
            }}
          >
            <PencilSimple aria-hidden="true" /> Edit origins
          </button>
        )}
      </section>

      <section className="portal-voice-detail-panel">
        <h3>Public support page</h3>
        <p className="portal-voice-hint">Open this page to test the customer experience, or embed it on a customer website after copying the key from creation or key rotation.</p>
        <code className="portal-voice-embed-url">{publicWidgetUrl()}</code>
        <pre className="portal-voice-embed-code"><code>{embedSnippet()}</code></pre>
        <div className="portal-voice-key-actions">
          <button className="portal-secondary-button" type="button" onClick={() => void copyPublicUrl()}>
            <Copy aria-hidden="true" /> {urlCopied ? 'URL copied' : 'Copy public URL'}
          </button>
          <button className="portal-secondary-button" type="button" onClick={() => void copySnippet()}>
            <Code aria-hidden="true" /> {snippetCopied ? 'Snippet copied' : 'Copy snippet'}
          </button>
        </div>
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

          </div>
        </section>
      )}
    </div>
  )
}
