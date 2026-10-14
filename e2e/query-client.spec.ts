import { AxiosError } from 'axios'
import { expect, test } from '@playwright/test'
import {
  MAX_QUERY_RETRIES,
  queryClient,
  queryRetryDelay,
  queryStaleTimes,
  shouldRetryQuery,
} from '../src/lib/query-client'
import { queryKeys } from '../src/hooks/queryKeys'

test('configures query retry, delay, stale time, and mutation defaults', () => {
  const serverError = Object.assign(
    new AxiosError('Server error', 'ERR_BAD_RESPONSE'),
    { response: { status: 503 } },
  )
  const clientError = Object.assign(
    new AxiosError('Client error', 'ERR_BAD_REQUEST'),
    { response: { status: 422 } },
  )
  const networkError = new AxiosError('Network error', 'ERR_NETWORK')
  const cancelledError = new AxiosError('Cancelled request', 'ERR_CANCELED')

  expect(MAX_QUERY_RETRIES).toBe(2)
  expect(shouldRetryQuery(0, networkError)).toBe(true)
  expect(shouldRetryQuery(1, serverError)).toBe(true)
  expect(shouldRetryQuery(0, clientError)).toBe(false)
  expect(shouldRetryQuery(0, cancelledError)).toBe(false)
  expect(shouldRetryQuery(2, networkError)).toBe(false)
  expect(shouldRetryQuery(0, new Error('Unknown failure'))).toBe(false)
  expect(queryRetryDelay(0)).toBe(1_000)
  expect(queryRetryDelay(1)).toBe(2_000)
  expect(queryRetryDelay(10)).toBe(30_000)

  const defaults = queryClient.getDefaultOptions()
  expect(queryStaleTimes).toEqual({
    catalog: 30_000,
    cart: 0,
    quote: 0,
    orders: 0,
    account: 60_000,
    session: Number.POSITIVE_INFINITY,
  })
  expect(defaults.queries?.staleTime).toBe(queryStaleTimes.cart)
  expect(defaults.queries?.retry).toBe(shouldRetryQuery)
  expect(defaults.queries?.retryDelay).toBe(queryRetryDelay)
  expect(defaults.mutations?.retry).toBe(false)
})

test('keeps public parameter keys and private user keys isolated', () => {
  const catalogParams = {
    q: 'kurio',
    feed: 'trending' as const,
    category: ['art'],
    page: 2,
  }
  const userA = queryKeys.user('user-a')
  const userB = queryKeys.user('user-b')

  expect(queryKeys.catalog.list(catalogParams)).toEqual([
    'nfts',
    'list',
    catalogParams,
  ])
  expect(queryKeys.auth.session).toEqual(['auth', 'session'])
  expect(userA.cart).toEqual(['user', 'user-a', 'cart'])
  expect(userA.cartQuote({ couponCode: 'KURIO' })).toEqual([
    'user',
    'user-a',
    'cart',
    'quote',
    { couponCode: 'KURIO' },
  ])
  expect(userA.favorites).toEqual(['user', 'user-a', 'favorites'])
  expect(userA.order('order-1')).toEqual([
    'user',
    'user-a',
    'orders',
    'order-1',
  ])
  expect(userA.profile).toEqual(['user', 'user-a', 'profile'])
  expect(userA.wallets).toEqual(['user', 'user-a', 'wallets'])
  expect(userA.cart).not.toEqual(userB.cart)
})
