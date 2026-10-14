import { expect, test } from '@playwright/test'
import {
  apiErrorEnvelopeSchema,
  cartItemInputSchema,
  createOrderRequestSchema,
  ethAmountSchema,
  nftSearchParamsSchema,
  passwordUpdateRequestSchema,
  positiveQuantitySchema,
  quoteResponseSchema,
  walletUpsertRequestSchema,
  type ApiErrorEnvelope,
  type CartItem,
  type CartItemInput,
  type ConnectWalletRequest,
  type CreateOrderRequest,
  type NftEdition,
  type NftListResponse,
  type OrderReceiptSnapshot,
  type QuoteResponse,
  type WalletUpsertRequest,
} from '../../src/types/contracts'
import { API_ERROR_STATUS } from '../../src/types/endpoints'
import {
  socketEventSchema,
  type SocketEvent,
} from '../../src/types/events'
import {
  serializeSearchArray,
  updateNftSearchParams,
} from '../../src/utils/search-params'

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
    fieldErrors: { email: ['E-mail inválido.'] },
  },
}

const validQuote: QuoteResponse = {
  quoteId: 'quote-123',
  items: [{
    nftId: 'emerald-ape-042',
    editionId: 'edition-1-50',
    edition: '1/50',
    quantity: 2,
    unitPrice: '0.125',
    lineTotal: '0.25',
    available: 8,
  }],
  subtotal: '0.25',
  discount: '0',
  networkFee: '0.01',
  total: '0.26',
  coupon: null,
  expiresAt: '2026-10-14T09:15:00.000Z',
  version: 1,
}

const validCartItemResponse: CartItem = {
  id: 'cart-item-1',
  nftId: 'emerald-ape-042',
  editionId: 'edition-1-50',
  edition: '1/50',
  quantity: 2,
  unitPrice: '0.125',
  lineTotal: '0.25',
  available: 8,
  nft: {
    id: 'emerald-ape-042',
    tokenId: '0042',
    name: 'Emerald Ape',
    collection: 'Kurio Apes',
    price: '0.125',
    images: [],
  },
}

const validReceipt: OrderReceiptSnapshot = {
  orderId: 'order-123',
  version: 1,
  quoteId: 'quote-123',
  status: 'confirmed',
  transactionHash: null,
  network: 'ethereum',
  explorerUrl: null,
  provider: 'metamask',
  wallet: { nickname: 'Principal', address: `0x${'1'.repeat(40)}` },
  items: [{
    nftId: 'emerald-ape-042',
    name: 'Emerald Ape',
    tokenId: '0042',
    edition: '1/50',
    quantity: 2,
    unitPrice: '0.125',
    subtotal: '0.25',
  }],
  subtotal: '0.25',
  discount: '0',
  fee: '0.01',
  total: '0.26',
  createdAt: '2026-10-14T09:00:00.000Z',
}

const validConnectWalletRequest: ConnectWalletRequest = {
  provider: 'metamask',
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
    editions: [{ id: 'edition-1-50', available: 8 }],
  },
}

test('valid REST contract examples satisfy their request and response types', () => {
  expect(cartItemInputSchema.parse(validCartItem)).toEqual(validCartItem)
  expect(createOrderRequestSchema.parse(validOrderRequest)).toEqual(
    validOrderRequest,
  )
  expect(apiErrorEnvelopeSchema.parse(validApiError)).toEqual(validApiError)
  expect(quoteResponseSchema.parse(validQuote)).toEqual(validQuote)
  expect(validCartItemResponse.lineTotal).toBe('0.25')
  expect(validReceipt).toMatchObject({
    quoteId: 'quote-123',
    subtotal: '0.25',
    discount: '0',
    items: [{ unitPrice: '0.125' }],
  })
  expect(validConnectWalletRequest.provider).toBe('metamask')
  expect(
    apiErrorEnvelopeSchema.parse({
      error: {
        code: 'PRICE_CHANGED',
        message: 'Revise a cotação.',
        details: { quote: validQuote },
      },
    }).error.details,
  ).toEqual({ quote: validQuote })
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
  expect(ethAmountSchema.safeParse(`1.${'1'.repeat(18)}`).success).toBe(true)
  expect(ethAmountSchema.safeParse(`1.${'1'.repeat(19)}`).success).toBe(false)
})

