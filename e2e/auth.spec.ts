import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.__KURIO_MOCKS__.reset('success'))
})

test('logs in through the API and returns from the desktop auth dialog', async ({
  page,
}) => {
  if ((page.viewportSize()?.width ?? 0) < 768) {
    await page.goto('/login')
  } else {
    await page.getByRole('link', { name: 'Entrar' }).click()
  }
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page).toHaveURL((url) => url.pathname === '/')
  await expect.poll(() =>
    page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
  ).toContain('mock-token-collector-ana-')
})

test('maps invalid login credentials to a field error', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
  await page.getByLabel('Senha', { exact: true }).fill('incorrect-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  await expect(page.getByRole('alert').first()).toContainText(
    'E-mail ou senha incorretos.',
  )
  await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
})

test('creates an account through the signup API', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Nome', { exact: true }).fill('Nova Pessoa')
  await page.getByLabel('E-mail', { exact: true }).fill('nova.pessoa@kurio.example.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!Nova2026')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  await expect(page).toHaveURL((url) => url.pathname === '/')
  await expect.poll(() =>
    page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
  ).toContain('mock-token-collector-signup-')
})

test('maps duplicate signup email to the email field', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Nome', { exact: true }).fill('Ana duplicada')
  await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
  await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!Nova2026')
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

  await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  )
  await expect(page.getByRole('alert').first()).toContainText(
    'Este e-mail já está cadastrado.',
  )
})

test('social and password recovery actions explain they are unavailable', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Esqueceu a senha?' }).click()
  await expect(page.getByRole('alert').first()).toContainText(
    'A recuperação de senha não está disponível nesta demonstração.',
  )

  await page.getByRole('button', { name: 'Continuar com Google' }).click()
  await expect(page.getByRole('status')).toContainText(
    'A autenticação com Google não está disponível nesta demonstração.',
  )
})

test('auth dialog fits required viewports and has no axe violations', async ({
  page,
}) => {
  await page.goto('/login')

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const bounds = await dialog.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds?.width).toBeLessThanOrEqual(width)

    const accessibility = await new AxeBuilder({ page }).analyze()
    expect(accessibility.violations).toEqual([])
  }
})
