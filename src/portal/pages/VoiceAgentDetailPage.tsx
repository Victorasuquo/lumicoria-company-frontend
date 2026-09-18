import { ArrowLeft, Plus, Warning } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type { VoiceAgent, VoiceAgentVersion, VoiceAgentVersionCollection } from '../../api/types'
import type { VoiceCollection, VoiceToolBinding } from '../../api/voice-types'
import { usePortalAuth } from '../../auth/AuthProvider'
import {
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'
import { useVoiceQuery } from '../hooks'
import { portalQueryClient } from '../query'

export function VoiceAgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { context, hasScope } = usePortalAuth()
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLanguage, setEditLanguage] = useState('')
  const [editSupported, setEditSupported] = useState('')
  const [mutationError, setMutationError] = useState<string | null>(null)

  const agentQuery = useVoiceQuery<VoiceAgent>(
    ['voice-agent', agentId],
    agentId ? `/voice/agents/${agentId}` : null,
  )

  const versionsQuery = useVoiceQuery<VoiceAgentVersionCollection>(
    ['voice-agent-versions', agentId],
    agentId ? `/voice/agents/${agentId}/versions?page_size=50` : null,
  )

  const bindingsQuery = useVoiceQuery<VoiceCollection<VoiceToolBinding>>(
    ['voice-agent-bindings', agentId],
    agentId ? `/voice/agents/${agentId}/tool-bindings` : null,
    { enabled: hasScope('voice.tools.read') },
  )

  const updateMutation = useMutation({
    mutationFn: async (body: { name?: string; description?: string | null; default_language?: string; supported_languages?: string[] }) => {
      const agent = agentQuery.data!
      const { data } = await portalFetch<VoiceAgent>(
        `/voice/agents/${agentId}`,
        { organizationId: context!.organization_id, method: 'PATCH', ifMatch: `"v${agent.version}"`, ...jsonBody(body) },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      setEditMode(false)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Update failed'),
  })

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceAgentVersion>(
        `/voice/agents/${agentId}/versions`,
        { organizationId: context!.organization_id, method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({}) },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-versions', agentId] })
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to create version'),
  })

  const publishMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const agent = agentQuery.data!
      const { data } = await portalFetch<VoiceAgent>(
        `/voice/agents/${agentId}/publish`,
        { organizationId: context!.organization_id, method: 'POST', idempotencyKey: createIdempotencyKey(), ifMatch: `"v${agent.version}"`, ...jsonBody({ version_id: versionId }) },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent', agentId] })
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-versions', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Publish failed'),
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const agent = agentQuery.data!
      const { data } = await portalFetch<VoiceAgent>(
        `/voice/agents/${agentId}/pause`,
        { organizationId: context!.organization_id, method: 'POST', ifMatch: `"v${agent.version}"` },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Pause failed'),
  })

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const agent = agentQuery.data!
      const { data } = await portalFetch<VoiceAgent>(
        `/voice/agents/${agentId}/resume`,
        { organizationId: context!.organization_id, method: 'POST', ifMatch: `"v${agent.version}"` },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Resume failed'),
  })

  if (agentQuery.isLoading) return <PortalLoading label="Loading voice agent" />
  if (agentQuery.error) return <PortalError error={agentQuery.error} onRetry={() => void agentQuery.refetch()} />
  if (!agentQuery.data) return <PortalEmpty title="Agent not found" description="This voice agent could not be loaded." />

  const agent = agentQuery.data
  const versions = versionsQuery.data?.items ?? []
  const bindings = bindingsQuery.data?.items ?? []

  function enterEditMode() {
    setEditName(agent.name)
    setEditDescription(agent.description ?? '')
    setEditLanguage(agent.default_language)
    setEditSupported((agent.supported_languages ?? []).join(', '))
    setMutationError(null)
    setEditMode(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const supported = editSupported.split(',').map((s) => s.trim()).filter(Boolean)
    updateMutation.mutate({
      name: editName,
      description: editDescription || null,
      default_language: editLanguage,
      supported_languages: supported,
    })
  }

  const latestVersion = versions.length ? versions[0] : null
  const actionBusy = publishMutation.isPending || pauseMutation.isPending || resumeMutation.isPending

  return (
    <div className="portal-page">
      <Link to="/portal/voice/agents" className="portal-voice-back">
        <ArrowLeft size={16} /> Voice Agents
      </Link>

      <PortalPageHeader
        eyebrow={humanize(agent.category)}
        title={agent.name}
        description={agent.description ?? undefined}
        action={<StatusPill value={agent.status} />}
      />

      <div className="portal-voice-detail-meta">
        <span>Language: <strong>{agent.default_language}</strong></span>
        {agent.published_version_id && <span>Published version: <strong>{agent.published_version_id.slice(0, 12)}…</strong></span>}
        <span>Updated {formatPortalDate(agent.updated_at)}</span>
      </div>

      {mutationError && <p className="portal-voice-mutation-error">{mutationError}</p>}

      {/* Configuration panel */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Configuration</h3>
          {!editMode && hasScope('voice.agents.manage') && (
            <button className="portal-secondary-button" type="button" onClick={enterEditMode}>Edit</button>
          )}
        </div>
        {editMode ? (
          <form onSubmit={handleSave} className="portal-voice-edit-form">
            <label>
              <span>Name</span>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </label>
            <label>
              <span>Description</span>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </label>
            <label>
              <span>Default language</span>
              <input type="text" value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} required />
            </label>
            <label>
              <span>Supported languages (comma-separated)</span>
              <input type="text" value={editSupported} onChange={(e) => setEditSupported(e.target.value)} />
            </label>
            <div className="portal-voice-edit-actions">
              <button className="portal-primary-button" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button className="portal-secondary-button" type="button" onClick={() => setEditMode(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <dl className="portal-voice-detail-dl">
            <dt>Name</dt><dd>{agent.name}</dd>
            <dt>Description</dt><dd>{agent.description || '—'}</dd>
            <dt>Default language</dt><dd>{agent.default_language}</dd>
            <dt>Supported languages</dt><dd>{(agent.supported_languages ?? []).join(', ') || '—'}</dd>
            <dt>Skill pack</dt><dd className="portal-voice-mono">{agent.skill_pack_id}</dd>
            <dt>Category</dt><dd>{humanize(agent.category)}</dd>
          </dl>
        )}
      </section>

      {/* Versions panel */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Versions <span className="portal-voice-count">{versions.length}</span></h3>
          {hasScope('voice.agents.manage') && (
            <button
              className="portal-secondary-button"
              type="button"
              onClick={() => createVersionMutation.mutate()}
              disabled={createVersionMutation.isPending}
            >
              <Plus size={14} /> {createVersionMutation.isPending ? 'Creating…' : 'New version'}
            </button>
          )}
        </div>
        {versionsQuery.isLoading ? (
          <PortalLoading label="Loading versions" />
        ) : versions.length ? (
          <ul className="portal-voice-version-list">
            {versions.map((v) => (
              <li key={v.id} className={v.id === agent.published_version_id ? 'is-published' : ''}>
                <strong>v{v.version_number}</strong>
                <StatusPill value={v.lifecycle_status} />
                <code>{v.vtl_checksum_sha256?.slice(0, 12) ?? '—'}</code>
                <time>{formatPortalDate(v.created_at)}</time>
                {v.id === agent.published_version_id && <span className="portal-voice-published-badge">Active</span>}
                {hasScope('voice.agents.publish') && v.lifecycle_status === 'validated' && v.id !== agent.published_version_id && (
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => publishMutation.mutate(v.id)}
                    disabled={actionBusy}
                  >
                    Publish
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <PortalEmpty title="No versions" description="Create a version to begin configuring this agent." />
        )}
      </section>

      {/* Tool bindings panel */}
      {hasScope('voice.tools.read') && (
        <section className="portal-voice-detail-panel">
          <div className="portal-voice-detail-panel-head">
            <h3>Tool Bindings</h3>
          </div>
          {bindingsQuery.isLoading ? (
            <PortalLoading label="Loading tool bindings" />
          ) : bindings.length ? (
            <ul className="portal-voice-binding-list">
              {bindings.map((b) => (
                <li key={b.id}>
                  <Link to={`/portal/voice/tools/${b.tool_id}`} className="portal-voice-mono">{b.tool_id}</Link>
                  <StatusPill value={b.status} />
                  <time>{formatPortalDate(b.created_at)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <PortalEmpty title="No tool bindings" description="Tools will appear here once bound to this agent." />
          )}
        </section>
      )}

      {/* Action bar */}
      <section className="portal-voice-action-bar">
        {hasScope('voice.agents.publish') && (agent.status === 'draft' || agent.status === 'test_ready') && latestVersion && (
          <div className="portal-voice-action-group">
            <p className="portal-voice-step-up-warning"><Warning size={16} /> Publishing requires elevated authentication.</p>
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => publishMutation.mutate(latestVersion.id)}
              disabled={actionBusy}
            >
              {publishMutation.isPending ? 'Publishing…' : 'Publish agent'}
            </button>
          </div>
        )}
        {hasScope('voice.agents.publish') && agent.status === 'published' && (
          <button
            className="portal-secondary-button"
            type="button"
            onClick={() => pauseMutation.mutate()}
            disabled={actionBusy}
          >
            {pauseMutation.isPending ? 'Pausing…' : 'Pause agent'}
          </button>
        )}
        {hasScope('voice.agents.publish') && agent.status === 'paused' && (
          <button
            className="portal-primary-button"
            type="button"
            onClick={() => resumeMutation.mutate()}
            disabled={actionBusy}
          >
            {resumeMutation.isPending ? 'Resuming…' : 'Resume agent'}
          </button>
        )}
      </section>
    </div>
  )
}
