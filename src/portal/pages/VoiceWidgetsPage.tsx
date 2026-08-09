import { Code, Copy, Plus, Warning } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
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

type WidgetCreateResponse = VoiceWidgetConfig & { plain_key?: string }

export function VoiceWidgetsPage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [agentId, setAgentId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [channels, setChannels] = useState<string[]>(['browser'])
  const [origins, setOrigins] = useState('')
  const [captcha, setCaptcha] = useState(false)
  const [plainKey, setPlainKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
      if (data.plain_key) {
        setPlainKey(data.plain_key)
      }
      setShowCreate(false)
      setAgentId('')
      setDisplayName('')
      setChannels(['browser'])
      setOrigins('')
      setCaptcha(false)
    },
  })

  function toggleChannel(ch: string) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  async function copyKey() {
    if (!plainKey) return
    await navigator.clipboard.writeText(plainKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (widgetsQuery.isLoading) return <PortalLoading label="Loading widgets" />
  if (widgetsQuery.error) return <PortalError error={widgetsQuery.error} onRetry={() => void widgetsQuery.refetch()} />

  const widgets = widgetsQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice embeds"
        title="Widgets"
        description="Embed voice agents on your website with secure, key-authenticated widgets."
        action={
          hasScope('voice.widgets.manage') ? (
            <button className="portal-primary-button" type="button" onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" /> New widget
            </button>
          ) : undefined
        }
      />

      {plainKey && (
        <div className="portal-voice-key-banner">
          <Warning aria-hidden="true" weight="duotone" />
          <div>
            <strong>Widget API key created</strong>
            <p>Copy this key now — it will not be shown again.</p>
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
              {w.key_prefix && (
                <p className="portal-voice-mono portal-voice-muted">Key: {w.key_prefix}…</p>
              )}
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
