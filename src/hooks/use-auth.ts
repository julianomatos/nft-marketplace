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
import {
  clearGuestCartItems,
  readGuestCartItems,
} from '@/utils/guest-cart'

async function mergeGuestCartOnLogin(): Promise<void> {
  const guestItems = readGuestCartItems()
  if (guestItems.length === 0) return

  await apiClient.post(API_ENDPOINTS.cart.merge, { items: guestItems })
  clearGuestCartItems()
}

async function persistAuthenticatedSession(
  response: LoginResponse | SignupResponse,
): Promise<void> {
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

  try {
    await mergeGuestCartOnLogin()
  } catch {
    // Keep the user signed in and retain the guest cart for a later retry.
  }
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
