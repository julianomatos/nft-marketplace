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

export type MockControlForTests = MockControl
export type MockSocketForTests = MockSocketClient

type CapturedSocketEvent = {
  name: 'nft.updated' | 'order.updated'
  payload: unknown
}

declare global {
  interface Window {
    __KURIO_MOCKS_READY__?: Promise<void>
    __KURIO_MOCKS_FAILED__?: unknown
    __KURIO_MOCKS_ERROR__?: string
  }
}

export async function waitForMockControl(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const mockWindow = window as unknown as Window & {
      __KURIO_MOCKS_READY__?: Promise<void>
      __KURIO_MOCKS_FAILED__?: unknown
      __KURIO_MOCKS_ERROR__?: string
    }
    if (!mockWindow.__KURIO_MOCKS_READY__) {
      throw new Error('Mock initialization did not publish its ready promise')
    }
    await mockWindow.__KURIO_MOCKS_READY__
    if (mockWindow.__KURIO_MOCKS_FAILED__) {
      throw new Error(
        `Mock initialization failed: ${mockWindow.__KURIO_MOCKS_ERROR__ ?? 'unknown error'}`,
      )
    }
  })
}

export async function withMockControl<T>(
  page: Page,
  callback: (control: MockControlForTests, browserWindow: Window) => T | Promise<T>,
): Promise<T> {
  await waitForMockControl(page)
  const callbackSource = callback.toString()
  return page.evaluate((source) => {
    const run = new Function(
      'control',
      'browserWindow',
      `return (${source})(control, browserWindow)`,
    ) as (
      control: MockControlForTests,
      browserWindow: Window,
    ) => T | Promise<T>
    const control = (window as unknown as Window & {
      __KURIO_MOCKS__: MockControlForTests
    }).__KURIO_MOCKS__
    return run(control, window)
  }, callbackSource)
}

export async function openWithMockScenario(
  page: Page,
  scenario: MockScenario,
): Promise<void> {
  await page.goto(`/?mockScenario=${encodeURIComponent(scenario)}`)
  await waitForMockControl(page)
}

export async function resetMockScenario(
  page: Page,
  scenario: MockScenario,
): Promise<void> {
  await waitForMockControl(page)
  await page.evaluate(
    ({ scenario: nextScenario }) => {
      const control = (window as unknown as Window & {
        __KURIO_MOCKS__: MockControl
      }).__KURIO_MOCKS__
      control.reset(nextScenario)
    },
    { scenario },
  )
}

export async function setMockClock(page: Page, timestamp: string): Promise<void> {
  await waitForMockControl(page)
  await page.evaluate(
    ({ timestamp: nextTimestamp }) => {
      const control = (window as unknown as Window & {
        __KURIO_MOCKS__: MockControl
      }).__KURIO_MOCKS__
      control.setMockTime(nextTimestamp)
    },
    { timestamp },
  )
}

export async function advanceMockClock(page: Page, milliseconds: number): Promise<void> {
  await waitForMockControl(page)
  await page.evaluate(
    ({ milliseconds: elapsed }) => {
      const control = (window as unknown as Window & {
        __KURIO_MOCKS__: MockControl
      }).__KURIO_MOCKS__
      control.advanceMockTime(elapsed)
    },
    { milliseconds },
  )
}

export async function setMockRequestLatency(
  page: Page,
  milliseconds: number,
): Promise<void> {
  await waitForMockControl(page)
  await page.evaluate(
    ({ latency }) => {
      const control = (window as unknown as Window & {
        __KURIO_MOCKS__: MockControl
      }).__KURIO_MOCKS__
      control.setLatency(latency)
    },
    { latency: milliseconds },
  )
}

export async function connectMockSocket(page: Page): Promise<void> {
  await withMockControl(page, async (mocks, browserWindow) => {
    const socket = await mocks.connectSocketClient()
    const events: CapturedSocketEvent[] = []
    socket.on('nft.updated', (payload) => {
      events.push({ name: 'nft.updated', payload })
    })
    socket.on('order.updated', (payload) => {
      events.push({ name: 'order.updated', payload })
    })
    const testWindow = browserWindow as Window & {
      __KURIO_TEST_SOCKET__?: MockSocketClient
      __KURIO_TEST_SOCKET_EVENTS__?: CapturedSocketEvent[]
    }
    testWindow.__KURIO_TEST_SOCKET__ = socket
    testWindow.__KURIO_TEST_SOCKET_EVENTS__ = events

    await new Promise<void>((resolve, reject) => {
      socket.once('mock:subscribed', () => resolve())
      socket.once('mock:subscription-error', () => reject(
        new Error('Mock Socket.IO subscription was rejected'),
      ))
    })
  })
}
