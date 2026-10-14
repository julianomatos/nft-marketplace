import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { API_ENDPOINTS } from '../../types/endpoints'
import {
  applyCouponRequestSchema,
  cartItemInputSchema,
  mergeCartRequestSchema,
  positiveQuantitySchema,
  quoteRequestSchema,
  type Cart,
} from '../../types/contracts'
import { mul } from '../../utils/eth'
import { coupons } from '../fixtures'
import { getMockNow, readMockState } from '../store'
import {
  buildCartItem,
  buildErrorResponse,
  calculateQuote,
  formatZodErrors,
  getAuthenticatedUser,
  getCartForUser,
  HANDLER_BASE_PATH,
  saveCartForUser,
  validateCartCoupon,
} from './utils'

const updateQuantitySchema = z.object({
  quantity: positiveQuantitySchema,
})

export const cartHandlers = [
  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.current}`, ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    return HttpResponse.json(getCartForUser(auth.user.id))
  }),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.items}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = cartItemInputSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os campos destacados e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const { nftId, editionId, quantity } = parsed.data
    const state = readMockState()
    const nft = state.nfts.find((entry) => entry.id === nftId)
    if (!nft) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O conteúdo solicitado não foi encontrado.',
      )
    }

    const edition = nft.editions.find((item) => item.id === editionId)
    if (!edition) {
      return buildErrorResponse(
        'NOT_FOUND',
        'Edição não encontrada para este NFT.',
      )
    }

    const cart = getCartForUser(auth.user.id)
    const existingIndex = cart.items.findIndex(
      (entry) => entry.nftId === nft.id && entry.editionId === editionId,
    )
    const currentQty = existingIndex >= 0 ? cart.items[existingIndex].quantity : 0
    const desiredQty = currentQty + quantity

    if (desiredQty > edition.available) {
      return buildErrorResponse(
        'AVAILABILITY_CONFLICT',
        'A quantidade solicitada excede a disponibilidade atual.',
        { quote: calculateQuote(cart) },
      )
    }

    if (existingIndex >= 0) {
      const existing = cart.items[existingIndex]
      cart.items[existingIndex] = {
        ...existing,
        quantity: desiredQty,
        lineTotal: mul(existing.unitPrice, String(desiredQty)),
      }
    } else {
      cart.items.push(buildCartItem(nft, editionId, quantity))
    }

    saveCartForUser(auth.user.id, cart)
    return HttpResponse.json(cart)
  }),

  http.put(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.itemPattern}`,
    async ({ params, request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = updateQuantitySchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Quantidade inválida.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const itemId = String(params.id)
    const cart = getCartForUser(auth.user.id)
    const itemIndex = cart.items.findIndex((entry) => entry.id === itemId)

    if (itemIndex < 0) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O item não foi encontrado no carrinho.',
      )
    }

    const currentItem = cart.items[itemIndex]
    const state = readMockState()
    const nft = state.nfts.find((entry) => entry.id === currentItem.nftId)
    const edition = nft?.editions.find((e) => e.id === currentItem.editionId)

    if (edition && parsed.data.quantity > edition.available) {
      return buildErrorResponse(
        'AVAILABILITY_CONFLICT',
        'A quantidade solicitada excede a disponibilidade atual.',
        { quote: calculateQuote(cart) },
      )
    }

    cart.items[itemIndex] = {
      ...currentItem,
      quantity: parsed.data.quantity,
      lineTotal: mul(currentItem.unitPrice, String(parsed.data.quantity)),
    }

    saveCartForUser(auth.user.id, cart)
    return HttpResponse.json(cart)
    },
  ),

  http.delete(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.itemPattern}`,
    ({ params, request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const itemId = String(params.id)
    const cart = getCartForUser(auth.user.id)
    const nextItems = cart.items.filter((entry) => entry.id !== itemId)
    const nextCart: Cart = { ...cart, items: nextItems }

    saveCartForUser(auth.user.id, nextCart)
    return HttpResponse.json({ itemId, removed: true })
    },
  ),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.merge}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = mergeCartRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Itens inválidos para mesclagem.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const cart = getCartForUser(auth.user.id)
    const state = readMockState()

    const mergedQuantities = new Map<string, number>()
    for (const item of parsed.data.items) {
      const nft = state.nfts.find((entry) => entry.id === item.nftId)
      const edition = nft?.editions.find((entry) => entry.id === item.editionId)
      if (!nft || !edition) {
        return buildErrorResponse(
          'NOT_FOUND',
          'Um dos itens do carrinho não está mais disponível.',
        )
      }

      const key = `${item.nftId}:${item.editionId}`
      const previousGuestQuantity = mergedQuantities.get(key) ?? 0
      const currentQuantity =
        cart.items.find(
          (entry) =>
            entry.nftId === item.nftId &&
            entry.editionId === item.editionId,
        )?.quantity ?? 0
      const desiredQuantity = currentQuantity + previousGuestQuantity + item.quantity
      if (desiredQuantity > edition.available) {
        return buildErrorResponse(
          'AVAILABILITY_CONFLICT',
          'A quantidade mesclada excede a disponibilidade atual.',
          { quote: calculateQuote(cart) },
        )
      }
      mergedQuantities.set(key, previousGuestQuantity + item.quantity)
    }

    for (const item of parsed.data.items) {
      const nft = state.nfts.find((entry) => entry.id === item.nftId)
      if (!nft) {
        throw new Error(`Validated merge item references missing NFT ${item.nftId}`)
      }
      const edition = nft.editions.find((e) => e.id === item.editionId)
      if (!edition) {
        throw new Error(`Validated merge item references missing edition ${item.editionId}`)
      }

      const existingIndex = cart.items.findIndex(
        (entry) => entry.nftId === item.nftId && entry.editionId === item.editionId,
      )

      if (existingIndex >= 0) {
        const nextQty = cart.items[existingIndex].quantity + item.quantity
        cart.items[existingIndex] = {
          ...cart.items[existingIndex],
          quantity: nextQty,
          lineTotal: mul(cart.items[existingIndex].unitPrice, String(nextQty)),
        }
      } else {
        cart.items.push(buildCartItem(nft, item.editionId, item.quantity))
      }
    }

    saveCartForUser(auth.user.id, cart)
    return HttpResponse.json({
      cart,
      mergedItemCount: parsed.data.items.length,
    })
  }),

  http.put(`${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.coupon}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = applyCouponRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Código de cupom obrigatório.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const code = parsed.data.code.trim().toUpperCase()
    const coupon = coupons.find((entry) => entry.code.toUpperCase() === code)

    if (!coupon) {
      return buildErrorResponse(
        'COUPON_INVALID',
        'Este cupom não é válido.',
        undefined,
        { code: ['Este cupom não é válido.'] },
      )
    }

    const nowMs = new Date(getMockNow()).getTime()
    const isExpired =
      coupon.status === 'expired' ||
      (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < nowMs)

    if (isExpired) {
      return buildErrorResponse(
        'COUPON_EXPIRED',
        'Este cupom expirou.',
        undefined,
        { code: ['Este cupom expirou.'] },
      )
    }

    const cart = getCartForUser(auth.user.id)
    const nextCart: Cart = {
      ...cart,
      coupon: { code: coupon.code, status: 'valid' },
    }

    saveCartForUser(auth.user.id, nextCart)
    return HttpResponse.json({ cart: nextCart })
  }),

  http.delete(`${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.coupon}`, ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const cart = getCartForUser(auth.user.id)
    const nextCart: Cart = { ...cart, coupon: null }

    saveCartForUser(auth.user.id, nextCart)
    return HttpResponse.json({ cart: nextCart })
  }),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.cart.quote}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = quoteRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'A cotação não aceita campos adicionais.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const cart = getCartForUser(auth.user.id)
    const couponError = validateCartCoupon(auth.user.id, cart)
    if (couponError) return couponError
    const quote = calculateQuote(cart)
    return HttpResponse.json(quote)
  }),
]
