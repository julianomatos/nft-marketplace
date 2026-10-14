import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { queryStaleTimes } from '@/lib/query-client'
import { apiClient } from '@/services/api-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import type { RelatedNftsResponse } from '@/types/contracts'

function relatedNftsQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.catalog.related(nftId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<RelatedNftsResponse>(
        API_ENDPOINTS.nfts.related(nftId),
        { signal },
      )
      return response.data
    },
    staleTime: queryStaleTimes.catalog,
  })
}

function useRelatedNfts(nftId: string) {
  return useQuery(relatedNftsQueryOptions(nftId))
}

export { relatedNftsQueryOptions, useRelatedNfts }
