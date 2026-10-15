import { expect, test, type Page } from '@playwright/test'
import {
  connectMockSocket,
  openWithMockScenario,
  waitForMockControl,
} from './mock-helpers'

declare global {
  interface Window {
    __KURIO_TEST_SOCKET__?: import('./mock-helpers').MockSocketForTests
    __KURIO_GUEST_SOCKET__?: import('./mock-helpers').MockSocketForTests
    __KURIO_TEST_SOCKET_EVENTS__?: Array<{
      name: 'nft.updated' | 'order.updated'
      payload: unknown
    }>
    __KURIO_GUEST_SOCKET_EVENTS__?: Array<{
      name: 'nft.updated' | 'order.updated'
      payload: unknown
    }>
  }
}

type BrowserApiModule = {
  apiClient: {
    post: (
      url: string,
      data?: unknown,
      config?: { headers?: Record<string, string> },
    ) => Promise<{ data: Record<string, unknown> }>
  }
}

async function connectGuestSocket(page: Page): Promise<void> {
  await waitForMockControl(page)
  await page.evaluate(async () => {
    const control = (window as unknown as Window & {
      __KURIO_MOCKS__: import('./mock-helpers').MockControlForTests
    }).__KURIO_MOCKS__
    const guestSocket = await control.connectSocketClient(null)
    const guestEvents: Array<{
      name: 'nft.updated' | 'order.updated'
      payload: unknown
    }> = []
    guestSocket.on('nft.updated', (payload) => {
      guestEvents.push({ name: 'nft.updated', payload })
    })
    guestSocket.on('order.updated', (payload) => {
      guestEvents.push({ name: 'order.updated', payload })
    })
    const testWindow = window as Window & {
      __KURIO_GUEST_SOCKET__?: import('./mock-helpers').MockSocketForTests
      __KURIO_GUEST_SOCKET_EVENTS__?: Array<{
        name: 'nft.updated' | 'order.updated'
        payload: unknown
      }>
    }
    testWindow.__KURIO_GUEST_SOCKET__ = guestSocket
    testWindow.__KURIO_GUEST_SOCKET_EVENTS__ = guestEvents
    await new Promise<void>((resolve, reject) => {
      guestSocket.once('mock:subscribed', () => resolve())
      guestSocket.once('mock:subscription-error', () => reject(
        new Error('Guest Socket.IO subscription was rejected'),
      ))
    })
  })
}

test('REST price revalidation emits nft.updated through socket.io-client', async ({
  page,
}) => {
  await openWithMockScenario(page, 'price-changed')
  await connectMockSocket(page)

  const result = await page.evaluate(async () => {
    const apiClientUrl = new URL('/src/services/api-client.ts', location.origin).href
    const apiModule = await import(/* @vite-ignore */ apiClientUrl) as BrowserApiModule
    const { apiClient } = apiModule
    const quote = await apiClient.post('/cart/quote', {})
    let errorCode: string | null = null

    try {
      await apiClient.post(
        '/orders',
        {
          quoteId: quote.data.quoteId,
          provider: 'metamask',
          walletId: 'wallet-ana-primary',
          collector: {
            displayName: 'Ana Oliveira',
            username: 'ana-oliveira',
            profileName: 'Ana O.',
            email: 'ana@kurio.example.test',
            walletAddress: '0x1111111111111111111111111111111111111111',
            walletType: 'metamask',
            network: 'ethereum',
            ensName: 'ana.kurio.eth',
            referralCode: 'KURIO-ANA-042',
          },
        },
        { headers: { 'X-Idempotency-Key': 'socket-price-change' } },
      )
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        errorCode = String(error.code)
      } else {
        throw error
      }
    }

    return {
      errorCode,
    }
  })

  expect(result.errorCode).toBe('PRICE_CHANGED')
  await expect.poll(async () =>
    page.evaluate(() => window.__KURIO_TEST_SOCKET_EVENTS__?.length ?? 0),
  ).toBe(1)

  const event = await page.evaluate(
    () => window.__KURIO_TEST_SOCKET_EVENTS__?.[0]?.payload,
  )
  expect(event).toMatchObject({
    type: 'nft.updated',
    resource: { kind: 'nft', id: 'emerald-ape-042' },
    data: { nftId: 'emerald-ape-042', price: '1.2' },
  })
  await page.evaluate(() => window.__KURIO_TEST_SOCKET__?.disconnect())
})

