import { HttpResponse } from 'msw'
import type { z } from 'zod'
import { add, div, mul, sum } from '../../utils/eth'
import { API_ERROR_STATUS } from '../../types/endpoints'
import { API_BASE_PATH } from '../../types/endpoints'
import type {
  ApiErrorCode,
  ApiErrorEnvelope,
  Cart,
  Nft,
  PositiveInteger,
  QuoteResponse,
} from '../../types/contracts'
import { coupons, LAUNCH_DISCOUNT } from '../fixtures'
import {
  getMockNow,
  persistMockState,
  readMockState,
  SESSION_TOKEN_STORAGE_KEY,
} from '../store'
import type { FixtureUser } from '../types'

export const STATE_UPDATE_INTERVAL_MS = 60_000
export const HANDLER_BASE_PATH = `*${API_BASE_PATH}`

export function buildErrorResponse(
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

  const status = API_ERROR_STATUS[code]
  return HttpResponse.json({ error: payload }, { status })
}

export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'root'
    if (!fieldErrors[key]) {
      fieldErrors[key] = []
    }
    fieldErrors[key].push(issue.message)
  }
  return fieldErrors
}

export function writeSessionToken(token: string | null) {
  if (typeof window === 'undefined') return
  if (token) {
    window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token)
  } else {
    window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY)
  }
}

export function getAuthenticatedUser(request: Request): {
  user: FixtureUser | null
  state: ReturnType<typeof readMockState>
  error: 'UNAUTHENTICATED' | 'SESSION_EXPIRED' | null
} {
  const state = readMockState()

  // 1. Check Bearer token in Authorization header
  let token: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.slice(7).trim()
  }

  // 2. Fall back to sessionStorage if in browser
  if (!token && typeof window !== 'undefined') {
    token = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
  }

  if (!token) {
    return { user: null, state, error: 'UNAUTHENTICATED' }
  }

  if (!state.session.token || state.session.token !== token) {
    return { user: null, state, error: 'UNAUTHENTICATED' }
  }

  const nowMs = new Date(getMockNow()).getTime()
  if (state.session.expiresAt && new Date(state.session.expiresAt).getTime() <= nowMs) {
    return { user: null, state, error: 'SESSION_EXPIRED' }
  }

  const user = state.users.find((entry) => entry.id === state.session.userId)
  if (!user) {
    return { user: null, state, error: 'UNAUTHENTICATED' }
  }

  return { user, state, error: null }
}

export function getCartForUser(userId: string): Cart {
  const state = readMockState()
  const cartRecord = state.carts.find((entry) => entry.userId === userId)
  return cartRecord?.cart ?? { items: [], coupon: null }
}

export function validateCartCoupon(
  userId: string,
  cart: Cart,
): ReturnType<typeof buildErrorResponse> | null {
  if (!cart.coupon) return null

  const coupon = coupons.find(
    (entry) => entry.code.toUpperCase() === cart.coupon?.code.toUpperCase(),
  )
  const expired =
    coupon?.status === 'expired' ||
    (coupon?.expiresAt !== undefined &&
      new Date(coupon.expiresAt).getTime() <= new Date(getMockNow()).getTime())
  if (coupon && !expired) return null
  const code: ApiErrorCode = coupon ? 'COUPON_EXPIRED' : 'COUPON_INVALID'

  saveCartForUser(userId, { ...cart, coupon: null })
  return buildErrorResponse(
    code,
    code === 'COUPON_EXPIRED'
      ? 'Este cupom expirou.'
      : 'Este cupom não é válido.',
    undefined,
    {
      code: [
        code === 'COUPON_EXPIRED'
          ? 'Este cupom expirou.'
          : 'Este cupom não é válido.',
      ],
    },
  )
}

export function saveCartForUser(userId: string, nextCart: Cart) {
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

export function buildCartItem(
  nft: Nft,
  editionId: string,
  quantity: number,
): Cart['items'][number] {
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

export function calculateQuote(
  cart: Cart,
  quoteId?: string,
  state = readMockState(),
): QuoteResponse {
  const items = cart.items.map((entry) => {
    const nft = state.nfts.find((item) => item.id === entry.nftId)
    const edition = nft?.editions.find((item) => item.id === entry.editionId)
    if (!nft || !edition) {
      throw new Error(`Cart item ${entry.id} references missing NFT edition`)
    }

    return {
      nftId: entry.nftId,
      editionId: entry.editionId,
      edition: entry.edition,
      quantity: entry.quantity,
      unitPrice: nft.price,
      lineTotal: mul(nft.price, String(entry.quantity)),
      available: edition.available,
    }
  })

  const subtotal = sum(items.map((item) => item.lineTotal))
  const discountCode = cart.coupon?.code
  const coupon = coupons.find((entry) => entry.code === discountCode)
  const couponExpired =
    coupon?.status === 'expired' ||
    (coupon?.expiresAt !== undefined &&
      new Date(coupon.expiresAt).getTime() <= new Date(getMockNow()).getTime())
  const discountPercent =
    coupon?.status === 'valid' && !couponExpired ? coupon.discountPercent : 0
  const discount = discountPercent === 0
    ? LAUNCH_DISCOUNT
    : div(mul(subtotal, String(discountPercent)), '100')
  const networkFee = '0.016'
  const total = add(add(subtotal, networkFee), `-${discount}`)

  const nowMs = new Date(getMockNow()).getTime()
  const expiresAt = new Date(nowMs + STATE_UPDATE_INTERVAL_MS).toISOString()
  const generatedId =
    quoteId ??
    `quote-${items.map((i) => `${i.nftId}:${i.editionId}:${i.quantity}:${i.unitPrice}:${i.available}`).join('_')}${cart.coupon ? `_${cart.coupon.code}` : ''}_${expiresAt}`

  return {
    quoteId: generatedId,
    items,
    subtotal,
    discount,
    networkFee,
    total,
    coupon: coupon && !couponExpired ? cart.coupon ?? null : null,
    expiresAt,
    version: 1 as PositiveInteger,
  }
}
