import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  // waitForMockControl,
  withMockControl,
} from './mock-helpers'

declare global {
  interface Window {
    __KURIO_MOCKS__: import('./auth.spec').TestMockControl
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await withMockControl(page, (mocks) => mocks.reset('success'))
  await page.evaluate(() =>
    window.sessionStorage.removeItem('kurio.session.token'),
  )
})

// test('opens an NFT detail directly with metadata and bounded edition quantity', async ({
//   page,
// }) => {
//   await page.goto('/nft/emerald-ape-042')

//   await expect(
//     page.getByRole('heading', { name: 'Emerald Ape #042' }),
//   ).toBeVisible()
//   await expect(
//     page
//       .getByRole('region', { name: 'Emerald Ape #042' })
//       .getByText('1.19 ETH', { exact: true })
//       .first(),
//   ).toBeVisible()
//   await expect(
//     page
//       .getByRole('tabpanel', { name: 'Detalhes do NFT' })
//       .getByText('Ethereum', { exact: true }),
//   ).toBeVisible()
//   await expect(page.getByText('#0042', { exact: true })).toBeVisible()
//   const thumbnail = page.getByRole('button', {
//     name: 'Exibir imagem 1 de Emerald Ape #042',
//   })
//   await expect(thumbnail).toHaveAttribute('aria-pressed', 'true')
//   const zoomButton = page.getByRole('button', {
//     name: 'Ampliar imagem de Emerald Ape #042',
//   })
//   await zoomButton.click()
//   const zoomDialog = page.getByRole('dialog', {
//     name: 'Imagem ampliada: Emerald Ape #042',
//   })
//   await expect(zoomDialog).toBeVisible()
//   await expect(
//     zoomDialog.getByRole('img', { name: 'Arte de Emerald Ape #042' }),
//   ).toBeVisible()
//   await page.keyboard.press('Escape')
//   await expect(zoomDialog).not.toBeVisible()
//   await expect(zoomButton).toBeFocused()

//   if ((page.viewportSize()?.width ?? 0) >= 768) {
//     await expect(
//       page
//         .getByRole('navigation', { name: 'Navegação principal' })
//         .getByRole('link', { name: 'Mercado', exact: true }),
//     ).toHaveAttribute('aria-current', 'page')
//   }

//   const editions = page.getByRole('group', { name: 'quantidade' })
//   await page.getByRole('radio', { name: '1/1', exact: true }).check()
//   await expect(
//     editions.getByRole('button', { name: 'Aumentar quantidade' }),
//   ).toBeDisabled()

//   await page.getByRole('radio', { name: '1/50', exact: true }).check()
//   await editions.getByRole('button', { name: 'Aumentar quantidade' }).click()
//   await expect(editions.locator('output')).toHaveText('2')
//   await expect(
//     editions.getByRole('button', { name: 'Aumentar quantidade' }),
//   ).toHaveClass((page.viewportSize()?.width ?? 0) < 768 ? /size-8/ : /size-12/)

//   for (const width of [390, 768, 1440]) {
//     await page.setViewportSize({ width, height: 900 })
//     await expect(
//       page.getByRole('heading', { name: 'Emerald Ape #042' }),
//     ).toBeVisible()
//     expect(
//       await page.evaluate(
//         () => document.documentElement.scrollWidth > window.innerWidth,
//       ),
//       `horizontal overflow at ${width}px`,
//     ).toBe(false)
//   }
//   const accessibility = await new AxeBuilder({ page }).analyze()
//   expect(accessibility.violations).toEqual([])
// })

test('catalog detail action opens the matching NFT', async ({ page }) => {
  await page.goto('/')
  await page
    .getByRole('link', { name: 'Ver Emerald Ape #042' })
    .click()

  await expect(page).toHaveURL('/nft/emerald-ape-042')
  await expect(
    page.getByRole('heading', { name: 'Emerald Ape #042' }),
  ).toBeVisible()
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.getByRole('button', { name: 'Voltar' }).click()
    await expect(page).toHaveURL('/')
  }
})

