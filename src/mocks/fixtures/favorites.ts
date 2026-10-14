import type { FavoriteRecord } from '../types'
import { nftsById } from './nfts'

export const favorites: readonly FavoriteRecord[] = [
  {
    userId: 'collector-ana',
    nftId: 'emerald-ape-042',
    nft: nftsById['emerald-ape-042'],
    createdAt: '2026-07-18T12:00:00.000Z',
  },
  {
    userId: 'collector-ana',
    nftId: 'neon-vessel-552',
    nft: nftsById['neon-vessel-552'],
    createdAt: '2026-07-19T12:00:00.000Z',
  },
  {
    userId: 'collector-caio',
    nftId: 'sage-nomad-009',
    nft: nftsById['sage-nomad-009'],
    createdAt: '2026-07-20T12:00:00.000Z',
  },
]
