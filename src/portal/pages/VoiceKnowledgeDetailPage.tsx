import { ArrowLeft, Plus, Trash, Warning } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type {
  VoiceCollection,
  VoiceKnowledgeBase,
  VoiceKnowledgeEvaluationResponse,
  VoiceKnowledgeReleaseResponse,
  VoiceKnowledgeSource,
  VoiceKnowledgeSourceProcessResponse,
  VoiceKnowledgeTestCaseResponse,
  VoiceKnowledgeTestQueryResponse,
} from '../../api/voice-types'
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

export function VoiceKnowledgeDetailPage() {
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>()
  const kbId = knowledgeBaseId!
  const { context, hasScope } = usePortalAuth()
  const orgId = context?.organization_id

  const [showAddSource, setShowAddSource] = useState(false)
  const [srcName, setSrcName] = useState('')
  const [srcType, setSrcType] = useState('text')
  const [srcContent, setSrcContent] = useState('')

  const [showCreateRelease, setShowCreateRelease] = useState(false)
  const [releaseName, setReleaseName] = useState('')

  const [showCreateTestCase, setShowCreateTestCase] = useState(false)
  const [tcName, setTcName] = useState('')
  const [tcQuery, setTcQuery] = useState('')
  const [tcExpected, setTcExpected] = useState('')
  const [tcForbidden, setTcForbidden] = useState('')
  const [tcConfidence, setTcConfidence] = useState('0.7')

  const [testQueryInput, setTestQueryInput] = useState('')
  const [testQueryScope, setTestQueryScope] = useState<'published' | 'draft'>('published')
  const [testQueryResult, setTestQueryResult] = useState<VoiceKnowledgeTestQueryResponse | null>(null)

  const [mutationError, setMutationError] = useState<string | null>(null)

  const kbQuery = useVoiceQuery<VoiceKnowledgeBase>(
    ['voice-kb', kbId],
    `/voice/knowledge-bases/${kbId}`,
  )

  const sourcesQuery = useVoiceQuery<VoiceCollection<VoiceKnowledgeSource>>(
    ['voice-kb-sources', kbId],
    `/voice/knowledge-bases/${kbId}/sources?page_size=100`,
  )

  const releasesQuery = useVoiceQuery<VoiceCollection<VoiceKnowledgeReleaseResponse>>(
    ['voice-kb-releases', kbId],
    `/voice/knowledge-bases/${kbId}/releases?page_size=50`,
  )

  const testCasesQuery = useVoiceQuery<VoiceCollection<VoiceKnowledgeTestCaseResponse>>(
    ['voice-kb-test-cases', kbId],
    `/voice/knowledge-bases/${kbId}/test-cases?page_size=50`,
  )

  function invalidateSources() {
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', orgId, 'voice-kb-sources', kbId] })
    void portalQueryClient.invalidateQueries({ queryKey: ['portal', orgId, 'voice-kb', kbId] })
  }

  const createSourceMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: srcName, source_type: srcType }
      if (srcType === 'text' || srcType === 'faq') body.raw_content = srcContent
      const { data } = await portalFetch<VoiceKnowledgeSourceProcessResponse>(
        `/voice/knowledge-bases/${kbId}/sources`,
        { organizationId: orgId!, method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody(body) },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      setShowAddSource(false)
      setSrcName('')
      setSrcContent('')
      invalidateSources()
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to create source'),
  })

  const archiveSourceMutation = useMutation({
    mutationFn: async ({ sourceId, version }: { sourceId: string; version: number }) => {
      await portalFetch<void>(
        `/voice/knowledge-bases/${kbId}/sources/${sourceId}`,
        { organizationId: orgId!, method: 'DELETE', ifMatch: `"v${version}"` },
      )
    },
    onSuccess: () => {
      setMutationError(null)
      invalidateSources()
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to archive source'),
  })

  const testQueryMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceKnowledgeTestQueryResponse>(
        `/voice/knowledge-bases/${kbId}/test-query`,
        { organizationId: orgId!, method: 'POST', ...jsonBody({ query: testQueryInput, scope: testQueryScope }) },
      )
      return data
    },
    onSuccess: (data) => {
      setMutationError(null)
      setTestQueryResult(data)
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Test query failed'),
  })

  const createReleaseMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceKnowledgeReleaseResponse>(
        `/voice/knowledge-bases/${kbId}/releases`,
        { organizationId: orgId!, method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody({ name: releaseName }) },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      setShowCreateRelease(false)
      setReleaseName('')
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', orgId, 'voice-kb-releases', kbId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to create release'),
  })

  const publishReleaseMutation = useMutation({
    mutationFn: async (releaseId: string) => {
      const { data } = await portalFetch<VoiceKnowledgeReleaseResponse>(
        `/voice/knowledge-bases/${kbId}/releases/${releaseId}/publish`,
        { organizationId: orgId!, method: 'POST', idempotencyKey: createIdempotencyKey() },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', orgId, 'voice-kb-releases', kbId] })
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', orgId, 'voice-kb', kbId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to publish release'),
  })

  const createTestCaseMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: tcName,
        query: tcQuery,
        expected_phrases: tcExpected.split(',').map((s) => s.trim()).filter(Boolean),
        forbidden_phrases: tcForbidden.split(',').map((s) => s.trim()).filter(Boolean),
        minimum_confidence: parseFloat(tcConfidence) || 0.7,
      }
      const { data } = await portalFetch<VoiceKnowledgeTestCaseResponse>(
        `/voice/knowledge-bases/${kbId}/test-cases`,
        { organizationId: orgId!, method: 'POST', idempotencyKey: createIdempotencyKey(), ...jsonBody(body) },
      )
      return data
    },
    onSuccess: () => {
      setMutationError(null)
      setShowCreateTestCase(false)
      setTcName('')
      setTcQuery('')
      setTcExpected('')
      setTcForbidden('')
      setTcConfidence('0.7')
      void portalQueryClient.invalidateQueries({ queryKey: ['portal', orgId, 'voice-kb-test-cases', kbId] })
    },
    onError: (err) => setMutationError(err instanceof Error ? err.message : 'Failed to create test case'),
  })

  if (kbQuery.isLoading) return <PortalLoading label="Loading knowledge base" />
  if (kbQuery.error) return <PortalError error={kbQuery.error} onRetry={() => void kbQuery.refetch()} />
  if (!kbQuery.data) return <PortalEmpty title="Not found" description="This knowledge base could not be loaded." />

  const kb = kbQuery.data
  const sources = sourcesQuery.data?.items ?? []
  const releases = releasesQuery.data?.items ?? []
  const testCases = testCasesQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <Link to="/portal/voice/knowledge" className="portal-voice-back">
        <ArrowLeft size={16} /> Knowledge Bases
      </Link>

      <PortalPageHeader
        eyebrow="Knowledge base"
        title={kb.name}
        description={kb.description ?? undefined}
        action={
          <span className="portal-voice-detail-meta">
            <StatusPill value={kb.status} />
            <span>{kb.source_count} sources</span>
            {kb.published_release_id
              ? <span className="portal-voice-published-badge">Published</span>
              : <span className="portal-voice-draft-badge">Draft</span>}
          </span>
        }
      />

      {mutationError && <p className="portal-voice-mutation-error">{mutationError}</p>}

      {/* Sources */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Sources <span className="portal-voice-count">{sources.length}</span></h3>
          {hasScope('voice.knowledge.manage') && (
            <button className="portal-secondary-button" type="button" onClick={() => setShowAddSource(!showAddSource)}>
              <Plus size={14} /> Add source
            </button>
          )}
        </div>

        {showAddSource && (
          <form className="portal-voice-inline-form" onSubmit={(e) => { e.preventDefault(); createSourceMutation.mutate() }}>
            <label>
              <span>Name</span>
              <input type="text" value={srcName} onChange={(e) => setSrcName(e.target.value)} required />
            </label>
            <label>
              <span>Type</span>
              <select value={srcType} onChange={(e) => setSrcType(e.target.value)}>
                <option value="text">Text</option>
                <option value="faq">FAQ</option>
                <option value="website">Website</option>
                <option value="file">File</option>
              </select>
            </label>
            {(srcType === 'text' || srcType === 'faq') && (
              <label>
                <span>Content</span>
                <textarea value={srcContent} onChange={(e) => setSrcContent(e.target.value)} rows={4} />
              </label>
            )}
            <div className="portal-voice-edit-actions">
              <button className="portal-primary-button" type="submit" disabled={createSourceMutation.isPending}>
                {createSourceMutation.isPending ? 'Adding…' : 'Add source'}
              </button>
              <button className="portal-secondary-button" type="button" onClick={() => setShowAddSource(false)}>Cancel</button>
            </div>
          </form>
        )}

        {sourcesQuery.isLoading ? (
          <PortalLoading label="Loading sources" />
        ) : sources.length ? (
          <div className="portal-voice-source-list">
            <div className="portal-voice-source-list-head">
              <span>Name</span><span>Type</span><span>Status</span><span>Version</span><span>Updated</span><span></span>
            </div>
            {sources.map((src) => (
              <div className="portal-voice-source-list-row" key={src.id}>
                <span>{src.name}</span>
                <span><StatusPill value={src.source_type} /></span>
                <span><StatusPill value={src.status} /></span>
                <span>v{src.latest_version}</span>
                <span>{formatPortalDate(src.updated_at)}</span>
                <span>
                  {src.last_error_code && (
                    <span className="portal-voice-source-error" title={src.last_error_detail ?? src.last_error_code}>
                      <Warning size={14} /> {src.last_error_code}
                    </span>
                  )}
                  {hasScope('voice.knowledge.manage') && (
                    <button
                      className="portal-voice-icon-button"
                      type="button"
                      title="Archive source"
                      onClick={() => archiveSourceMutation.mutate({ sourceId: src.id, version: src.version })}
                      disabled={archiveSourceMutation.isPending}
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <PortalEmpty title="No sources" description="Add a source to start building this knowledge base." />
        )}
      </section>

      {/* Test Retrieval */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Test Retrieval</h3>
        </div>
        <div className="portal-voice-test-query">
          <textarea
            placeholder="Enter a test query…"
            value={testQueryInput}
            onChange={(e) => setTestQueryInput(e.target.value)}
            rows={3}
          />
          <div className="portal-voice-test-query-controls">
            <label className="portal-voice-radio">
              <input type="radio" name="scope" value="published" checked={testQueryScope === 'published'} onChange={() => setTestQueryScope('published')} />
              Published
            </label>
            <label className="portal-voice-radio">
              <input type="radio" name="scope" value="draft" checked={testQueryScope === 'draft'} onChange={() => setTestQueryScope('draft')} />
              Draft
            </label>
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => testQueryMutation.mutate()}
              disabled={testQueryMutation.isPending || !testQueryInput.trim()}
            >
              {testQueryMutation.isPending ? 'Querying…' : 'Run query'}
            </button>
          </div>

          {testQueryResult && (
            <div className="portal-voice-test-query-results">
              <div className="portal-voice-test-query-summary">
                <span>Confidence: <strong>{(testQueryResult.confidence * 100).toFixed(1)}%</strong></span>
                {testQueryResult.insufficient && <span className="portal-voice-warning-pill">Insufficient</span>}
              </div>
              {testQueryResult.passages.length ? (
                <ul className="portal-voice-passage-list">
                  {testQueryResult.passages.map((passage, i) => (
                    <li key={i} className="portal-voice-passage">
                      <p>{passage.content.length > 300 ? passage.content.slice(0, 300) + '…' : passage.content}</p>
                      <div className="portal-voice-passage-meta">
                        <span>Score: {passage.score.toFixed(3)}</span>
                        <span>{passage.citation.source_name}</span>
                        {passage.citation.heading_path.length > 0 && (
                          <span>{passage.citation.heading_path.join(' › ')}</span>
                        )}
                        {passage.prompt_injection_detected && <span className="portal-voice-warning-pill">Injection detected</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="portal-voice-muted">No passages returned.</p>
              )}
              {testQueryResult.conflicts.length > 0 && (
                <div className="portal-voice-conflicts">
                  <h4>Conflicts</h4>
                  {testQueryResult.conflicts.map((c, i) => (
                    <p key={i}><strong>{c.category}:</strong> {c.detail}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Releases */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Releases <span className="portal-voice-count">{releases.length}</span></h3>
          {hasScope('voice.knowledge.publish') && (
            <button className="portal-secondary-button" type="button" onClick={() => setShowCreateRelease(!showCreateRelease)}>
              <Plus size={14} /> New release
            </button>
          )}
        </div>

        {showCreateRelease && (
          <form className="portal-voice-inline-form" onSubmit={(e) => { e.preventDefault(); createReleaseMutation.mutate() }}>
            <label>
              <span>Release name</span>
              <input type="text" value={releaseName} onChange={(e) => setReleaseName(e.target.value)} required />
            </label>
            <div className="portal-voice-edit-actions">
              <button className="portal-primary-button" type="submit" disabled={createReleaseMutation.isPending}>
                {createReleaseMutation.isPending ? 'Creating…' : 'Create release'}
              </button>
              <button className="portal-secondary-button" type="button" onClick={() => setShowCreateRelease(false)}>Cancel</button>
            </div>
          </form>
        )}

        {releasesQuery.isLoading ? (
          <PortalLoading label="Loading releases" />
        ) : releases.length ? (
          <ul className="portal-voice-release-list">
            {releases.map((r) => (
              <li key={r.id}>
                <strong>#{r.release_number}</strong>
                <span>{r.name}</span>
                <StatusPill value={r.status} />
                <span>{r.item_count} items</span>
                <time>{formatPortalDate(r.published_at ?? r.created_at)}</time>
                {hasScope('voice.knowledge.publish') && r.status === 'draft' && (
                  <button
                    className="portal-secondary-button"
                    type="button"
                    onClick={() => publishReleaseMutation.mutate(r.id)}
                    disabled={publishReleaseMutation.isPending}
                  >
                    {publishReleaseMutation.isPending ? 'Publishing…' : 'Publish'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <PortalEmpty title="No releases" description="Create a release to snapshot and publish knowledge." />
        )}
      </section>

      {/* Test Cases */}
      <section className="portal-voice-detail-panel">
        <div className="portal-voice-detail-panel-head">
          <h3>Test Cases <span className="portal-voice-count">{testCases.length}</span></h3>
          {hasScope('voice.knowledge.manage') && (
            <button className="portal-secondary-button" type="button" onClick={() => setShowCreateTestCase(!showCreateTestCase)}>
              <Plus size={14} /> New test case
            </button>
          )}
        </div>

        {showCreateTestCase && (
          <form className="portal-voice-inline-form" onSubmit={(e) => { e.preventDefault(); createTestCaseMutation.mutate() }}>
            <label>
              <span>Name</span>
              <input type="text" value={tcName} onChange={(e) => setTcName(e.target.value)} required />
            </label>
            <label>
              <span>Query</span>
              <textarea value={tcQuery} onChange={(e) => setTcQuery(e.target.value)} rows={2} required />
            </label>
            <label>
              <span>Expected phrases (comma-separated)</span>
              <input type="text" value={tcExpected} onChange={(e) => setTcExpected(e.target.value)} />
            </label>
            <label>
              <span>Forbidden phrases (comma-separated)</span>
              <input type="text" value={tcForbidden} onChange={(e) => setTcForbidden(e.target.value)} />
            </label>
            <label>
              <span>Minimum confidence</span>
              <input type="number" step="0.01" min="0" max="1" value={tcConfidence} onChange={(e) => setTcConfidence(e.target.value)} />
            </label>
            <div className="portal-voice-edit-actions">
              <button className="portal-primary-button" type="submit" disabled={createTestCaseMutation.isPending}>
                {createTestCaseMutation.isPending ? 'Creating…' : 'Create test case'}
              </button>
              <button className="portal-secondary-button" type="button" onClick={() => setShowCreateTestCase(false)}>Cancel</button>
            </div>
          </form>
        )}

        {testCasesQuery.isLoading ? (
          <PortalLoading label="Loading test cases" />
        ) : testCases.length ? (
          <ul className="portal-voice-test-case-list">
            {testCases.map((tc) => (
              <li key={tc.id}>
                <strong>{tc.name}</strong>
                <span className="portal-voice-muted">{tc.query.length > 80 ? tc.query.slice(0, 80) + '…' : tc.query}</span>
                <StatusPill value={tc.status} />
                <span>≥ {(tc.minimum_confidence * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <PortalEmpty title="No test cases" description="Add test cases to verify knowledge retrieval quality." />
        )}
      </section>
    </div>
  )
}
