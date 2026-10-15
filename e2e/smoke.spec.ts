import { expect, test } from '@playwright/test'
import {
  openWithMockScenario,
  waitForMockWorker,
  withMockControl,
} from './mock-helpers'

test('the application starts in Chromium', async ({ page }) => {
  await page.goto('/')
  await waitForMockWorker(page)

  await expect(page).toHaveTitle('KURIO | Marketplace de NFTs')
  const heroTitle =
    test.info().project.name === 'chromium-mobile'
      ? 'Seja dono da cultura digital'
      : 'Seja dono do futuro da arte digital'
  await expect(
    page.getByRole('heading', { name: heroTitle }),
  ).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Arte de Emerald Ape #042' }).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('img', { name: 'Arte de Emerald Ape #042' }).first(),
  ).toHaveJSProperty('naturalWidth', 320)
})

test('MSW Socket.IO binding delivers a mocked event to socket.io-client', async ({
  page,
}) => {
  await page.goto('/e2e/socket-smoke.html')

  await expect(page.getByRole('status')).toHaveText(
    'Socket.IO event received from MSW',
  )
})

test('mock scenario can be selected from the URL before the app starts', async ({
  page,
}) => {
  await openWithMockScenario(page, 'empty')

  await expect.poll(() =>
    withMockControl(page, (mocks) => mocks.getState().scenario),
  ).toBe('empty')
})
