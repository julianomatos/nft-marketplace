import type { NftFacets, Network } from '../../types/contracts'
import { categories, networks } from './categories'
import { coupons, INVALID_COUPON_EXAMPLE } from './coupons'
import { designCart, emptyCarts } from './carts'
import { favorites } from './favorites'
import { featuredNfts, nfts, nftsById } from './nfts'
import { orders } from './orders'
import { reviews } from './reviews'
import { users } from './users'
import { wallets } from './wallets'

export const MOCK_NOW = '2026-07-29T12:00:00.000Z'
export const NETWORK_FEE = '0.016'
export const LAUNCH_DISCOUNT = '0.00'

const categoryCounts = new Map<string, number>()
const networkCounts = new Map<Network, number>()
for (const nft of nfts) {
  categoryCounts.set(
    nft.category,
    (categoryCounts.get(nft.category) ?? 0) + 1,
  )
  networkCounts.set(nft.network, (networkCounts.get(nft.network) ?? 0) + 1)
}

export const nftFacets: NftFacets = {
  categories: categories.map(({ id, label }) => ({
    id,
    label,
    count: categoryCounts.get(id) ?? 0,
  })),
  networks: networks.map(({ id, label }) => ({
    id,
    label,
    count: networkCounts.get(id) ?? 0,
  })),
  priceRange: { min: '0.02', max: '12.30' },
}

export {
  categories,
  coupons,
  designCart,
  emptyCarts,
  featuredNfts,
  favorites,
  INVALID_COUPON_EXAMPLE,
  nfts,
  nftsById,
  networks,
  orders,
  reviews,
  users,
  wallets,
}