test('quantities must be positive integers', () => {
  expect(positiveQuantitySchema.safeParse(1).success).toBe(true)
  expect(positiveQuantitySchema.safeParse(1.5).success).toBe(false)
  expect(positiveQuantitySchema.safeParse(0).success).toBe(false)
})

test('catalog search defaults malformed values and serializes array filters as JSON', () => {
  expect(nftSearchParamsSchema.parse({})).toMatchObject({
    sort: 'recent',
    page: 1,
    limit: 9,
  })

  expect(
    nftSearchParamsSchema.parse({
      category: serializeSearchArray(['art', 'collectibles']),
      network: serializeSearchArray(['ethereum', 'solana']),
    }),
  ).toMatchObject({
    category: ['art', 'collectibles'],
    network: ['ethereum', 'solana'],
  })

  expect(
    nftSearchParamsSchema.parse({
      page: '0',
      limit: 'not-a-number',
      sort: 'unknown',
      minPrice: '1e-3',
      network: serializeSearchArray(['not-a-network']),
    }),
  ).toMatchObject({ page: 1, limit: 9, sort: 'recent' })

  const current = nftSearchParamsSchema.parse({ page: 4 })
  expect(updateNftSearchParams(current, { category: ['art'] })).toMatchObject({
    page: 1,
    category: ['art'],
  })
})

test('password and wallet contracts enforce the documented validation rules', () => {
  expect(
    passwordUpdateRequestSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'new-password',
      confirmPassword: 'different-password',
    }).success,
  ).toBe(false)
  expect(
    passwordUpdateRequestSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'short',
      confirmPassword: 'short',
    }).success,
  ).toBe(false)
  expect(
    walletUpsertRequestSchema.safeParse({
      ...validWalletRequest,
      network: 'solana',
      address: '1'.repeat(32),
    }).success,
  ).toBe(true)
  expect(
    walletUpsertRequestSchema.safeParse({
      ...validWalletRequest,
      network: 'solana',
      address: '1'.repeat(31),
    }).success,
  ).toBe(false)

  const openEdition: NftEdition = {
    id: 'open',
    label: 'ABERTA',
    supply: null,
    available: 500,
  }
  expect(openEdition.supply).toBeNull()
})

test('received socket events require a stable eventId and valid envelope', () => {
  expect(socketEventSchema.safeParse(validNftEvent).success).toBe(true)

  const eventWithoutId = structuredClone(validNftEvent)
  Reflect.deleteProperty(eventWithoutId, 'eventId')
  expect(socketEventSchema.safeParse(eventWithoutId).success).toBe(false)
  expect(
    socketEventSchema.safeParse({
      ...validNftEvent,
      resource: { kind: 'nft', id: 'another-nft' },
    }).success,
  ).toBe(false)
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
  expect(
    socketEventSchema.safeParse({
      ...validOrderEvent,
      data: { ...validOrderEvent.data, orderId: 'another-order' },
    }).success,
  ).toBe(false)

  const privateEventWithoutUser = structuredClone(validOrderEvent)
  Reflect.deleteProperty(privateEventWithoutUser, 'userId')
  expect(socketEventSchema.safeParse(privateEventWithoutUser).success).toBe(
    false,
  )
})

test('error codes have shared HTTP statuses', () => {
  expect(API_ERROR_STATUS.INVALID_CREDENTIALS).toBe(401)
  expect(API_ERROR_STATUS.COUPON_INVALID).toBe(422)
  expect(API_ERROR_STATUS.TRANSIENT_FAILURE).toBe(503)
})
