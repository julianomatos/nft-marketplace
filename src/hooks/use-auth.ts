import { useMutation } from '@tanstack/react-query'
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '@/types/contracts'
import { API_ENDPOINTS } from '@/types/endpoints'
import { apiClient } from '@/services/api-client'

function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>(
        API_ENDPOINTS.auth.login,
        payload,
      )
      return response.data
    },
  })
}

function useSignup() {
  return useMutation({
    mutationFn: async (payload: SignupRequest) => {
      const response = await apiClient.post<SignupResponse>(
        API_ENDPOINTS.auth.signup,
        payload,
      )
      return response.data
    },
  })
}

export { useLogin, useSignup }
