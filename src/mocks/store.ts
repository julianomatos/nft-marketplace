import type {
  CartRecord,
  FavoriteRecord,
  FixtureUser,
  NftRecord,
  OrderRecord,
  ReviewRecord,
  WalletRecord,
} from './types'
import {
  designCart,
  emptyCarts,
  favorites,
  nfts,
  orders,
  reviews,
  users,
  wallets,
} from './fixtures'

export const MOCK_STATE_STORAGE_KEY = 'kurio.mock.state'

export type MockScenario =
  | 'success'
  | 'empty'
  | 'design-cart'
  | 'expired-session'
  | 'network-error'
  | 'validation-error'

export type MockSessionState = {
  userId: string | null
  token: string | null
  expiresAt: string | null
}

export type MockState = {
  scenario: MockScenario
  lastResetAt: string
  session: MockSessionState
  users: readonly FixtureUser[]
  nfts: readonly NftRecord[]
  favorites: readonly FavoriteRecord[]
  carts: readonly CartRecord[]
  orders: readonly OrderRecord[]
  wallets: readonly WalletRecord[]
  reviews: readonly ReviewRecord[]
}

const defaultSession: MockSessionState = {
  userId: null,
  token: null,
  expiresAt: null,
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getStorage(): Storage | null {
  const storage = typeof window !== 'undefined'
    ? window.localStorage
    : globalThis.localStorage

  if (!storage) return null

  try {
    return storage
  } catch {
    return null
  }
}

export function resolveMockScenario(
  value?: string | null,
): MockScenario {
  const scenario = value ??
    (typeof import.meta !== 'undefined' ? import.meta.env.VITE_MOCK_SCENARIO : undefined) ??
    'success'

  switch (scenario) {
    case 'empty':
    case 'design-cart':
    case 'expired-session':
    case 'network-error':
    case 'validation-error':
      return scenario
    case 'success':
    default:
      return 'success'
  }
}

export function createMockState(scenario: MockScenario = 'success'): MockState {
  const nextState: MockState = {
    scenario,
    lastResetAt: new Date().toISOString(),
    session: clone(defaultSession),
    users: clone(users) as readonly FixtureUser[],
    nfts: clone(nfts) as readonly NftRecord[],
    favorites: clone(favorites) as readonly FavoriteRecord[],
    carts: clone(emptyCarts) as readonly CartRecord[],
    orders: clone(orders) as readonly OrderRecord[],
    wallets: clone(wallets) as readonly WalletRecord[],
    reviews: clone(reviews) as readonly ReviewRecord[],
  }

  if (scenario === 'design-cart') {
    nextState.carts = [
      clone(designCart),
      ...clone(emptyCarts).filter(({ userId }) => userId !== 'collector-ana'),
    ] as readonly CartRecord[]
  }

  if (scenario === 'expired-session') {
    nextState.session = {
      userId: 'collector-ana',
      token: 'expired-session-token',
      expiresAt: '2020-01-01T00:00:00.000Z',
    }
  }

  if (scenario === 'success') {
    nextState.session = {
      userId: 'collector-ana',
      token: 'mock-token-collector-ana',
      expiresAt: '2099-01-01T00:00:00.000Z',
    }
  }

  return nextState
}

export function readMockState(): MockState {
  const storage = getStorage()
  if (!storage) {
    return createMockState(resolveMockScenario())
  }

  try {
    const raw = storage.getItem(MOCK_STATE_STORAGE_KEY)
    if (!raw) {
      return resetMockState(resolveMockScenario())
    }

    const parsed = JSON.parse(raw) as Partial<MockState>
    if (!parsed || typeof parsed !== 'object') {
      return resetMockState(resolveMockScenario())
    }

    return {
      scenario: resolveMockScenario(parsed.scenario),
      lastResetAt: parsed.lastResetAt ?? new Date().toISOString(),
      session: { ...defaultSession, ...(parsed.session ?? {}) },
      users: Array.isArray(parsed.users) ? (parsed.users as readonly FixtureUser[]) : (clone(users) as readonly FixtureUser[]),
      nfts: Array.isArray(parsed.nfts) ? (parsed.nfts as readonly NftRecord[]) : (clone(nfts) as readonly NftRecord[]),
      favorites: Array.isArray(parsed.favorites) ? (parsed.favorites as readonly FavoriteRecord[]) : (clone(favorites) as readonly FavoriteRecord[]),
      carts: Array.isArray(parsed.carts) ? (parsed.carts as readonly CartRecord[]) : (clone(emptyCarts) as readonly CartRecord[]),
      orders: Array.isArray(parsed.orders) ? (parsed.orders as readonly OrderRecord[]) : (clone(orders) as readonly OrderRecord[]),
      wallets: Array.isArray(parsed.wallets) ? (parsed.wallets as readonly WalletRecord[]) : (clone(wallets) as readonly WalletRecord[]),
      reviews: Array.isArray(parsed.reviews) ? (parsed.reviews as readonly ReviewRecord[]) : (clone(reviews) as readonly ReviewRecord[]),
    }
  } catch {
    return resetMockState(resolveMockScenario())
  }
}

export function persistMockState(state: MockState): MockState {
  const storage = getStorage()
  if (storage) {
    storage.setItem(MOCK_STATE_STORAGE_KEY, JSON.stringify(state))
  }
  return state
}

export function resetMockState(scenario?: string): MockState {
  const nextScenario = resolveMockScenario(scenario)
  const nextState = createMockState(nextScenario)
  return persistMockState(nextState)
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder()
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    encoder.encode(`${salt}:${password}`),
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function validatePassword(
  user: FixtureUser,
  password: string,
): Promise<boolean> {
  const hash = await hashPassword(password, user.passwordSalt)
  return hash === user.passwordHash
}
