import type { Page } from '@playwright/test'
import type { MockScenario } from '../src/mocks/scenario-contract'

type MockControl = {
  reset: (scenario?: string) => unknown
  setMockTime: (timestamp: string) => void
  advanceMockTime: (milliseconds: number) => void
  setLatency: (milliseconds: number) => void
  connectSocketClient: (tokenOverride?: string | null) => Promise<MockSocketClient>
  getState: () => { scenario: string }
  requestProfile: () => Promise<{
    data: { displayName: string; email: string }
  }>
}

type MockSocketClient = {
  connected: boolean
  once: (event: string, listener: (...args: unknown[]) => void) => MockSocketClient
  on: (event: string, listener: (payload: unknown) => void) => MockSocketClient
  disconnect: () => void
}

type CapturedSocketEvent = {
  name: 'nft.updated' | 'order.updated'
  payload: unknown
}

declare global {
  interface Window {
    __KURIO_MOCKS__: MockControl
    __KURIO_TEST_SOCKET__?: MockSocketClient
    __KURIO_TEST_SOCKET_EVENTS__?: CapturedSocketEvent[]
    __KURIO_GUEST_SOCKET__?: MockSocketClient
    __KURIO_GUEST_SOCKET_EVENTS__?: CapturedSocketEvent[]
  }
}

export async function openWithMockScenario(
  page: Page,
  scenario: MockScenario,
): Promise<void> {
  await page.goto(`/?mockScenario=${encodeURIComponent(scenario)}`)
}

export async function resetMockScenario(
  page: Page,
  scenario: MockScenario,
): Promise<void> {
  await page.evaluate((nextScenario) => {
    window.__KURIO_MOCKS__.reset(nextScenario)
  }, scenario)
}

export async function setMockClock(page: Page, timestamp: string): Promise<void> {
  await page.evaluate((nextTimestamp) => {
    window.__KURIO_MOCKS__.setMockTime(nextTimestamp)
  }, timestamp)
}

export async function advanceMockClock(page: Page, milliseconds: number): Promise<void> {
  await page.evaluate((elapsed) => {
    window.__KURIO_MOCKS__.advanceMockTime(elapsed)
  }, milliseconds)
}

export async function setMockRequestLatency(
  page: Page,
  milliseconds: number,
): Promise<void> {
  await page.evaluate((latency) => {
    window.__KURIO_MOCKS__.setLatency(latency)
  }, milliseconds)
}

export async function connectMockSocket(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const socket = await window.__KURIO_MOCKS__.connectSocketClient()
    const events: CapturedSocketEvent[] = []
    socket.on('nft.updated', (payload) => {
      events.push({ name: 'nft.updated', payload })
    })
    socket.on('order.updated', (payload) => {
      events.push({ name: 'order.updated', payload })
    })
    window.__KURIO_TEST_SOCKET__ = socket
    window.__KURIO_TEST_SOCKET_EVENTS__ = events

    await new Promise<void>((resolve, reject) => {
      socket.once('mock:subscribed', () => resolve())
      socket.once('mock:subscription-error', () => reject(
        new Error('Mock Socket.IO subscription was rejected'),
      ))
    })
  })
}
