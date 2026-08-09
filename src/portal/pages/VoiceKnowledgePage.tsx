import { BookOpenText, Plus } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import { usePortalAuth } from '../../auth/AuthProvider'
import type { VoiceCollection, VoiceKnowledgeBase } from '../../api/voice-types'
import { useVoiceQuery } from '../hooks'
import { portalQueryClient } from '../query'
import {
  formatPortalDate,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function VoiceKnowledgePage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultLocale, setDefaultLocale] = useState('en')

  const query = useVoiceQuery<VoiceCollection<VoiceKnowledgeBase>>(
    ['voice-knowledge-bases'],
    '/voice/knowledge-bases?page_size=100',
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceKnowledgeBase>('/voice/knowledge-bases', {
        organizationId: context!.organization_id,
        method: 'POST',
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({
          name,
          description: description || undefined,
          default_locale: defaultLocale,
        }),
      })
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({
        queryKey: ['portal', context!.organization_id, 'voice-knowledge-bases'],
      })
      setShowCreate(false)
      setName('')
      setDescription('')
      setDefaultLocale('en')
    },
  })

  if (query.isLoading) return <PortalLoading label="Loading knowledge bases" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const bases = query.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice knowledge"
        title="Knowledge Bases"
        description="Manage knowledge that powers your voice agents' responses."
        action={
          hasScope('voice.knowledge.manage') ? (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus aria-hidden="true" /> New knowledge base
            </button>
          ) : (
            <span className="portal-header-stat"><strong>{bases.length}</strong> bases</span>
          )
        }
      />

      {createMutation.error && (
        <PortalError error={createMutation.error} title="Could not create knowledge base" />
      )}

      {bases.length ? (
        <section className="portal-voice-kb-grid">
          {bases.map((kb) => (
            <article key={kb.id}>
              <Link to={`/portal/voice/knowledge/${kb.id}`}>
                <div className="portal-voice-card-icon">
                  <BookOpenText aria-hidden="true" weight="duotone" />
                </div>
                <header>
                  <StatusPill value={kb.status} />
                  {kb.published_release_id ? (
                    <span className="portal-voice-published-badge">Published</span>
                  ) : (
                    <span>Draft</span>
                  )}
                </header>
                <h2>{kb.name}</h2>
                <p>{kb.description || 'No description provided.'}</p>
                <dl>
                  <div>
                    <dt>Sources</dt>
                    <dd>{kb.source_count}</dd>
                  </div>
                  <div>
                    <dt>Locale</dt>
                    <dd>{kb.default_locale}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatPortalDate(kb.updated_at)}</dd>
                  </div>
                </dl>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty
          title="No knowledge bases"
          description="Create a knowledge base to provide your voice agents with answers and procedures."
        />
      )}

      {showCreate && (
        <div className="portal-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create knowledge base</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
            >
              <label>
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Product FAQ"
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What knowledge does this base contain?"
                />
              </label>
              <label>
                <span>Default locale</span>
                <input
                  type="text"
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                  placeholder="en"
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
                  disabled={createMutation.isPending || !name}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create knowledge base'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
