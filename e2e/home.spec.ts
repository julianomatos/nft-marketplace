import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openWithMockScenario, resetMockScenario } from './mock-helpers'

test.beforeEach(async ({ page }) => {
  await openWithMockScenario(page, 'success')
})

test('renders hero and catalog data from the REST mock', async ({ page }) => {
  await expect(
    page.getByRole('heading', { name: 'Seja dono do futuro da arte digital' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'NFT em destaque' })).toBeVisible()
  await expect(
    page
      .getByRole('region', { name: 'NFT em destaque' })
      .getByText('Sage Nomad #009', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'NFTs para descobrir' }),
  ).toBeVisible()
  await expect(page.getByText('Emerald Ape #042', { exact: true })).toBeVisible()
  await expect(page.getByText('1.19 ETH', { exact: true })).toBeVisible()
  await expect(page.locator('#catalog article')).toHaveCount(9)
})

test('home layout stays within the viewport at required widths', async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect(
      page.getByRole('heading', {
        name: 'Seja dono do futuro da arte digital',
      }),
    ).toBeVisible()
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(horizontalOverflow, `horizontal overflow at ${width}px`).toBe(false)
  }
})

test('home has no automated accessibility violations', async ({ page }) => {
  await expect(
    page.getByRole('heading', {
      name: 'Seja dono do futuro da arte digital',
    }),
  ).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

test('shows the valid empty catalog state', async ({ page }) => {
  await openWithMockScenario(page, 'empty')

  await expect(
    page.getByRole('heading', { name: 'Nenhum NFT encontrado' }),
  ).toBeVisible()
})

test('shows a recoverable catalog error and retries after the mock recovers', async ({
  page,
}) => {
  await openWithMockScenario(page, 'server-error')

  const catalogError = page.getByRole('heading', {
    name: 'Falha ao carregar o catálogo',
  })
  await expect(catalogError).toBeVisible({ timeout: 15_000 })

  await resetMockScenario(page, 'success')
  await page
    .getByRole('button', { name: 'Tentar novamente' })
    .last()
    .click()
  await expect(page.locator('#catalog article')).toHaveCount(9)
})
