import { http, HttpResponse } from 'msw'
import { add, mul, sum } from '../utils/eth'
import { API_BASE_PATH, IDEMPOTENCY_KEY_HEADER } from '../types/endpoints'
import type {
  ApiErrorCode,
  ApiErrorEnvelope,
  Cart,
  Favorite,
  Nft,
  OrderReceiptSnapshot,
  Profile,
  QuoteResponse,
  Wallet,
} from '../types/contracts'
import type { FixtureUser } from './types'
import { categories, coupons, featuredNfts, nfts, nftsById } from './fixtures'
import { hashPassword, readMockState, persistMockState, validatePassword } from './store'

const SESSION_TOKEN_STORAGE_KEY = 'kurio.session.token'
const STATE_UPDATE_INTERVAL_MS = 60_000

type SessionUser = {
  user: FixtureUser
  state: ReturnType<typeof readMockState>
}

function buildError(
  code: ApiErrorCode,
  message?: string,
  details?: Record<string, unknown>,
  fieldErrors?: Record<string, string[]>,
) {
  const payload = {
    code,
    message: message ?? code,
    ...(fieldErrors ? { fieldErrors } : {}),
    ...(details ? { details } : {}),
  } as ApiErrorEnvelope['error']

  const status = code === 'PRICE_CHANGED' || code === 'AVAILABILITY_CONFLICT' ? 409 : 400
  return HttpResponse.json({ error: payload }, { status })
}

function writeSessionToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token)
    return
  }

  window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY)
}

function getCurrentUserSession(): SessionUser | null {
  const state = readMockState()

  if (typeof window === 'undefined') {
    return null
  }

  const token = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
  if (!token) return null

  if (!state.session.token || state.session.token !== token) {
    return null
  }

  if (state.session.expiresAt && new Date(state.session.expiresAt).getTime() < Date.now()) {
    return null
  }

  const user = state.users.find((entry) => entry.id === state.session.userId)
  if (!user) return null

  return { user, state }
}

function getUserById(userId: string): FixtureUser | undefined {
  return readMockState().users.find((user) => user.id === userId)
}

function getCartForUser(userId: string): Cart {
  const state = readMockState()
  const cartRecord = state.carts.find((entry) => entry.userId === userId)
  return cartRecord?.cart ?? { items: [], coupon: null }
}

function saveCartForUser(userId: string, nextCart: Cart) {
  const state = readMockState()
  const nextCarts = [...state.carts]
  const cartIndex = nextCarts.findIndex((entry) => entry.userId === userId)

  if (cartIndex >= 0) {
    nextCarts[cartIndex] = { ...nextCarts[cartIndex], cart: nextCart }
  } else {
    nextCarts.push({ userId, cart: nextCart })
  }

  persistMockState({ ...state, carts: nextCarts })
}

function getUserFavorites(userId: string) {
  const state = readMockState()
  return state.favorites.filter((favorite) => favorite.userId === userId)
}

function buildCartItem(nft: Nft, editionId: string, quantity: number): Cart['items'][number] {
  const edition = nft.editions.find((item) => item.id === editionId)
  if (!edition) throw new Error(`Missing edition ${editionId}`)

  const unitPrice = nft.price
  const lineTotal = mul(unitPrice, String(quantity))

  return {
    id: `${nft.id}-${editionId}`,
    nftId: nft.id,
    editionId,
    edition: edition.label,
    quantity,
    unitPrice,
    lineTotal,
    available: edition.available,
    nft: {
      id: nft.id,
      tokenId: nft.tokenId,
      name: nft.name,
      collection: nft.collection,
      price: nft.price,
      ...(nft.compareAtPrice ? { compareAtPrice: nft.compareAtPrice } : {}),
      ...(nft.rarity ? { rarity: nft.rarity } : {}),
      images: nft.images,
    },
  }
}

