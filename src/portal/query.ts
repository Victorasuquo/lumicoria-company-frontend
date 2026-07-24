import { QueryClient } from '@tanstack/react-query'

export const portalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = typeof error === 'object' && error && 'status' in error
          ? Number(error.status)
          : 0
        if ([401, 403, 404, 409, 412, 422, 428].includes(status)) return false
        return failureCount < 2
      },
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
