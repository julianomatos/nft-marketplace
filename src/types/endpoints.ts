import type { ApiErrorCode } from './contracts'

export const API_BASE_PATH = '/api'

export const API_ENDPOINTS = {
  auth: {
    signup: '/auth/signup',
    login: '/auth/login',
    session: '/auth/session',
    logout: '/auth/logout',
  },
  nfts: {
    list: '/nfts',
    featured: '/nfts/featured',
    detail: (id: string) => `/nfts/${encodeURIComponent(id)}`,
    detailPattern: '/nfts/:id',
    related: (id: string) => `/nfts/${encodeURIComponent(id)}/related`,
    relatedPattern: '/nfts/:id/related',
    reviews: (id: string) => `/nfts/${encodeURIComponent(id)}/reviews`,
    reviewsPattern: '/nfts/:id/reviews',
  },
  favorites: {
    list: '/favorites',
    create: '/favorites',
    delete: (nftId: string) => `/favorites/${encodeURIComponent(nftId)}`,
    deletePattern: '/favorites/:nftId',
  },
  cart: {
    current: '/cart',
    items: '/cart/items',
    item: (id: string) => `/cart/items/${encodeURIComponent(id)}`,
    itemPattern: '/cart/items/:id',
    merge: '/cart/merge',
    coupon: '/cart/coupon',
    quote: '/cart/quote',
  },
  orders: {
    create: '/orders',
    detail: (id: string) => `/orders/${encodeURIComponent(id)}`,
    detailPattern: '/orders/:id',
  },
  profile: {
    current: '/profile',
    password: '/profile/password',
  },
  wallets: {
    list: '/wallets',
    detail: (id: string) => `/wallets/${encodeURIComponent(id)}`,
    detailPattern: '/wallets/:id',
    connect: (id: string) => `/wallets/${encodeURIComponent(id)}/connect`,
    connectPattern: '/wallets/:id/connect',
    disconnect: (id: string) => `/wallets/${encodeURIComponent(id)}/disconnect`,
    disconnectPattern: '/wallets/:id/disconnect',
  },
} as const

export const IDEMPOTENCY_KEY_HEADER = 'X-Idempotency-Key'

export const API_ERROR_STATUS: Readonly<Record<ApiErrorCode, number>> = {
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  AVAILABILITY_CONFLICT: 409,
  PRICE_CHANGED: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  WALLET_KIND_CONFLICT: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  VALIDATION_ERROR: 422,
  TRANSIENT_FAILURE: 503,
}
