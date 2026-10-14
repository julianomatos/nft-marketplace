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

test('feed tabs and facets update catalog results and URL search params', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Novos', exact: true }).click()
  await expect(page).toHaveURL(/feed=new/)
  await expect(page.locator('#catalog article')).toHaveCount(9)

  const isMobile = (page.viewportSize()?.width ?? 0) < 1024
  if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
  const filters = isMobile
    ? page.getByRole('dialog', { name: 'Filtrar NFTs' })
    : page.getByRole('complementary', { name: 'Filtros do catálogo' })
  const categoryFilter = filters.getByLabel(/Arte digital/)
  await categoryFilter.check()
  await expect(page).toHaveURL(/category=%5B%22arte-digital%22%5D/)
  await expect(page.locator('#catalog article')).toHaveCount(3)

  const networkFilter = filters.getByLabel(/Ethereum/)
  await networkFilter.check()
  await expect(page).toHaveURL(/network=%5B%22ethereum%22%5D/)
  await expect(page.locator('#catalog article')).toHaveCount(3)
})

test('price range is applied to the URL and searches can be cleared', async ({
  page,
}) => {
  const isMobile = (page.viewportSize()?.width ?? 0) < 1024
  if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
  const filters = isMobile
    ? page.getByRole('dialog', { name: 'Filtrar NFTs' })
    : page.getByRole('complementary', { name: 'Filtros do catálogo' })
  const lowerRange = filters.getByRole('slider', { name: 'Preço: mínimo' })
  await lowerRange.press('ArrowRight')
  await filters.getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('minPrice'))
    .toBe('"0.03"')
  await expect(page.locator('#catalog article')).toHaveCount(9)

  if (isMobile) {
    await page.getByRole('button', { name: 'Ver resultados' }).click()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Emerald Ape')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/q=Emerald/)
  await expect(page.locator('#catalog article')).toHaveCount(1)

  await page.getByRole('button', { name: 'Abrir filtros' }).click()
  await expect(page.getByRole('dialog', { name: 'Filtrar NFTs' })).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: 'Filtrar NFTs' }).getByText('Coleções'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Fechar' }).click()
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page).not.toHaveURL(/(?:q|minPrice|category|network)=/)
})

test('card actions require auth and use REST for favorite and cart', async ({
  page,
}) => {
  const removeFavorite = page.getByRole('button', {
    name: 'Remover Emerald Ape #042 dos favoritos',
  })
  await removeFavorite.focus()
  await expect(removeFavorite).toBeVisible()
  await removeFavorite.press('Enter')
  await expect(page.getByRole('status').filter({
    hasText: 'Removido da lista de interesse.',
  })).toBeVisible()

  await page.getByRole('button', {
    name: 'Adicionar Emerald Ape #042 aos favoritos',
  }).click()
  await expect(page.getByRole('status').filter({
    hasText: 'Adicionado à lista de interesse.',
  })).toBeVisible()

  await page.getByRole('button', {
    name: 'Adicionar Emerald Ape #042 ao carrinho',
  }).click()
  await expect(page.getByRole('status').filter({
    hasText: 'NFT adicionado ao carrinho.',
  })).toBeVisible()

  await page.getByRole('button', {
    name: 'Ver Emerald Ape #042',
    exact: true,
  }).click()
  await expect(page.getByRole('status').filter({
    hasText: 'A página de detalhes deste NFT estará disponível em breve.',
  })).toBeVisible()
})

test('guest favorite action returns to login instead of mutating private state', async ({
  page,
}) => {
  await page.getByText('Ana Oliveira', { exact: true }).click()
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await expect(page.getByText('Ana Oliveira', { exact: true })).toHaveCount(0)
  await page.locator('#catalog article').first().hover()
  await page.getByRole('button', {
    name: 'Adicionar Emerald Ape #042 aos favoritos',
  }).click()
  await expect(page).toHaveURL(/\/login/)
})
