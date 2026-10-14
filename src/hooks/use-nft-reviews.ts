import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { queryStaleTimes } from '@/lib/query-client'
import { apiClient } from '@/services/api-client'
import { API_ENDPOINTS } from '@/types/endpoints'
import type { NftReviewsResponse } from '@/types/contracts'

function nftReviewsQueryOptions(nftId: string) {
  return queryOptions({
    queryKey: queryKeys.catalog.reviews(nftId),
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<NftReviewsResponse>(
        API_ENDPOINTS.nfts.reviews(nftId),
        { signal },
      )
      return response.data
    },
    staleTime: queryStaleTimes.catalog,
  })
}

function useNftReviews(nftId: string, enabled = true) {
  return useQuery({
    ...nftReviewsQueryOptions(nftId),
    enabled,
  })
}

export { nftReviewsQueryOptions, useNftReviews }
