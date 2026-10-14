import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { queryStaleTimes } from '@/lib/query-client'
import { apiClient } from '@/services/api-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import type { NftDetailResponse } from '@/types/contracts'

function nftDetailQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.catalog.detail(nftId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<NftDetailResponse>(
        API_ENDPOINTS.nfts.detail(nftId),
        { signal },
      )
      return response.data
    },
    staleTime: queryStaleTimes.catalog,
  })
}

function useNftDetail(nftId: string) {
  return useQuery(nftDetailQueryOptions(nftId))
}

export { nftDetailQueryOptions, useNftDetail }
