import { expect, test } from '@playwright/test'
import { setupServer } from 'msw/node'
import { handlers } from '../../src/mocks/handlers'
import { kurioMocks } from '../../src/mocks/control'
import { apiClient } from '../../src/services/api-client'
import { IDEMPOTENCY_KEY_HEADER } from '../../src/types/endpoints'

const server = setupServer(...handlers)
const authHeader = {
  headers: { Authorization: 'Bearer mock-token-collector-ana' },
}
const collector = {
  displayName: 'Ana Oliveira',
  username: 'ana-oliveira',
  profileName: 'Ana O.',
  email: 'ana@kurio.example.test',
  walletAddress: '0x1111111111111111111111111111111111111111',
  walletType: 'metamask',
  network: 'ethereum',
  ensName: 'ana.kurio.eth',
  referralCode: 'KURIO-ANA-042',
}

test.beforeAll(() => {
  apiClient.defaults.baseURL = 'http://localhost/api'
  server.listen({ onUnhandledRequest: 'error' })
})

test.afterAll(() => {
  server.close()
})

test.beforeEach(() => {
  server.resetHandlers()
  apiClient.defaults.timeout = 15_000
  kurioMocks.reset('success')
})

test('empty scenario returns a valid empty catalog result', async () => {
  kurioMocks.reset('empty')
  const response = await apiClient.get('/nfts')

  expect(response.data.items).toEqual([])
  expect(response.data.total).toBe(0)
  expect(response.data.totalPages).toBe(1)
})

test('network, server and unauthorized scenarios return their expected failures', async () => {
  kurioMocks.reset('network-error')
  await expect(apiClient.get('/nfts')).rejects.toMatchObject({
    code: 'NETWORK_ERROR',
  })

  kurioMocks.reset('server-error')
  await expect(apiClient.get('/nfts')).rejects.toMatchObject({
    code: 'TRANSIENT_FAILURE',
    status: 503,
  })

  kurioMocks.reset('unauthorized')
  await expect(apiClient.get('/favorites')).rejects.toMatchObject({
    code: 'UNAUTHENTICATED',
    status: 401,
  })
})

test('signup and coupon scenarios return deterministic field errors', async () => {
  kurioMocks.reset('signup-conflict')
  await expect(
    apiClient.post('/auth/signup', {
      displayName: 'Ana',
      email: 'ana@kurio.example.test',
      password: 'secret',
    }),
  ).rejects.toMatchObject({
    code: 'EMAIL_TAKEN',
    status: 409,
    fieldErrors: { email: expect.any(Array) },
  })

  kurioMocks.reset('validation-error')
  await expect(
    apiClient.post('/auth/signup', {
      displayName: 'Ana',
      email: 'ana@kurio.example.test',
      password: 'secret',
    }),
  ).rejects.toMatchObject({
    code: 'VALIDATION_ERROR',
    status: 422,
    fieldErrors: { displayName: expect.any(Array) },
  })

  kurioMocks.reset('design-cart')
  kurioMocks.reset('invalid-coupon')
  const cartBefore = kurioMocks.getState().carts
  await expect(
    apiClient.put('/cart/coupon', { code: 'KURIO10' }, authHeader),
  ).rejects.toMatchObject({ code: 'COUPON_INVALID', status: 422 })
  expect(kurioMocks.getState().carts).toEqual(cartBefore)

  kurioMocks.reset('expired-coupon')
  await expect(
    apiClient.put('/cart/coupon', { code: 'EXPIRED20' }, authHeader),
  ).rejects.toMatchObject({ code: 'COUPON_EXPIRED', status: 422 })
})

test('variable latency deterministically returns concurrent requests out of order', async () => {
  kurioMocks.reset('variable-latency')
  const completed: string[] = []
  await Promise.all([
    apiClient.get('/nfts').then(() => completed.push('first')),
    apiClient.get('/nfts').then(() => completed.push('second')),
  ])

  expect(completed).toEqual(['second', 'first'])
})

test('price-changed and sold-out scenarios return a refreshed quote', async () => {
  for (const [scenario, errorCode] of [
    ['price-changed', 'PRICE_CHANGED'],
    ['sold-out', 'AVAILABILITY_CONFLICT'],
  ] as const) {
    kurioMocks.reset(scenario)
    const quote = await apiClient.post('/cart/quote', {}, authHeader)

    await expect(
      apiClient.post(
        '/orders',
        {
          quoteId: quote.data.quoteId,
          provider: 'metamask',
          walletId: 'wallet-ana-primary',
          collector,
        },
        {
          ...authHeader,
          headers: {
            ...authHeader.headers,
            [IDEMPOTENCY_KEY_HEADER]: `scenario-${scenario}`,
          },
        },
      ),
    ).rejects.toMatchObject({
      code: errorCode,
      status: 409,
      details: { quote: expect.objectContaining({ quoteId: expect.any(String) }) },
    })
  }
})

test('payment scenarios settle orders and apply terminal outcomes', async () => {
  for (const [scenario, status] of [
    ['payment-confirmed', 'confirmed'],
    ['payment-rejected', 'rejected'],
  ] as const) {
    kurioMocks.reset(scenario)
    const quote = await apiClient.post('/cart/quote', {}, authHeader)
    const response = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector,
      },
      {
        ...authHeader,
        headers: {
          ...authHeader.headers,
          [IDEMPOTENCY_KEY_HEADER]: `scenario-${scenario}`,
        },
      },
    )

    expect(response.data.status).toBe(status)
    expect(kurioMocks.getState().orders.at(-1)?.status).toBe(status)
  }
})

test('timeout-after-order stores the order before losing the response and replays by key', async () => {
  kurioMocks.reset('timeout-after-order')
  kurioMocks.setTimeoutResponseDelay(100)
  apiClient.defaults.timeout = 20

  const quote = await apiClient.post('/cart/quote', {}, authHeader)
  const orderPayload = {
    quoteId: quote.data.quoteId,
    provider: 'metamask',
    walletId: 'wallet-ana-primary',
    collector,
  }
  const orderOptions = {
    ...authHeader,
    headers: {
      ...authHeader.headers,
      [IDEMPOTENCY_KEY_HEADER]: 'timeout-recovery',
    },
  }

  await expect(
    apiClient.post('/orders', orderPayload, orderOptions),
  ).rejects.toMatchObject({ code: 'NETWORK_ERROR' })

  const replay = await apiClient.post('/orders', orderPayload, orderOptions)
  expect(replay.data.orderId).toBe(kurioMocks.getState().orders.at(-1)?.orderId)
  expect(kurioMocks.getState().orders).toHaveLength(1)
})
