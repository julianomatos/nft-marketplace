import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { API_ENDPOINTS } from '@/types/endpoints'
import type { NftListResponse, NftSearchParams } from '@/types/contracts'
import { nftSearchParamsSchema } from '@/types/contracts'
import { queryStaleTimes } from '@/lib/query-client'
import { apiClient } from '@/services/api-client'

function nftCatalogQueryOptions(input: NftSearchParams) {
  const params = nftSearchParamsSchema.parse(input)

  return queryOptions({
    queryKey: queryKeys.catalog.list(params),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<NftListResponse>(
        API_ENDPOINTS.nfts.list,
        { params, signal },
      )
      return response.data
    },
    staleTime: queryStaleTimes.catalog,
  })
}

function useNftCatalog(params: NftSearchParams) {
  return useQuery(nftCatalogQueryOptions(params))
}

export { nftCatalogQueryOptions, useNftCatalog }
