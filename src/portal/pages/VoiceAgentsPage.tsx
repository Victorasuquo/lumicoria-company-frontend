import {
  Plus, Robot, Headset, CalendarCheck, Phone, ShoppingCart,
  Wrench, Handshake, CurrencyDollar, Smiley, X, Globe,
  Sparkle, CaretRight,
} from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
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

const CATEGORY_META: Record<string, { icon: ReactNode; label: string; desc: string }> = {
  customer_support:    { icon: <Headset weight="duotone" />,        label: 'Customer Support',    desc: 'Handle inquiries & issues' },
  booking:             { icon: <CalendarCheck weight="duotone" />,   label: 'Booking',             desc: 'Appointments & scheduling' },
  receptionist:        { icon: <Phone weight="duotone" />,           label: 'Receptionist',        desc: 'Route calls & greet callers' },
  order_account:       { icon: <ShoppingCart weight="duotone" />,    label: 'Order & Account',     desc: 'Orders, billing & accounts' },
  technical_support:   { icon: <Wrench weight="duotone" />,          label: 'Technical Support',   desc: 'Troubleshoot & resolve' },
  sales_qualification: { icon: <Handshake weight="duotone" />,       label: 'Sales Qualification', desc: 'Qualify leads & prospects' },
  payment_reminder:    { icon: <CurrencyDollar weight="duotone" />,  label: 'Payment Reminder',    desc: 'Collections & reminders' },
  customer_success:    { icon: <Smiley weight="duotone" />,          label: 'Customer Success',    desc: 'Retention & satisfaction' },
}

const LANGUAGES = [
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
      closeModal()
    },
  })

  function closeModal() {
    setShowCreate(false)
    setName('')
    setDescription('')
    setCategory(CATEGORIES[0])
    setSkillPackId('')
    setDefaultLanguage('en')
    createMutation.reset()
  }

  if (agentsQuery.isLoading) return <PortalLoading label="Loading voice agents" />
  if (agentsQuery.error) return <PortalError error={agentsQuery.error} onRetry={() => void agentsQuery.refetch()} />

  const agents = agentsQuery.data?.items ?? []
  const skillPacks: VoiceSkillPack[] = skillPacksQuery.data?.items ?? []
  const canManage = hasScope('voice.agents.manage')

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Voice platform"
        title="Voice Agents"
        description="Create and manage AI voice agents for your organization."
        action={
          canManage ? (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus weight="bold" size={16} /> New Agent
            </button>
          ) : (
            <span className="portal-header-stat"><strong>{agents.length}</strong> agents</span>
          )
        }
      />

      {agents.length ? (
        <section className="portal-voice-agent-grid">
          {agents.map((agent) => {
            const meta = CATEGORY_META[agent.category]
            return (
              <article key={agent.id}>
                <Link to={`/portal/voice/agents/${agent.id}`}>
                  <div className="portal-voice-card-icon">
                    {meta?.icon ?? <Robot weight="duotone" />}
                  </div>
                  <header>
                    <StatusPill value={agent.status} />
                    <span className="portal-voice-card-category">{meta?.label ?? humanize(agent.category)}</span>
                  </header>
                  <h2>{agent.name}</h2>
                  <p>{agent.description || 'No description provided.'}</p>
                  <dl>
                    <div>
                      <dt><Globe size={13} /> Language</dt>
                      <dd>{agent.default_language}</dd>
                    </div>
                    <div>
                      <dt><Sparkle size={13} /> Published</dt>
                      <dd>{agent.published_version_id ? 'Live' : 'Draft'}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatPortalDate(agent.updated_at)}</dd>
                    </div>
                  </dl>
                  <span className="portal-voice-card-arrow"><CaretRight size={16} weight="bold" /></span>
                </Link>
              </article>
            )
          })}
        </section>
      ) : (
        <div className="portal-voice-empty-hero">
          <div className="portal-voice-empty-icon-cluster">
            <span><Robot weight="duotone" size={28} /></span>
            <span><Headset weight="duotone" size={20} /></span>
            <span><Phone weight="duotone" size={20} /></span>
          </div>
          <h2>Create your first voice agent</h2>
          <p>Build AI-powered voice agents that handle calls, qualify leads, and support your customers around the clock.</p>
          {canManage && (
            <button
              className="portal-primary-button"
              type="button"
              onClick={() => setShowCreate(true)}
            >
              <Plus weight="bold" size={16} /> Create Agent
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <div className="portal-voice-create-backdrop" onClick={closeModal}>
          <div className="portal-voice-create-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="portal-voice-create-head">
              <div className="portal-voice-create-head-icon">
                <Robot weight="duotone" size={24} />
              </div>
              <div>
                <h2>Create Voice Agent</h2>
                <p>Configure a new AI agent for your voice interactions.</p>
              </div>
              <button type="button" className="portal-voice-create-close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {createMutation.error && (
              <div className="portal-voice-create-error">
                <strong>Could not create agent</strong>
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
                <label className="portal-voice-create-label">Agent Name</label>
                <input
                  className="portal-voice-create-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Support Agent, Booking Assistant"
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
                  placeholder="Briefly describe what this agent does and who it serves..."
                />
              </div>

              <div className="portal-voice-create-section">
                <label className="portal-voice-create-label">Category</label>
                <div className="portal-voice-category-grid">
                  {CATEGORIES.map((cat) => {
                    const meta = CATEGORY_META[cat]
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`portal-voice-category-option${category === cat ? ' is-selected' : ''}`}
                        onClick={() => setCategory(cat)}
                      >
                        <span className="portal-voice-category-icon">{meta.icon}</span>
                        <span className="portal-voice-category-text">
                          <strong>{meta.label}</strong>
                          <small>{meta.desc}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="portal-voice-create-row">
                <div className="portal-voice-create-section portal-voice-create-flex">
                  <label className="portal-voice-create-label">Skill Pack</label>
                  <div className="portal-voice-create-select-wrap">
                    <select
                      className="portal-voice-create-select"
                      value={skillPackId}
                      onChange={(e) => setSkillPackId(e.target.value)}
                      required
                    >
                      <option value="">Select a skill pack...</option>
                      {skillPacks.map((pack) => (
                        <option key={pack.id} value={pack.id}>
                          {pack.display_name}
                        </option>
                      ))}
                    </select>
                    {skillPacksQuery.isLoading && (
                      <span className="portal-voice-create-hint">Loading skill packs...</span>
                    )}
                    {!skillPacksQuery.isLoading && skillPacks.length === 0 && (
                      <span className="portal-voice-create-hint">No skill packs available. Create one first.</span>
                    )}
                  </div>
                </div>

                <div className="portal-voice-create-section portal-voice-create-flex">
                  <label className="portal-voice-create-label">
                    <Globe size={14} /> Default Language
                  </label>
                  <select
                    className="portal-voice-create-select"
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value)}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label} ({lang.code})
                      </option>
                    ))}
                  </select>
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
                  disabled={createMutation.isPending || !name.trim() || !skillPackId}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
