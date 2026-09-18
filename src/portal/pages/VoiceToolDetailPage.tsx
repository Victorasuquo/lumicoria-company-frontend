import { ArrowLeft, Heartbeat, TestTube, Upload } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { portalFetch, createIdempotencyKey, jsonBody } from '../../api/client'
import type { VoiceAgent, VoiceAgentCollection } from '../../api/types'
import type {
  VoiceToolDetail,
  VoiceToolHealth,
  VoiceToolExecutionResult,
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

export function VoiceToolDetailPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const { context, hasScope } = usePortalAuth()

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const [showCreateVersion, setShowCreateVersion] = useState(false)
  const [bapitInput, setBapitInput] = useState('')

  const [testAgentId, setTestAgentId] = useState('')
  const [testArgs, setTestArgs] = useState('{}')
  const [testResult, setTestResult] = useState<VoiceToolExecutionResult | null>(null)

  const [healthAgentId, setHealthAgentId] = useState('')

  const toolQuery = useVoiceQuery<VoiceToolDetail>(
    ['voice-tool', toolId],
    toolId ? `/voice/tools/${toolId}` : null,
  )

  const agentsQuery = useVoiceQuery<VoiceAgentCollection>(
    ['voice-agents'],
    '/voice/agents?page_size=100',
  )

  const healthQuery = useVoiceQuery<VoiceToolHealth>(
    ['voice-tool-health', toolId, healthAgentId],
    toolId && healthAgentId
      ? `/voice/tools/${toolId}/health?agent_id=${healthAgentId}`
      : null,
  )

  const updateMutation = useMutation({
    mutationFn: async (payload: { display_name?: string; description?: string }) => {
      const { data } = await portalFetch<VoiceToolDetail>(
        `/voice/tools/${toolId}`,
        {
          organizationId: context!.organization_id,
          method: 'PATCH',
          ifMatch: `"v${toolQuery.data!.version}"`,
          ...jsonBody(payload),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context!.organization_id, 'voice-tool', toolId] })
      setEditing(false)
    },
  })

  const createVersionMutation = useMutation({
    mutationFn: async (bapitDoc: Record<string, unknown>) => {
      const { data } = await portalFetch<unknown>(
        `/voice/tools/${toolId}/versions`,
        {
          organizationId: context!.organization_id,
          method: 'POST',
          ...jsonBody({ bapit_document: bapitDoc }),
        },
      )
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', context!.organization_id, 'voice-tool', toolId] })
      setShowCreateVersion(false)
      setBapitInput('')
    },
  })

  const testMutation = useMutation({
    mutationFn: async (input: { agent_id: string; arguments: Record<string, unknown> }) => {
      const { data } = await portalFetch<VoiceToolExecutionResult>(
        `/voice/tools/${toolId}/test`,
        {
          organizationId: context!.organization_id,
          method: 'POST',
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody(input),
        },
      )
      return data
    },
    onSuccess: (data) => {
      setTestResult(data)
    },
  })

  if (!toolId) return <PortalEmpty title="No tool selected" description="Select a tool to view its details." />
  if (toolQuery.isLoading) return <PortalLoading label="Loading tool" />
  if (toolQuery.error) return <PortalError error={toolQuery.error} onRetry={() => void toolQuery.refetch()} />

  const tool = toolQuery.data!
  const agents = agentsQuery.data?.items ?? []
  const isTenant = tool.ownership === 'tenant'
  const canManage = hasScope('voice.tools.manage') && isTenant
  const canTest = hasScope('voice.tools.test')

  function startEdit() {
    setEditName(tool.display_name)
    setEditDesc(tool.description)
    setEditing(true)
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ display_name: editName, description: editDesc })
  }

  function handleCreateVersion(e: React.FormEvent) {
    e.preventDefault()
    try {
      const doc = JSON.parse(bapitInput)
      createVersionMutation.mutate(doc)
    } catch {
      /* invalid JSON — ignore, user will see no action */
    }
  }

  function handleTest(e: React.FormEvent) {
    e.preventDefault()
    try {
      const args = JSON.parse(testArgs)
      testMutation.mutate({ agent_id: testAgentId, arguments: args })
    } catch {
      /* invalid JSON */
    }
  }

  return (
    <div className="portal-page">
      <Link to="/portal/voice/tools" className="portal-voice-back">
        <ArrowLeft size={16} /> Tool Definitions
      </Link>

      <PortalPageHeader
        eyebrow="Voice tool"
        title={tool.display_name}
        description={
          <span className="portal-voice-detail-meta">
            <code>{tool.key}</code>
            <StatusPill value={tool.ownership} />
            <StatusPill value={tool.status} />
          </span>
        }
        action={
          canManage && !editing ? (
            <button type="button" className="portal-secondary-button" onClick={startEdit}>
              Edit
            </button>
          ) : undefined
        }
      />

      {/* Details panel */}
      <section className="portal-voice-detail-panel">
        <h3>Details</h3>
        {editing ? (
          <form onSubmit={handleUpdate} className="portal-voice-form">
            <label>
              <span>Display name</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </label>
            <label>
              <span>Description</span>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} />
            </label>
            {updateMutation.error && <p className="portal-voice-form-error">{String(updateMutation.error)}</p>}
            <div className="portal-voice-form-actions">
              <button type="submit" className="portal-primary-button" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="portal-secondary-button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="portal-voice-detail-grid">
            <div>
              <small>Description</small>
              <p>{tool.description || '—'}</p>
            </div>
            <div>
              <small>Category</small>
              <p>{humanize(tool.category)}</p>
            </div>
            <div>
              <small>Latest version</small>
              <p>v{tool.latest_version}</p>
            </div>
            <div>
              <small>Updated</small>
              <p>{formatPortalDate(tool.updated_at)}</p>
            </div>
          </div>
        )}
      </section>

      {/* Latest version panel */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-panel-header">
          <h3>Latest Version {tool.latest ? `v${tool.latest.version_number}` : ''}</h3>
          {canManage && (
            <button
              type="button"
              className="portal-secondary-button"
              onClick={() => setShowCreateVersion(!showCreateVersion)}
            >
              <Upload size={16} /> New Version
            </button>
          )}
        </div>
        {tool.latest ? (
          <>
            <div className="portal-voice-detail-grid">
              <div>
                <small>Schema version</small>
                <p>{tool.latest.schema_version}</p>
              </div>
              <div>
                <small>Status</small>
                <p><StatusPill value={tool.latest.lifecycle_status} /></p>
              </div>
              <div>
                <small>Published</small>
                <p>{formatPortalDate(tool.latest.published_at)}</p>
              </div>
              <div>
                <small>Checksum</small>
                <p><code>{tool.latest.checksum_sha256.slice(0, 16)}…</code></p>
              </div>
            </div>
            <div className="portal-voice-code-block">
              <small>BAPIT Document</small>
              <pre>{JSON.stringify(tool.latest.bapit_document, null, 2)}</pre>
            </div>
          </>
        ) : (
          <PortalEmpty title="No versions" description="Create the first version to define tool behavior." />
        )}
        {showCreateVersion && (
          <form onSubmit={handleCreateVersion} className="portal-voice-form portal-voice-form-inset">
            <label>
              <span>BAPIT document (JSON)</span>
              <textarea
                value={bapitInput}
                onChange={(e) => setBapitInput(e.target.value)}
                rows={8}
                placeholder='{"action": "...", ...}'
                className="portal-voice-code-input"
                required
              />
            </label>
            {createVersionMutation.error && <p className="portal-voice-form-error">{String(createVersionMutation.error)}</p>}
            <div className="portal-voice-form-actions">
              <button type="submit" className="portal-primary-button" disabled={createVersionMutation.isPending}>
                {createVersionMutation.isPending ? 'Creating…' : 'Create Version'}
              </button>
              <button type="button" className="portal-secondary-button" onClick={() => setShowCreateVersion(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Test panel */}
      {canTest && (
        <section className="portal-voice-detail-panel">
          <h3><TestTube size={20} /> Test Execution</h3>
          <form onSubmit={handleTest} className="portal-voice-form">
            <label>
              <span>Agent</span>
              <select value={testAgentId} onChange={(e) => setTestAgentId(e.target.value)} required>
                <option value="">Select an agent…</option>
                {agents.map((a: VoiceAgent) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Arguments (JSON)</span>
              <textarea
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                rows={4}
                className="portal-voice-code-input"
              />
            </label>
            {testMutation.error && <p className="portal-voice-form-error">{String(testMutation.error)}</p>}
            <div className="portal-voice-form-actions">
              <button type="submit" className="portal-primary-button" disabled={testMutation.isPending || !testAgentId}>
                {testMutation.isPending ? 'Running…' : 'Execute'}
              </button>
            </div>
          </form>
          {testResult && (
            <div className="portal-voice-test-result">
              <div className="portal-voice-detail-grid">
                <div>
                  <small>Outcome</small>
                  <p><StatusPill value={testResult.outcome} /></p>
                </div>
                <div>
                  <small>Latency</small>
                  <p>{testResult.latency_ms}ms</p>
                </div>
                <div>
                  <small>Tool</small>
                  <p><code>{testResult.tool_id}</code></p>
                </div>
                {testResult.safe_error_code && (
                  <div>
                    <small>Error</small>
                    <p><code>{testResult.safe_error_code}</code></p>
                  </div>
                )}
              </div>
              {testResult.output && (
                <div className="portal-voice-code-block">
                  <small>Output</small>
                  <pre>{JSON.stringify(testResult.output, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Health panel */}
      <section className="portal-voice-detail-panel">
        <h3><Heartbeat size={20} /> Health Check</h3>
        <div className="portal-voice-form">
          <label>
            <span>Agent</span>
            <select value={healthAgentId} onChange={(e) => setHealthAgentId(e.target.value)}>
              <option value="">Select an agent…</option>
              {agents.map((a: VoiceAgent) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>
        {!healthAgentId && (
          <p className="portal-voice-hint">Select an agent to view health status.</p>
        )}
        {healthAgentId && healthQuery.isLoading && <PortalLoading label="Checking health" />}
        {healthAgentId && healthQuery.error && (
          <PortalError error={healthQuery.error} onRetry={() => void healthQuery.refetch()} />
        )}
        {healthAgentId && healthQuery.data && (
          <div className="portal-voice-detail-grid">
            <div>
              <small>Status</small>
              <p><StatusPill value={healthQuery.data.status} /></p>
            </div>
            <div>
              <small>Circuit</small>
              <p><StatusPill value={healthQuery.data.circuit_state} /></p>
            </div>
            <div>
              <small>Failures</small>
              <p>{healthQuery.data.consecutive_failures}</p>
            </div>
            <div>
              <small>Latency</small>
              <p>{healthQuery.data.latency_ms != null ? `${healthQuery.data.latency_ms}ms` : '—'}</p>
            </div>
            {healthQuery.data.safe_error_code && (
              <div>
                <small>Error</small>
                <p><code>{healthQuery.data.safe_error_code}</code></p>
              </div>
            )}
            <div>
              <small>Checked</small>
              <p>{formatPortalDate(healthQuery.data.checked_at)}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
