import type { PositiveInteger, Cart } from '../types/contracts'
import { mul } from '../utils/eth'
import type {
  CartRecord,
  FavoriteRecord,
  FixtureUser,
  IdempotencyRecord,
  NftRecord,
  OrderRecord,
  ReviewRecord,
  WalletRecord,
} from './types'
import {
  designCart,
  emptyCarts,
  favorites,
  MOCK_NOW,
  nfts,
  orders,
  reviews,
  users,
  wallets,
} from './fixtures'
import {
  isMockScenario,
  mockScenarioSchema,
  type MockScenario,
} from './scenario-contract'

export const MOCK_STATE_STORAGE_KEY = 'kurio.mock.state'
export const SESSION_TOKEN_STORAGE_KEY = 'kurio.session.token'
export const MOCK_TIMEOUT_RESPONSE_DELAY_MS = 16_000

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
  idempotencyRecords: Record<string, IdempotencyRecord>
}

const defaultSession: MockSessionState = {
  userId: null,
  token: null,
  expiresAt: null,
}

class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

const memoryStorage = new MemoryStorage()

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // ignore
  }

  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
  } catch {
    // ignore
  }

  return memoryStorage
}

let currentMockTime: string | null = null
let mockRequestSequence = 0
let mockLatencyMs = 0
let mockTimeoutResponseDelayMs = MOCK_TIMEOUT_RESPONSE_DELAY_MS

export function getMockNow(): string {
  return currentMockTime ?? MOCK_NOW
}

export function setMockNow(isoString: string): void {
  currentMockTime = isoString
}

export function advanceMockNow(ms: number): void {
  const currentMs = new Date(getMockNow()).getTime()
  currentMockTime = new Date(currentMs + ms).toISOString()
}

export function resetMockNow(): void {
  currentMockTime = null
}

export function setMockLatency(milliseconds: number): void {
  if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 15_000) {
    throw new RangeError('Mock latency must be an integer between 0 and 15000 ms.')
  }
  mockLatencyMs = milliseconds
}

export function getMockLatency(): number {
  return mockLatencyMs
}

export function setMockTimeoutResponseDelay(milliseconds: number): void {
  if (!Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 60_000) {
    throw new RangeError('Mock timeout response delay must be an integer between 0 and 60000 ms.')
  }
  mockTimeoutResponseDelayMs = milliseconds
}

export function getMockTimeoutResponseDelay(): number {
  return mockTimeoutResponseDelayMs
}

export function nextMockRequestSequence(): number {
  mockRequestSequence += 1
  return mockRequestSequence
}

export function resolveMockScenario(
  value?: string | null,
): MockScenario {
  const configuredScenario =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MOCK_SCENARIO) ||
    undefined
  const scenario = value ?? configuredScenario ?? 'success'

  const parsed = mockScenarioSchema.safeParse(scenario)
  return parsed.success ? parsed.data : 'success'
}

export function createMockState(scenario: MockScenario = 'success'): MockState {
  const now = getMockNow()
  const nextState: MockState = {
    scenario,
    lastResetAt: now,
    session: clone(defaultSession),
    users: clone(users) as readonly FixtureUser[],
    nfts: clone(nfts) as readonly NftRecord[],
    favorites: clone(favorites) as readonly FavoriteRecord[],
    carts: clone(emptyCarts) as readonly CartRecord[],
    orders: clone(orders) as readonly OrderRecord[],
    wallets: clone(wallets) as readonly WalletRecord[],
    reviews: clone(reviews) as readonly ReviewRecord[],
    idempotencyRecords: {},
  }

  const purchaseScenarios: readonly MockScenario[] = [
    'design-cart',
    'price-changed',
    'sold-out',
    'timeout-after-order',
    'payment-confirmed',
    'payment-rejected',
  ]

  if (purchaseScenarios.includes(scenario)) {
    nextState.carts = [
      clone(designCart),
      ...clone(emptyCarts).filter(({ userId }) => userId !== 'collector-ana'),
    ] as readonly CartRecord[]
  }

  if (scenario === 'expired-session') {
    nextState.session = {
      userId: 'collector-ana',
      token: 'expired-session-token',
      expiresAt: new Date(new Date(now).getTime() - 1000 * 60).toISOString(),
    }
  }

  if (scenario === 'success' || purchaseScenarios.includes(scenario)) {
    nextState.session = {
      userId: 'collector-ana',
      token: 'mock-token-collector-ana',
      expiresAt: new Date(new Date(now).getTime() + 1000 * 60 * 60 * 24).toISOString(),
    }
  }

  return nextState
}

export function readMockState(): MockState {
  const storage = getStorage()

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
      scenario: isMockScenario(parsed.scenario)
        ? parsed.scenario
        : resolveMockScenario(),
      lastResetAt: parsed.lastResetAt ?? getMockNow(),
      session: { ...defaultSession, ...(parsed.session ?? {}) },
      users: Array.isArray(parsed.users) ? (parsed.users as readonly FixtureUser[]) : (clone(users) as readonly FixtureUser[]),
      nfts: Array.isArray(parsed.nfts) ? (parsed.nfts as readonly NftRecord[]) : (clone(nfts) as readonly NftRecord[]),
      favorites: Array.isArray(parsed.favorites) ? (parsed.favorites as readonly FavoriteRecord[]) : (clone(favorites) as readonly FavoriteRecord[]),
      carts: Array.isArray(parsed.carts) ? (parsed.carts as readonly CartRecord[]) : (clone(emptyCarts) as readonly CartRecord[]),
      orders: Array.isArray(parsed.orders) ? (parsed.orders as readonly OrderRecord[]) : (clone(orders) as readonly OrderRecord[]),
      wallets: Array.isArray(parsed.wallets) ? (parsed.wallets as readonly WalletRecord[]) : (clone(wallets) as readonly WalletRecord[]),
      reviews: Array.isArray(parsed.reviews) ? (parsed.reviews as readonly ReviewRecord[]) : (clone(reviews) as readonly ReviewRecord[]),
      idempotencyRecords: (parsed.idempotencyRecords && typeof parsed.idempotencyRecords === 'object') ? parsed.idempotencyRecords : {},
    }
  } catch {
    return resetMockState(resolveMockScenario())
  }
}

