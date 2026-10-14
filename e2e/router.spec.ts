import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { requireAuthenticated } from '../src/utils/route-guards'
import {
  catalogSearchSchema,
  validateSearchWithZod,
} from '../src/utils/search-params'

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
  await expect(
    page.getByRole('heading', { name: 'O marketplace está em construção.' }),
  ).toBeVisible()
})

test('validates catalog search values with Zod on direct navigation', async ({
  page,
}) => {
  const parseSearch = validateSearchWithZod(catalogSearchSchema)

  expect(
    parseSearch({ q: 'kurio', feed: 'trending', page: '2' }),
  ).toEqual({ q: 'kurio', feed: 'trending', page: 2 })
  expect(() => parseSearch({ page: '0' })).toThrow()

  await page.goto('/?q=kurio&feed=trending&page=2')
  await expect(
    page.getByRole('heading', { name: 'O marketplace está em construção.' }),
  ).toBeVisible()
})

test('redirects guest guard requests to login with their return URL', () => {
  expect(() =>
    requireAuthenticated({
      context: { session: { status: 'guest' } },
      location: { href: '/carrinho?item=ape' },
    }),
  ).toThrow()

  try {
    requireAuthenticated({
      context: { session: { status: 'guest' } },
      location: { href: '/carrinho?item=ape' },
    })
  } catch (error) {
    expect(error).toMatchObject({
      options: {
        href: '/login?redirect=%2Fcarrinho%3Fitem%3Dape',
      },
    })
  }

  expect(() =>
    requireAuthenticated({
      context: {
        session: {
          status: 'authenticated',
          userId: 'collector-1',
          displayName: 'Collector',
        },
      },
      location: { href: '/perfil' },
    }),
  ).not.toThrow()
})

test('uses the root error boundary for invalid route search params', async ({
  page,
}) => {
  await page.goto('/?page=0')

  await expect(
    page.getByRole('heading', { name: 'Algo deu errado' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Voltar ao início' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'KURIO — início' }),
  ).toBeVisible()
  await expect(
    page
      .getByRole('contentinfo')
      .filter({ hasText: 'Segurança da carteira' }),
  ).toBeVisible()
  if (test.info().project.name === 'chromium-mobile') {
    await expect(
      page.getByRole('navigation', { name: 'Navegação mobile' }),
    ).toBeVisible()
  } else {
    await expect(
      page.getByRole('navigation', { name: 'Navegação principal' }),
    ).toBeVisible()
  }
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})
