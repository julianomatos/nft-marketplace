import { expect, test } from '@playwright/test'

test('renders the responsive KURIO shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('KURIO | Marketplace de NFTs')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /marketplace KURIO/,
  )
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/favicon.svg',
  )
  const faviconResponse = await page.request.get('/favicon.svg')
  expect(faviconResponse.ok()).toBe(true)

  await expect(
    page.getByRole('link', { name: 'KURIO — início' }),
  ).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(
    page
      .getByRole('contentinfo')
      .filter({ hasText: 'Segurança da carteira' }),
  ).toBeVisible()

  const designTokens = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement)

    return {
      rating: styles.getPropertyValue('--rating').trim(),
      primaryGradient: styles.getPropertyValue('--primary-gradient').trim(),
      heroGradientMobile: styles
        .getPropertyValue('--hero-gradient-mobile')
        .trim(),
    }
  })
  expect(designTokens.rating).toBe('#E3A44E')
  expect(designTokens.primaryGradient).toContain('linear-gradient')
  expect(designTokens.heroGradientMobile).toContain('radial-gradient')
  expect(designTokens.heroGradientMobile).toContain('linear-gradient')

  if (test.info().project.name === 'chromium-mobile') {
    const mobileNavigation = page.getByRole('navigation', {
      name: 'Navegação mobile',
    })
    await expect(
      mobileNavigation.getByRole('listitem'),
    ).toHaveCount(4)
    const exploreLink = mobileNavigation.getByRole('link', {
      name: 'Explorar coleções',
    })
    await expect(
      mobileNavigation.getByRole('link', { name: 'Início' }),
    ).toBeVisible()
    await page.goto('/indisponivel')
    await exploreLink.click()
    await expect(page).toHaveURL(/\/\?page=1#catalog$/)
    await expect(
      page.getByRole('link', { name: 'Buscar coleções' }),
    ).toBeFocused()
  } else {
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible()
  }
})

test('unavailable destinations explain the outcome and provide a return path', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('link', { name: 'Estúdio do criador' })
    .click()

  await expect(
    page.getByRole('heading', {
      name: 'Esta funcionalidade ainda não está disponível.',
    }),
  ).toBeVisible()
  await expect(page.getByText('Nenhuma ação foi realizada.')).toBeVisible()

  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Seja dono do futuro da arte digital',
    }),
  ).toBeVisible()
})

test('does not overflow horizontally at the required viewport widths', async ({
  page,
}) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const pageWidth = await page.locator('body').evaluate((body) => body.scrollWidth)
    expect(pageWidth).toBeLessThanOrEqual(width)

    const headerInset = await page
      .locator('header .kurio-container > a')
      .evaluate((header) => header.getBoundingClientRect().left)
    const expectedInset =
      width < 768 ? 24 : Math.min(120, Math.max(24, width * 0.0833))
    expect(Math.abs(headerInset - expectedInset)).toBeLessThan(1)
  }
})

test('newsletter notice does not claim a successful registration', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Seu e-mail').fill('collector@example.test')
  await page.getByRole('button', { name: 'Enviar' }).click()

  await expect(
    page.getByText(
      'O cadastro por e-mail não está disponível nesta demonstração.',
    ),
  ).toBeVisible()
})
