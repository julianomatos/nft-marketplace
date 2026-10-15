import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.__KURIO_MOCKS__.reset('design-cart')
    window.sessionStorage.setItem('kurio.session.token', 'mock-token-collector-ana')
  })
})

test('renders the checkout form, validates collector data and confirms the order through the API', async ({
  page,
}) => {
  await page.goto('/pagamento')

  await expect(page.getByRole('heading', { name: 'Finalizar compra' })).toBeVisible()
  await expect(page.getByLabel('Nome completo')).toHaveValue('Ana Oliveira')
  await expect(page.getByLabel('E-mail')).toHaveValue('ana@kurio.example.test')

  await page.getByRole('checkbox').check()
  await page.getByLabel('Endereço da carteira').fill('0x1234567890abcdef1234567890abcdef12345678')
  await page.getByRole('button', { name: 'Revisar pedido' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Revisar compra' })).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar compra' }).click()

  await expect(page.getByText('Pedido confirmado')).toBeVisible()
  await expect(page.getByText(/#order-/)).toBeVisible()

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})
