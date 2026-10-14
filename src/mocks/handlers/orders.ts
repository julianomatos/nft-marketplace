import { http, HttpResponse } from 'msw'
import { API_ENDPOINTS, IDEMPOTENCY_KEY_HEADER } from '../../types/endpoints'
import {
  createOrderRequestSchema,
  type OrderReceiptSnapshot,
  type PositiveInteger,
} from '../../types/contracts'
import {
  getMockNow,
  getMockTimeoutResponseDelay,
  persistMockState,
  readMockState,
} from '../store'
import type { OrderRecord } from '../types'
import { settleMockOrder } from '../settle-order'
import { applyOrderScenarioMutation } from './scenarios'
import {
  buildErrorResponse,
  calculateQuote,
  formatZodErrors,
  getAuthenticatedUser,
  getCartForUser,
  HANDLER_BASE_PATH,
  validateCartCoupon,
} from './utils'

async function hashPayload(payload: unknown): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(payload)),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function toReceipt(order: OrderRecord): OrderReceiptSnapshot {
  return {
    orderId: order.orderId,
    version: order.version,
    quoteId: order.quoteId,
    status: order.status,
    transactionHash: order.transactionHash,
    network: order.network,
    explorerUrl: order.explorerUrl,
    provider: order.provider,
    wallet: order.wallet,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    fee: order.fee,
    total: order.total,
    createdAt: order.createdAt,
  }
}

export const orderHandlers = [
  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.orders.create}`, async ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER)
    if (!idempotencyKey) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'A chave de idempotência é obrigatória.',
        undefined,
        { [IDEMPOTENCY_KEY_HEADER]: ['A chave de idempotência é obrigatória.'] },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return buildErrorResponse('VALIDATION_ERROR', 'JSON inválido.')
    }

    const parsed = createOrderRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os dados do pedido e tente novamente.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const payloadHash = await hashPayload(parsed.data)
    let state = readMockState()
    const scopedKey = `${auth.user.id}:${idempotencyKey}`
    const existingKeyRecord = state.idempotencyRecords[scopedKey]

    if (existingKeyRecord) {
      if (existingKeyRecord.payloadHash === payloadHash) {
        const existingOrder = state.orders.find(
          (entry) =>
            entry.userId === auth.user!.id &&
            entry.orderId === existingKeyRecord.orderId,
        )
        if (existingOrder) {
          return HttpResponse.json(toReceipt(existingOrder))
        }
        throw new Error(`Idempotency record references missing order ${existingKeyRecord.orderId}`)
      } else {
        return buildErrorResponse(
          'IDEMPOTENCY_KEY_REUSED',
          'Esta chave de idempotência já foi utilizada com outro conteúdo.',
        )
      }
    }

    const cart = getCartForUser(auth.user.id)
    if (cart.items.length === 0) {
      return buildErrorResponse('VALIDATION_ERROR', 'O carrinho está vazio.')
    }

    const couponError = validateCartCoupon(auth.user.id, cart)
    if (couponError) return couponError

    if (state.scenario === 'price-changed' || state.scenario === 'sold-out') {
      applyOrderScenarioMutation(state.scenario, auth.user.id)
      state = readMockState()
    }

    const currentQuote = calculateQuote(cart, undefined, state)

    if (currentQuote.items.some((item) => item.quantity > item.available)) {
      return buildErrorResponse(
        'AVAILABILITY_CONFLICT',
        'A edição solicitada não possui estoque suficiente.',
        { quote: currentQuote },
      )
    }

    if (parsed.data.quoteId !== currentQuote.quoteId) {
      return buildErrorResponse(
        'PRICE_CHANGED',
        'Os valores da compra foram alterados. Revise a nova cotação.',
        { quote: currentQuote },
      )
    }

    const nowMs = new Date(getMockNow()).getTime()
    const orderId = `order-${nowMs}-${String(state.orders.length + 1).padStart(4, '0')}`

    const snapshot: OrderReceiptSnapshot = {
      orderId,
      version: 1 as PositiveInteger,
      quoteId: currentQuote.quoteId,
      status: 'pending',
      transactionHash: null,
      network: parsed.data.collector.network,
      explorerUrl: null,
      provider: parsed.data.provider,
      wallet: {
        nickname: parsed.data.collector.profileName || 'Principal',
        address: parsed.data.collector.walletAddress,
      },
      items: currentQuote.items.map((quoteItem) => {
        const item = cart.items.find(
          (entry) =>
            entry.nftId === quoteItem.nftId &&
            entry.editionId === quoteItem.editionId,
        )
        if (!item) {
          throw new Error(`Quote item ${quoteItem.nftId} disappeared from cart`)
        }
        return {
          nftId: item.nftId,
          name: item.nft.name,
          tokenId: item.nft.tokenId,
          edition: quoteItem.edition,
          quantity: quoteItem.quantity,
          unitPrice: quoteItem.unitPrice,
          subtotal: quoteItem.lineTotal,
        }
      }),
      subtotal: currentQuote.subtotal,
      discount: currentQuote.discount,
      fee: currentQuote.networkFee,
      total: currentQuote.total,
      createdAt: getMockNow(),
    }

    const orderRecord: OrderRecord = {
      ...snapshot,
      userId: auth.user.id,
    }

    persistMockState({
      ...state,
      orders: [...state.orders, orderRecord],
      idempotencyRecords: {
        ...state.idempotencyRecords,
        [scopedKey]: {
          payloadHash,
          orderId,
        },
      },
    })

    if (
      state.scenario === 'payment-confirmed' ||
      state.scenario === 'payment-rejected'
    ) {
      const outcome = state.scenario === 'payment-confirmed' ? 'confirmed' : 'rejected'
      return HttpResponse.json(toReceipt(settleMockOrder(orderId, outcome)))
    }

    if (state.scenario === 'timeout-after-order') {
      await new Promise((resolve) =>
        setTimeout(resolve, getMockTimeoutResponseDelay()),
      )
    }

    return HttpResponse.json(snapshot)
  }),

  http.get(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.orders.detailPattern}`,
    ({ params, request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const orderId = String(params.id)
    const state = readMockState()
    const order = state.orders.find(
      (entry) => entry.userId === auth.user!.id && entry.orderId === orderId,
    )

    if (!order) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O conteúdo solicitado não foi encontrado.',
      )
    }

    return HttpResponse.json(toReceipt(order))
    },
  ),
]
