import { http, HttpResponse } from 'msw'
import { API_ENDPOINTS } from '../../types/endpoints'
import {
  passwordUpdateRequestSchema,
  profileUpdateRequestSchema,
  type Profile,
} from '../../types/contracts'
import {
  hashPassword,
  persistMockState,
  readMockState,
  validatePassword,
} from '../store'
import {
  buildErrorResponse,
  formatZodErrors,
  getAuthenticatedUser,
  HANDLER_BASE_PATH,
} from './utils'

export const profileHandlers = [
  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.profile.current}`, ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const profile: Profile = {
      displayName: auth.user.displayName,
      username: auth.user.username,
      email: auth.user.email,
      ensName: auth.user.ensName,
      walletNickname: 'Principal',
      avatar: auth.user.avatar,
      referralCode: auth.user.referralCode,
    }

    return HttpResponse.json(profile)
  }),

  http.put(`${HANDLER_BASE_PATH}${API_ENDPOINTS.profile.current}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = profileUpdateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os dados do perfil e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const state = readMockState()
    const nextUsers = state.users.map((user) => {
      if (user.id !== auth.user!.id) return user
      return {
        ...user,
        displayName: parsed.data.displayName,
        username: parsed.data.username,
        email: parsed.data.email,
        ensName: parsed.data.ensName,
        avatar: parsed.data.avatar ?? user.avatar,
      }
    })

    persistMockState({ ...state, users: nextUsers })

    const updatedProfile: Profile = {
      displayName: parsed.data.displayName,
      username: parsed.data.username,
      email: parsed.data.email,
      ensName: parsed.data.ensName,
      walletNickname: parsed.data.walletNickname,
      avatar: parsed.data.avatar ?? auth.user.avatar,
      referralCode: auth.user.referralCode,
    }

    return HttpResponse.json(updatedProfile)
  }),

  http.put(`${HANDLER_BASE_PATH}${API_ENDPOINTS.profile.password}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = passwordUpdateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os campos da senha e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const { currentPassword, newPassword } = parsed.data
    const isValid = await validatePassword(auth.user, currentPassword)
    if (!isValid) {
      return buildErrorResponse(
        'INVALID_CREDENTIALS',
        'A senha atual informada está incorreta.',
        undefined,
        { currentPassword: ['A senha atual informada está incorreta.'] },
      )
    }

    const newHash = await hashPassword(newPassword, auth.user.passwordSalt)
    const state = readMockState()
    const nextUsers = state.users.map((user) => {
      if (user.id !== auth.user!.id) return user
      return {
        ...user,
        passwordHash: newHash,
      }
    })

    persistMockState({ ...state, users: nextUsers })
    return HttpResponse.json({ updated: true })
  }),
]
