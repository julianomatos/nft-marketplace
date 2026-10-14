import { expect, test } from '@playwright/test'
import {
  apiErrorEnvelopeSchema,
  cartItemInputSchema,
  createOrderRequestSchema,
  ethAmountSchema,
  positiveQuantitySchema,
  walletUpsertRequestSchema,
  type ApiErrorEnvelope,
  type CartItemInput,
  type CreateOrderRequest,
  type NftListResponse,
  type WalletUpsertRequest,
} from '../src/types/contracts'
import {
  socketEventSchema,
  type SocketEvent,
} from '../src/types/events'

const validCartItem: CartItemInput = {
  nftId: 'emerald-ape-042',
  editionId: 'edition-1-50',
  quantity: 2,
}

const validOrderRequest: CreateOrderRequest = {
  quoteId: 'quote-123',
  provider: 'metamask',
  walletId: 'wallet-primary',
  collector: {
    displayName: 'Collector',
    username: 'collector',
    profileName: 'Collector profile',
    email: 'collector@example.test',
    walletAddress: `0x${'1'.repeat(40)}`,
    walletType: 'metamask',
    network: 'ethereum',
    ensName: 'collector.kurio.eth',
    referralCode: 'KURIO-123',
  },
}

const validNftList: NftListResponse = {
  items: [],
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  facets: {
    categories: [],
    networks: [],
    priceRange: { min: '0.02', max: '12.30' },
  },
}

const validApiError: ApiErrorEnvelope = {
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Revise os campos.',
    fieldErrors: { email: 'E-mail inválido.' },
  },
}

const validWalletRequest: WalletUpsertRequest = {
  kind: 'primary',
  displayName: 'Collector',
  nickname: 'Principal',
  network: 'ethereum',
  profileName: 'Collector profile',
  address: `0x${'1'.repeat(40)}`,
  walletType: 'metamask',
  referralCode: 'KURIO-123',
  email: 'collector@example.test',
  ensName: 'collector.kurio.eth',
}

const validNftEvent: SocketEvent = {
  eventId: 'evt-nft-1',
  type: 'nft.updated',
  resource: { kind: 'nft', id: 'emerald-ape-042' },
  version: 1,
  timestamp: '2026-10-14T09:00:00.000Z',
  data: {
    nftId: 'emerald-ape-042',
    price: '1.19',
    editionId: 'edition-1-50',
    availableEdition: 8,
  },
}

test('valid REST contract examples satisfy their request and response types', () => {
  expect(cartItemInputSchema.parse(validCartItem)).toEqual(validCartItem)
  expect(createOrderRequestSchema.parse(validOrderRequest)).toEqual(
    validOrderRequest,
  )
  expect(apiErrorEnvelopeSchema.parse(validApiError)).toEqual(validApiError)
  expect(walletUpsertRequestSchema.parse(validWalletRequest)).toEqual(
    validWalletRequest,
  )
  expect(
    walletUpsertRequestSchema.safeParse({
      ...validWalletRequest,
      address: 'not-an-ethereum-address',
    }).success,
  ).toBe(false)
  expect(validNftList.facets.priceRange.max).toBe('12.30')
})

test('ETH amounts accept decimal strings and reject localized or exponent notation', () => {
  expect(ethAmountSchema.safeParse('0.125').success).toBe(true)
  expect(ethAmountSchema.safeParse('12').success).toBe(true)
  expect(ethAmountSchema.safeParse('0,125').success).toBe(false)
  expect(ethAmountSchema.safeParse('1e-3').success).toBe(false)
})

test('quantities must be positive integers', () => {
  expect(positiveQuantitySchema.safeParse(1).success).toBe(true)
  expect(positiveQuantitySchema.safeParse(1.5).success).toBe(false)
  expect(positiveQuantitySchema.safeParse(0).success).toBe(false)
})

test('received socket events require a stable eventId and valid envelope', () => {
  expect(socketEventSchema.safeParse(validNftEvent).success).toBe(true)

  const eventWithoutId = structuredClone(validNftEvent)
  Reflect.deleteProperty(eventWithoutId, 'eventId')
  expect(socketEventSchema.safeParse(eventWithoutId).success).toBe(false)
})

test('order events require the owning user and a terminal result', () => {
  const validOrderEvent = {
    eventId: 'evt-order-1',
    type: 'order.updated',
    resource: { kind: 'order', id: 'order-123' },
    version: 1,
    timestamp: '2026-10-14T09:00:00.000Z',
    userId: 'collector-1',
    data: {
      orderId: 'order-123',
      status: 'confirmed',
      transactionHash: `0x${'a'.repeat(64)}`,
    },
  } satisfies SocketEvent

  expect(socketEventSchema.safeParse(validOrderEvent).success).toBe(true)

  const privateEventWithoutUser = structuredClone(validOrderEvent)
  Reflect.deleteProperty(privateEventWithoutUser, 'userId')
  expect(socketEventSchema.safeParse(privateEventWithoutUser).success).toBe(
    false,
  )
})
