import { Plus, Robot } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type {
  VoiceAgent,
  VoiceAgentCollection,
  VoiceSkillPack,
  VoiceSkillPackCollection,
} from '../../api/types'
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

const CATEGORIES = [
  'customer_support',
  'booking',
  'receptionist',
  'order_account',
  'technical_support',
  'sales_qualification',
  'payment_reminder',
  'customer_success',
] as const

export function VoiceAgentsPage() {
  const { context, hasScope } = usePortalAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [skillPackId, setSkillPackId] = useState('')
  const [defaultLanguage, setDefaultLanguage] = useState('en')

  const agentsQuery = useVoiceQuery<VoiceAgentCollection>(
    ['voice-agents'],
    '/voice/agents?page_size=100',
  )

  const skillPacksQuery = useVoiceQuery<VoiceSkillPackCollection>(
    ['voice-skill-packs'],
    showCreate ? '/voice/skill-packs?page_size=100' : null,
  )

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await portalFetch<VoiceAgent>('/voice/agents', {
        organizationId: context!.organization_id,
        method: 'POST',
        idempotencyKey: createIdempotencyKey(),
        ...jsonBody({
          name,
          description: description || undefined,
          category,
          skill_pack_id: skillPackId,
          default_language: defaultLanguage,
        }),
      })
      return data
    },
    onSuccess: () => {
      void portalQueryClient.invalidateQueries({
        queryKey: ['portal', context!.organization_id, 'voice-agents'],
      })
      setShowCreate(false)
      setName('')
      setDescription('')
      setCategory(CATEGORIES[0])
      setSkillPackId('')
      setDefaultLanguage('en')
    },
  })

  if (agentsQuery.isLoading) return <PortalLoading label="Loading voice agents" />
  if (agentsQuery.error) return <PortalError error={agentsQuery.error} onRetry={() => void agentsQuery.refetch()} />

  const agents = agentsQuery.data?.items ?? []
  const skillPacks: VoiceSkillPack[] = skillPacksQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice platform"
        title="Voice Agents"
        description="Create and manage AI voice agents for your organization."
        action={
          hasScope('voice.agents.manage') ? (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus aria-hidden="true" /> New agent
            </button>
          ) : (
            <span className="portal-header-stat"><strong>{agents.length}</strong> agents</span>
          )
        }
      />

      {createMutation.error && (
        <PortalError error={createMutation.error} title="Could not create agent" />
      )}

      {agents.length ? (
        <section className="portal-voice-agent-grid">
          {agents.map((agent) => (
            <article key={agent.id}>
              <Link to={`/portal/voice/agents/${agent.id}`}>
                <div className="portal-voice-card-icon">
                  <Robot aria-hidden="true" weight="duotone" />
                </div>
                <header>
                  <StatusPill value={agent.status} />
                  <span>{humanize(agent.category)}</span>
                </header>
                <h2>{agent.name}</h2>
                <p>{agent.description || 'No description provided.'}</p>
                <dl>
                  <div>
                    <dt>Language</dt>
                    <dd>{agent.default_language}</dd>
                  </div>
                  <div>
                    <dt>Published</dt>
                    <dd>{agent.published_version_id ? 'Yes' : '—'}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{formatPortalDate(agent.updated_at)}</dd>
                  </div>
                </dl>
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <PortalEmpty
          title="No voice agents yet"
          description="Create your first voice agent to get started with AI-powered conversations."
        />
      )}

      {showCreate && (
        <div className="portal-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create voice agent</h2>
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
                  placeholder="e.g. Support Agent"
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="What does this agent do?"
                />
              </label>
              <label>
                <span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{humanize(cat)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Skill pack</span>
                <select
                  value={skillPackId}
                  onChange={(e) => setSkillPackId(e.target.value)}
                  required
                >
                  <option value="">Select a skill pack</option>
                  {skillPacks.map((pack) => (
                    <option key={pack.id} value={pack.id}>
                      {pack.display_name} — {humanize(pack.category)}
                    </option>
                  ))}
                </select>
                {skillPacksQuery.isLoading && <small>Loading skill packs…</small>}
              </label>
              <label>
                <span>Default language</span>
                <input
                  type="text"
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
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
                  disabled={createMutation.isPending || !name || !skillPackId}
                >
                  {createMutation.isPending ? 'Creating…' : 'Create agent'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
