import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { ethAmountSchema } from '../../src/types/contracts'
import {
  categories,
  coupons,
  designCart,
  emptyCarts,
  featuredNfts,
  favorites,
  INVALID_COUPON_EXAMPLE,
  LAUNCH_DISCOUNT,
  MOCK_NOW,
  NETWORK_FEE,
  nftFacets,
  nfts,
  orders,
  reviews,
  users,
  wallets,
} from '../../src/mocks/fixtures'
import type { FixtureUser } from '../../src/mocks/types'
import { add, mul, sum } from '../../src/utils/eth'

const knownCredentials = [
  { email: 'ana@kurio.example.test', password: 'KurioDemo!A2026' },
  { email: 'caio@kurio.example.test', password: 'KurioDemo!B2026' },
] as const
const expectedEditionLabels = ['1/1', '1/10', '1/50', 'ABERTA']

function verifyCredential(user: FixtureUser, password: string): boolean {
  const digest = createHash('sha256')
    .update(`${user.passwordSalt}:${password}`)
    .digest('hex')
  return digest === user.passwordHash
}

test('fixture IDs are unique and referential records resolve', () => {
  for (const ids of [
    users.map(({ id }) => id),
    nfts.map(({ id }) => id),
    reviews.map(({ id }) => id),
    coupons.map(({ code }) => code),
    wallets.map(({ id }) => id),
    favorites.map(({ userId, nftId }) => `${userId}:${nftId}`),
  ]) {
    expect(new Set(ids).size).toBe(ids.length)
  }

  const nftIds = new Set(nfts.map(({ id }) => id))
  const categoryIds = new Set(categories.map(({ id }) => id))
  const walletIds = new Set(wallets.map(({ id }) => id))
  const userIds = new Set(users.map(({ id }) => id))

  for (const nft of nfts) {
    expect(categoryIds.has(nft.category)).toBe(true)
    expect(nft.editions.map(({ label }) => label)).toEqual(expectedEditionLabels)
  }
  for (const review of reviews) expect(nftIds.has(review.nftId)).toBe(true)
  for (const wallet of wallets) expect(userIds.has(wallet.userId)).toBe(true)
  expect(wallets[0]).toMatchObject({
    nickname: 'Principal',
    network: 'ethereum',
    walletType: 'metamask',
  })
  expect(wallets[1]).toMatchObject({
    nickname: 'Reserva',
    network: 'polygon',
    ensName: 'nova.kurio.eth',
  })
  for (const user of users) {
    expect(user.walletIds.every((walletId) => walletIds.has(walletId))).toBe(true)
  }
  for (const favorite of favorites) {
    expect(userIds.has(favorite.userId)).toBe(true)
    expect(nftIds.has(favorite.nftId)).toBe(true)
  }
  expect(orders).toEqual([])
})

test('fixture monetary values are valid decimal ETH strings and supplies are consistent', () => {
  for (const nft of nfts) {
    expect(ethAmountSchema.safeParse(nft.price).success).toBe(true)
    if (nft.compareAtPrice) {
      expect(ethAmountSchema.safeParse(nft.compareAtPrice).success).toBe(true)
    }
    for (const edition of nft.editions) {
      if (edition.supply !== null) {
        expect(edition.available).toBeLessThanOrEqual(edition.supply)
      }
    }
  }

  for (const item of designCart.cart.items) {
    expect(ethAmountSchema.safeParse(item.unitPrice).success).toBe(true)
    expect(ethAmountSchema.safeParse(item.lineTotal).success).toBe(true)
    expect(item.quantity).toBeLessThanOrEqual(item.available)
  }
  expect(nfts.some((nft) => nft.editions.some(({ available }) => available === 0)))
    .toBe(true)
  expect(nfts.some((nft) => nft.editions.every(({ available }) => available === 0)))
    .toBe(true)
})

test('two fictitious user credentials match only their salted fixture hashes', () => {
  expect(users).toHaveLength(2)
  for (const credentials of knownCredentials) {
    const user = users.find(({ email }) => email === credentials.email)
    if (!user) throw new Error(`Missing fixture user for ${credentials.email}`)
    expect(verifyCredential(user, credentials.password)).toBe(true)
    expect(verifyCredential(user, `${credentials.password}!wrong`)).toBe(false)
  }

  const walletsForUsers = users.map((user) =>
    wallets.filter((wallet) => wallet.userId === user.id),
  )
  expect(walletsForUsers.map((userWallets) => userWallets.length)).toEqual([2, 1])
  expect(users.every(({ referralCode, ensName, avatar }) =>
    Boolean(referralCode && ensName && avatar),
  )).toBe(true)
})

