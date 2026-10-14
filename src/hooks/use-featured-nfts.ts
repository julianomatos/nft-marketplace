import { queryOptions, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/hooks/queryKeys'
import { API_ENDPOINTS } from '@/types/endpoints'
import type { FeaturedNftsResponse } from '@/types/contracts'
import { queryStaleTimes } from '@/lib/query-client'
import { apiClient } from '@/services/api-client'

function featuredNftsQueryOptions() {
  return queryOptions({
    queryKey: queryKeys.catalog.featured,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<FeaturedNftsResponse>(
        API_ENDPOINTS.nfts.featured,
        { signal },
      )
      return response.data
    },
    staleTime: queryStaleTimes.catalog,
  })
}

function useFeaturedNfts() {
  return useQuery(featuredNftsQueryOptions())
}

export { featuredNftsQueryOptions, useFeaturedNfts }
