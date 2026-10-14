import { http, HttpResponse } from 'msw'
import { API_ENDPOINTS } from '../../types/endpoints'
import { loginRequestSchema, signupRequestSchema } from '../../types/contracts'
import {
  getMockNow,
  hashPassword,
  persistMockState,
  readMockState,
  validatePassword,
} from '../store'
import type { FixtureUser } from '../types'
import {
  buildErrorResponse,
  formatZodErrors,
  getAuthenticatedUser,
  HANDLER_BASE_PATH,
  writeSessionToken,
} from './utils'

export const authHandlers = [
  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.auth.signup}`, async ({ request }) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = signupRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os campos destacados e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const { email, password, displayName } = parsed.data
    const state = readMockState()

    if (state.users.some((user) => user.email === email)) {
      return buildErrorResponse(
        'EMAIL_TAKEN',
        'Este e-mail já está cadastrado.',
        undefined,
        { email: ['Este e-mail já está cadastrado.'] },
      )
    }

    const normalizedEmail = email.toLowerCase()
    const userSlug = normalizedEmail.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const userKey = encodeURIComponent(normalizedEmail)
    const passwordSalt = `kurio-signup-salt-${userKey}`
    const passwordHash = await hashPassword(password, passwordSalt)
    const latestState = readMockState()

    if (latestState.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return buildErrorResponse(
        'EMAIL_TAKEN',
        'Este e-mail já está cadastrado.',
        undefined,
        { email: ['Este e-mail já está cadastrado.'] },
      )
    }

    const nowMs = new Date(getMockNow()).getTime()
    const newUser: FixtureUser = {
      id: `collector-signup-${userKey}`,
      displayName,
      username: displayName.toLowerCase().replace(/\s+/g, '-'),
      email,
      ensName: `${displayName.toLowerCase().replace(/\s+/g, '-')}.kurio.eth`,
      referralCode: `KURIO-${userSlug.toUpperCase()}-${latestState.users.length + 1}`,
      avatar: '/assets/nfts/emerald-ape-480.webp',
      passwordSalt,
      passwordHash,
      walletIds: [],
    }

    const token = `mock-token-${newUser.id}-${nowMs}`
    const expiresAt = new Date(nowMs + 1000 * 60 * 60 * 24).toISOString()

    persistMockState({
      ...latestState,
      users: [...latestState.users, newUser],
      session: {
        userId: newUser.id,
        token,
        expiresAt,
      },
    })
    writeSessionToken(token)

    return HttpResponse.json({
      token,
      expiresAt,
      user: {
        id: newUser.id,
        displayName: newUser.displayName,
        username: newUser.username,
        email: newUser.email,
        ensName: newUser.ensName,
        referralCode: newUser.referralCode,
        avatar: newUser.avatar,
      },
    })
  }),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.auth.login}`, async ({ request }) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = loginRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os campos destacados e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const { email, password } = parsed.data
    const state = readMockState()
    const user = state.users.find((entry) => entry.email === email)

    if (!user) {
      return buildErrorResponse(
        'INVALID_CREDENTIALS',
        'E-mail ou senha incorretos.',
        undefined,
        { email: ['E-mail ou senha incorretos.'] },
      )
    }

    const isValidPassword = await validatePassword(user, password)
    if (!isValidPassword) {
      return buildErrorResponse(
        'INVALID_CREDENTIALS',
        'E-mail ou senha incorretos.',
        undefined,
        { password: ['E-mail ou senha incorretos.'] },
      )
    }

    const nowMs = new Date(getMockNow()).getTime()
    const token = `mock-token-${user.id}-${nowMs}`
    const expiresAt = new Date(nowMs + 1000 * 60 * 60 * 24).toISOString()

    persistMockState({
      ...state,
      session: {
        userId: user.id,
        token,
        expiresAt,
      },
    })
    writeSessionToken(token)

    return HttpResponse.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        email: user.email,
        ensName: user.ensName,
        referralCode: user.referralCode,
        avatar: user.avatar,
      },
    })
  }),

  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.auth.session}`, ({ request }) => {
    const auth = getAuthenticatedUser(request)

    if (auth.error === 'SESSION_EXPIRED') {
      return buildErrorResponse('SESSION_EXPIRED', 'Sua sessão expirou. Faça login novamente.')
    }

    if (!auth.user) {
      return HttpResponse.json({ authenticated: false, user: null }, { status: 200 })
    }

    return HttpResponse.json({
      authenticated: true,
      user: {
        id: auth.user.id,
        displayName: auth.user.displayName,
        username: auth.user.username,
        email: auth.user.email,
        ensName: auth.user.ensName,
        referralCode: auth.user.referralCode,
        avatar: auth.user.avatar,
      },
      expiresAt: auth.state.session.expiresAt ?? getMockNow(),
    })
  }),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.auth.logout}`, () => {
    const state = readMockState()
    persistMockState({
      ...state,
      session: {
        userId: null,
        token: null,
        expiresAt: null,
      },
    })
    writeSessionToken(null)

    return HttpResponse.json({ loggedOut: true })
  }),
]