test('confirmed order emits private order.updated and inventory nft.updated events', async ({
  page,
}) => {
  await openWithMockScenario(page, 'payment-confirmed')
  await connectMockSocket(page)

  await connectGuestSocket(page)

  const order = await page.evaluate(async () => {
    const apiClientUrl = new URL('/src/services/api-client.ts', location.origin).href
    const apiModule = await import(/* @vite-ignore */ apiClientUrl) as BrowserApiModule
    const { apiClient } = apiModule
    const quote = await apiClient.post('/cart/quote', {})
    const response = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: {
          displayName: 'Ana Oliveira',
          username: 'ana-oliveira',
          profileName: 'Ana O.',
          email: 'ana@kurio.example.test',
          walletAddress: '0x1111111111111111111111111111111111111111',
          walletType: 'metamask',
          network: 'ethereum',
          ensName: 'ana.kurio.eth',
          referralCode: 'KURIO-ANA-042',
        },
      },
      { headers: { 'X-Idempotency-Key': 'socket-payment-confirmed' } },
    )

    const { orderId, status, version } = response.data
    if (
      typeof orderId !== 'string' ||
      typeof status !== 'string' ||
      typeof version !== 'number'
    ) {
      throw new Error('Order response is missing its ID, status, or version')
    }
    return { orderId, status, version }
  })

  expect(order.status).toBe('confirmed')
  await expect.poll(async () =>
    page.evaluate(() => window.__KURIO_TEST_SOCKET_EVENTS__?.length ?? 0),
  ).toBe(4)

  const events = await page.evaluate(
    () => window.__KURIO_TEST_SOCKET_EVENTS__ ?? [],
  )
  expect(events.filter(({ name }) => name === 'nft.updated')).toHaveLength(3)
  expect(events.find(({ name }) => name === 'order.updated')?.payload).toMatchObject({
    type: 'order.updated',
    resource: { kind: 'order', id: order.orderId },
    version: order.version,
    userId: 'collector-ana',
    data: { orderId: order.orderId, status: 'confirmed' },
  })

  await expect.poll(async () =>
    page.evaluate(() => window.__KURIO_GUEST_SOCKET_EVENTS__?.length ?? 0),
  ).toBe(3)
  const guestEvents = await page.evaluate(
    () => window.__KURIO_GUEST_SOCKET_EVENTS__ ?? [],
  )
  expect(guestEvents.every(({ name }) => name === 'nft.updated')).toBe(true)

  await page.evaluate(() => window.__KURIO_TEST_SOCKET__?.disconnect())
  await page.evaluate(() => {
    const guestSocket = (window as Window & {
      __KURIO_GUEST_SOCKET__?: import('./mock-helpers').MockSocketForTests
    }).__KURIO_GUEST_SOCKET__
    guestSocket?.disconnect()
  })
})

test('rejected payment emits terminal order.updated without inventory changes', async ({
  page,
}) => {
  await openWithMockScenario(page, 'payment-rejected')
  await connectMockSocket(page)

  const order = await page.evaluate(async () => {
    const apiClientUrl = new URL('/src/services/api-client.ts', location.origin).href
    const apiModule = await import(/* @vite-ignore */ apiClientUrl) as BrowserApiModule
    const { apiClient } = apiModule
    const quote = await apiClient.post('/cart/quote', {})
    const response = await apiClient.post(
      '/orders',
      {
        quoteId: quote.data.quoteId,
        provider: 'metamask',
        walletId: 'wallet-ana-primary',
        collector: {
          displayName: 'Ana Oliveira',
          username: 'ana-oliveira',
          profileName: 'Ana O.',
          email: 'ana@kurio.example.test',
          walletAddress: '0x1111111111111111111111111111111111111111',
          walletType: 'metamask',
          network: 'ethereum',
          ensName: 'ana.kurio.eth',
          referralCode: 'KURIO-ANA-042',
        },
      },
      { headers: { 'X-Idempotency-Key': 'socket-payment-rejected' } },
    )
    const { orderId, status, version } = response.data
    if (
      typeof orderId !== 'string' ||
      typeof status !== 'string' ||
      typeof version !== 'number'
    ) {
      throw new Error('Order response is missing its ID, status, or version')
    }
    return { orderId, status, version }
  })

  expect(order.status).toBe('rejected')
  await expect.poll(async () =>
    page.evaluate(() => window.__KURIO_TEST_SOCKET_EVENTS__?.length ?? 0),
  ).toBe(1)
  const event = await page.evaluate(
    () => window.__KURIO_TEST_SOCKET_EVENTS__?.[0]?.payload,
  )
  expect(event).toMatchObject({
    type: 'order.updated',
    resource: { kind: 'order', id: order.orderId },
    version: order.version,
    userId: 'collector-ana',
    data: { orderId: order.orderId, status: 'rejected' },
  })
  await page.evaluate(() => window.__KURIO_TEST_SOCKET__?.disconnect())
})
