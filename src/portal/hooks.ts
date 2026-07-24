import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import { portalFetch } from '../api/client'
import type { ApiCollection, Engagement } from '../api/types'
import { usePortalAuth } from '../auth/AuthProvider'

export function usePortalQuery<T>(
  key: readonly unknown[],
  path: string | null,
  options: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'> = {},
) {
  const { context } = usePortalAuth()
  return useQuery<T, Error>({
    queryKey: ['portal', context?.organization_id, ...key],
    queryFn: async () => {
      if (!path || !context?.organization_id) {
        throw new Error('Portal context is unavailable.')
      }
      const { data } = await portalFetch<T>(path, {
        organizationId: context.organization_id,
      })
      return data
    },
    enabled: Boolean(path && context?.organization_id) && options.enabled !== false,
    ...options,
  })
}

export function useEngagements() {
  return usePortalQuery<ApiCollection<Engagement>>(
    ['engagements'],
    '/engagements?page_size=100',
  )
}

export function useSelectedEngagement() {
  const { selectedEngagementId } = usePortalAuth()
  const engagementsQuery = useEngagements()
  const engagement = engagementsQuery.data?.items.find(
    ({ id }) => id === selectedEngagementId,
  ) ?? null

  return {
    engagement,
    engagementId: engagement?.id ?? selectedEngagementId,
    engagementsQuery,
  }
}
