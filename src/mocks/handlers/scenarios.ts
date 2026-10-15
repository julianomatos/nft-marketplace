import { delay, http, HttpResponse } from 'msw'
import { API_BASE_PATH, API_ENDPOINTS } from '../../types/endpoints'
import { add } from '../../utils/eth'
import { nfts as fixtureNfts } from '../fixtures'
import {
  getMockLatency,
  nextMockRequestSequence,
  persistMockState,
  readMockState,
} from '../store'
import type { MockScenario } from '../scenario-contract'
import { publishNftUpdated } from '../socket-events'
import {
  buildErrorResponse,
  getCartForUser,
} from './utils'

const PRIVATE_PATHS = [
  '/favorites',
  '/cart',
  '/orders',
  '/profile',
  '/wallets',
]

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PATHS.some(
    (path) =>
      pathname === `${API_BASE_PATH}${path}` ||
      pathname.startsWith(`${API_BASE_PATH}${path}/`),
  )
}

function forceCouponError(scenario: MockScenario) {
  const code = scenario === 'invalid-coupon' ? 'COUPON_INVALID' : 'COUPON_EXPIRED'
  const message = scenario === 'invalid-coupon'
    ? 'Este cupom não é válido.'
    : 'Este cupom expirou.'
  return buildErrorResponse(code, message, undefined, { code: [message] })
}

export function applyOrderScenarioMutation(
  scenario: 'price-changed' | 'sold-out',
  userId: string,
): void {
  const state = readMockState()
  const firstItem = getCartForUser(userId).items[0]
  if (!firstItem) return

  let changed = false
  const nextNfts = state.nfts.map((nft) => {
    if (nft.id !== firstItem.nftId) return nft

    const fixture = fixtureNfts.find(({ id }) => id === nft.id)
    if (!fixture) return nft

    if (scenario === 'price-changed') {
      if (nft.price !== fixture.price) return nft
      changed = true
      return {
        ...nft,
        price: add(nft.price, '0.01'),
        version: nft.version + 1,
      }
    }

    let editionChanged = false
    const editions = nft.editions.map((edition) => {
      if (edition.id !== firstItem.editionId || edition.available === 0) {
        return edition
      }
      editionChanged = true
      return { ...edition, available: 0 }
    })
    if (!editionChanged) return nft
    changed = true
    return { ...nft, editions, version: nft.version + 1 }
  })

  if (!changed) return

  persistMockState({ ...state, nfts: nextNfts })
  for (const nft of nextNfts) {
    const previousNft = state.nfts.find((entry) => entry.id === nft.id)
    if (previousNft && nft.version > previousNft.version) {
      publishNftUpdated(nft)
    }
  }
}

export const scenarioHandlers = [
  http.all('*', async ({ request }) => {
    const url = new URL(request.url)
    if (!url.pathname.startsWith(`${API_BASE_PATH}/`)) return undefined

    const state = readMockState()
    const scenario = state.scenario
    const method = request.method.toUpperCase()

    if (scenario === 'variable-latency') {
      const sequence = nextMockRequestSequence()
      const baseDelay = sequence % 2 === 1 ? 120 : 5
      await delay(baseDelay + getMockLatency())
    } else if (getMockLatency() > 0) {
      await delay(getMockLatency())
    }

    if (scenario === 'network-error') return HttpResponse.error()
    if (scenario === 'server-error') {
      return buildErrorResponse(
        'TRANSIENT_FAILURE',
        'O serviço está temporariamente indisponível.',
      )
    }
    if (scenario === 'unauthorized' && isPrivatePath(url.pathname)) {
      return buildErrorResponse(
        'UNAUTHENTICATED',
        'A sessão não está autorizada para este recurso.',
      )
    }

    if (
      method === 'POST' &&
      url.pathname === `${API_BASE_PATH}${API_ENDPOINTS.auth.signup}` &&
      scenario === 'signup-conflict'
    ) {
      return buildErrorResponse(
        'EMAIL_TAKEN',
        'Este e-mail já está cadastrado.',
        undefined,
        { email: ['Este e-mail já está cadastrado.'] },
      )
    }
    if (
      method === 'POST' &&
      url.pathname === `${API_BASE_PATH}${API_ENDPOINTS.auth.signup}` &&
      scenario === 'validation-error'
    ) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Revise os campos destacados e tente novamente.',
        undefined,
        {
          displayName: ['Informe seu nome.'],
          email: ['Informe um e-mail válido.'],
        },
      )
    }
    if (
      method === 'PUT' &&
      url.pathname === `${API_BASE_PATH}${API_ENDPOINTS.cart.coupon}` &&
      (scenario === 'invalid-coupon' || scenario === 'expired-coupon')
    ) {
      return forceCouponError(scenario)
    }

    return undefined
  }),
]
