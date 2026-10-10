import { ArrowLeft, Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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
  const [promptCompany, setPromptCompany] = useState('')
  const [promptRole, setPromptRole] = useState('')
  const [promptTone, setPromptTone] = useState('')
  const [promptLocale, setPromptLocale] = useState('')
  const [promptCulture, setPromptCulture] = useState('')
  const [promptRules, setPromptRules] = useState('')
  const [promptForbidden, setPromptForbidden] = useState('')
  const [promptTerms, setPromptTerms] = useState('')
  const [promptOpening, setPromptOpening] = useState('')
  const [promptClosing, setPromptClosing] = useState('')
  const [promptIntents, setPromptIntents] = useState('')
  const [promptKnowledgeConfidence, setPromptKnowledgeConfidence] = useState('0.72')
  const [promptKnowledgeAction, setPromptKnowledgeAction] = useState('handoff')
  const [promptAllowedActions, setPromptAllowedActions] = useState('')
  const [promptMaximumRisk, setPromptMaximumRisk] = useState('A1')
  const [promptConfirmationPhrases, setPromptConfirmationPhrases] = useState('')
  const [promptHandoffRules, setPromptHandoffRules] = useState('')
  const [promptTimezone, setPromptTimezone] = useState('UTC')
  const [promptOutsideHoursAction, setPromptOutsideHoursAction] = useState('create_ticket')
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

  const promptPreviewQuery = useVoiceQuery<{
    agent_id: string
    version_id: string
    lifecycle_status: string
    configuration_checksum_sha256: string
    system_prompt: string
  }>(
    ['voice-agent-prompt-preview', agentId],
    agentId ? `/voice/agents/${agentId}/prompt-preview` : null,
    { enabled: hasScope('voice.agents.read') && Boolean(versionsQuery.data?.items?.length) },
  )

  const knowledgeBasesQuery = useVoiceQuery<VoiceCollection<VoiceKnowledgeBase>>(
    ['voice-agent-knowledge-bases'],
    '/voice/knowledge-bases?page_size=100',
    { enabled: hasScope('voice.knowledge.read') },
  )

  useEffect(() => {
    const versions = versionsQuery.data?.items ?? []
    const latest = [...versions].sort((a, b) => b.version_number - a.version_number)[0]
    if (!latest) return
    const document = latest.vtl_document as Record<string, any>
    const identity = (document.identity ?? {}) as Record<string, any>
    const disclosure = (document.disclosure ?? {}) as Record<string, any>
    const conversation = (document.conversation ?? {}) as Record<string, any>
    const knowledge = (document.knowledge ?? {}) as Record<string, any>
    const actions = (document.actions ?? {}) as Record<string, any>
    const handoff = (document.handoff ?? {}) as Record<string, any>
    const businessHours = (document.business_hours ?? {}) as Record<string, any>
    setPromptCompany(typeof identity.company_name === 'string' ? identity.company_name : '')
    setPromptRole(typeof identity.role === 'string' ? identity.role : '')
    setPromptTone(Array.isArray(identity.tone) ? identity.tone.join(', ') : '')
    setPromptLocale(typeof identity.locale === 'string' ? identity.locale : '')
    setPromptCulture(Array.isArray(identity.cultural_guidance) ? identity.cultural_guidance.join('\n') : '')
    setPromptRules(Array.isArray(identity.response_rules) ? identity.response_rules.join('\n') : '')
    setPromptForbidden(Array.isArray(identity.forbidden_topics) ? identity.forbidden_topics.join('\n') : '')
    setPromptTerms(
      identity.preferred_terms && typeof identity.preferred_terms === 'object'
        ? Object.entries(identity.preferred_terms).map(([key, value]) => `${key}=${String(value)}`).join('\n')
        : '',
    )
    setPromptOpening(typeof disclosure.opening_text === 'string' ? disclosure.opening_text : '')
    setPromptClosing(typeof disclosure.closing_text === 'string' ? disclosure.closing_text : '')
    setPromptIntents(Array.isArray(conversation.intents) ? conversation.intents.join('\n') : '')
    setPromptKnowledgeConfidence(typeof knowledge.minimum_confidence === 'number' ? String(knowledge.minimum_confidence) : '0.72')
    setPromptKnowledgeAction(typeof knowledge.insufficient_action === 'string' ? knowledge.insufficient_action : 'handoff')
    setPromptAllowedActions(Array.isArray(actions.allowed_action_classes) ? actions.allowed_action_classes.join('\n') : '')
    setPromptMaximumRisk(typeof actions.maximum_autonomous_risk === 'string' ? actions.maximum_autonomous_risk : 'A1')
    setPromptConfirmationPhrases(Array.isArray(actions.confirmation_phrases) ? actions.confirmation_phrases.join('\n') : '')
    setPromptHandoffRules(Array.isArray(handoff.escalation_rules) ? handoff.escalation_rules.join('\n') : '')
    setPromptTimezone(typeof businessHours.timezone === 'string' ? businessHours.timezone : 'UTC')
    setPromptOutsideHoursAction(typeof businessHours.outside_hours_action === 'string' ? businessHours.outside_hours_action : 'create_ticket')
  }, [versionsQuery.data])

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
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-prompt-preview', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to configure knowledge'),
  })

  const savePromptMutation = useMutation({
    mutationFn: async (version: VoiceAgentVersion) => {
      const document = JSON.parse(JSON.stringify(version.vtl_document)) as Record<string, any>
      const identity: Record<string, any> = {
        ...(document.identity as Record<string, any> | undefined),
        company_name: promptCompany.trim(),
        role: promptRole.trim(),
        tone: promptTone.split(',').map((value) => value.trim()).filter(Boolean),
        cultural_guidance: promptCulture.split('\n').map((value) => value.trim()).filter(Boolean),
        response_rules: promptRules.split('\n').map((value) => value.trim()).filter(Boolean),
        forbidden_topics: promptForbidden.split('\n').map((value) => value.trim()).filter(Boolean),
        preferred_terms: Object.fromEntries(
          promptTerms.split('\n').map((line) => line.split('=').map((value) => value.trim())).filter(([key, value]) => Boolean(key && value)),
        ),
      }
      if (promptLocale.trim()) identity.locale = promptLocale.trim()
      else delete identity.locale
      document.identity = identity
      document.disclosure = {
        ...(document.disclosure as Record<string, any> | undefined),
        opening_text: promptOpening.trim() || undefined,
        closing_text: promptClosing.trim() || undefined,
      }
      const intentLines = promptIntents.split('\n').map((value) => value.trim()).filter(Boolean)
      if (intentLines.length > 0) {
        document.conversation = {
          ...(document.conversation as Record<string, any> | undefined),
          intents: intentLines,
        }
      }
      const knowledgeConfidence = Number(promptKnowledgeConfidence)
      document.knowledge = {
        ...(document.knowledge as Record<string, any> | undefined),
        minimum_confidence: Number.isFinite(knowledgeConfidence) ? Math.min(1, Math.max(0, knowledgeConfidence)) : 0.72,
        insufficient_action: promptKnowledgeAction,
      }
      document.actions = {
        ...(document.actions as Record<string, any> | undefined),
        allowed_action_classes: promptAllowedActions.split('\n').map((value) => value.trim()).filter(Boolean),
        maximum_autonomous_risk: promptMaximumRisk,
        confirmation_phrases: promptConfirmationPhrases.split('\n').map((value) => value.trim()).filter(Boolean),
      }
      document.handoff = {
        ...(document.handoff as Record<string, any> | undefined),
        escalation_rules: promptHandoffRules.split('\n').map((value) => value.trim()).filter(Boolean),
      }
      document.business_hours = {
        ...(document.business_hours as Record<string, any> | undefined),
        timezone: promptTimezone.trim() || 'UTC',
        outside_hours_action: promptOutsideHoursAction,
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
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'voice-agent-prompt-preview', agentId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to save prompt configuration'),
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

      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <div>
            <h3>Prompt and guardrails</h3>
            <p className="portal-voice-panel-note">Structured settings are compiled into the next immutable VTL version. They apply to browser, phone, widget, and fallback runtime paths.</p>
          </div>
        </div>
        {!latestVersion ? (
          <PortalEmpty title="Create a version first" description="The prompt and guardrail editor becomes available after the first agent version is created." />
        ) : hasScope('voice.agents.manage') ? (
          <form className="portal-voice-edit-form" onSubmit={(event) => { event.preventDefault(); savePromptMutation.mutate(latestVersion) }}>
            <div className="portal-voice-form-grid">
              <label><span>Company represented</span><input value={promptCompany} onChange={(event) => setPromptCompany(event.target.value)} placeholder="The organisation this agent represents" required /></label>
              <label><span>Agent role</span><input value={promptRole} onChange={(event) => setPromptRole(event.target.value)} placeholder="Customer support specialist" required /></label>
              <label><span>Locale</span><input value={promptLocale} onChange={(event) => setPromptLocale(event.target.value)} placeholder="en-NG" /></label>
              <label><span>Brand tone</span><input value={promptTone} onChange={(event) => setPromptTone(event.target.value)} placeholder="warm, clear, professional" /></label>
            </div>
            <label><span>Cultural guidance <small>One rule per line</small></span><textarea value={promptCulture} onChange={(event) => setPromptCulture(event.target.value)} rows={3} placeholder="Use respectful Nigerian English.\nAvoid slang unless the customer uses it first." /></label>
            <label><span>Response rules <small>One rule per line</small></span><textarea value={promptRules} onChange={(event) => setPromptRules(event.target.value)} rows={3} placeholder="Ask one question at a time.\nAlways explain the next step." /></label>
            <div className="portal-voice-form-grid">
              <label><span>Forbidden topics <small>One topic per line</small></span><textarea value={promptForbidden} onChange={(event) => setPromptForbidden(event.target.value)} rows={3} placeholder="Unverified prices\nUnconfirmed availability" /></label>
              <label><span>Preferred terms <small>One key=value per line</small></span><textarea value={promptTerms} onChange={(event) => setPromptTerms(event.target.value)} rows={3} placeholder="customer=guest\nstaff=the support team" /></label>
            </div>
            <div className="portal-voice-form-grid">
              <label><span>AI opening disclosure</span><textarea value={promptOpening} onChange={(event) => setPromptOpening(event.target.value)} rows={2} /></label>
              <label><span>Closing message</span><textarea value={promptClosing} onChange={(event) => setPromptClosing(event.target.value)} rows={2} /></label>
            </div>
            <label><span>Supported intents <small>One intent key per line</small></span><textarea value={promptIntents} onChange={(event) => setPromptIntents(event.target.value)} rows={3} placeholder="service_question\ncomplaint\nhuman_handoff" /></label>
            <div className="portal-voice-form-grid">
              <label><span>Knowledge confidence threshold</span><input type="number" min="0" max="1" step="0.01" value={promptKnowledgeConfidence} onChange={(event) => setPromptKnowledgeConfidence(event.target.value)} /></label>
              <label><span>When knowledge is insufficient</span><select value={promptKnowledgeAction} onChange={(event) => setPromptKnowledgeAction(event.target.value)}><option value="clarify">Ask for clarification</option><option value="handoff">Hand off to staff</option><option value="create_ticket">Create a ticket</option><option value="end">End safely</option></select></label>
              <label><span>Maximum autonomous risk</span><select value={promptMaximumRisk} onChange={(event) => setPromptMaximumRisk(event.target.value)}><option value="A0">A0 · informational only</option><option value="A1">A1 · low-risk actions</option><option value="A2">A2 · bounded actions with confirmation</option></select></label>
              <label><span>Business-hours timezone</span><input value={promptTimezone} onChange={(event) => setPromptTimezone(event.target.value)} placeholder="Africa/Lagos" /></label>
            </div>
            <label><span>Allowed action classes <small>One action key per line</small></span><textarea value={promptAllowedActions} onChange={(event) => setPromptAllowedActions(event.target.value)} rows={3} placeholder="knowledge.search\nticket.create\ncall.transfer" /></label>
            <label><span>Confirmation phrases <small>Required before side effects</small></span><textarea value={promptConfirmationPhrases} onChange={(event) => setPromptConfirmationPhrases(event.target.value)} rows={2} placeholder="Please confirm that you want me to proceed." /></label>
            <div className="portal-voice-form-grid">
              <label><span>Escalation rules <small>One rule per line</small></span><textarea value={promptHandoffRules} onChange={(event) => setPromptHandoffRules(event.target.value)} rows={3} placeholder="customer_requests_a_human\nrequired_policy_is_unavailable\nidentity_or_confirmation_fails" /></label>
              <label><span>Outside-hours action</span><select value={promptOutsideHoursAction} onChange={(event) => setPromptOutsideHoursAction(event.target.value)}><option value="allow">Continue with published knowledge</option><option value="create_ticket">Create a ticket</option><option value="schedule_callback">Schedule a callback</option><option value="end">End safely</option></select></label>
            </div>
            <div className="portal-voice-edit-actions"><button className="portal-primary-button" type="submit" disabled={savePromptMutation.isPending || !promptCompany.trim() || !promptRole.trim()}>{savePromptMutation.isPending ? 'Creating version…' : 'Save as new version'}</button><span className="portal-voice-panel-note">The current published version is unchanged until you validate and publish this new version.</span></div>
          </form>
        ) : <p className="portal-voice-panel-note">You have read-only access to this agent’s prompt and guardrails.</p>}
      </section>

      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <div>
            <h3>Effective runtime prompt</h3>
            <p className="portal-voice-panel-note">
              This is the tenant-aware prompt assembled from the selected agent version. The same compiled identity, knowledge rules, handoff rules, and guardrails are used by chat, browser voice, phone, and widget runtimes.
            </p>
          </div>
          {promptPreviewQuery.data && <code className="portal-voice-mono">{promptPreviewQuery.data.configuration_checksum_sha256.slice(0, 12)}…</code>}
        </div>
        {promptPreviewQuery.isLoading ? (
          <PortalLoading label="Building effective prompt" />
        ) : promptPreviewQuery.error ? (
          <PortalError error={promptPreviewQuery.error} onRetry={() => void promptPreviewQuery.refetch()} />
        ) : promptPreviewQuery.data ? (
          <pre className="portal-voice-prompt-preview">{promptPreviewQuery.data.system_prompt}</pre>
        ) : (
          <PortalEmpty title="No prompt version yet" description="Create an immutable version to preview the prompt used by runtime paths." />
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