export function persistMockState(state: MockState): MockState {
  const storage = getStorage()
  storage.setItem(MOCK_STATE_STORAGE_KEY, JSON.stringify(state))
  return state
}

export function resetMockState(scenario?: string): MockState {
  resetMockNow()
  mockRequestSequence = 0
  mockLatencyMs = 0
  mockTimeoutResponseDelayMs = MOCK_TIMEOUT_RESPONSE_DELAY_MS
  const nextScenario = resolveMockScenario(scenario)
  const nextState = createMockState(nextScenario)
  try {
    if (typeof window !== 'undefined') {
      if (nextState.session.token) {
        window.sessionStorage.setItem(
          SESSION_TOKEN_STORAGE_KEY,
          nextState.session.token,
        )
      } else {
        window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY)
      }
    }
  } catch {
    // Session storage is optional in browser and test environments.
  }
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

export function settleOrder(
  orderId: string,
  outcome: 'confirmed' | 'rejected',
): OrderRecord {
  const state = readMockState()
  const orderIndex = state.orders.findIndex((o) => o.orderId === orderId)
  if (orderIndex === -1) {
    throw new Error(`Order ${orderId} not found`)
  }

  const currentOrder = state.orders[orderIndex]
  if (currentOrder.status === 'confirmed' || currentOrder.status === 'rejected') {
    throw new Error(
      `Cannot settle terminal order ${orderId} (current status: ${currentOrder.status})`,
    )
  }

  const nextVersion = (currentOrder.version + 1) as PositiveInteger

  if (outcome === 'rejected') {
    const updatedOrder: OrderRecord = {
      ...currentOrder,
      status: 'rejected',
      version: nextVersion,
    }
    const nextOrders = [...state.orders]
    nextOrders[orderIndex] = updatedOrder
    persistMockState({ ...state, orders: nextOrders })
    return updatedOrder
  }

  for (const item of currentOrder.items) {
    const nft = state.nfts.find((entry) => entry.id === item.nftId)
    const edition = nft?.editions.find((entry) => entry.label === item.edition)
    if (!edition || edition.available < item.quantity) {
      throw new Error(
        `Cannot confirm order ${orderId}: insufficient availability for ${item.nftId} (${item.edition})`,
      )
    }
  }

  // outcome === 'confirmed'
  const txHash = `0x${Array.from({ length: 64 }, (_, i) => ((i * 7 + 13) % 16).toString(16)).join('')}`
  const explorerUrl = currentOrder.network === 'polygon'
    ? `https://polygonscan.com/tx/${txHash}`
    : currentOrder.network === 'solana'
      ? `https://solscan.io/tx/${txHash}`
      : `https://etherscan.io/tx/${txHash}`

  const updatedOrder: OrderRecord = {
    ...currentOrder,
    status: 'confirmed',
    version: nextVersion,
    transactionHash: txHash,
    explorerUrl,
  }

  // Decrement edition availability for purchased items
  const nextNfts = state.nfts.map((nft) => {
    const purchasedForNft = currentOrder.items.filter((item) => item.nftId === nft.id)
    if (purchasedForNft.length === 0) return nft

    const nextEditions = nft.editions.map((edition) => {
      const matchingPurchased = purchasedForNft.find(
        (item) => item.edition === edition.label,
      )
      if (!matchingPurchased) return edition

      return {
        ...edition,
        available: edition.available - matchingPurchased.quantity,
      }
    })

    return {
      ...nft,
      editions: nextEditions,
      version: nft.version + 1,
    }
  })

  // Remove only purchased items and quantities from the user's cart
  const nextCarts = state.carts.map((cartRecord) => {
    if (cartRecord.userId !== currentOrder.userId) return cartRecord

    const remainingItems: Cart['items'] = []
    for (const cartItem of cartRecord.cart.items) {
      const purchased = currentOrder.items.find(
        (item) => item.nftId === cartItem.nftId && item.edition === cartItem.edition,
      )

      if (!purchased) {
        remainingItems.push(cartItem)
      } else if (cartItem.quantity > purchased.quantity) {
        const remainingQty = cartItem.quantity - purchased.quantity
        remainingItems.push({
          ...cartItem,
          quantity: remainingQty,
          lineTotal: mul(cartItem.unitPrice, String(remainingQty)),
        })
      }
    }

    return {
      ...cartRecord,
      cart: {
        ...cartRecord.cart,
        items: remainingItems,
      },
    }
  })

  const nextOrders = [...state.orders]
  nextOrders[orderIndex] = updatedOrder

  const nextState: MockState = {
    ...state,
    orders: nextOrders,
    nfts: nextNfts,
    carts: nextCarts,
  }
  persistMockState(nextState)
  return updatedOrder
}
