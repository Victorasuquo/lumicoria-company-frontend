import { MagnifyingGlass, Plus, Wrench, X } from '@phosphor-icons/react'
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
  const [search, setSearch] = useState('')

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
    <div className="portal-page portal-tools-page">
      <PortalPageHeader
        title="Tools"
        description="Actions your voice agents can use to complete a support workflow."
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

      {tools.length > 0 && (
        <div className="portal-collection-toolbar">
          <label className="portal-collection-search">
            <MagnifyingGlass aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tools"
              aria-label="Search tools"
            />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><X aria-hidden="true" /></button>}
          </label>
          <span>{tools.filter((tool) => `${tool.display_name} ${tool.key} ${tool.description} ${tool.category}`.toLowerCase().includes(search.toLowerCase())).length} of {tools.length} tools</span>
        </div>
      )}

      {tools.length ? (
        <section className="portal-tool-grid">
          {tools.filter((tool) => `${tool.display_name} ${tool.key} ${tool.description} ${tool.category}`.toLowerCase().includes(search.toLowerCase())).map((tool) => (
            <article className="portal-tool-card" key={tool.id}>
              <Link to={`/portal/voice/tools/${tool.id}`} className="portal-tool-card-link">
                <div className="portal-voice-card-icon">
                  <Wrench aria-hidden="true" weight="duotone" />
                </div>
                <header className="portal-tool-card-status">
                  <StatusPill value={tool.status} />
                  <span className={`portal-voice-ownership-pill portal-voice-ownership-${tool.ownership}`}>
                    {humanize(tool.ownership)}
                  </span>
                </header>
                <h2>{tool.display_name}</h2>
                <code className="portal-tool-key">{tool.key}</code>
                <p className="portal-tool-description">{tool.description}</p>
                <div className="portal-tool-card-footer">
                  <span>{humanize(tool.category)}</span>
                  <span>v{tool.latest_version}</span>
                  <time>{formatPortalDate(tool.updated_at)}</time>
                </div>
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

      {tools.length > 0 && !tools.some((tool) => `${tool.display_name} ${tool.key} ${tool.description} ${tool.category}`.toLowerCase().includes(search.toLowerCase())) && (
        <PortalEmpty title="No matching tools" description="Try another name, category, or tool key." action={<button className="portal-secondary-button" type="button" onClick={() => setSearch('')}>Clear search</button>} />
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
