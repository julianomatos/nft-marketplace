import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.__KURIO_MOCKS__.reset('design-cart')
    window.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana')
  })
})

test('loads the cart, updates quantity, and uses the API quote summary', async ({
  page,
}) => {
  await page.goto('/carrinho')

  await expect(page.getByRole('heading', { name: 'Meu carrinho' })).toBeVisible()
  const emeraldRow = page
    .locator('article')
    .filter({ hasText: 'Emerald Ape #042' })
    .first()
  await expect(emeraldRow).toContainText('Edição 1/50')

  const quantityGroup = emeraldRow.getByRole('group', {
    name: 'quantidade de Emerald Ape #042',
  })
  await expect(quantityGroup.locator('output')).toHaveText('2')
  await quantityGroup.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await expect(quantityGroup.locator('output')).toHaveText('3')

  const summary = page.getByRole('complementary', { name: 'Resumo do carrinho' })
  await expect(summary).toContainText('Resumo')
  await expect(summary).toContainText('Total')

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})
