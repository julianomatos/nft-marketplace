import type {
  FeaturedNftsResponse,
  Network,
  Nft,
} from '../../types/contracts'
import { NFT_IMAGE_METADATA } from './generated-image-metadata'
import { categories, networks } from './categories'
import type { NftImageAsset, NftRecord } from '../types'

type NftSeed = {
  id: string
  tokenId: string
  name: string
  price: string
  asset: NftImageAsset
  collection: string
  category?: string
  network?: Network
  compareAtPrice?: string
  rarity?: string
}

const featuredSeeds: readonly NftSeed[] = [
  {
    id: 'emerald-ape-042',
    tokenId: '#0042',
    name: 'Emerald Ape #042',
    price: '1.19',
    asset: 'emerald-ape',
    collection: 'Kurio Apes',
    category: 'arte-digital',
    network: 'ethereum',
  },
  {
    id: 'sage-nomad-009',
    tokenId: '#0009',
    name: 'Sage Nomad #009',
    price: '1.69',
    asset: 'hat-gorilla',
    collection: 'Kurio Nomads',
    category: 'colecionaveis',
    network: 'polygon',
  },
  {
    id: 'neon-vessel-552',
    tokenId: '#0552',
    name: 'Neon Vessel #552',
    price: '1.99',
    compareAtPrice: '2.29',
    rarity: 'RARO',
    asset: 'golden-ap',
    collection: 'Neon Vessels',
    category: 'generativa',
    network: 'solana',
  },
  {
    id: 'cosmic-bloom-118',
    tokenId: '#0118',
    name: 'Cosmic Bloom #118',
    price: '1.29',
    asset: 'black-gorilla',
    collection: 'Cosmic Bloom',
    category: 'arte-3d',
    network: 'ethereum',
  },
  {
    id: 'violet-nomad-314',
    tokenId: '#0314',
    name: 'Violet Nomad #314',
    price: '1.39',
    asset: 'hat-gorilla',
    collection: 'Kurio Nomads',
    category: 'colecionaveis',
    network: 'polygon',
  },
  {
    id: 'ivory-baron-088',
    tokenId: '#0088',
    name: 'Ivory Baron #088',
    price: '1.79',
    asset: 'black-gorilla',
    collection: 'Kurio Apes',
    category: 'arte-digital',
    network: 'ethereum',
  },
  {
    id: 'golden-beat-207',
    tokenId: '#0207',
    name: 'Golden Beat #207',
    price: '0.99',
    asset: 'golden-ap',
    collection: 'Golden Frequency',
    category: 'musica',
    network: 'solana',
  },
  {
    id: 'golden-frequency-071',
    tokenId: '#0071',
    name: 'Golden Frequency #071',
    price: '0.59',
    asset: 'emerald-ape',
    collection: 'Golden Frequency',
    category: 'musica',
    network: 'polygon',
  },
  {
    id: 'golden-signal-160',
    tokenId: '#0160',
    name: 'Golden Signal #160',
    price: '0.39',
    asset: 'golden-ap',
    collection: 'Golden Frequency',
    category: 'musica',
    network: 'ethereum',
  },
]

const additionalSeeds: readonly Omit<NftSeed, 'id' | 'tokenId'>[] = [
  { name: 'Azure Echo', price: '0.02', asset: 'black-gorilla', collection: 'Azure Echoes' },
  { name: 'Obsidian Bloom', price: '2.10', asset: 'emerald-ape', collection: 'Obsidian Garden' },
  { name: 'Solar Drift', price: '0.88', asset: 'golden-ap', collection: 'Solar Drift' },
  { name: 'Quiet Orbit', price: '3.25', asset: 'hat-gorilla', collection: 'Quiet Orbit' },
  { name: 'Velvet Current', price: '1.08', asset: 'black-gorilla', collection: 'Velvet Current' },
  { name: 'Pixel Orchard', price: '0.72', asset: 'emerald-ape', collection: 'Pixel Orchard' },
  { name: 'Dawn Circuit', price: '4.20', asset: 'golden-ap', collection: 'Dawn Circuit' },
  { name: 'Monsoon Study', price: '1.56', asset: 'hat-gorilla', collection: 'Monsoon Study' },
  { name: 'Amber Motion', price: '0.47', asset: 'black-gorilla', collection: 'Amber Motion' },
  { name: 'Lunar Archive', price: '2.65', asset: 'emerald-ape', collection: 'Lunar Archive' },
  { name: 'Soft Geometry', price: '0.93', asset: 'golden-ap', collection: 'Soft Geometry' },
  { name: 'Wildflower Engine', price: '1.24', asset: 'hat-gorilla', collection: 'Wildflower Engine' },
  { name: 'Electric Petal', price: '5.40', asset: 'black-gorilla', collection: 'Electric Petal' },
  { name: 'Moss Frequency', price: '0.34', asset: 'emerald-ape', collection: 'Moss Frequency' },
  { name: 'Sunday Satellite', price: '1.87', asset: 'golden-ap', collection: 'Sunday Satellite' },
  { name: 'Paper Comet', price: '0.61', asset: 'hat-gorilla', collection: 'Paper Comet' },
  { name: 'Afterglow Garden', price: '2.32', asset: 'black-gorilla', collection: 'Afterglow Garden' },
  { name: 'Prism Runner', price: '0.15', asset: 'emerald-ape', collection: 'Prism Runners' },
  { name: 'Blue Hour', price: '1.42', asset: 'golden-ap', collection: 'Blue Hour' },
  { name: 'Garden Signal', price: '0.78', asset: 'hat-gorilla', collection: 'Garden Signals' },
  { name: 'Marble Dream', price: '6.75', asset: 'black-gorilla', collection: 'Marble Dream' },
  { name: 'Copper Skyline', price: '0.29', asset: 'emerald-ape', collection: 'Copper Skyline' },
  { name: 'Tidal Memory', price: '1.15', asset: 'golden-ap', collection: 'Tidal Memory' },
  { name: 'Night Arcade', price: '3.80', asset: 'hat-gorilla', collection: 'Night Arcade' },
  { name: 'Lemon Static', price: '0.55', asset: 'black-gorilla', collection: 'Lemon Static' },
  { name: 'Silver Canopy', price: '2.05', asset: 'emerald-ape', collection: 'Silver Canopy' },
  { name: 'Future Relic', price: '0.11', asset: 'golden-ap', collection: 'Future Relics' },
  { name: 'Coral Frequency', price: '1.73', asset: 'hat-gorilla', collection: 'Coral Frequency' },
  { name: 'Golden Meridian', price: '8.90', asset: 'black-gorilla', collection: 'Golden Meridian' },
  { name: 'Emerald Horizon', price: '0.67', asset: 'emerald-ape', collection: 'Kurio Apes' },
  { name: 'Infinite Meadow', price: '12.30', asset: 'golden-ap', collection: 'Infinite Meadow' },
]

