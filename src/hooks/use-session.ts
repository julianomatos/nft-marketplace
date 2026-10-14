import { useQuery } from '@tanstack/react-query'
import { authSessionResponseSchema } from '@/types/contracts'
import { queryKeys } from '@/hooks/queryKeys'
import { queryStaleTimes } from '@/lib/query-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import { ApiClientError } from '@/utils/errors'
import {
  apiClient,
  getSessionToken,
  setSessionToken,
} from '@/services/api-client'

function useSession() {
  const token = getSessionToken()

  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async ({ signal }) => {
      if (!getSessionToken()) {
        return { authenticated: false, user: null } as const
      }

      try {
        const response = await apiClient.get<unknown>(
          API_ENDPOINTS.auth.session,
          { signal },
        )
        const session = authSessionResponseSchema.parse(response.data)
        if (!session.authenticated) setSessionToken(null)
        return session
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          (error.status === 401 || error.code === 'SESSION_EXPIRED')
        ) {
          setSessionToken(null)
        }
        throw error
      }
    },
    enabled: token !== null,
    staleTime: queryStaleTimes.session,
  })
}

export { useSession }
