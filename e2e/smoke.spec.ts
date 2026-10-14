import { expect, test } from '@playwright/test'

test('the application starts in Chromium', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('KURIO | Marketplace de NFTs')
  await expect(
    page.getByRole('heading', { name: 'O marketplace está em construção.' }),
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
