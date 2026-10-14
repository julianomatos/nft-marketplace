import { expect, test } from '@playwright/test'
import { persistAuthenticatedSession } from '../../src/hooks/use-auth'
import { clearClientSession } from '../../src/hooks/use-logout'
import { queryClient } from '../../src/lib/query-client'
import { queryKeys } from '../../src/hooks/queryKeys'
import type { AuthResponse, User } from '../../src/types/contracts'

const ana: User = {
  id: 'collector-ana',
  displayName: 'Ana Oliveira',
  username: 'ana-oliveira',
  email: 'ana@kurio.example.test',
  ensName: 'ana.kurio.eth',
  referralCode: 'KURIO-ANA-042',
}

const caio: User = {
  id: 'collector-caio',
  displayName: 'Caio Martins',
  username: 'caio-martins',
  email: 'caio@kurio.example.test',
  ensName: 'caio.kurio.eth',
  referralCode: 'KURIO-CAIO-009',
}

function authenticatedResponse(user: User): AuthResponse {
  return {
    token: `token-${user.id}`,
    expiresAt: '2026-10-15T00:00:00.000Z',
    user,
  }
}

test.beforeEach(() => {
  queryClient.clear()
})

test.afterEach(() => {
  queryClient.clear()
})

test('switching identities removes previous private queries before caching the new session', () => {
  queryClient.setQueryData(queryKeys.auth.session, {
    authenticated: true,
    user: ana,
    expiresAt: '2026-10-15T00:00:00.000Z',
  })
  queryClient.setQueryData(queryKeys.user(ana.id).profile, {
    displayName: ana.displayName,
  })
  queryClient.setQueryData(queryKeys.user(ana.id).cart, { items: [] })

  persistAuthenticatedSession(authenticatedResponse(caio))

  expect(queryClient.getQueryData(queryKeys.user(ana.id).profile)).toBeUndefined()
  expect(queryClient.getQueryData(queryKeys.user(ana.id).cart)).toBeUndefined()
  expect(queryClient.getQueryData(queryKeys.auth.session)).toMatchObject({
    authenticated: true,
    user: { id: caio.id },
  })
})

test('logout clears every query and leaves an explicit guest session', () => {
  queryClient.setQueryData(queryKeys.auth.session, {
    authenticated: true,
    user: ana,
    expiresAt: '2026-10-15T00:00:00.000Z',
  })
  queryClient.setQueryData(queryKeys.user(ana.id).profile, {
    displayName: ana.displayName,
  })

  clearClientSession()

  expect(queryClient.getQueryData(queryKeys.user(ana.id).profile)).toBeUndefined()
  expect(queryClient.getQueryData(queryKeys.auth.session)).toEqual({
    authenticated: false,
    user: null,
  })
})