const allSeeds: readonly NftSeed[] = [
  ...featuredSeeds,
  ...additionalSeeds.map((seed, index) => {
    const tokenNumber = 1001 + index
    const slug = seed.name.toLowerCase().replaceAll(' ', '-')
    const categoryIndex = index % categories.length
    const networkIndex = Math.floor(index / categories.length) % networks.length

    return {
      ...seed,
      id: `${slug}-${tokenNumber}`,
      tokenId: `#${String(tokenNumber).padStart(4, '0')}`,
      category: categories[categoryIndex].id,
      network: networks[networkIndex].id,
    }
  }),
]

const editionLabels = ['1/1', '1/10', '1/50', 'ABERTA'] as const
const soldEditionNftIndex = 9
const allSoldNftIndex = allSeeds.length - 1

function createNft(seed: NftSeed, index: number): NftRecord {
  const imageMetadata = NFT_IMAGE_METADATA[seed.asset]
  const allEditionsSold = index === allSoldNftIndex
  const editions = editionLabels.map((label, editionIndex) => {
    const supply = label === 'ABERTA' ? null : [1, 10, 50][editionIndex]
    const available = allEditionsSold
      ? 0
      : index === soldEditionNftIndex && editionIndex === 1
        ? 0
        : editionIndex === 0
          ? 1
          : editionIndex === 1
              ? 10
            : editionIndex === 2
              ? 32
              : 500

    return {
      id: `${seed.id}-${label.replace('/', '-')}`,
      label,
      supply,
      available,
    }
  })

  const nft: Nft = {
    id: seed.id,
    tokenId: seed.tokenId,
    name: seed.name,
    collection: seed.collection,
    category: seed.category ?? categories[index % categories.length].id,
    network: seed.network ?? networks[index % networks.length].id,
    price: seed.price,
    ...(seed.compareAtPrice ? { compareAtPrice: seed.compareAtPrice } : {}),
    ...(seed.rarity ? { rarity: seed.rarity } : {}),
    isNew: index < 10,
    trending: index % 4 === 0,
    rating: {
      average: index === 0 ? 4.8 : index % 5 === 1 ? 4.5 : 0,
      count: index === 0 ? 19 : index % 5 === 1 ? 2 : 0,
    },
    attributes: [
      { traitType: 'Coleção', value: seed.collection },
      { traitType: 'Série', value: `Série ${String((index % 5) + 1).padStart(2, '0')}` },
    ],
    description: `${seed.name} integra a coleção ${seed.collection}.`,
    images: [{
      url: `/assets/nfts/${seed.asset}-960.webp`,
      responsiveSrcSet: [
        `/assets/nfts/${seed.asset}-192.webp 192w`,
        `/assets/nfts/${seed.asset}-320.webp 320w`,
        `/assets/nfts/${seed.asset}-480.webp 480w`,
        `/assets/nfts/${seed.asset}-640.webp 640w`,
        `/assets/nfts/${seed.asset}-960.webp 960w`,
      ].join(', '),
      thumbnailUrl: `/assets/nfts/${seed.asset}-480.webp`,
      alt: `Arte de ${seed.name}`,
      width: imageMetadata.width,
      height: imageMetadata.height,
    }],
    editions,
    version: 1,
  }

  return {
    ...nft,
    createdAt: `2026-07-${String(28 - (index % 28)).padStart(2, '0')}T12:00:00.000Z`,
    popularity: allSeeds.length - index,
    trendScore: (index * 17 + 23) % 101,
  }
}

export const nfts = allSeeds.map(createNft)

export const nftsById = Object.fromEntries(
  nfts.map((nft) => [nft.id, nft]),
) as Readonly<Record<string, NftRecord>>

export const featuredNfts: FeaturedNftsResponse = {
  hero: nfts.slice(0, 3),
  featured: nftsById['sage-nomad-009'],
}
