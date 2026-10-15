import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { withMockControl } from './mock-helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await withMockControl(page, (mocks, browserWindow) => {
    mocks.reset('design-cart')
    browserWindow.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana')
  })
})

test('keeps guest cart items until login and merges them into the authenticated cart', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.localStorage.setItem(
      'kurio.guest-cart',
      JSON.stringify([
        {
          nftId: 'emerald-ape-042',
          editionId: 'emerald-ape-042-1-50',
          quantity: 1,
        },
      ]),
    )
    window.sessionStorage.removeItem('kurio.session.token')
  })

  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect.poll(() =>
    page.evaluate(() => window.localStorage.getItem('kurio.guest-cart')),
  ).toBeNull()

  await page.goto('/carrinho')
  await expect(page.getByRole('heading', { name: 'Meu carrinho' })).toBeVisible()
  await expect(
    page.locator('article').filter({ hasText: 'Emerald Ape #042' }).first(),
  ).toContainText('Edição 1/50')
})

test('loads the cart, applies a coupon, updates quantity, and uses the API quote summary', async ({
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

  const mobileSummaryButton = page.getByRole('button', { name: 'Ver resumo e cupom' })
  if (await mobileSummaryButton.isVisible().catch(() => false)) {
    await mobileSummaryButton.click()
  }

  const couponInput = page.locator('input[placeholder="KURIO10"]:visible').first()
  await couponInput.fill('KURIO10')
  await page.getByRole('button', { name: 'Aplicar cupom' }).first().click()
  await expect(page.locator('button[aria-label="Remover cupom"]:visible')).toBeVisible()
  await expect(page.locator(':visible').filter({ hasText: /^Desconto$/ }).first()).toBeVisible()
  await expect(page.locator(':visible').filter({ hasText: /^Total$/ }).first()).toBeVisible()

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})
