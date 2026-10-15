import { expect, test } from '@playwright/test'
import { withMockControl } from './mock-helpers'

test.describe('visual regression baselines', () => {
  test('home page baseline', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('home.png')
  })

  test('nft detail baseline', async ({ page }) => {
    await page.goto('/nft/emerald-ape-042')
    await expect(page).toHaveScreenshot('detail.png')
  })

  test('cart baseline', async ({ page }) => {
    await page.goto('/')
    await withMockControl(page, (mocks) => {
      mocks.reset('design-cart')
    })
    await page.evaluate(() =>
      window.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana'),
    )
    await page.goto('/carrinho')
    await expect(page).toHaveScreenshot('cart.png')
  })

  test('payment baseline', async ({ page }) => {
    await page.goto('/')
    await withMockControl(page, (mocks) => {
      mocks.reset('design-cart')
    })
    await page.evaluate(() =>
      window.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana'),
    )
    await page.goto('/pagamento')
    await expect(page).toHaveScreenshot('payment.png')
  })
})
