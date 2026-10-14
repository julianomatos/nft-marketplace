import { expect, test } from '@playwright/test'
import { setupServer } from 'msw/node'
import { handlers } from '../../src/mocks/handlers'
import { apiClient } from '../../src/services/api-client'
import { kurioMocks } from '../../src/mocks/control'
import { IDEMPOTENCY_KEY_HEADER } from '../../src/types/endpoints'
import type {
  AuthResponse,
  CreateOrderRequest,
} from '../../src/types/contracts'
import { compare } from '../../src/utils/eth'

const server = setupServer(...handlers)

const ANA_TOKEN = 'mock-token-collector-ana'
const authHeader = (token: string = ANA_TOKEN) => ({
  headers: { Authorization: `Bearer ${token}` },
})

test.beforeAll(() => {
  apiClient.defaults.baseURL = 'http://localhost/api'
  server.listen({ onUnhandledRequest: 'error' })
})

test.afterAll(() => {
  server.close()
})

test.beforeEach(() => {
  server.resetHandlers()
  kurioMocks.reset('success')
  kurioMocks.resetMockTime()
})

// ---------------------------------------------------------------------------
// 1. Auth Handlers
// ---------------------------------------------------------------------------
test.describe('Auth Handlers', () => {
  test('POST /api/auth/signup creates a new user and returns session', async () => {
    const response = await apiClient.post('/auth/signup', {
      displayName: 'Novo Colecionador',
      email: 'novo@kurio.example.test',
      password: 'SenhaSegura!123',
    })

    expect(response.status).toBe(200)
    expect(response.data.user.email).toBe('novo@kurio.example.test')
    expect(response.data.token).toBeDefined()
    expect(response.data.expiresAt).toBeDefined()
  })

  test('POST /api/auth/signup returns 409 EMAIL_TAKEN when email already exists', async () => {
    await expect(
      apiClient.post('/auth/signup', {
        displayName: 'Ana Duplicada',
        email: 'ana@kurio.example.test',
        password: 'OutraSenha!123',
      }),
    ).rejects.toMatchObject({
      code: 'EMAIL_TAKEN',
      status: 409,
    })
  })

  test('POST /api/auth/signup returns 422 VALIDATION_ERROR on invalid data', async () => {
    await expect(
      apiClient.post('/auth/signup', {
        displayName: '',
        email: 'not-an-email',
        password: '',
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  })

  test('POST /api/auth/login returns token for valid credentials', async () => {
    const response = await apiClient.post('/auth/login', {
      email: 'ana@kurio.example.test',
      password: 'KurioDemo!A2026',
    })

    expect(response.status).toBe(200)
    expect(response.data.user.email).toBe('ana@kurio.example.test')
    expect(response.data.token).toBeDefined()
  })

  test('POST /api/auth/login returns 401 INVALID_CREDENTIALS for wrong password or email', async () => {
    await expect(
      apiClient.post('/auth/login', {
        email: 'ana@kurio.example.test',
        password: 'WrongPassword!999',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })

    await expect(
      apiClient.post('/auth/login', {
        email: 'inexistente@kurio.example.test',
        password: 'AnyPassword!123',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })
  })

  test('GET /api/auth/session returns authenticated: false with 200 for visitors without token', async () => {
    const response = await apiClient.get('/auth/session')
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ authenticated: false, user: null })
  })

  test('GET /api/auth/session returns user for valid token', async () => {
    const response = await apiClient.get('/auth/session', authHeader())
    expect(response.status).toBe(200)
    expect(response.data.authenticated).toBe(true)
    expect(response.data.user.email).toBe('ana@kurio.example.test')
  })

  test('GET /api/auth/session returns 401 SESSION_EXPIRED when token is expired', async () => {
    kurioMocks.reset('expired-session')
    await expect(
      apiClient.get('/auth/session', authHeader('expired-session-token')),
    ).rejects.toMatchObject({
      code: 'SESSION_EXPIRED',
      status: 401,
    })
  })

  test('POST /api/auth/logout clears the session', async () => {
    const response = await apiClient.post('/auth/logout', {}, authHeader())
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ loggedOut: true })

    const sessionResponse = await apiClient.get('/auth/session', authHeader())
    expect(sessionResponse.data).toEqual({ authenticated: false, user: null })
  })
})

// ---------------------------------------------------------------------------
// 2. NFT Handlers
// ---------------------------------------------------------------------------
test.describe('NFT Handlers', () => {
  test('GET /api/nfts returns default page of 9 items, facets, and pagination metadata', async () => {
    const response = await apiClient.get('/nfts')
    expect(response.status).toBe(200)
    expect(response.data.items).toHaveLength(9)
    expect(response.data.total).toBe(40)
    expect(response.data.totalPages).toBe(5)
    expect(response.data.page).toBe(1)
    expect(response.data.limit).toBe(9)
    expect(response.data.facets.categories).toHaveLength(9)
    expect(response.data.facets.networks).toHaveLength(3)
    expect(response.data.facets.priceRange).toEqual({ min: '0.02', max: '12.30' })
  })

  test('GET /api/nfts filters by search q matching name, collection, or tokenId', async () => {
    const nameSearch = await apiClient.get('/nfts', { params: { q: 'Emerald' } })
    expect(nameSearch.data.items.some((i: { name: string }) => i.name.includes('Emerald'))).toBe(true)

    const tokenSearchWithHash = await apiClient.get('/nfts', { params: { q: '#0042' } })
    expect(tokenSearchWithHash.data.items.some((i: { tokenId: string }) => i.tokenId === '#0042')).toBe(true)

    const tokenSearchWithoutHash = await apiClient.get('/nfts', { params: { q: '0042' } })
    expect(tokenSearchWithoutHash.data.items.some((i: { tokenId: string }) => i.tokenId === '#0042')).toBe(true)

    const collectionSearch = await apiClient.get('/nfts', { params: { q: 'Nomads' } })
    expect(collectionSearch.data.items.length).toBeGreaterThan(0)
  })

  test('GET /api/nfts filters by feed (new, trending)', async () => {
    const newFeed = await apiClient.get('/nfts', { params: { feed: 'new' } })
    expect(newFeed.data.items.every((i: { isNew: boolean }) => i.isNew)).toBe(true)

    const trendingFeed = await apiClient.get('/nfts', { params: { feed: 'trending' } })
    expect(trendingFeed.data.items.every((i: { trending: boolean }) => i.trending)).toBe(true)
  })

  test('GET /api/nfts filters by price range with decimal comparison', async () => {
    const response = await apiClient.get('/nfts', {
      params: { minPrice: '1.00', maxPrice: '2.00' },
    })
    for (const item of response.data.items) {
      expect(compare(item.price, '1.00')).toBeGreaterThanOrEqual(0)
      expect(compare(item.price, '2.00')).toBeLessThanOrEqual(0)
    }
  })

  test('GET /api/nfts sorts by price-asc, price-desc, and popular', async () => {
    const asc = await apiClient.get('/nfts', { params: { sort: 'price-asc', limit: 40 } })
    const ascPrices = asc.data.items.map((i: { price: string }) => i.price)
    for (let i = 1; i < ascPrices.length; i++) {
      expect(compare(ascPrices[i], ascPrices[i - 1])).toBeGreaterThanOrEqual(0)
    }

    const desc = await apiClient.get('/nfts', { params: { sort: 'price-desc', limit: 40 } })
    const descPrices = desc.data.items.map((i: { price: string }) => i.price)
    for (let i = 1; i < descPrices.length; i++) {
      expect(compare(descPrices[i], descPrices[i - 1])).toBeLessThanOrEqual(0)
    }

    const pop = await apiClient.get('/nfts', { params: { sort: 'popular', limit: 40 } })
    expect(pop.data.items[0].id).toBe('emerald-ape-042')
  })

  test('GET /api/nfts calculates facet counts without their own selection', async () => {
    const withCategory = await apiClient.get('/nfts', {
      params: { category: ['arte-digital'] },
    })

    // Other categories in facets must NOT be 0 because category facet excludes its own filter
    const totalFacetCounts = withCategory.data.facets.categories.reduce(
      (sum: number, c: { count: number }) => sum + c.count,
      0,
    )
    expect(totalFacetCounts).toBe(40)

    const combined = await apiClient.get('/nfts', {
      params: { category: ['arte-digital', 'fotografia'], network: ['ethereum', 'polygon'] },
    })
    expect(combined.data.items.length).toBeGreaterThan(0)
    expect(combined.data.items.every((item: { category: string; network: string }) =>
      ['arte-digital', 'fotografia'].includes(item.category) &&
      ['ethereum', 'polygon'].includes(item.network),
    )).toBe(true)
  })

  test('GET /api/nfts returns empty items array with valid structure when no matches', async () => {
    const response = await apiClient.get('/nfts', {
      params: { q: 'inexistente-termo-raro-9999' },
    })
    expect(response.status).toBe(200)
    expect(response.data.items).toEqual([])
    expect(response.data.total).toBe(0)
    expect(response.data.totalPages).toBe(1)
  })

  test('GET /api/nfts/:id returns NFT detail and 404 for non-existent NFT', async () => {
    const valid = await apiClient.get('/nfts/emerald-ape-042')
    expect(valid.status).toBe(200)
    expect(valid.data.id).toBe('emerald-ape-042')

    await expect(apiClient.get('/nfts/nft-que-nao-existe')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  test('GET /api/nfts/featured returns hero and featured NFTs', async () => {
    const response = await apiClient.get('/nfts/featured')
    expect(response.status).toBe(200)
    expect(response.data.hero).toHaveLength(3)
    expect(response.data.featured.id).toBe('sage-nomad-009')
  })

  test('GET /api/nfts/:id/related returns related collection items and 404 for unknown NFT', async () => {
    const response = await apiClient.get('/nfts/emerald-ape-042/related')
    expect(response.status).toBe(200)
    expect(response.data.items.length).toBeGreaterThan(0)
    expect(response.data.items.every((i: { id: string }) => i.id !== 'emerald-ape-042')).toBe(true)

    await expect(apiClient.get('/nfts/unknown-id/related')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  test('GET /api/nfts/:id/reviews returns reviews for NFT', async () => {
    const response = await apiClient.get('/nfts/emerald-ape-042/reviews')
    expect(response.status).toBe(200)
    expect(response.data.items).toHaveLength(19)
    expect(response.data.items[0].rating).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// 3. Favorites Handlers
// ---------------------------------------------------------------------------
test.describe('Favorites Handlers', () => {
  test('GET /api/favorites requires authentication', async () => {
    await expect(apiClient.get('/favorites')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    })
  })

  test('GET /api/favorites returns list of favorites for authenticated user', async () => {
    const response = await apiClient.get('/favorites', authHeader())
    expect(response.status).toBe(200)
    expect(response.data.items.length).toBeGreaterThanOrEqual(1)
  })

  test('POST /api/favorites adds favorite idempotently', async () => {
    const firstAdd = await apiClient.post(
      '/favorites',
      { nftId: 'golden-beat-207' },
      authHeader(),
    )
    expect(firstAdd.status).toBe(200)
    expect(firstAdd.data.nftId).toBe('golden-beat-207')

    // Second add should return existing without error
    const secondAdd = await apiClient.post(
      '/favorites',
      { nftId: 'golden-beat-207' },
      authHeader(),
    )
    expect(secondAdd.status).toBe(200)
    expect(secondAdd.data.nftId).toBe('golden-beat-207')
  })

  test('POST /api/favorites returns 404 for non-existent NFT', async () => {
    await expect(
      apiClient.post('/favorites', { nftId: 'missing-nft' }, authHeader()),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })

  test('DELETE /api/favorites/:nftId removes favorite', async () => {
    const response = await apiClient.delete(
      '/favorites/emerald-ape-042',
      authHeader(),
    )
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ nftId: 'emerald-ape-042', removed: true })

    const list = await apiClient.get('/favorites', authHeader())
    expect(
      list.data.items.some((f: { nftId: string }) => f.nftId === 'emerald-ape-042'),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. Cart & Quote Handlers
// ---------------------------------------------------------------------------
test.describe('Cart & Quote Handlers', () => {
  test('Cart endpoints require authentication', async () => {
    await expect(apiClient.get('/cart')).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
      status: 401,
    })
  })

  test('POST /api/cart/items adds item with lineTotal and availability check', async () => {
    const response = await apiClient.post(
      '/cart/items',
      {
        nftId: 'emerald-ape-042',
        editionId: 'emerald-ape-042-1-50',
        quantity: 2,
      },
      authHeader(),
    )

    expect(response.status).toBe(200)
    const item = response.data.items.find(
      (i: { nftId: string }) => i.nftId === 'emerald-ape-042',
    )
    expect(item).toBeDefined()
    expect(item.quantity).toBe(2)
    expect(item.lineTotal).toBe('2.38')
  })

  test('POST /api/cart/items returns 409 AVAILABILITY_CONFLICT when quantity exceeds available', async () => {
    // 1/1 tier has available: 1
    await expect(
      apiClient.post(
        '/cart/items',
        {
          nftId: 'emerald-ape-042',
          editionId: 'emerald-ape-042-1-1',
          quantity: 5,
        },
        authHeader(),
      ),
    ).rejects.toMatchObject({
      code: 'AVAILABILITY_CONFLICT',
      status: 409,
    })
  })

  test('PUT /api/cart/items/:id updates item quantity and lineTotal', async () => {
    await apiClient.post(
      '/cart/items',
      {
        nftId: 'emerald-ape-042',
        editionId: 'emerald-ape-042-1-50',
        quantity: 2,
      },
      authHeader(),
    )

    const updateResponse = await apiClient.put(
      '/cart/items/emerald-ape-042-emerald-ape-042-1-50',
      { quantity: 4 },
      authHeader(),
    )

    expect(updateResponse.status).toBe(200)
    const updated = updateResponse.data.items.find(
      (i: { id: string }) => i.id === 'emerald-ape-042-emerald-ape-042-1-50',
    )
    expect(updated.quantity).toBe(4)
    expect(updated.lineTotal).toBe('4.76')
  })

  test('DELETE /api/cart/items/:id removes item from cart', async () => {
    await apiClient.post(
      '/cart/items',
      {
        nftId: 'emerald-ape-042',
        editionId: 'emerald-ape-042-1-50',
        quantity: 1,
      },
      authHeader(),
    )

    const remove = await apiClient.delete(
      '/cart/items/emerald-ape-042-emerald-ape-042-1-50',
      authHeader(),
    )
    expect(remove.status).toBe(200)
    expect(remove.data.removed).toBe(true)

    const cart = await apiClient.get('/cart', authHeader())
    expect(cart.data.items.some((i: { nftId: string }) => i.nftId === 'emerald-ape-042')).toBe(false)
  })

  test('POST /api/cart/merge merges guest items into user cart', async () => {
    const mergeResponse = await apiClient.post(
      '/cart/merge',
      {
        items: [
          {
            nftId: 'sage-nomad-009',
            editionId: 'sage-nomad-009-1-50',
            quantity: 3,
          },
        ],
      },
      authHeader(),
    )

    expect(mergeResponse.status).toBe(200)
    expect(mergeResponse.data.mergedItemCount).toBe(1)
    expect(mergeResponse.data.cart.items.some((i: { nftId: string }) => i.nftId === 'sage-nomad-009')).toBe(true)
  })

  test('PUT /api/cart/coupon applies valid coupon and rejects invalid/expired', async () => {
    // Valid coupon
    const valid = await apiClient.put(
      '/cart/coupon',
      { code: 'KURIO10' },
      authHeader(),
    )
    expect(valid.status).toBe(200)
    expect(valid.data.cart.coupon.code).toBe('KURIO10')

    // Invalid coupon -> 422 COUPON_INVALID
    await expect(
      apiClient.put('/cart/coupon', { code: 'INVALID-CODE' }, authHeader()),
    ).rejects.toMatchObject({
      code: 'COUPON_INVALID',
      status: 422,
    })

    // Expired coupon -> 422 COUPON_EXPIRED
    await expect(
      apiClient.put('/cart/coupon', { code: 'EXPIRED20' }, authHeader()),
    ).rejects.toMatchObject({
      code: 'COUPON_EXPIRED',
      status: 422,
    })
    const cartAfterRejectedCoupons = await apiClient.get('/cart', authHeader())
    expect(cartAfterRejectedCoupons.data.coupon).toEqual({
      code: 'KURIO10',
      status: 'valid',
    })

    // DELETE coupon
    const removeCoupon = await apiClient.delete('/cart/coupon', authHeader())
    expect(removeCoupon.status).toBe(200)
    expect(removeCoupon.data.cart.coupon).toBeNull()
  })

  test('POST /api/cart/quote computes authoritative totals and quoteId', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())
    expect(quote.status).toBe(200)
    expect(quote.data.subtotal).toBe('26.83')
    expect(quote.data.networkFee).toBe('0.016')
    expect(quote.data.discount).toBe('0.00')
    expect(quote.data.total).toBe('26.846')
    expect(quote.data.quoteId).toBeDefined()
    expect(quote.data.expiresAt).toBeDefined()
    expect(quote.data.items).toHaveLength(3)
  })

  test('POST /api/cart/quote computes coupon discounts with decimal arithmetic', async () => {
    kurioMocks.reset('design-cart')
    await apiClient.put('/cart/coupon', { code: 'KURIO10' }, authHeader())

    const quote = await apiClient.post('/cart/quote', {}, authHeader())
    expect(quote.data.subtotal).toBe('26.83')
    expect(quote.data.discount).toBe('2.683')
    expect(quote.data.total).toBe('24.163')
  })

  test('POST /api/cart/quote validates its empty request body', async () => {
    await expect(
      apiClient.post('/cart/quote', { unexpected: true }, authHeader()),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      fieldErrors: expect.objectContaining({
        root: expect.any(Array),
      }),
    })
  })

  test('POST /api/cart/quote rejects an applied coupon after expiry and clears it', async () => {
    await apiClient.put('/cart/coupon', { code: 'KURIO10' }, authHeader())
    kurioMocks.setMockTime('2027-01-01T00:00:00.000Z')
    const login = await apiClient.post<AuthResponse>('/auth/login', {
      email: 'ana@kurio.example.test',
      password: 'KurioDemo!A2026',
    })

    await expect(
      apiClient.post('/cart/quote', {}, authHeader(login.data.token)),
    ).rejects.toMatchObject({
      code: 'COUPON_EXPIRED',
      status: 422,
      fieldErrors: expect.objectContaining({ code: expect.any(Array) }),
    })

    expect(kurioMocks.getState().carts.find(({ userId }) => userId === 'collector-ana')
      ?.cart.coupon)
      .toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 5. Order Handlers
// ---------------------------------------------------------------------------
test.describe('Order Handlers', () => {
  const validCollector = {
    displayName: 'Ana Oliveira',
    username: 'ana-oliveira',
    profileName: 'Ana O.',
    email: 'ana@kurio.example.test',
    walletAddress: '0x1111111111111111111111111111111111111111',
    walletType: 'metamask' as const,
    network: 'ethereum' as const,
    ensName: 'ana.kurio.eth',
    referralCode: 'KURIO-ANA-042',
  }

  test('POST /api/orders requires X-Idempotency-Key header', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())

    await expect(
      apiClient.post(
        '/orders',
        {
          quoteId: quote.data.quoteId,
          provider: 'metamask',
          walletId: 'wallet-ana-primary',
          collector: validCollector,
        },
        authHeader(),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  })

  test('POST /api/orders rejects stale/invalid quote with 409 PRICE_CHANGED', async () => {
    kurioMocks.reset('design-cart')

    await expect(
      apiClient.post(
        '/orders',
        {
          quoteId: 'stale-quote-id-123',
          provider: 'metamask',
          walletId: 'wallet-ana-primary',
          collector: validCollector,
        },
        {
          headers: {
            Authorization: `Bearer ${ANA_TOKEN}`,
            [IDEMPOTENCY_KEY_HEADER]: 'key-stale-quote',
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'PRICE_CHANGED',
      status: 409,
      details: {
        quote: expect.objectContaining({
          quoteId: expect.any(String),
          subtotal: '26.83',
        }),
      },
    })
  })

  test('POST /api/orders returns a fresh quote when edition availability changes', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())
    const state = kurioMocks.getState()
    const nfts = state.nfts.map((nft) => nft.id === 'emerald-ape-042'
      ? {
          ...nft,
          editions: nft.editions.map((edition) =>
            edition.id === 'emerald-ape-042-1-50'
              ? { ...edition, available: 1 }
              : edition,
          ),
        }
      : nft)
    kurioMocks.setState({ ...state, nfts })

    await expect(
      apiClient.post(
        '/orders',
        {
          quoteId: quote.data.quoteId,
          provider: 'metamask',
          walletId: 'wallet-ana-primary',
          collector: validCollector,
        },
        {
          ...authHeader(),
          headers: {
            ...authHeader().headers,
            [IDEMPOTENCY_KEY_HEADER]: 'key-stale-availability',
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'AVAILABILITY_CONFLICT',
      status: 409,
      details: {
        quote: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              nftId: 'emerald-ape-042',
              available: 1,
            }),
          ]),
        }),
      },
    })
  })

  test('POST /api/orders creates pending order snapshot with idempotency', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())

    const orderPayload: CreateOrderRequest = {
      quoteId: quote.data.quoteId,
      provider: 'metamask',
      walletId: 'wallet-ana-primary',
      collector: validCollector,
    }

    const orderResponse = await apiClient.post('/orders', orderPayload, {
      headers: {
        Authorization: `Bearer ${ANA_TOKEN}`,
        [IDEMPOTENCY_KEY_HEADER]: 'key-order-1',
      },
    })

    expect(orderResponse.status).toBe(200)
    expect(orderResponse.data.orderId).toBeDefined()
    expect(orderResponse.data.status).toBe('pending')
    expect(orderResponse.data.total).toBe('26.846')
    expect(orderResponse.data.items).toHaveLength(3)

    // Replay with exact same idempotency key and payload -> returns same order
    const replayResponse = await apiClient.post('/orders', orderPayload, {
      headers: {
        Authorization: `Bearer ${ANA_TOKEN}`,
        [IDEMPOTENCY_KEY_HEADER]: 'key-order-1',
      },
    })
    expect(replayResponse.status).toBe(200)
    expect(replayResponse.data.orderId).toBe(orderResponse.data.orderId)

    // Replay with same key but different payload -> 409 IDEMPOTENCY_KEY_REUSED
    await expect(
      apiClient.post(
        '/orders',
        {
          ...orderPayload,
          provider: 'coinbase',
        },
        {
          headers: {
            Authorization: `Bearer ${ANA_TOKEN}`,
            [IDEMPOTENCY_KEY_HEADER]: 'key-order-1',
          },
        },
      ),
    ).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
      status: 409,
    })
  })

  test('X-Idempotency-Key records are isolated by authenticated user', async () => {
    kurioMocks.reset('design-cart')
    const anaQuote = await apiClient.post('/cart/quote', {}, authHeader())
    const anaOrder = await apiClient.post(
      '/orders',
      {
        quoteId: anaQuote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: validCollector,
      },
      {
        headers: {
          ...authHeader().headers,
          [IDEMPOTENCY_KEY_HEADER]: 'same-key-per-user',
        },
      },
    )

    const login = await apiClient.post<AuthResponse>('/auth/login', {
      email: 'caio@kurio.example.test',
      password: 'KurioDemo!B2026',
    })
    const caioAuth = authHeader(login.data.token)
    await apiClient.post(
      '/cart/items',
      {
        nftId: 'sage-nomad-009',
        editionId: 'sage-nomad-009-1-50',
        quantity: 1,
      },
      caioAuth,
    )
    const caioQuote = await apiClient.post('/cart/quote', {}, caioAuth)
    const caioOrder = await apiClient.post(
      '/orders',
      {
        quoteId: caioQuote.data.quoteId,
        provider: 'coinbase',
        walletId: 'wallet-caio-primary',
        collector: {
          ...validCollector,
          displayName: 'Caio Martins',
          username: 'caio-martins',
          profileName: 'Caio M.',
          email: 'caio@kurio.example.test',
          walletAddress: '0x3333333333333333333333333333333333333333',
          walletType: 'coinbase',
          ensName: 'caio.kurio.eth',
          referralCode: 'KURIO-CAIO-009',
        },
      },
      {
        headers: {
          ...caioAuth.headers,
          [IDEMPOTENCY_KEY_HEADER]: 'same-key-per-user',
        },
      },
    )

    expect(caioOrder.data.orderId).not.toBe(anaOrder.data.orderId)
    expect(caioOrder.data.status).toBe('pending')
    expect(kurioMocks.getState().idempotencyRecords).toHaveProperty(
      'collector-ana:same-key-per-user',
    )
    expect(kurioMocks.getState().idempotencyRecords).toHaveProperty(
      'collector-caio:same-key-per-user',
    )
    const storedPayload = kurioMocks.getState().idempotencyRecords[
      'collector-ana:same-key-per-user'
    ].payloadHash
    expect(storedPayload).toMatch(/^[0-9a-f]{64}$/)
    expect(storedPayload).not.toContain(validCollector.email)
  })

  test('GET /api/orders/:id returns order snapshot and 404 for unknown order', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())

    const created = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: validCollector,
      },
      {
        headers: {
          Authorization: `Bearer ${ANA_TOKEN}`,
          [IDEMPOTENCY_KEY_HEADER]: 'key-order-retrieve',
        },
      },
    )

    const retrieved = await apiClient.get(
      `/orders/${created.data.orderId}`,
      authHeader(),
    )
    expect(retrieved.status).toBe(200)
    expect(retrieved.data.orderId).toBe(created.data.orderId)

    await expect(
      apiClient.get('/orders/non-existent-order-id', authHeader()),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    })
  })
})

