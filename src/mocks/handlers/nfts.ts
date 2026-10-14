import { http, HttpResponse } from 'msw'
import { API_ENDPOINTS } from '../../types/endpoints'
import { nftSearchParamsSchema } from '../../types/contracts'
import { compare } from '../../utils/eth'
import { categories, featuredNfts, networks } from '../fixtures'
import { readMockState } from '../store'
import type { NftRecord } from '../types'
import { HANDLER_BASE_PATH, buildErrorResponse } from './utils'

function parseMultiValue(url: URL, key: string): string[] {
  const all = url.searchParams.getAll(key)
  if (all.length === 0) return []
  if (all.length === 1 && all[0].startsWith('[') && all[0].endsWith(']')) {
    try {
      const parsed = JSON.parse(all[0])
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return []
    }
  }
  return all
}

export const nftHandlers = [
  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.nfts.list}`, ({ request }) => {
    const url = new URL(request.url)
    const rawParams = Object.fromEntries(url.searchParams.entries())
    const params = nftSearchParamsSchema.parse({
      ...rawParams,
      category: parseMultiValue(url, 'category'),
      network: parseMultiValue(url, 'network'),
    })
    const {
      q = '',
      feed = 'all',
      category: categoryValues = [],
      network: networkValues = [],
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
    } = params

    const state = readMockState()
    const allNfts = state.scenario === 'empty' ? [] : state.nfts

    function applyFilters(
      source: readonly NftRecord[],
      options: { excludeCategory?: boolean; excludeNetwork?: boolean } = {},
    ): NftRecord[] {
      let filtered = [...source]

      if (q) {
        const needle = q.toLowerCase()
        const strippedNeedle = needle.replace(/^#/, '')
        filtered = filtered.filter((nft) => {
          const nameMatch = nft.name.toLowerCase().includes(needle)
          const colMatch = nft.collection.toLowerCase().includes(needle)
          const tokenMatch =
            nft.tokenId.toLowerCase().includes(needle) ||
            nft.tokenId.toLowerCase().replace(/^#/, '').includes(strippedNeedle)
          return nameMatch || colMatch || tokenMatch
        })
      }

      if (feed === 'new') {
        filtered = filtered.filter((nft) => nft.isNew)
      } else if (feed === 'trending') {
        filtered = filtered.filter((nft) => nft.trending)
      }

      if (minPrice) {
        filtered = filtered.filter((nft) => compare(nft.price, minPrice) >= 0)
      }

      if (maxPrice) {
        filtered = filtered.filter((nft) => compare(nft.price, maxPrice) <= 0)
      }

      if (!options.excludeCategory && categoryValues.length > 0) {
        filtered = filtered.filter((nft) => categoryValues.includes(nft.category))
      }

      if (!options.excludeNetwork && networkValues.length > 0) {
        filtered = filtered.filter((nft) => networkValues.includes(nft.network))
      }

      return filtered
    }

    // Facet counts without their own selection
    const nftsForCategoryFacets = applyFilters(allNfts, { excludeCategory: true })
    const nftsForNetworkFacets = applyFilters(allNfts, { excludeNetwork: true })

    // Final filtered items
    const items = applyFilters(allNfts)

    if (sort === 'recent') {
      items.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    } else if (sort === 'price-asc') {
      items.sort((left, right) => compare(left.price, right.price))
    } else if (sort === 'price-desc') {
      items.sort((left, right) => compare(right.price, left.price))
    } else if (sort === 'popular') {
      items.sort((left, right) => right.popularity - left.popularity)
    }

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const validPage = Math.min(page, totalPages)
    const paginated = items.slice((validPage - 1) * limit, validPage * limit)

    return HttpResponse.json({
      items: paginated,
      page: validPage,
      limit,
      total,
      totalPages,
      facets: {
        categories: categories.map(({ id, label }) => ({
          id,
          label,
          count: nftsForCategoryFacets.filter((nft) => nft.category === id).length,
        })),
        networks: networks.map(({ id, label }) => ({
          id,
          label,
          count: nftsForNetworkFacets.filter((nft) => nft.network === id).length,
        })),
        priceRange: { min: '0.02', max: '12.30' },
      },
    })
  }),

  http.get(`${HANDLER_BASE_PATH}${API_ENDPOINTS.nfts.featured}`, () =>
    HttpResponse.json(featuredNfts),
  ),

  http.get(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.nfts.relatedPattern}`,
    ({ params }) => {
    const id = String(params.id)
    const state = readMockState()
    const targetNft = state.nfts.find((entry) => entry.id === id)

    if (!targetNft) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O conteúdo solicitado não foi encontrado.',
      )
    }

    const related = state.nfts
      .filter((entry) => entry.collection === targetNft.collection && entry.id !== targetNft.id)
      .slice(0, 4)

    return HttpResponse.json({ items: related })
    },
  ),

  http.get(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.nfts.reviewsPattern}`,
    ({ params }) => {
    const id = String(params.id)
    const state = readMockState()
    if (!state.nfts.some((entry) => entry.id === id)) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O conteúdo solicitado não foi encontrado.',
      )
    }

    const reviews = state.reviews
      .filter((review) => review.nftId === id)
      .map(({ id: reviewId, displayName, rating, comment, createdAt }) => ({
        id: reviewId,
        displayName,
        rating,
        comment,
        createdAt,
      }))

    return HttpResponse.json({ items: reviews })
    },
  ),

  http.get(
    `${HANDLER_BASE_PATH}${API_ENDPOINTS.nfts.detailPattern}`,
    ({ params }) => {
    const id = String(params.id)
    const state = readMockState()
    const targetNft = state.nfts.find((entry) => entry.id === id)

    if (!targetNft) {
      return buildErrorResponse(
        'NOT_FOUND',
        'O conteúdo solicitado não foi encontrado.',
      )
    }

    return HttpResponse.json(targetNft)
    },
  ),
]
