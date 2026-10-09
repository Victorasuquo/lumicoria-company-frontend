import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type {
  VoiceAgent,
  VoiceAgentReadiness,
  VoiceAgentVersion,
  VoiceAgentVersionCollection,
} from '../../api/types'
import type { VoiceCollection, VoiceToolBinding } from '../../api/voice-types'
import type { VoiceKnowledgeBase } from '../../api/voice-types'
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
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState('')
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

  const readinessQuery = useVoiceQuery<VoiceAgentReadiness>(
    ['voice-agent-readiness', agentId],
    agentId ? `/voice/agents/${agentId}/readiness` : null,
    { enabled: hasScope('voice.agents.read') },
  )

  const knowledgeBasesQuery = useVoiceQuery<VoiceCollection<VoiceKnowledgeBase>>(
    ['voice-agent-knowledge-bases'],
    '/voice/knowledge-bases?page_size=100',
    { enabled: hasScope('voice.knowledge.read') },
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

  const configureKnowledgeMutation = useMutation({
    mutationFn: async ({ version, knowledgeBase }: { version: VoiceAgentVersion; knowledgeBase: VoiceKnowledgeBase }) => {
      const document = JSON.parse(JSON.stringify(version.vtl_document)) as Record<string, any>
      document.knowledge = {
        ...document.knowledge,
        knowledge_base_ids: [knowledgeBase.id],
        release_bindings: [
          {
            knowledge_base_id: knowledgeBase.id,
            release_id: knowledgeBase.published_release_id,
            required: true,
          },
        ],
      }
      const { data } = await portalFetch<VoiceAgentVersion>(
        `/voice/agents/${agentId}/versions`,
        {
          organizationId: context!.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ vtl_document: document }),
        },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-versions', agentId] })
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-readiness', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to configure knowledge'),
  })

  const evaluationsMutation = useMutation({
    mutationFn: async (version: VoiceAgentVersion) => {
      const evaluation = version.vtl_document.evaluation as { critical_suite_keys?: unknown } | undefined
      const suiteKeys = Array.isArray(evaluation?.critical_suite_keys)
        ? evaluation.critical_suite_keys.filter((suiteKey): suiteKey is string => typeof suiteKey === 'string')
        : []
      for (const suiteKey of suiteKeys) {
        await portalFetch(
          `/voice/agents/${agentId}/evaluations`,
          {
            organizationId: context!.organization_id,
            method: 'POST',
            idempotencyKey: createIdempotencyKey(),
            ...jsonBody({ version_id: version.id, suite_key: suiteKey }),
          },
        )
      }
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-readiness', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Required checks failed'),
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
  const latestVersion = [...versions].sort((a, b) => b.version_number - a.version_number)[0] ?? null
  const publishedKnowledgeBases = (knowledgeBasesQuery.data?.items ?? []).filter(
    (knowledgeBase) => knowledgeBase.status === 'active' && Boolean(knowledgeBase.published_release_id),
  )
  const selectedKnowledgeBase = publishedKnowledgeBases.find(
    (knowledgeBase) => knowledgeBase.id === selectedKnowledgeBaseId,
  ) ?? publishedKnowledgeBases[0] ?? null
  const blockingIssues = readinessQuery.data?.issues.filter((issue) => issue.blocking) ?? []
  const hasMissingEvaluation = blockingIssues.some((issue) => issue.code === 'CRITICAL_EVALUATION_MISSING' || issue.code === 'CRITICAL_EVALUATION_FAILED')

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

  function requestPublish(versionId: string) {
    publishMutation.mutate(versionId)
  }

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

      <section className={`portal-voice-readiness-panel ${readinessQuery.data?.ready ? 'is-ready' : 'is-blocked'}`}>
        <div className="portal-voice-readiness-header">
          <div>
            <span className="portal-voice-card-category">Publication readiness</span>
            <h3>{readinessQuery.isLoading ? 'Checking configuration…' : readinessQuery.data?.ready ? 'Ready to publish' : 'Publication is blocked'}</h3>
            <p>Every blocker below must be cleared before this version can become live.</p>
          </div>
          {readinessQuery.data && <StatusPill value={readinessQuery.data.ready ? 'ready' : 'blocked'} />}
        </div>
        {readinessQuery.error && <PortalError error={readinessQuery.error} onRetry={() => void readinessQuery.refetch()} />}
        {blockingIssues.length > 0 && (
          <ul className="portal-voice-readiness-issues">
            {blockingIssues.map((issue) => (
              <li key={`${issue.code}-${issue.path}`}>
                <div><strong>{humanize(issue.code)}</strong><span>{issue.message}</span></div>
                {issue.code === 'KNOWLEDGE_RELEASE_REQUIRED' && hasScope('voice.agents.manage') && (
                  <div className="portal-voice-readiness-action">
                    {publishedKnowledgeBases.length > 0 ? (
                      <>
                        <select
                          aria-label="Published knowledge base"
                          value={selectedKnowledgeBase?.id ?? ''}
                          onChange={(event) => setSelectedKnowledgeBaseId(event.target.value)}
                        >
                          {publishedKnowledgeBases.map((knowledgeBase) => <option key={knowledgeBase.id} value={knowledgeBase.id}>{knowledgeBase.name}</option>)}
                        </select>
                        <button
                          className="portal-secondary-button"
                          type="button"
                          onClick={() => latestVersion && selectedKnowledgeBase && configureKnowledgeMutation.mutate({ version: latestVersion, knowledgeBase: selectedKnowledgeBase })}
                          disabled={!latestVersion || !selectedKnowledgeBase || configureKnowledgeMutation.isPending}
                        >
                          {configureKnowledgeMutation.isPending ? 'Creating version…' : 'Bind published knowledge'}
                        </button>
                      </>
                    ) : (
                      <Link className="portal-secondary-button" to="/portal/voice/knowledge">Publish knowledge first</Link>
                    )}
                  </div>
                )}
                {issue.code === 'CRITICAL_EVALUATION_MISSING' && latestVersion && hasScope('voice.agents.manage') && (
                  <span className="portal-voice-readiness-action-note">Run the required checks below.</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {hasMissingEvaluation && latestVersion && hasScope('voice.agents.manage') && (
          <button
            className="portal-primary-button"
            type="button"
            onClick={() => evaluationsMutation.mutate(latestVersion)}
            disabled={evaluationsMutation.isPending}
          >
            {evaluationsMutation.isPending ? 'Running required checks…' : 'Run required checks'}
          </button>
        )}
        {readinessQuery.data?.issues.some((issue) => issue.code === 'TOOL_BINDING_UNHEALTHY') && (
          <Link className="portal-secondary-button" to="/portal/voice/tools">Review tool bindings</Link>
        )}
      </section>

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
                    onClick={() => requestPublish(v.id)}
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
            <PortalEmpty title="No tool bindings" description="This version does not require any tools. Bind a tool from Tool Definitions only when the workflow needs a live action." />
          )}
        </section>
      )}

      {/* Action bar */}
      <section className="portal-voice-action-bar">
        {hasScope('voice.agents.publish') && (agent.status === 'draft' || agent.status === 'test_ready') && latestVersion && (
          <div className="portal-voice-action-group">
              <button
                className="portal-primary-button"
                type="button"
                onClick={() => requestPublish(latestVersion.id)}
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