// ---------------------------------------------------------------------------
// 6. Profile Handlers
// ---------------------------------------------------------------------------
test.describe('Profile Handlers', () => {
  test('GET /api/profile returns profile data for authenticated user', async () => {
    const response = await apiClient.get('/profile', authHeader())
    expect(response.status).toBe(200)
    expect(response.data.displayName).toBe('Ana Oliveira')
    expect(response.data.email).toBe('ana@kurio.example.test')
  })

  test('PUT /api/profile updates profile and validates input', async () => {
    const update = await apiClient.put(
      '/profile',
      {
        displayName: 'Ana Nova',
        username: 'ana-nova',
        email: 'ananova@kurio.example.test',
        ensName: 'ananova.kurio.eth',
        walletNickname: 'Principal',
      },
      authHeader(),
    )

    expect(update.status).toBe(200)
    expect(update.data.displayName).toBe('Ana Nova')

    // Invalid email -> 422
    await expect(
      apiClient.put(
        '/profile',
        {
          displayName: 'Ana Nova',
          username: 'ana-nova',
          email: 'invalid-email',
          ensName: 'ananova.kurio.eth',
          walletNickname: 'Principal',
        },
        authHeader(),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  })

  test('PUT /api/profile/password verifies current password and updates hash', async () => {
    // Wrong current password -> 401 INVALID_CREDENTIALS
    await expect(
      apiClient.put(
        '/profile/password',
        {
          currentPassword: 'WrongPassword!123',
          newPassword: 'NovaSenha!2026',
          confirmPassword: 'NovaSenha!2026',
        },
        authHeader(),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    })

    // Password mismatch -> 422 VALIDATION_ERROR
    await expect(
      apiClient.put(
        '/profile/password',
        {
          currentPassword: 'KurioDemo!A2026',
          newPassword: 'NovaSenha!2026',
          confirmPassword: 'OutraSenha!2026',
        },
        authHeader(),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    })

    // Correct password update
    const success = await apiClient.put(
      '/profile/password',
      {
        currentPassword: 'KurioDemo!A2026',
        newPassword: 'NovaSenha!2026',
        confirmPassword: 'NovaSenha!2026',
      },
      authHeader(),
    )
    expect(success.status).toBe(200)
    expect(success.data.updated).toBe(true)

    // Now login with new password should succeed
    const newLogin = await apiClient.post('/auth/login', {
      email: 'ana@kurio.example.test',
      password: 'NovaSenha!2026',
    })
    expect(newLogin.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// 7. Wallets Handlers
// ---------------------------------------------------------------------------
test.describe('Wallets Handlers', () => {
  test('GET /api/wallets returns user registered wallets', async () => {
    const response = await apiClient.get('/wallets', authHeader())
    expect(response.status).toBe(200)
    expect(response.data.items).toHaveLength(2)
  })

  test('POST /api/wallets rejects duplicate kind with 409', async () => {
    // Ana already has 'primary' wallet
    await expect(
      apiClient.post(
        '/wallets',
        {
          kind: 'primary',
          displayName: 'Ana Oliveira',
          nickname: 'Segunda Principal',
          network: 'ethereum',
          profileName: 'Ana O.',
          address: '0x9999999999999999999999999999999999999999',
          walletType: 'metamask',
          referralCode: 'KURIO-ANA-042',
          email: 'ana@kurio.example.test',
          ensName: 'ana.kurio.eth',
        },
        authHeader(),
      ),
    ).rejects.toMatchObject({
      code: 'WALLET_KIND_CONFLICT',
      status: 409,
    })
  })

  test('POST /api/wallets validates wallet address format by network with 422', async () => {
    // Caio has no secondary wallet, but provides invalid ethereum address
    const login = await apiClient.post<AuthResponse>('/auth/login', {
      email: 'caio@kurio.example.test',
      password: 'KurioDemo!B2026',
    })
    const caioToken = login.data.token
    await expect(
      apiClient.post(
        '/wallets',
        {
          kind: 'secondary',
          displayName: 'Caio Martins',
          nickname: 'Secundária',
          network: 'ethereum',
          profileName: 'Caio M.',
          address: 'invalid-ethereum-address',
          walletType: 'metamask',
          referralCode: 'KURIO-CAIO-009',
          email: 'caio@kurio.example.test',
          ensName: 'caio.kurio.eth',
        },
        authHeader(caioToken),
      ),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
    })
  })

  test('POST, PUT, and connection toggle on wallets succeed', async () => {
    const login = await apiClient.post<AuthResponse>('/auth/login', {
      email: 'caio@kurio.example.test',
      password: 'KurioDemo!B2026',
    })
    const caioToken = login.data.token
    const create = await apiClient.post(
      '/wallets',
      {
        kind: 'secondary',
        displayName: 'Caio Martins',
        nickname: 'Reserva Polygon',
        network: 'polygon',
        profileName: 'Caio M.',
        address: '0x4444444444444444444444444444444444444444',
        walletType: 'walletconnect',
        referralCode: 'KURIO-CAIO-009',
        email: 'caio@kurio.example.test',
        ensName: 'caio.kurio.eth',
      },
      authHeader(caioToken),
    )

    expect(create.status).toBe(200)
    expect(create.data.wallet.kind).toBe('secondary')
    const walletId = create.data.wallet.id

    // Disconnect
    const disconnect = await apiClient.post(
      `/wallets/${walletId}/disconnect`,
      {},
      authHeader(caioToken),
    )
    expect(disconnect.status).toBe(200)
    expect(disconnect.data.outcome).toBe('disconnected')
    expect(disconnect.data.wallet.connectionStatus).toBe('disconnected')

    // Connect
    const connect = await apiClient.post(
      `/wallets/${walletId}/connect`,
      { provider: 'walletconnect' },
      authHeader(caioToken),
    )
    expect(connect.status).toBe(200)
    expect(connect.data.outcome).toBe('connected')
    expect(connect.data.wallet.connectionStatus).toBe('connected')

    // Update
    const update = await apiClient.put(
      `/wallets/${walletId}`,
      {
        kind: 'secondary',
        displayName: 'Caio Martins',
        nickname: 'Reserva Atualizada',
        network: 'polygon',
        profileName: 'Caio M.',
        address: '0x4444444444444444444444444444444444444444',
        walletType: 'walletconnect',
        referralCode: 'KURIO-CAIO-009',
        email: 'caio@kurio.example.test',
        ensName: 'caio.kurio.eth',
      },
      authHeader(caioToken),
    )
    expect(update.status).toBe(200)
    expect(update.data.wallet.nickname).toBe('Reserva Atualizada')
  })

  test('POST /api/wallets/:id/connect supports an explicit mock refusal', async () => {
    const refused = await apiClient.post(
      '/wallets/wallet-ana-reserve/connect',
      { provider: 'walletconnect', outcome: 'refused' },
      authHeader(),
    )
    expect(refused.status).toBe(200)
    expect(refused.data.outcome).toBe('refused')
    expect(refused.data.wallet.connectionStatus).toBe('disconnected')

    const walletsResponse = await apiClient.get('/wallets', authHeader())
    expect(
      walletsResponse.data.items.find(
        (wallet: { id: string }) => wallet.id === 'wallet-ana-reserve',
      ).connectionStatus,
    ).toBe('disconnected')
  })
})

// ---------------------------------------------------------------------------
// 8. Settle Order & Control Surface
// ---------------------------------------------------------------------------
test.describe('Mock Control Surface & Order Settlement', () => {
  const validCollector = {
    displayName: 'Ana Oliveira',
    username: 'ana-oliveira',
    profileName: 'Ana O.',
    email: 'ana@kurio.example.test',
    walletAddress: '0x1111111111111111111111111111111111111111',
    walletType: 'metamask' as const,
    network: 'ethereum' as const,
    ensName: 'ana.kurio.eth',
    referralCode: 'KURIO-ANA-042',
  }

  test('settleOrder("confirmed") confirms order, decrements availability, and removes purchased items from cart', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())

    const orderResponse = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: validCollector,
      },
      {
        headers: {
          Authorization: `Bearer ${ANA_TOKEN}`,
          [IDEMPOTENCY_KEY_HEADER]: 'key-settle-confirm',
        },
      },
    )

    const orderId = orderResponse.data.orderId

    // Settle as confirmed
    const settled = kurioMocks.settleOrder(orderId, 'confirmed')
    expect(settled.status).toBe('confirmed')
    expect(settled.version).toBe(2)
    expect(settled.transactionHash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(settled.explorerUrl).toContain('etherscan.io')

    // Cart should now be empty of purchased items
    const cart = await apiClient.get('/cart', authHeader())
    expect(cart.data.items).toEqual([])

    // Check edition availability decremented
    const emeraldNft = await apiClient.get('/nfts/emerald-ape-042')
    const tier50 = emeraldNft.data.editions.find((e: { label: string }) => e.label === '1/50')
    // Originally 32, ordered 2 -> now 30
    expect(tier50.available).toBe(30)

    // Cannot settle terminal order again
    expect(() => kurioMocks.settleOrder(orderId, 'confirmed')).toThrow(/terminal/)
  })

  test('settleOrder("rejected") marks order rejected and preserves cart items and availability', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())

    const orderResponse = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: validCollector,
      },
      {
        headers: {
          Authorization: `Bearer ${ANA_TOKEN}`,
          [IDEMPOTENCY_KEY_HEADER]: 'key-settle-reject',
        },
      },
    )

    const orderId = orderResponse.data.orderId

    // Settle as rejected
    const settled = kurioMocks.settleOrder(orderId, 'rejected')
    expect(settled.status).toBe('rejected')
    expect(settled.version).toBe(2)

    // Cart items should be preserved
    const cart = await apiClient.get('/cart', authHeader())
    expect(cart.data.items).toHaveLength(3)

    // Edition availability preserved (originally 32)
    const emeraldNft = await apiClient.get('/nfts/emerald-ape-042')
    const tier50 = emeraldNft.data.editions.find((e: { label: string }) => e.label === '1/50')
    expect(tier50.available).toBe(32)
  })

  test('settleOrder does not confirm an order after its edition stock is exhausted', async () => {
    kurioMocks.reset('design-cart')
    const quote = await apiClient.post('/cart/quote', {}, authHeader())
    const orderResponse = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: validCollector,
      },
      {
        headers: {
          ...authHeader().headers,
          [IDEMPOTENCY_KEY_HEADER]: 'key-settle-insufficient-stock',
        },
      },
    )
    const orderId = orderResponse.data.orderId
    const state = kurioMocks.getState()
    kurioMocks.setState({
      ...state,
      nfts: state.nfts.map((nft) => nft.id === 'emerald-ape-042'
        ? {
            ...nft,
            editions: nft.editions.map((edition) =>
              edition.id === 'emerald-ape-042-1-50'
                ? { ...edition, available: 1 }
                : edition,
            ),
          }
        : nft),
    })

    expect(() => kurioMocks.settleOrder(orderId, 'confirmed'))
      .toThrow(/insufficient availability/)
    expect(kurioMocks.getState().orders.find(({ orderId: id }) => id === orderId)?.status)
      .toBe('pending')
    expect(kurioMocks.getState().nfts.find(({ id }) => id === 'emerald-ape-042')
      ?.editions.find(({ id }) => id === 'emerald-ape-042-1-50')?.available)
      .toBe(1)
    expect((await apiClient.get('/cart', authHeader())).data.items).toHaveLength(3)
  })

  test('reset("design-cart") restores the reference cart amounts', async () => {
    const state = kurioMocks.reset('design-cart')
    expect(state.scenario).toBe('design-cart')

    const cart = await apiClient.get('/cart', authHeader())
    expect(cart.data.items).toHaveLength(3)

    const quote = await apiClient.post('/cart/quote', {}, authHeader())
    expect(quote.data.total).toBe('26.846')
  })
})
