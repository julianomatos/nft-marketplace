import { useMutation } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/hooks/queryKeys'
import { API_ENDPOINTS } from '@/types/endpoints'
import {
  apiClient,
  notifySessionChanged,
  setSessionToken,
} from '@/services/api-client'
import { clearPrivateSessionStorage } from '@/utils/auth-return-context'
import { disconnectSessionSockets } from '@/services/socket-registry'

function clearClientSession(): void {
  queryClient.clear()
  setSessionToken(null)
  clearPrivateSessionStorage()
  disconnectSessionSockets()
  queryClient.setQueryData(queryKeys.auth.session, {
    authenticated: false,
    user: null,
  })
  notifySessionChanged()
}

function useLogout() {
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(API_ENDPOINTS.auth.logout)
    },
    onSettled: clearClientSession,
  })
}

export { clearClientSession, useLogout }
