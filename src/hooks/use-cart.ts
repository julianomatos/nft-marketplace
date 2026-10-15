import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/hooks/use-session'
import { queryKeys } from '@/hooks/queryKeys'
import { API_ENDPOINTS } from '@/types/endpoints'
import type {
  CartResponse,
  QuoteResponse,
  RemoveCartItemResponse,
} from '@/types/contracts'
import { apiClient } from '@/services/api-client'
import { mul } from '@/utils/eth'

function useCart() {
  const sessionQuery = useSession()
  const queryClient = useQueryClient()
  const userId = sessionQuery.data?.authenticated
    ? sessionQuery.data.user.id
    : undefined

  const cartKey = userId ? queryKeys.user(userId).cart : ['guest', 'cart']
  const cartQuoteKey = userId
    ? queryKeys.user(userId).cartQuote({})
    : ['guest', 'cart', 'quote']

  const cartQuery = useQuery({
    enabled: userId !== undefined,
    queryKey: cartKey,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<CartResponse>(
        API_ENDPOINTS.cart.current,
        { signal },
      )
      return response.data
    },
    staleTime: 0,
  })

  const cartQuoteQuery = useQuery({
    enabled: userId !== undefined,
    queryKey: cartQuoteKey,
    queryFn: async ({ signal }) => {
      const response = await apiClient.post<QuoteResponse>(
        API_ENDPOINTS.cart.quote,
        {},
        { signal },
      )
      return response.data
    },
    staleTime: 0,
  })

  const updateQuantityMutation = useMutation<
    CartResponse,
    Error,
    { id: string; quantity: number },
    { previousCart: CartResponse | undefined }
  >({
    mutationFn: async ({ id, quantity }) => {
      const response = await apiClient.put<CartResponse>(
        API_ENDPOINTS.cart.item(id),
        { quantity },
      )
      return response.data
    },
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previousCart = queryClient.getQueryData<CartResponse>(cartKey)
      queryClient.setQueryData<CartResponse>(cartKey, (currentCart) => {
        if (!currentCart) return currentCart
        return {
          ...currentCart,
          items: currentCart.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity,
                  lineTotal: mul(item.unitPrice, String(quantity)),
                }
              : item,
          ),
        }
      })
      return { previousCart }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKey, context.previousCart)
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartKey }),
        queryClient.invalidateQueries({ queryKey: cartQuoteKey }),
      ])
    },
  })

  const removeItemMutation = useMutation<
    RemoveCartItemResponse,
    Error,
    string,
    { previousCart: CartResponse | undefined }
  >({
    mutationFn: async (id) => {
      const response = await apiClient.delete<RemoveCartItemResponse>(
        API_ENDPOINTS.cart.item(id),
      )
      return response.data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: cartKey })
      const previousCart = queryClient.getQueryData<CartResponse>(cartKey)
      queryClient.setQueryData<CartResponse>(cartKey, (currentCart) => {
        if (!currentCart) return currentCart
        return {
          ...currentCart,
          items: currentCart.items.filter((item) => item.id !== id),
        }
      })
      return { previousCart }
    },
    onError: (_error, _id, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKey, context.previousCart)
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cartKey }),
        queryClient.invalidateQueries({ queryKey: cartQuoteKey }),
      ])
    },
  })

  return {
    cartQuery,
    cartQuoteQuery,
    isPending: cartQuery.isPending || cartQuoteQuery.isPending,
    isError: cartQuery.isError || cartQuoteQuery.isError,
    data: cartQuery.data,
    quote: cartQuoteQuery.data,
    updateQuantity: (id: string, quantity: number) =>
      updateQuantityMutation.mutateAsync({ id, quantity }),
    removeItem: (id: string) => removeItemMutation.mutateAsync(id),
    isUpdating: updateQuantityMutation.isPending || removeItemMutation.isPending,
    refetch: () => Promise.all([cartQuery.refetch(), cartQuoteQuery.refetch()]),
  }
}

export { useCart }
