import { Check, Clock, FileArrowUp, UsersThree } from '@phosphor-icons/react'
import { useMutation } from '@tanstack/react-query'
import { createIdempotencyKey, jsonBody, portalFetch } from '../../api/client'
import type {
  ApiCollection,
  ChecklistItem,
  OnboardingChecklist,
  OnboardingProgress,
} from '../../api/types'
import { usePortalAuth } from '../../auth/AuthProvider'
import { portalQueryClient } from '../query'
import { usePortalQuery, useSelectedEngagement } from '../hooks'
import {
  CompletionMark,
  formatPortalDate,
  humanize,
  PortalEmpty,
  PortalError,
  PortalLoading,
  PortalPageHeader,
  StatusPill,
} from '../components/PortalState'

export function OnboardingPage() {
  const { context, hasScope } = usePortalAuth()
  const { engagement, engagementId } = useSelectedEngagement()
  const progressQuery = usePortalQuery<OnboardingProgress>(
    ['onboarding-progress', engagementId],
    engagementId ? `/engagements/${engagementId}/onboarding/progress` : null,
  )
  const checklistsQuery = usePortalQuery<ApiCollection<OnboardingChecklist>>(
    ['onboarding-checklists', engagementId],
    engagementId ? `/engagements/${engagementId}/onboarding-checklists?page_size=100` : null,
  )
  const itemsQuery = usePortalQuery<ApiCollection<ChecklistItem>>(
    ['checklist-items', engagementId],
    engagementId ? `/engagements/${engagementId}/checklist-items?page_size=100` : null,
  )
  const completeMutation = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      if (!engagementId || !context) throw new Error('Engagement context is unavailable.')
      return portalFetch<ChecklistItem>(
        `/engagements/${engagementId}/checklist-items/${item.id}/complete`,
        {
          method: 'POST',
          organizationId: context.organization_id,
          idempotencyKey: createIdempotencyKey(),
          ...jsonBody({ evidence: [] }),
        },
      )
    },
    onSuccess: async () => {
      await Promise.all([
        portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'checklist-items'] }),
        portalQueryClient.invalidateQueries({ queryKey: ['portal', context?.organization_id, 'onboarding-progress'] }),
      ])
    },
  })

  if (!engagementId) return <PortalEmpty title="No engagement selected" description="Select an engagement to view onboarding." />
  if (progressQuery.isLoading || checklistsQuery.isLoading || itemsQuery.isLoading) {
    return <PortalLoading label="Loading onboarding plan" />
  }
  const firstError = progressQuery.error || checklistsQuery.error || itemsQuery.error
  if (firstError) return <PortalError error={firstError} />

  const progress = progressQuery.data
  const items = itemsQuery.data?.items ?? []
  const checklists = checklistsQuery.data?.items ?? []

  return (
    <div className="portal-page">
      <PortalPageHeader
        eyebrow="Getting ready"
        title="Onboarding"
        description={`Everything required from Lumicoria and ${engagement?.name || 'your team'} before delivery can move at full speed.`}
      />
      <section className="portal-onboarding-summary">
        <div className="portal-progress-orbit" style={{ '--progress': `${progress?.percent ?? 0}%` } as React.CSSProperties}>
          <div><strong>{progress?.percent ?? 0}%</strong><span>complete</span></div>
        </div>
        <div>
          <span>Required preparation</span>
          <h2>{progress?.required_completed ?? 0} of {progress?.required_total ?? 0} items complete</h2>
          <p>Required work is separated by the party responsible so ownership stays clear.</p>
        </div>
        <div className="portal-party-progress">
          {progress?.by_party.map((party) => (
            <div key={party.party}>
              <UsersThree aria-hidden="true" weight="duotone" />
              <span><strong>{humanize(party.party)}</strong><small>{party.required_completed}/{party.required_total} complete</small></span>
              <b>{party.percent}%</b>
            </div>
          ))}
        </div>
      </section>

      {completeMutation.error && <PortalError error={completeMutation.error} title="The item was not completed" />}

      <section className="portal-checklist-groups">
        {checklists.length ? checklists.map((checklist) => {
          const checklistItems = items.filter((item) => item.checklist_id === checklist.id)
          return (
            <article className="portal-checklist" key={checklist.id}>
              <header>
                <div>
                  <span>{humanize(checklist.party)} onboarding</span>
                  <h2>{checklist.name}</h2>
                  <p><Clock aria-hidden="true" /> Due {formatPortalDate(checklist.due_at)}</p>
                </div>
                <StatusPill value={checklist.status} />
              </header>
              <div className="portal-checklist-items">
                {checklistItems.map((item) => {
                  const complete = item.status === 'completed'
                  const canComplete = hasScope('onboarding.items.complete')
                    && !complete
                    && !item.evidence_required
                  return (
                    <div key={item.id}>
                      <CompletionMark complete={complete} />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.description || `${humanize(item.assigned_party)} is responsible for this item.`}</p>
                        <small>{item.required ? 'Required' : 'Optional'} · Due {formatPortalDate(item.due_at)}</small>
                      </div>
                      {item.evidence_required && !complete && (
                        <span className="portal-evidence-required"><FileArrowUp aria-hidden="true" /> Evidence required</span>
                      )}
                      {canComplete && (
                        <button
                          className="portal-secondary-button"
                          type="button"
                          onClick={() => completeMutation.mutate(item)}
                          disabled={completeMutation.isPending}
                        >
                          <Check aria-hidden="true" /> Mark complete
                        </button>
                      )}
                    </div>
                  )
                })}
                {!checklistItems.length && <PortalEmpty title="No visible items" description="This checklist does not currently contain client-visible work." />}
              </div>
            </article>
          )
        }) : (
          <PortalEmpty title="Onboarding has not been launched" description="The engagement team will publish the onboarding plan here." />
        )}
      </section>
    </div>
  )
}
