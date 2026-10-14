import { expect, test } from '@playwright/test'
import { users } from '../../src/mocks/fixtures'
import {
  hashPassword,
  persistMockState,
  getMockNow,
  getMockLatency,
  getMockTimeoutResponseDelay,
  MOCK_TIMEOUT_RESPONSE_DELAY_MS,
  nextMockRequestSequence,
  readMockState,
  resetMockState,
  setMockLatency,
  setMockNow,
  setMockTimeoutResponseDelay,
  validatePassword,
} from '../../src/mocks/store'

const knownPasswords = {
  'ana@kurio.example.test': 'KurioDemo!A2026',
  'caio@kurio.example.test': 'KurioDemo!B2026',
} as const

test('Node memory storage supports persistence, complete reset, controlled time, and fixture hashes', async () => {
  expect(typeof window).toBe('undefined')
  expect(typeof globalThis.localStorage).toBe('undefined')
  const initial = resetMockState('success')
  persistMockState({
    ...initial,
    scenario: 'empty',
    nfts: [],
    favorites: [],
    carts: [],
    orders: [],
    wallets: [],
    reviews: [],
    idempotencyRecords: {
      'collector-ana:key': { payloadHash: 'hash', orderId: 'order-1' },
    },
  })
  setMockNow('2026-07-30T12:00:00.000Z')
  setMockLatency(25)
  setMockTimeoutResponseDelay(50)
  expect(nextMockRequestSequence()).toBe(1)

  expect(readMockState()).toMatchObject({
    scenario: 'empty',
    nfts: [],
    idempotencyRecords: {
      'collector-ana:key': { payloadHash: 'hash', orderId: 'order-1' },
    },
  })
  expect(getMockNow()).toBe('2026-07-30T12:00:00.000Z')

  const nextState = resetMockState('design-cart')

  expect(nextState.scenario).toBe('design-cart')
  expect(nextState.lastResetAt).toBe('2026-07-29T12:00:00.000Z')
  expect(getMockNow()).toBe('2026-07-29T12:00:00.000Z')
  expect(getMockLatency()).toBe(0)
  expect(getMockTimeoutResponseDelay()).toBe(MOCK_TIMEOUT_RESPONSE_DELAY_MS)
  expect(nextMockRequestSequence()).toBe(1)
  expect(nextState.session.userId).toBe('collector-ana')
  expect(nextState.nfts).toHaveLength(40)
  expect(nextState.carts.find(({ userId }) => userId === 'collector-ana')?.cart.items)
    .toHaveLength(3)
  expect(nextState.favorites.length).toBeGreaterThan(0)
  expect(nextState.wallets).toHaveLength(3)
  expect(nextState.reviews.length).toBeGreaterThan(0)
  expect(nextState.orders).toEqual([])
  expect(nextState.idempotencyRecords).toEqual({})
  expect(readMockState().scenario).toBe('design-cart')

  for (const user of users) {
    const password = knownPasswords[user.email as keyof typeof knownPasswords]
    const hash = await hashPassword(password, user.passwordSalt)
    expect(hash).toBe(user.passwordHash)

    expect(await validatePassword(user, password)).toBe(true)
    expect(await validatePassword(user, `${password}!wrong`)).toBe(false)
  }

  resetMockState('success')
})