function getQuoteFromCart(cart: Cart): QuoteResponse {
  const items = cart.items.map((entry) => ({
    nftId: entry.nftId,
    editionId: entry.editionId,
    edition: entry.edition,
    quantity: entry.quantity,
    unitPrice: entry.unitPrice,
    lineTotal: entry.lineTotal,
    available: entry.available,
  }))

  const subtotal = sum(items.map((item) => item.lineTotal))
  const discountCode = cart.coupon?.code
  const coupon = coupons.find((entry) => entry.code === discountCode)
  const discountPercent = coupon?.status === 'valid' ? coupon.discountPercent : 0
  const discount = mul(subtotal, String(discountPercent / 100))
  const networkFee = '0.016'
  const total = add(add(subtotal, networkFee), `-${discount}`)

  return {
    quoteId: `quote-${Date.now()}`,
    items,
    subtotal,
    discount,
    networkFee,
    total,
    coupon: cart.coupon ?? null,
    expiresAt: new Date(Date.now() + STATE_UPDATE_INTERVAL_MS).toISOString(),
    version: 1,
  }
}

function createOrderFromQuote(
  userId: string,
  cart: Cart,
  quote: QuoteResponse,
  _idempotencyKey: string,
): OrderReceiptSnapshot {
  void _idempotencyKey
  const state = readMockState()
  const user = getUserById(userId)
  if (!user) {
    throw new Error('Missing user for order creation')
  }

  const orderId = `order-${Date.now()}`
  const snapshot: OrderReceiptSnapshot = {
    orderId,
    version: 1,
    quoteId: quote.quoteId,
    status: 'pending',
    transactionHash: null,
    network: 'ethereum',
    explorerUrl: null,
    provider: 'metamask',
    wallet: {
      nickname: 'Principal',
      address: '0x1111111111111111111111111111111111111111',
    },
    items: cart.items.map((item) => ({
      nftId: item.nftId,
      name: item.nft.name,
      tokenId: item.nft.tokenId,
      edition: item.edition,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.lineTotal,
    })),
    subtotal: quote.subtotal,
    discount: quote.discount,
    fee: quote.networkFee,
    total: quote.total,
    createdAt: new Date().toISOString(),
  }

  persistMockState({
    ...state,
    orders: [...state.orders, { ...snapshot, userId }],
  })

  return snapshot
}

function findOrderForUser(userId: string, orderId: string) {
  const state = readMockState()
  return state.orders.find((entry) => entry.userId === userId && entry.orderId === orderId)
}