test('shows an NFT-specific 404 state for a missing resource', async ({
  page,
}) => {
  const detailResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/nfts/not-a-real-nft' &&
      response.request().method() === 'GET',
  )
  await page.goto('/nft/not-a-real-nft')

  expect((await detailResponse).status()).toBe(404)
  await expect(
    page.getByRole('heading', { name: 'NFT não encontrado.' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Voltar ao mercado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Tentar novamente' }),
  ).toHaveCount(0)

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])

  await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
  await expect(
    page.getByRole('heading', { name: /Seja dono/ }),
  ).toBeVisible()
})

test('marks unavailable editions and blocks selecting a sold-out tier', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/nft/azure-echo-1001')

  await expect(
    page.getByRole('heading', { name: 'Azure Echo' }),
  ).toBeVisible()
  const soldEdition = page.getByRole('radio', {
    name: '1/10 — Esgotada',
  })
  await expect(soldEdition).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Comprar NFT' }),
  ).toBeEnabled()

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

test('disables purchase when every edition is sold out', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/nft/infinite-meadow-1031')

  await expect(
    page.getByRole('heading', { name: 'Infinite Meadow' }),
  ).toBeVisible()
  await expect(
    page.getByText('Todas as edições deste NFT estão esgotadas.', {
      exact: true,
    }),
  )
    .toHaveAttribute('role', 'status')
  await expect(
    page.getByText('Todas as edições deste NFT estão esgotadas.', {
      exact: true,
    }),
  ).toBeVisible()
  const editions = page.getByRole('radio')
  await expect(editions).toHaveCount(4)
  for (let index = 0; index < 4; index += 1) {
    await expect(editions.nth(index)).toBeDisabled()
  }
  await expect(
    page.getByRole('region', { name: 'Ações de compra' }).getByRole('button', {
      name: 'Comprar NFT',
    }),
  ).toBeDisabled()
})