test('NFT catalog and category/network facets cover the required search space', () => {
  expect(nfts).toHaveLength(40)
  expect(categories).toHaveLength(9)
  expect(new Set(nfts.map(({ network }) => network)).size).toBe(3)
  expect(nfts.some(
    ({ category, network }) => category === 'arte-digital' && network === 'ethereum',
  )).toBe(true)
  expect(nfts.every(({ network }) =>
    ['ethereum', 'polygon', 'solana'].includes(network),
  )).toBe(true)
  expect(
    nfts.filter(({ name }) => name.toLowerCase().includes('no-such-nft')).length,
  ).toBe(0)
  expect(Math.ceil(nfts.length / 9)).toBe(5)
  expect(nftFacets.categories).toHaveLength(9)
  expect(nftFacets.networks).toHaveLength(3)
  expect(nftFacets.priceRange).toEqual({ min: '0.02', max: '12.30' })
  expect(nftFacets.categories.reduce((count, facet) => count + facet.count, 0))
    .toBe(40)
  expect(new Set(nfts.map(({ images }) => images[0].url)).size).toBe(4)
  expect(nfts.some(({ price }) => price === '0.02')).toBe(true)
  expect(nfts.some(({ price }) => price === '12.30')).toBe(true)
  expect(nfts.filter(({ isNew }) => isNew)).toHaveLength(10)
  expect(nfts.filter(({ trending }) => trending)).toHaveLength(10)
})

test('first nine NFTs keep the reference order, names, token IDs, and prices', () => {
  expect(nfts.slice(0, 9).map(({ name, tokenId, price }) => ({
    name,
    tokenId,
    price,
  }))).toEqual([
    { name: 'Emerald Ape #042', tokenId: '#0042', price: '1.19' },
    { name: 'Sage Nomad #009', tokenId: '#0009', price: '1.69' },
    { name: 'Neon Vessel #552', tokenId: '#0552', price: '1.99' },
    { name: 'Cosmic Bloom #118', tokenId: '#0118', price: '1.29' },
    { name: 'Violet Nomad #314', tokenId: '#0314', price: '1.39' },
    { name: 'Ivory Baron #088', tokenId: '#0088', price: '1.79' },
    { name: 'Golden Beat #207', tokenId: '#0207', price: '0.99' },
    { name: 'Golden Frequency #071', tokenId: '#0071', price: '0.59' },
    { name: 'Golden Signal #160', tokenId: '#0160', price: '0.39' },
  ])
  expect(nfts[2]).toMatchObject({
    compareAtPrice: '2.29',
    rarity: 'RARO',
  })
})

test('design-cart totals exactly match the KURIO reference amounts', () => {
  const items = designCart.cart.items
  const itemTotals = items.map(({ quantity, unitPrice, lineTotal }) => {
    expect(lineTotal).toBe(mul(unitPrice, String(quantity)))
    return lineTotal
  })
  const subtotal = sum(itemTotals)

  expect(items.map(({ nftId, edition, quantity, unitPrice, lineTotal }) => ({
    nftId,
    edition,
    quantity,
    unitPrice,
    lineTotal,
  }))).toEqual([
    {
      nftId: 'emerald-ape-042',
      edition: '1/50',
      quantity: 2,
      unitPrice: '1.19',
      lineTotal: '2.38',
    },
    {
      nftId: 'violet-nomad-314',
      edition: 'ABERTA',
      quantity: 6,
      unitPrice: '1.39',
      lineTotal: '8.34',
    },
    {
      nftId: 'ivory-baron-088',
      edition: '1/10',
      quantity: 9,
      unitPrice: '1.79',
      lineTotal: '16.11',
    },
  ])
  expect(subtotal).toBe('26.83')
  expect(add(subtotal, NETWORK_FEE)).toBe('26.846')
  expect(LAUNCH_DISCOUNT).toBe('0.00')
  expect(emptyCarts.every(({ cart }) =>
    cart.items.length === 0 && cart.coupon === null,
  )).toBe(true)
  expect(designCart.userId).toBe('collector-ana')
})

test('reviews, coupons, featured records, and fixed mock time are deterministic', () => {
  const emeraldReviews = reviews.filter(
    ({ nftId }) => nftId === 'emerald-ape-042',
  )
  const roundedAverage = Number(
    (
      emeraldReviews.reduce((total, review) => total + review.rating, 0) /
      emeraldReviews.length
    ).toFixed(1),
  )

  expect(emeraldReviews).toHaveLength(19)
  expect(roundedAverage).toBe(4.8)
  expect(nfts[0].rating).toEqual({ average: 4.8, count: 19 })
  expect(featuredNfts.hero).toHaveLength(3)
  expect(featuredNfts.featured?.id).toBe('sage-nomad-009')
  expect(coupons).toMatchObject([
    { code: 'KURIO10', status: 'valid', discountPercent: 10 },
    { code: 'EXPIRED20', status: 'expired' },
  ])
  expect(coupons.some(({ code }) => code === INVALID_COUPON_EXAMPLE)).toBe(false)
  expect(MOCK_NOW).toBe('2026-07-29T12:00:00.000Z')
})
