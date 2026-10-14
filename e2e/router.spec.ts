import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('renders the catch-all 404 route and offers a return path', async ({
  page,
}) => {
  await page.goto('/missing-route')

  await expect(
    page.getByRole('heading', { name: 'Página não encontrada.' }),
  ).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])

  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  const heroTitle =
    test.info().project.name === 'chromium-mobile'
      ? 'Seja dono da cultura digital'
      : 'Seja dono do futuro da arte digital'
  await expect(
    page.getByRole('heading', { name: heroTitle }),
  ).toBeVisible()
})

test('supports valid catalog search params during direct navigation', async ({
  page,
}) => {
  await page.goto('/?q=kurio&feed=trending&page=2')
  const heroTitle =
    test.info().project.name === 'chromium-mobile'
      ? 'Seja dono da cultura digital'
      : 'Seja dono do futuro da arte digital'
  await expect(
    page.getByRole('heading', { name: heroTitle }),
  ).toBeVisible()
})

test('falls back to default route search params without breaking the route', async ({
  page,
}) => {
  await page.goto('/?page=0')

  const heroTitle =
    test.info().project.name === 'chromium-mobile'
      ? 'Seja dono da cultura digital'
      : 'Seja dono do futuro da arte digital'
  await expect(
    page.getByRole('heading', { name: heroTitle }),
  ).toBeVisible()
})
