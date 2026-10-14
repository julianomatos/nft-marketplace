import { expect, test } from '@playwright/test'
import { openWithMockScenario } from './mock-helpers'

test('the application starts in Chromium', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('KURIO | Marketplace de NFTs')
  await expect(
    page.getByRole('heading', { name: 'Seja dono do futuro da arte digital' }),
  ).toBeVisible()
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
    page.evaluate(() => window.__KURIO_MOCKS__.getState().scenario),
  ).toBe('empty')
})
