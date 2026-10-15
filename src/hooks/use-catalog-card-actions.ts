import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '@/hooks/use-session'
import { useAddToCart } from '@/hooks/use-add-to-cart'
import { queryKeys } from '@/hooks/queryKeys'
import { queryStaleTimes } from '@/lib/query-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import type {
  FavoritesResponse,
  Nft,
  RemoveFavoriteResponse,
} from '@/types/contracts'
import { apiClient, getSessionToken } from '@/services/api-client'

function useCatalogCardActions(nft: Nft) {
  const cartActions = useAddToCart(nft)
  const sessionQuery = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = sessionQuery.data?.authenticated
    ? sessionQuery.data.user.id
    : undefined
  const hasSessionToken =
    typeof window !== 'undefined' &&
    window.sessionStorage.getItem('kurio.session.token') !== null
  const favoriteIdsKey = queryKeys.user(userId ?? 'guest').favoriteIds
  const favoriteIdsQuery = useQuery({
    queryKey: favoriteIdsKey,
    enabled: userId !== undefined && hasSessionToken,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<FavoritesResponse>(
        API_ENDPOINTS.favorites.list,
        { signal },
      )
      return response.data.items.map(({ nftId }) => nftId)
    },
    staleTime: queryStaleTimes.account,
  })

  const favoriteMutation = useMutation<
    void,
    Error,
    boolean,
    { previousIds: string[] | undefined }
  >({
    mutationFn: async (isFavorite) => {
      if (!userId || !getSessionToken()) {
        throw new Error('Entre na sua conta para continuar.')
      }

      if (isFavorite) {
        await apiClient.post<void>(API_ENDPOINTS.favorites.create, {
          nftId: nft.id,
        })
      } else {
        await apiClient.delete<RemoveFavoriteResponse>(
          API_ENDPOINTS.favorites.delete(nft.id),
        )
      }
    },
    onMutate: async (isFavorite) => {
      await queryClient.cancelQueries({ queryKey: favoriteIdsKey })
      const previousIds = queryClient.getQueryData<string[]>(favoriteIdsKey)
      queryClient.setQueryData<string[]>(favoriteIdsKey, (currentIds = []) =>
        isFavorite
          ? currentIds.includes(nft.id)
            ? currentIds
            : [...currentIds, nft.id]
          : currentIds.filter((id) => id !== nft.id),
      )
      return { previousIds }
    },
    onError: (_error, _isFavorite, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(favoriteIdsKey, context.previousIds)
      } else {
        queryClient.removeQueries({ queryKey: favoriteIdsKey, exact: true })
      }
    },
    onSettled: async () => {
      if (!userId) return
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.user(userId).favoriteIds,
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.user(userId).favorites,
        }),
      ])
    },
  })

  function requireAuthentication(): boolean {
    const token = getSessionToken()
    if (!token) {
      const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
      void navigate({ to: '/login', search: { redirect } })
      return false
    }
    if (userId) return true
    if (sessionQuery.isPending) return false

    const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
    void navigate({ to: '/login', search: { redirect } })
    return false
  }

  async function toggleFavorite(): Promise<boolean> {
    if (!requireAuthentication()) return false
    await favoriteMutation.mutateAsync(
      !(favoriteIdsQuery.data?.includes(nft.id) ?? false),
    )
    return true
  }

  return {
    addToCart: cartActions.addToCart,
    addToCartPending: cartActions.addToCartPending,
    favoritePending:
      favoriteMutation.isPending ||
      (userId !== undefined && favoriteIdsQuery.isPending) ||
      (getSessionToken() !== null && sessionQuery.isPending),
    isFavorite: favoriteIdsQuery.data?.includes(nft.id) ?? false,
    toggleFavorite,
  }
}

export { useCatalogCardActions }
