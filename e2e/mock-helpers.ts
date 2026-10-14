import type { Page } from '@playwright/test'
import type { MockScenario } from '../src/mocks/scenario-contract'

type MockControl = {
  reset: (scenario?: string) => unknown
  setMockTime: (timestamp: string) => void
  advanceMockTime: (milliseconds: number) => void
  setLatency: (milliseconds: number) => void
  getState: () => { scenario: string }
}

declare global {
  interface Window {
    __KURIO_MOCKS__: MockControl
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