test('mobile detail keeps purchase actions above bottom navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/nft/emerald-ape-042')

  await expect(page.getByRole('button', { name: 'Voltar' })).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Adicionar Emerald Ape #042 aos favoritos',
    }),
  ).toBeVisible()
  const stickyActions = page.getByRole('region', { name: 'Ações de compra' })
  await expect(stickyActions).toBeVisible()
  await expect(stickyActions.getByRole('group', { name: 'quantidade' })).toBeVisible()
  await expect(
    stickyActions.getByText('1.19 ETH', { exact: true }),
  ).toBeVisible()
  await expect(
    stickyActions.getByRole('button', {
      name: 'Adicionar Emerald Ape #042 ao carrinho',
    }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

// test('detail favorites roll back after API failure and recover on retry', async ({
//   page,
// }) => {
//   await waitForMockControl(page)
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
//   await expect(page).toHaveURL('/')
//   await withMockControl(page, (mocks) => mocks.reset('success'))
//   await page.reload()
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
//   await expect(page).toHaveURL('/')
//   await page.evaluate(() => {
//     const storageKey = 'kurio.mock.state'
//     const rawState = window.localStorage.getItem(storageKey)
//     if (!rawState) throw new Error('Expected persisted mock state after login.')
//     const state = JSON.parse(rawState) as {
//       favorites: { userId: string; nftId: string; createdAt: string }[]
//     }
//     window.localStorage.setItem(
//       storageKey,
//       JSON.stringify({
//         ...state,
//         favorites: state.favorites.filter(
//           ({ nftId }) => nftId !== 'emerald-ape-042',
//         ),
//       }),
//     )
//   })
//   await page.reload()
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
//   await expect(page).toHaveURL('/')
//   await page.goto('/nft/emerald-ape-042')

//   const favoriteButton = page.getByRole('button', {
//     name: /Remover Emerald Ape #042 dos favoritos/,
//   })
//   await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
//   const favoriteRequest = page.waitForResponse(
//     (response) =>
//       new URL(response.url()).pathname ===
//         '/api/favorites/emerald-ape-042' &&
//       response.request().method() === 'DELETE',
//   )
//   await page.route('**/api/**', async (route) => {
//     if (
//       route.request().method() !== 'DELETE' ||
//       !route.request().url().includes('/api/favorites/emerald-ape-042')
//     ) {
//       await route.continue()
//       return
//     }
//     await route.fulfill({
//       contentType: 'application/json',
//       status: 503,
//       body: JSON.stringify({
//         error: {
//           code: 'TRANSIENT_FAILURE',
//           message: 'O serviço está temporariamente indisponível.',
//         },
//       }),
//     })
//   })
//   await favoriteButton.click()
//   const failedFavoriteResponse = await favoriteRequest
//   expect(failedFavoriteResponse.status()).toBe(503)
//   await expect(
//     page.getByRole('status').filter({
//       hasText: 'Removido da lista de interesse.',
//     }),
//   ).toBeVisible()
//   await expect(page.getByRole('button', {
//     name: /Adicionar Emerald Ape #042 aos favoritos/,
//   })).toHaveAttribute('aria-pressed', 'false')

//   await page.unrouteAll()
//   await page.getByRole('button', {
//     name: /Adicionar Emerald Ape #042 aos favoritos/,
//   }).click()
//   await expect(
//     page.getByRole('button', {
//       name: /Remover Emerald Ape #042 dos favoritos/,
//     }),
//   ).toHaveAttribute('aria-pressed', 'true')
//   await expect(
//     page.getByText('Adicionado à lista de interesse.', { exact: true }),
//   ).toBeVisible()
// })

test('loads reviews and related collection items through REST endpoints', async ({
  page,
}) => {
  const reviewsResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        '/api/nfts/emerald-ape-042/reviews' &&
      response.request().method() === 'GET',
  )
  const relatedResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname ===
        '/api/nfts/emerald-ape-042/related' &&
      response.request().method() === 'GET',
  )
  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('tab', { name: 'Detalhes do NFT' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: /Avaliações de colecionadores/ }),
  ).toBeFocused()
  expect((await reviewsResponse).status()).toBe(200)
  await expect(
    page.getByRole('tab', { name: /Avaliações de colecionadores/ }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    page.getByRole('heading', { name: 'Lia Costa' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('tabpanel', { name: /Avaliações de colecionadores/ })
      .getByText('Uma peça marcante da coleção.')
      .first(),
  ).toBeVisible()

  await page.getByRole('tab', { name: 'Detalhes do NFT' }).click()
  await expect(
    page.getByRole('heading', { name: 'Mais desta coleção' }),
  ).toBeVisible()
  expect((await relatedResponse).status()).toBe(200)
  await expect(
    page.getByRole('region', { name: 'NFTs relacionados' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Exibir Ivory Baron #088' }),
  ).toBeVisible()
  const relatedDot = page.getByRole('button', {
    name: 'Exibir Ivory Baron #088',
  })
  await relatedDot.click()
  await expect(relatedDot).toHaveAttribute('aria-pressed', 'true')

  const shareLinks = page.getByRole('region', { name: 'Compartilhar NFT' })
  await expect(
    shareLinks.getByRole('link', { name: 'X', exact: true }),
  ).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(
    shareLinks.getByRole('link', { name: 'LinkedIn', exact: true }),
  ).toHaveAttribute('target', '_blank')
})

test('adding a selected NFT edition uses the cart API response', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/')

  await page.goto('/nft/emerald-ape-042')
  await page.getByRole('radio', { name: '1/50', exact: true }).check()
  const quantityGroup = page.getByRole('group', { name: 'quantidade' })
  await quantityGroup.getByRole('button', { name: 'Aumentar quantidade' }).click()

  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/cart/items' &&
      response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Comprar NFT' }).click()
  const response = await responsePromise

  expect(response.status()).toBe(200)
  const body: unknown = await response.json()
  expect(body).toMatchObject({
    items: expect.arrayContaining([
      expect.objectContaining({
        nftId: 'emerald-ape-042',
        edition: '1/50',
        quantity: 2,
      }),
    ]),
  })
  await expect(
    page.getByRole('status').filter({
      hasText: 'Emerald Ape #042 adicionado ao carrinho.',
    }).first(),
  ).toBeVisible()
})
