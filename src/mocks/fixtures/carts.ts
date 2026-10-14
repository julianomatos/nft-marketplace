import { mul } from '../../utils/eth'
import type { Cart, NftSummary } from '../../types/contracts'
import { nftsById } from './nfts'
import type { CartRecord } from '../types'

export const emptyCarts: readonly CartRecord[] = [
  { userId: 'collector-ana', cart: { items: [], coupon: null } },
  { userId: 'collector-caio', cart: { items: [], coupon: null } },
]

function createReferenceItem(
  id: string,
  nftId: string,
  editionLabel: '1/50' | 'ABERTA' | '1/10',
  quantity: number,
): Cart['items'][number] {
  const nft = nftsById[nftId]
  const edition = nft.editions.find((tier) => tier.label === editionLabel)
  if (!edition) throw new Error(`Missing ${editionLabel} tier for ${nftId}`)

  const summary: NftSummary = {
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    collection: nft.collection,
    price: nft.price,
    ...(nft.compareAtPrice ? { compareAtPrice: nft.compareAtPrice } : {}),
    ...(nft.rarity ? { rarity: nft.rarity } : {}),
    images: nft.images,
  }

  return {
    id,
    nftId,
    editionId: edition.id,
    edition: edition.label,
    quantity,
    unitPrice: nft.price,
    lineTotal: mul(nft.price, String(quantity)),
    available: edition.available,
    nft: summary,
  }
}

export const designCart: CartRecord = {
  userId: 'collector-ana',
  cart: {
    items: [
      createReferenceItem('design-cart-emerald', 'emerald-ape-042', '1/50', 2),
      createReferenceItem('design-cart-violet', 'violet-nomad-314', 'ABERTA', 6),
      createReferenceItem('design-cart-ivory', 'ivory-baron-088', '1/10', 9),
    ],
    coupon: null,
  },
}
