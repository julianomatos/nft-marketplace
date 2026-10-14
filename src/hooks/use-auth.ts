import { useMutation } from '@tanstack/react-query'
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '@/types/contracts'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/hooks/queryKeys'
import { API_ENDPOINTS } from '@/types/endpoints'
import { apiClient, setSessionToken } from '@/services/api-client'
import { authResponseSchema } from '@/types/contracts'
import { clearPrivateSessionStorage } from '@/utils/auth-return-context'
import { disconnectSessionSockets } from '@/services/socket-registry'

function persistAuthenticatedSession(
  response: LoginResponse | SignupResponse,
): void {
  const previousSession = queryClient.getQueryData<{
    authenticated: boolean
    user?: { id: string }
  }>(queryKeys.auth.session)
  const switchedUser =
    previousSession?.authenticated === true &&
    previousSession.user?.id !== response.user.id

  if (switchedUser && previousSession.user) {
    clearPrivateSessionStorage()
    disconnectSessionSockets(previousSession.user.id)
  }
  queryClient.clear()
  setSessionToken(response.token)
  queryClient.setQueryData(queryKeys.auth.session, {
    authenticated: true,
    user: response.user,
    expiresAt: response.expiresAt,
  })
}

function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.auth.login,
        payload,
      )
      return authResponseSchema.parse(response.data)
    },
    onSuccess: persistAuthenticatedSession,
  })
}

function useSignup() {
  return useMutation({
    mutationFn: async (payload: SignupRequest) => {
      const response = await apiClient.post<SignupResponse>(
        API_ENDPOINTS.auth.signup,
        payload,
      )
      return authResponseSchema.parse(response.data)
    },
    onSuccess: persistAuthenticatedSession,
  })
}

export { persistAuthenticatedSession, useLogin, useSignup }
