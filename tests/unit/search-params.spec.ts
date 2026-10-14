import { expect, test } from '@playwright/test'
import { nftSearchParamsSchema } from '../../src/types/contracts'
import {
  parseSearchArray,
  serializeSearchArray,
} from '../../src/types/search-array-serialization'
import {
  serializeNftApiParams,
  updateNftSearchParams,
} from '../../src/utils/search-params'

test('serializes browser URL arrays as JSON and API arrays as repeated keys', () => {
  const browserCategory = serializeSearchArray(['art', 'music'])
  expect(browserCategory).toBe('["art","music"]')
  expect(parseSearchArray(browserCategory)).toEqual(['art', 'music'])

  const apiParams = serializeNftApiParams({
    category: ['art', 'music'],
    network: ['ethereum', 'polygon'],
    page: 2,
  })
  const parsed = new URLSearchParams(apiParams)

  expect(parsed.getAll('category')).toEqual(['art', 'music'])
  expect(parsed.getAll('network')).toEqual(['ethereum', 'polygon'])
  expect(parsed.get('page')).toBe('2')
})

test('filter changes reset page while page-only changes are preserved', () => {
  const current = nftSearchParamsSchema.parse({
    category: ['art'],
    page: 4,
  })

  expect(updateNftSearchParams(current, { page: 3 }).page).toBe(3)
  expect(
    updateNftSearchParams(current, { network: ['ethereum'] }),
  ).toMatchObject({
    page: 1,
    category: ['art'],
    network: ['ethereum'],
  })
})

test('sort changes reset pagination while page changes preserve the active sort', () => {
  const current = nftSearchParamsSchema.parse({
    feed: 'trending',
    sort: 'recent',
    page: 4,
  })

  expect(
    updateNftSearchParams(current, { sort: 'price-asc' }),
  ).toMatchObject({
    feed: 'trending',
    sort: 'price-asc',
    page: 1,
  })
  expect(
    updateNftSearchParams(
      { ...current, sort: 'price-asc' },
      { page: 2 },
    ),
  ).toMatchObject({
    feed: 'trending',
    sort: 'price-asc',
    page: 2,
  })
})

test('catalog route search schema retains the complete set of filters', async () => {
  const { catalogSearchSchema } = await import('../../src/utils/search-params')
  const defaults = catalogSearchSchema.parse({})
  expect(defaults.page).toBeUndefined()
  expect(defaults.sort).toBeUndefined()
  expect(defaults.limit).toBeUndefined()
  expect(nftSearchParamsSchema.parse(defaults)).toMatchObject({
    page: 1,
    sort: 'recent',
    limit: 9,
  })

  expect(
    catalogSearchSchema.parse({
      category: '["art","music"]',
      network: '["ethereum"]',
      minPrice: '0.25',
      maxPrice: '2.50',
      sort: 'price-asc',
      page: '3',
      limit: '9',
    }),
  ).toMatchObject({
    category: ['art', 'music'],
    network: ['ethereum'],
    minPrice: '0.25',
    maxPrice: '2.50',
    sort: 'price-asc',
    page: 3,
    limit: 9,
  })
})

test('invalid filters use defaults and do not break parsing', () => {
  expect(
    nftSearchParamsSchema.parse({
      category: '["art",4]',
      network: '["not-a-network"]',
      minPrice: '1e-3',
      sort: 'unsupported',
      page: '0',
      limit: 'invalid',
    }),
  ).toMatchObject({
    category: undefined,
    network: undefined,
    minPrice: undefined,
    sort: 'recent',
    page: 1,
    limit: 9,
  })
})
