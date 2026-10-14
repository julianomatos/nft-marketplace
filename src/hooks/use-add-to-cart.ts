import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '@/hooks/use-session'
import { queryKeys } from '@/hooks/queryKeys'
import { API_ENDPOINTS } from '@/types/endpoints'
import {
  cartItemInputSchema,
  type CartItemInput,
  type CartResponse,
  type Nft,
} from '@/types/contracts'
import { apiClient, getSessionToken } from '@/services/api-client'

type AddToCartOptions = {
  editionId?: string
  quantity?: number
}

function useAddToCart(nft: Nft) {
  const sessionQuery = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userId = sessionQuery.data?.authenticated
    ? sessionQuery.data.user.id
    : undefined

  const addToCartMutation = useMutation<
    CartResponse,
    Error,
    CartItemInput
  >({
    mutationFn: async (input) => {
      const payload = cartItemInputSchema.parse(input)
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

  async function addToCart(options: AddToCartOptions = {}): Promise<boolean> {
    if (!requireAuthentication()) return false

    const edition = options.editionId
      ? nft.editions.find(({ id }) => id === options.editionId)
      : nft.editions.find(({ available }) => available > 0)
    if (!edition) {
      throw new Error(
        options.editionId
          ? 'A edição selecionada não está disponível.'
          : 'Todas as edições deste NFT estão esgotadas.',
      )
    }
    if (edition.available === 0) {
      throw new Error('Todas as unidades desta edição estão esgotadas.')
    }

    const quantity = options.quantity ?? 1
    if (quantity > edition.available) {
      throw new Error('A quantidade excede a disponibilidade desta edição.')
    }

    await addToCartMutation.mutateAsync({
      nftId: nft.id,
      editionId: edition.id,
      quantity,
    })
    return true
  }

  return {
    addToCart,
    addToCartPending:
      addToCartMutation.isPending ||
      (getSessionToken() !== null && sessionQuery.isPending),
  }
}

export { useAddToCart, type AddToCartOptions }
