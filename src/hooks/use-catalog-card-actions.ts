import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '@/hooks/use-session'
import { queryKeys } from '@/hooks/queryKeys'
import { queryStaleTimes } from '@/lib/query-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import type {
  CartItemInput,
  CartResponse,
  FavoritesResponse,
  Nft,
  RemoveFavoriteResponse,
} from '@/types/contracts'
import { apiClient, getSessionToken } from '@/services/api-client'

function useCatalogCardActions(nft: Nft) {
  const sessionQuery = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = sessionQuery.data?.authenticated
    ? sessionQuery.data.user.id
    : undefined
  const favoriteIdsKey = queryKeys.user(userId ?? 'guest').favoriteIds
  const favoriteIdsQuery = useQuery({
    queryKey: favoriteIdsKey,
    enabled: userId !== undefined,
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
      if (!userId) throw new Error('Entre na sua conta para continuar.')

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

  const addToCartMutation = useMutation({
    mutationFn: async (editionId: string) => {
      if (!userId) throw new Error('Entre na sua conta para continuar.')
      const payload: CartItemInput = {
        nftId: nft.id,
        editionId,
        quantity: 1,
      }
      const response = await apiClient.post<CartResponse>(
        API_ENDPOINTS.cart.items,
        payload,
      )
      return response.data
    },
    onSuccess: async () => {
      if (!userId) return
      await queryClient.invalidateQueries({
        queryKey: queryKeys.user(userId).cart,
      })
    },
  })

  function requireAuthentication(): boolean {
    if (userId) return true
    if (getSessionToken() && sessionQuery.isPending) return false

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

  async function addToCart(): Promise<boolean> {
    if (!requireAuthentication()) return false
    const edition = nft.editions.find(({ available }) => available > 0)
    if (!edition) throw new Error('Todas as edições deste NFT estão esgotadas.')
    await addToCartMutation.mutateAsync(edition.id)
    return true
  }

  return {
    addToCart,
    addToCartPending:
      addToCartMutation.isPending ||
      (getSessionToken() !== null && sessionQuery.isPending),
    favoritePending:
      favoriteMutation.isPending ||
      (userId !== undefined && favoriteIdsQuery.isPending) ||
      (getSessionToken() !== null && sessionQuery.isPending),
    isFavorite: favoriteIdsQuery.data?.includes(nft.id) ?? false,
    toggleFavorite,
  }
}

export { useCatalogCardActions }
