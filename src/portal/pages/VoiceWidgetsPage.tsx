import { Code, Copy, Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalApiOrigin, portalFetch } from '../../api/client'
import type { VoiceAgentCollection } from '../../api/types'
import type { VoiceCollection, VoiceWidgetConfig } from '../../api/voice-types'
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

type WidgetCreateResponse = VoiceWidgetConfig

export function VoiceWidgetsPage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [channels, setChannels] = useState<string[]>(['browser'])
  const [origins, setOrigins] = useState(() => window.location.origin)
  const [captcha, setCaptcha] = useState(false)
  const [createdWidgetId, setCreatedWidgetId] = useState<string | null>(null)
  const [urlCopied, setUrlCopied] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)

  const widgetsQuery = useVoiceQuery<VoiceCollection<VoiceWidgetConfig>>(
    ['voice-widgets'],
    '/voice/widgets?page_size=100',
  )

  const agentsQuery = useVoiceQuery<VoiceAgentCollection>(
    ['voice-agents-for-widget'],
    showCreate ? '/voice/agents?page_size=100' : null,
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!context) throw new Error('Context unavailable.')
      const originList = origins
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean)
        .map((origin) => ({ origin }))
      if (!originList.length) throw new Error('At least one origin is required.')
      const { data } = await portalFetch<WidgetCreateResponse>(
        '/voice/widgets',
        {
          organizationId: context.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({
            agent_id: agentId,
            display_name: displayName,
            channels,
            origins: originList,
            captcha_enabled: captcha,
          }),
        },
      )
      return data
    },
    onSuccess: (data) => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-widgets'] })
      setCreatedWidgetId(data.id)
      setShowCreate(false)
      setAgentId('')
      setDisplayName('')
      setChannels(['browser'])
      setOrigins(window.location.origin)
      setCaptcha(false)
    },
  })

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  function publicWidgetUrl(widgetId: string): string {
    return `${window.location.origin}/chat/${encodeURIComponent(widgetId)}`
  }

  function embedSnippet(widgetId: string): string {
    const publicOrigin = window.location.origin
    const apiOrigin = portalApiOrigin || publicOrigin
    return `<script src="${publicOrigin}/lumicoria-widget.js" data-widget-id="${widgetId}" data-public-url="${publicOrigin}" data-api-origin="${apiOrigin}" defer></script>`
  }

  async function copyPublicUrl() {
    if (!createdWidgetId) return
    await navigator.clipboard.writeText(publicWidgetUrl(createdWidgetId))
    setUrlCopied(true)
    setTimeout(() => setUrlCopied(false), 2000)
  }

  async function copySnippet() {
    if (!createdWidgetId) return
    await navigator.clipboard.writeText(embedSnippet(createdWidgetId))
    setSnippetCopied(true)
    setTimeout(() => setSnippetCopied(false), 2000)
  }

  if (widgetsQuery.isLoading) return <PortalLoading label="Loading widgets" />
  if (widgetsQuery.error) return <PortalError error={widgetsQuery.error} onRetry={() => void widgetsQuery.refetch()} />

  const widgets = widgetsQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice embeds"
        title="Widgets"
        description="Give customers a public support page or embed one on your website."
        action={
          hasScope('voice.widgets.manage') ? (
            <button className="portal-primary-button" type="button" onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" /> New widget
            </button>
          ) : undefined
        }
      />

      {createdWidgetId && (
        <div className="portal-voice-key-banner">
          <Code aria-hidden="true" weight="duotone" />
          <div>
            <strong>Public support page ready</strong>
            <p>Share this URL with customers, or copy the embed snippet into the website.</p>
            <code className="portal-voice-key-value">{publicWidgetUrl(createdWidgetId)}</code>
            <textarea
              className="portal-voice-embed-snippet"
              value={embedSnippet(createdWidgetId)}
              readOnly
              rows={3}
              aria-label="Widget embed snippet"
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          <div className="portal-voice-key-actions">
            <button className="portal-secondary-button" type="button" onClick={() => void copyPublicUrl()}>
              <Copy aria-hidden="true" /> {urlCopied ? 'URL copied' : 'Copy public URL'}
            </button>
            <button className="portal-secondary-button" type="button" onClick={() => void copySnippet()}>
              <Code aria-hidden="true" /> {snippetCopied ? 'Snippet copied' : 'Copy snippet'}
            </button>
          </div>
          <button className="portal-secondary-button" type="button" onClick={() => setCreatedWidgetId(null)}>
            Dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <div className="portal-voice-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="portal-voice-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create widget</h2>
            {createMutation.error && <p className="portal-voice-form-error">{String(createMutation.error.message)}</p>}
            <div className="portal-voice-form">
              <label>
                <small>Agent</small>
                <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">Select agent…</option>
                  {(agentsQuery.data?.items ?? []).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <small>Display name</small>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Support Widget" />
              </label>
              <fieldset>
                <small>Channels</small>
                <label className="portal-voice-checkbox-label">
                  <input type="checkbox" checked={channels.includes('browser')} onChange={() => toggleChannel('browser')} />
                  Browser
                </label>
                <label className="portal-voice-checkbox-label">
                  <input type="checkbox" checked={channels.includes('callback')} onChange={() => toggleChannel('callback')} />
                  Callback
                </label>
              </fieldset>
              <label>
                <small>Allowed origins (one per line)</small>
                <textarea
                  rows={3}
                  value={origins}
                  onChange={(e) => setOrigins(e.target.value)}
                  placeholder={"https://example.com\nhttps://app.example.com"}
                />
              </label>
              <label className="portal-voice-checkbox-label">
                <input type="checkbox" checked={captcha} onChange={(e) => setCaptcha(e.target.checked)} />
                Enable CAPTCHA
              </label>
              <div className="portal-voice-form-actions">
                <button className="portal-secondary-button" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button
                  className="portal-primary-button"
                  type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={!agentId || !displayName || !channels.length || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {widgets.length ? (
        <div className="portal-voice-agent-grid">
          {widgets.map((w) => (
            <Link to={`/portal/voice/widgets/${w.id}`} key={w.id} className="portal-voice-card">
              <div className="portal-voice-card-icon">
                <Code aria-hidden="true" weight="duotone" />
              </div>
              <h3>{w.display_name}</h3>
              <div className="portal-voice-card-meta">
                <StatusPill value={w.status} />
                {w.kill_switch !== 'off' && <StatusPill value={`kill: ${w.kill_switch}`} />}
              </div>
              <div className="portal-voice-card-meta">
                {w.channels.map((ch) => (
                  <span key={ch} className="portal-voice-card-badge">{humanize(ch)}</span>
                ))}
                <span className="portal-voice-card-badge">{w.origins.length} origin{w.origins.length !== 1 ? 's' : ''}</span>
              </div>
              <time className="portal-voice-muted">{formatPortalDate(w.updated_at)}</time>
            </Link>
          ))}
        </div>
      ) : (
        <PortalEmpty
          title="No widgets configured"
          description="Create a widget to embed voice agents on your website."
        />
      )}
    </div>
  )
}
