import { expect, test } from '@playwright/test'

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
    await page.evaluate(() => {
      window.__KURIO_MOCKS__.reset('design-cart')
      window.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana')
    })
    await page.goto('/carrinho')
    await expect(page).toHaveScreenshot('cart.png')
  })

  test('payment baseline', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      window.__KURIO_MOCKS__.reset('design-cart')
      window.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana')
    })
    await page.goto('/pagamento')
    await expect(page).toHaveScreenshot('payment.png')
  })
})
