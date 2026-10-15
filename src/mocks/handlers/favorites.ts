import { http, HttpResponse } from 'msw'
import { API_ENDPOINTS } from '../../types/endpoints'
import { favoriteRequestSchema, type Favorite } from '../../types/contracts'
import { getMockNow, persistMockState, readMockState } from '../store'
import {
  buildErrorResponse,
  formatZodErrors,
  getAuthenticatedUser,
  HANDLER_BASE_PATH,
} from './utils'

export const favoritesHandlers = [
  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.favorites.list}`, ({ request }) => {
    const auth = getAuthenticatedUser(request)
    if (!auth.user) {
      return buildErrorResponse(
        auth.error ?? 'UNAUTHENTICATED',
        'Entre na sua conta para continuar.',
      )
    }

    const state = readMockState()
    const userFavorites = state.favorites
      .filter((fav) => fav.userId === auth.user!.id)
      .map(({ nftId, nft, createdAt }) => ({ nftId, nft, createdAt }))

    return HttpResponse.json({ items: userFavorites })
  }),

  http.post(`${HANDLER_BASE_PATH}${API_ENDPOINTS.favorites.create}`, async ({ request }) => {
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

    const parsed = favoriteRequestSchema.safeParse(body)
    if (!parsed.success) {
      return buildErrorResponse(
        'VALIDATION_ERROR',
        'Informe um NFT válido.',
        undefined,
        formatZodErrors(parsed.error),
      )
    }

    const { nftId } = parsed.data
    const state = readMockState()
    const nft = state.nfts.find((entry) => entry.id === nftId)
    if (!nft) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O conteúdo solicitado não foi encontrado.',
      )
    }

    const existing = state.favorites.find(
      (entry) => entry.userId === auth.user!.id && entry.nftId === nftId,
    )
    if (existing) {
      return HttpResponse.json({
        nftId: existing.nftId,
        nft: existing.nft,
        createdAt: existing.createdAt,
      })
    }

    const newFavorite: Favorite = {
      nftId: nft.id,
      nft,
      createdAt: getMockNow(),
    }

    persistMockState({
      ...state,
      favorites: [
        ...state.favorites,
        { ...newFavorite, userId: auth.user.id },
      ],
    })

    return HttpResponse.json(newFavorite)
  }),

  http.delete(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.favorites.deletePattern}`,
    ({ params, request }) => {
      const auth = getAuthenticatedUser(request)
      if (!auth.user) {
        return buildErrorResponse(
          auth.error ?? 'UNAUTHENTICATED',
          'Entre na sua conta para continuar.',
        )
      }

      const nftId = String(params.nftId)
      const state = readMockState()
      const nextFavorites = state.favorites.filter(
        (entry) => !(entry.userId === auth.user!.id && entry.nftId === nftId),
      )

      persistMockState({
        ...state,
        favorites: nextFavorites,
      })

      return HttpResponse.json({ nftId, removed: true })
    },
  ),
]