const authHandlers = [
  http.post(`${API_BASE_PATH}/auth/signup`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string; displayName?: string }
    const state = readMockState()

    if (!body.email || !body.password || !body.displayName) {
      return buildError('VALIDATION_ERROR', 'Revise os campos destacados e tente novamente.', {
        field: ['displayName', 'email', 'password'],
      }, {
        displayName: ['O nome é obrigatório.'],
        email: ['Digite um e-mail válido.'],
        password: ['Informe uma senha válida.'],
      })
    }

    if (state.users.some((user) => user.email === body.email)) {
      return buildError('EMAIL_TAKEN', 'Este e-mail já está cadastrado.', undefined, {
        email: ['Este e-mail já está cadastrado.'],
      })
    }

    const passwordSalt = `kurio-signup-salt-${Date.now()}`
    const newUser: FixtureUser = {
      id: `collector-${Date.now()}`,
      displayName: body.displayName,
      username: body.displayName.toLowerCase().replace(/\s+/g, '-'),
      email: body.email,
      ensName: `${body.displayName.toLowerCase().replace(/\s+/g, '-')}.kurio.eth`,
      referralCode: `KURIO-${Date.now().toString(36).toUpperCase()}`,
      avatar: '/assets/nfts/emerald-ape-480.webp',
      passwordSalt,
      passwordHash: await hashPassword(body.password, passwordSalt),
      walletIds: [],
    }

    persistMockState({
      ...state,
      users: [...state.users, newUser],
    })

    const token = `mock-token-${newUser.id}-${Date.now()}`
    persistMockState({
      ...readMockState(),
      session: {
        userId: newUser.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      },
    })
    writeSessionToken(token)

    return HttpResponse.json({
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      user: newUser,
    })
  }),

  http.post(`${API_BASE_PATH}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string }
    const state = readMockState()
    const user = state.users.find((entry) => entry.email === body.email)

    if (!user) {
      return buildError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', undefined, {
        email: ['E-mail ou senha incorretos.'],
      })
    }

    const isValidPassword = await validatePassword(user, body.password ?? '')
    if (!isValidPassword) {
      return buildError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.', undefined, {
        password: ['E-mail ou senha incorretos.'],
      })
    }

    const token = `mock-token-${user.id}-${Date.now()}`
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
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
      user,
    })
  }),

  http.get(`${API_BASE_PATH}/auth/session`, () => {
    const currentSession = getCurrentUserSession()
    if (!currentSession) {
      return HttpResponse.json({ authenticated: false, user: null }, { status: 200 })
    }

    return HttpResponse.json({
      authenticated: true,
      user: currentSession.user,
      expiresAt: readMockState().session.expiresAt,
    })
  }),

  http.post(`${API_BASE_PATH}/auth/logout`, () => {
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

const nftHandlers = [
  http.get(`${API_BASE_PATH}/nfts`, ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q') ?? ''
    const categoryValues = url.searchParams.getAll('category')
    const networkValues = url.searchParams.getAll('network')
    const minPrice = url.searchParams.get('minPrice') ?? undefined
    const maxPrice = url.searchParams.get('maxPrice') ?? undefined
    const feed = url.searchParams.get('feed') ?? 'all'
    const sort = url.searchParams.get('sort') ?? 'recent'
    const page = Number(url.searchParams.get('page') ?? '1') || 1
    const limit = Number(url.searchParams.get('limit') ?? '9') || 9

    let items = [...nfts]

    if (q) {
      const needle = q.toLowerCase()
      items = items.filter((nft) => nftsById[nft.id]?.name.toLowerCase().includes(needle) || nftsById[nft.id]?.collection.toLowerCase().includes(needle))
    }

    if (feed === 'new') {
      items = items.filter((nft) => nft.isNew)
    }

    if (feed === 'trending') {
      items = items.filter((nft) => nft.trending)
    }

    if (categoryValues.length) {
      items = items.filter((nft) => categoryValues.includes(nft.category))
    }

    if (networkValues.length) {
      items = items.filter((nft) => networkValues.includes(nft.network))
    }

    if (minPrice) {
      items = items.filter((nft) => Number(nft.price) >= Number(minPrice))
    }

    if (maxPrice) {
      items = items.filter((nft) => Number(nft.price) <= Number(maxPrice))
    }

    if (sort === 'price-asc') {
      items = [...items].sort((left, right) => Number(left.price) - Number(right.price))
    }

    if (sort === 'price-desc') {
      items = [...items].sort((left, right) => Number(right.price) - Number(left.price))
    }

    if (sort === 'popular') {
      items = [...items].sort((left, right) => right.version - left.version)
    }

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const validPage = Math.min(page, totalPages)
    const paginated = items.slice((validPage - 1) * limit, validPage * limit)

    return HttpResponse.json({
      items: paginated,
      page: validPage,
      limit,
      total,
      totalPages,
      facets: {
        categories: categories.map(({ id, label }) => ({
          id,
          label,
          count: items.filter((nft) => nft.category === id).length,
        })),
        networks: [{ id: 'ethereum', label: 'Ethereum', count: items.filter((nft) => nft.network === 'ethereum').length }, { id: 'polygon', label: 'Polygon', count: items.filter((nft) => nft.network === 'polygon').length }, { id: 'solana', label: 'Solana', count: items.filter((nft) => nft.network === 'solana').length }],
        priceRange: { min: '0.02', max: '12.30' },
      },
    })
  }),

  http.get(`${API_BASE_PATH}/nfts/featured`, () => HttpResponse.json(featuredNfts)),

  http.get(`${API_BASE_PATH}/nfts/:id`, ({ params }) => {
    const nft = nftsById[String(params.id)]
    if (!nft) {
      return buildError('NOT_FOUND', 'O conteúdo solicitado não foi encontrado.')
    }

    return HttpResponse.json(nft)
  }),

  http.get(`${API_BASE_PATH}/nfts/:id/related`, ({ params }) => {
    const nft = nftsById[String(params.id)]
    if (!nft) {
      return buildError('NOT_FOUND', 'O conteúdo solicitado não foi encontrado.')
    }

    const items = nfts
      .filter((entry) => entry.collection === nft.collection && entry.id !== nft.id)
      .slice(0, 4)

    return HttpResponse.json({ items })
  }),

  http.get(`${API_BASE_PATH}/nfts/:id/reviews`, ({ params }) => {
    const nftId = String(params.id)
    const items = readMockState().reviews.filter((review) => review.nftId === nftId)
    return HttpResponse.json({ items })
  }),
]

const favoritesHandlers = [
  http.get(`${API_BASE_PATH}/favorites`, () => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const items = getUserFavorites(current.user.id).map(({ nftId, nft, createdAt }) => ({ nftId, nft, createdAt }))
    return HttpResponse.json({ items })
  }),

  http.post(`${API_BASE_PATH}/favorites`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { nftId?: string }
    const nft = nftsById[body.nftId ?? '']
    if (!nft) {
      return buildError('NOT_FOUND', 'O conteúdo solicitado não foi encontrado.')
    }

    const state = readMockState()
    const existing = state.favorites.find((entry) => entry.userId === current.user.id && entry.nftId === nft.id)
    if (existing) {
      return HttpResponse.json(existing)
    }

    const favorite: Favorite = {
      nftId: nft.id,
      nft,
      createdAt: new Date().toISOString(),
    }

    persistMockState({
      ...state,
      favorites: [...state.favorites, { ...favorite, userId: current.user.id }],
    })

    return HttpResponse.json(favorite)
  }),

  http.delete(`${API_BASE_PATH}/favorites/:nftId`, ({ params }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const nftId = String(params.nftId)
    const state = readMockState()
    persistMockState({
      ...state,
      favorites: state.favorites.filter((entry) => !(entry.userId === current.user.id && entry.nftId === nftId)),
    })

    return HttpResponse.json({ nftId, removed: true })
  }),
]

const cartHandlers = [
  http.get(`${API_BASE_PATH}/cart`, () => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    return HttpResponse.json(getCartForUser(current.user.id))
  }),

  http.post(`${API_BASE_PATH}/cart/items`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { nftId?: string; editionId?: string; quantity?: number }
    const nft = nftsById[body.nftId ?? '']
    if (!nft) {
      return buildError('NOT_FOUND', 'O conteúdo solicitado não foi encontrado.')
    }

    if (!body.editionId || !body.quantity) {
      return buildError('VALIDATION_ERROR', 'Revise os campos destacados e tente novamente.')
    }

    const cart = getCartForUser(current.user.id)
    const nextItem = buildCartItem(nft, body.editionId, body.quantity)
    const existingItemIndex = cart.items.findIndex((entry) => entry.nftId === nft.id && entry.editionId === body.editionId)

    if (existingItemIndex >= 0) {
      const existingItem = cart.items[existingItemIndex]
      const mergedQuantity = existingItem.quantity + body.quantity
      cart.items[existingItemIndex] = {
        ...existingItem,
        quantity: mergedQuantity,
        lineTotal: mul(existingItem.unitPrice, String(mergedQuantity)),
      }
    } else {
      cart.items.push(nextItem)
    }

    saveCartForUser(current.user.id, cart)
    return HttpResponse.json(cart)
  }),

  http.put(`${API_BASE_PATH}/cart/items/:id`, async ({ params, request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { quantity?: number }
    const cart = getCartForUser(current.user.id)
    const itemId = String(params.id)
    const itemIndex = cart.items.findIndex((entry) => entry.id === itemId)

    if (itemIndex < 0) {
      return buildError('NOT_FOUND', 'O item não foi encontrado no carrinho.')
    }

    const nextQuantity = Math.max(1, body.quantity ?? cart.items[itemIndex].quantity)
    cart.items[itemIndex] = {
      ...cart.items[itemIndex],
      quantity: nextQuantity,
      lineTotal: mul(cart.items[itemIndex].unitPrice, String(nextQuantity)),
    }

    saveCartForUser(current.user.id, cart)
    return HttpResponse.json(cart)
  }),

  http.delete(`${API_BASE_PATH}/cart/items/:id`, ({ params }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const cart = getCartForUser(current.user.id)
    const nextItems = cart.items.filter((entry) => entry.id !== String(params.id))
    const nextCart: Cart = { ...cart, items: nextItems }
    saveCartForUser(current.user.id, nextCart)
    return HttpResponse.json({ itemId: String(params.id), removed: true })
  }),

  http.post(`${API_BASE_PATH}/cart/merge`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { items?: Array<{ nftId: string; editionId: string; quantity: number }> }
    const cart = getCartForUser(current.user.id)
    const merged = body.items ?? []
    for (const item of merged) {
      const nft = nftsById[item.nftId]
      if (!nft) continue
      const existingIndex = cart.items.findIndex((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId)
      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += item.quantity
      } else {
        cart.items.push(buildCartItem(nft, item.editionId, item.quantity))
      }
    }

    saveCartForUser(current.user.id, cart)
    return HttpResponse.json({ cart, mergedItemCount: merged.length })
  }),

  http.put(`${API_BASE_PATH}/cart/coupon`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { code?: string }
    const code = body.code ?? ''
    const cart = getCartForUser(current.user.id)
    const coupon = coupons.find((entry) => entry.code === code)

    if (!coupon) {
      return buildError('COUPON_INVALID', 'Este cupom não é válido.')
    }

    if (coupon.status === 'expired') {
      return buildError('COUPON_EXPIRED', 'Este cupom expirou.')
    }

    const nextCart: Cart = { ...cart, coupon: { code: coupon.code, status: coupon.status } }
    saveCartForUser(current.user.id, nextCart)
    return HttpResponse.json({ cart: nextCart })
  }),

  http.delete(`${API_BASE_PATH}/cart/coupon`, () => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const cart = getCartForUser(current.user.id)
    const nextCart: Cart = { ...cart, coupon: null }
    saveCartForUser(current.user.id, nextCart)
    return HttpResponse.json({ cart: nextCart })
  }),

  http.post(`${API_BASE_PATH}/cart/quote`, () => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const cart = getCartForUser(current.user.id)
    const result = getQuoteFromCart(cart)
    return HttpResponse.json(result)
  }),
]

const orderHandlers = [
  http.post(`${API_BASE_PATH}/orders`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { quoteId?: string; provider?: string; walletId?: string }
    const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER) ?? 'default-key'

    const cart = getCartForUser(current.user.id)
    const quote = getQuoteFromCart(cart)
    const existing = readMockState().orders.find((entry) => entry.userId === current.user.id && entry.quoteId === quote.quoteId && entry.createdAt)

    if (existing && body.quoteId === quote.quoteId) {
      return HttpResponse.json(existing)
    }

    if (body.quoteId && body.quoteId !== quote.quoteId) {
      return buildError('PRICE_CHANGED', 'O preço foi alterado. Revise os valores antes de continuar.', { quote })
    }

    const order = createOrderFromQuote(current.user.id, cart, quote, idempotencyKey)
    return HttpResponse.json(order)
  }),

  http.get(`${API_BASE_PATH}/orders/:id`, ({ params }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const order = findOrderForUser(current.user.id, String(params.id))
    if (!order) {
      return buildError('NOT_FOUND', 'O conteúdo solicitado não foi encontrado.')
    }

    return HttpResponse.json(order)
  }),
]

const profileHandlers = [
  http.get(`${API_BASE_PATH}/profile`, () => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const target = getUserById(current.user.id)
    if (!target) {
      return buildError('NOT_FOUND', 'O conteúdo solicitado não foi encontrado.')
    }

    return HttpResponse.json({
      displayName: target.displayName,
      username: target.username,
      email: target.email,
      ensName: target.ensName,
      walletNickname: 'Principal',
      avatar: target.avatar,
      referralCode: target.referralCode,
    } satisfies Profile)
  }),

  http.put(`${API_BASE_PATH}/profile`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as Partial<Profile>
    const state = readMockState()
    const nextUsers = state.users.map((user) =>
      user.id === current.user.id ? { ...user, ...body } : user,
    )
    persistMockState({ ...state, users: nextUsers })

    return HttpResponse.json({
      displayName: body.displayName ?? current.user.displayName,
      username: body.username ?? current.user.username,
      email: body.email ?? current.user.email,
      ensName: body.ensName ?? current.user.ensName,
      walletNickname: 'Principal',
      avatar: body.avatar ?? current.user.avatar,
      referralCode: current.user.referralCode,
    } satisfies Profile)
  }),

  http.put(`${API_BASE_PATH}/profile/password`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as { currentPassword?: string; newPassword?: string; confirmPassword?: string }
    if (body.newPassword !== body.confirmPassword) {
      return buildError('VALIDATION_ERROR', 'Revise os campos destacados e tente novamente.', undefined, {
        confirmPassword: ['As senhas não coincidem.'],
      })
    }

    const isValid = await validatePassword(current.user, body.currentPassword ?? '')
    if (!isValid) {
      return buildError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
    }

    return HttpResponse.json({ updated: true })
  }),
]

const walletHandlers = [
  http.get(`${API_BASE_PATH}/wallets`, () => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    return HttpResponse.json({ items: readMockState().wallets.filter((wallet) => wallet.userId === current.user.id) })
  }),

  http.post(`${API_BASE_PATH}/wallets`, async ({ request }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as Omit<Wallet, 'id' | 'userId' | 'connectionStatus'>
    const state = readMockState()
    const wallet: Wallet & { userId: string } = {
      ...body,
      id: `wallet-${Date.now()}`,
      userId: current.user.id,
      connectionStatus: 'connected',
    }

    const nextWallets = [...state.wallets, wallet] as const
    persistMockState({
      ...state,
      wallets: nextWallets,
    })

    return HttpResponse.json(wallet)
  }),

  http.put(`${API_BASE_PATH}/wallets/:id`, async ({ request, params }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const body = await request.json() as Partial<Wallet>
    const state = readMockState()
    const nextWallets = state.wallets.map((wallet) =>
      wallet.id === String(params.id)
        ? { ...wallet, ...body, connectionStatus: wallet.connectionStatus }
        : wallet,
    )

    persistMockState({ ...state, wallets: nextWallets })
    return HttpResponse.json(nextWallets.find((wallet) => wallet.id === String(params.id)))
  }),

  http.post(`${API_BASE_PATH}/wallets/:id/connect`, ({ params }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const state = readMockState()
    const nextWallets = state.wallets.map((wallet) =>
      wallet.id === String(params.id) ? { ...wallet, connectionStatus: 'connected' as const } : wallet,
    )

    persistMockState({ ...state, wallets: nextWallets })
    return HttpResponse.json({ connected: true })
  }),

  http.post(`${API_BASE_PATH}/wallets/:id/disconnect`, ({ params }) => {
    const current = getCurrentUserSession()
    if (!current) {
      return buildError('UNAUTHENTICATED', 'Entre na sua conta para continuar.')
    }

    const state = readMockState()
    const nextWallets = state.wallets.map((wallet) =>
      wallet.id === String(params.id) ? { ...wallet, connectionStatus: 'disconnected' as const } : wallet,
    )

    persistMockState({ ...state, wallets: nextWallets })
    return HttpResponse.json({ disconnected: true })
  }),
]

const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
]

export { handlers }
