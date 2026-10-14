type CatalogQueryParams = Readonly<{
  q?: string
  feed?: 'all' | 'new' | 'trending'
  category?: readonly string[]
  network?: readonly string[]
  minPrice?: string
  maxPrice?: string
  sort?: string
  page?: number
  limit?: number
}>

type QueryParams = Readonly<Record<string, unknown>>

function userQueryKeys(userId: string) {
  return {
    all: ['user', userId] as const,
    cart: ['user', userId, 'cart'] as const,
    cartQuote: (params: QueryParams) =>
      ['user', userId, 'cart', 'quote', params] as const,
    favorites: ['user', userId, 'favorites'] as const,
    orders: ['user', userId, 'orders'] as const,
    order: (orderId: string) =>
      ['user', userId, 'orders', orderId] as const,
    profile: ['user', userId, 'profile'] as const,
    wallets: ['user', userId, 'wallets'] as const,
  }
}

const queryKeys = {
  auth: {
    session: ['auth', 'session'] as const,
  },
  catalog: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (params: CatalogQueryParams) =>
      ['nfts', 'list', params] as const,
    featured: ['nfts', 'featured'] as const,
    detail: (nftId: string) => ['nfts', 'detail', nftId] as const,
    related: (nftId: string) => ['nfts', 'related', nftId] as const,
    reviews: (nftId: string) => ['nfts', 'reviews', nftId] as const,
  },
  user: userQueryKeys,
}

export { queryKeys, type CatalogQueryParams, type QueryParams }
