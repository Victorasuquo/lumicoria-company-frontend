import { Plus, Wrench } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import { usePortalAuth } from '../../auth/AuthProvider'
import type { VoiceCollection, VoiceToolDefinition, VoiceToolDetail } from '../../api/voice-types'
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

export function VoiceToolsPage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [key, setKey] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')

  const query = useVoiceQuery<VoiceCollection<VoiceToolDefinition>>(
    ['voice-tools'],
    '/voice/tools?page_size=100',
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceToolDetail>('/voice/tools', {
        organizationId: context!.organization_id,
        method: 'POST',
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({
          key,
          display_name: displayName,
          description,
          category,
        }),
      })
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({
        queryKey: ['portal', context!.organization_id, 'voice-tools'],
      })
      setShowCreate(false)
      setKey('')
      setDisplayName('')
      setDescription('')
      setCategory('')
    },
  })

  if (query.isLoading) return <PortalLoading label="Loading tool definitions" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const tools = query.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice platform"
        title="Tool Definitions"
        description="Platform and custom tools available to your voice agents."
        action={
          hasScope('voice.tools.manage') ? (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus aria-hidden="true" /> New tool
            </button>
          ) : (
            <span className="portal-header-stat"><strong>{tools.length}</strong> tools</span>
          )
        }
      />

      {createMutation.error && (
        <PortalError error={createMutation.error} title="Could not create tool" />
      )}

      {tools.length ? (
        <section className="portal-voice-tool-grid">
          {tools.map((tool) => (
            <article key={tool.id}>
              <Link to={`/portal/voice/tools/${tool.id}`}>
                <div className="portal-voice-card-icon">
                  <Wrench aria-hidden="true" weight="duotone" />
                </div>
                <header>
                  <StatusPill value={tool.status} />
                  <span className={`portal-voice-ownership-pill portal-voice-ownership-${tool.ownership}`}>
                    {humanize(tool.ownership)}
                  </span>
                </header>
                <h2>{tool.display_name}</h2>
                <p className="portal-voice-tool-key">{tool.key}</p>
                <p>{tool.description}</p>
                <dl>
                  <div>
                    <dt>Category</dt>
                    <dd>{humanize(tool.category)}</dd>
                  </div>
                  <div>
                    <dt>Version</dt>
                    <dd>v{tool.latest_version}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatPortalDate(tool.updated_at)}</dd>
                  </div>
                </dl>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty
          title="No tool definitions"
          description="Tool definitions will appear here once they are configured for your organization."
        />
      )}

      {showCreate && (
        <div className="portal-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create tool definition</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
            >
              <label>
                <span>Key</span>
                <input
                  type="text"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                  placeholder="e.g. lookup_order"
                  className="portal-voice-mono-input"
                />
              </label>
              <label>
                <span>Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Order Lookup"
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                  placeholder="What does this tool do?"
                />
              </label>
              <label>
                <span>Category</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  placeholder="e.g. crm, billing, lookup"
                />
              </label>
              <footer>
                <button
                  className="portal-secondary-button"
                  type="button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  className="portal-primary-button"
                  type="submit"
                  disabled={createMutation.isPending || !key || !displayName || !description || !category}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create tool'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
