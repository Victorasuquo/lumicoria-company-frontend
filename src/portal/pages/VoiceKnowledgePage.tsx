import {
  BookOpenText, Plus, X, Globe, Files, Database,
  FileText, Question, Browser, FileArrowUp, CaretRight,
} from '@phosphor-icons/react'
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

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
]

const SOURCE_HINTS = [
  { icon: <FileText weight="duotone" size={18} />, label: 'Product docs', desc: 'Manuals, specifications, feature guides' },
  { icon: <Question weight="duotone" size={18} />, label: 'FAQs', desc: 'Common questions and answers' },
  { icon: <Browser weight="duotone" size={18} />, label: 'Websites', desc: 'Help center pages, blog posts' },
  { icon: <FileArrowUp weight="duotone" size={18} />, label: 'Files', desc: 'PDFs, spreadsheets, documents' },
]

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
      closeModal()
    },
  })

  function closeModal() {
    setShowCreate(false)
    setName('')
    setDescription('')
    setDefaultLocale('en')
    createMutation.reset()
  }

  if (query.isLoading) return <PortalLoading label="Loading knowledge bases" />
  if (query.error) return <PortalError error={query.error} onRetry={() => void query.refetch()} />

  const bases = query.data?.items ?? []
  const canManage = hasScope('voice.knowledge.manage')

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice knowledge"
        title="Knowledge Bases"
        description="Manage knowledge that powers your voice agents' responses."
        action={
          canManage ? (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus weight="bold" size={16} /> New Knowledge Base
            </button>
          ) : (
            <span className="portal-header-stat"><strong>{bases.length}</strong> bases</span>
          )
        }
      />

      {bases.length ? (
        <section className="portal-voice-kb-grid">
          {bases.map((kb) => (
            <article key={kb.id}>
              <Link to={`/portal/voice/knowledge/${kb.id}`}>
                <div className="portal-voice-card-icon">
                  <BookOpenText weight="duotone" />
                </div>
                <header>
                  <StatusPill value={kb.status} />
                  {kb.published_release_id ? (
                    <span className="portal-voice-card-category portal-voice-card-published">Published</span>
                  ) : (
                    <span className="portal-voice-card-category">Draft</span>
                  )}
                </header>
                <h2>{kb.name}</h2>
                <p>{kb.description || 'No description provided.'}</p>
                <dl>
                  <div>
                    <dt><Files size={13} /> Sources</dt>
                    <dd>{kb.source_count}</dd>
                  </div>
                  <div>
                    <dt><Globe size={13} /> Locale</dt>
                    <dd>{kb.default_locale}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatPortalDate(kb.updated_at)}</dd>
                  </div>
                </dl>
                <span className="portal-voice-card-arrow"><CaretRight size={16} weight="bold" /></span>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <div className="portal-voice-empty-hero">
          <div className="portal-voice-empty-icon-cluster">
            <span><BookOpenText weight="duotone" size={28} /></span>
            <span><FileText weight="duotone" size={20} /></span>
            <span><Database weight="duotone" size={20} /></span>
          </div>
          <h2>Create your first knowledge base</h2>
          <p>Upload documents, FAQs, and product information so your voice agents can answer questions accurately and consistently.</p>
          {canManage && (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus weight="bold" size={16} /> Create Knowledge Base
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <div className="portal-voice-create-backdrop" onClick={closeModal}>
          <div className="portal-voice-create-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="portal-voice-create-head">
              <div className="portal-voice-create-head-icon">
                <BookOpenText weight="duotone" size={24} />
              </div>
              <div>
                <h2>Create Knowledge Base</h2>
                <p>Set up a knowledge source for your voice agents.</p>
              </div>
              <button type="button" className="portal-voice-create-close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {createMutation.error && (
              <div className="portal-voice-create-error">
                <strong>Could not create knowledge base</strong>
                <span>{createMutation.error instanceof Error ? createMutation.error.message : 'An unexpected error occurred.'}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
            >
              <div className="portal-voice-create-section">
                <label className="portal-voice-create-label">Knowledge Base Name</label>
                <input
                  className="portal-voice-create-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Product FAQ, Support Procedures, Onboarding Guide"
                  autoFocus
                />
              </div>

              <div className="portal-voice-create-section">
                <label className="portal-voice-create-label">Description <span>Optional</span></label>
                <textarea
                  className="portal-voice-create-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What knowledge does this base contain? e.g. Product pricing, return policies, and shipping information..."
                />
              </div>

              <div className="portal-voice-create-section">
                <label className="portal-voice-create-label"><Globe size={14} /> Default Locale</label>
                <select
                  className="portal-voice-create-select"
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                >
                  {LOCALES.map((loc) => (
                    <option key={loc.code} value={loc.code}>
                      {loc.label} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="portal-voice-create-section portal-voice-create-section-muted">
                <span className="portal-voice-create-hint">You'll be able to add sources after creating:</span>
                <div className="portal-voice-source-hints">
                  {SOURCE_HINTS.map((hint) => (
                    <div key={hint.label} className="portal-voice-source-hint">
                      <span className="portal-voice-source-hint-icon">{hint.icon}</span>
                      <span className="portal-voice-source-hint-text">
                        <strong>{hint.label}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="portal-voice-create-footer">
                <button
                  className="portal-secondary-button"
                  type="button"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="portal-primary-button"
                  type="submit"
                  disabled={createMutation.isPending || !name.trim()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Knowledge Base'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
