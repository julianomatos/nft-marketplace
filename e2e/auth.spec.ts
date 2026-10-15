// import AxeBuilder from '@axe-core/playwright'
import { test } from '@playwright/test'
import { withMockControl } from './mock-helpers'
import type { MockControlForTests } from './mock-helpers'

export type TestMockControl = MockControlForTests & {
  advanceMockTime: (milliseconds: number) => void
  requestProfile: () => Promise<{ data: { displayName: string; email: string } }>
}

declare global {
  interface Window {
    __KURIO_MOCKS__: TestMockControl
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await withMockControl(page, (mocks) => mocks.reset('success'))
  await page.evaluate(() =>
    window.sessionStorage.removeItem('kurio.session.token'),
  )
})

// test('logs in through the API and returns from the desktop auth dialog', async ({
//   page,
// }) => {
//   if ((page.viewportSize()?.width ?? 0) < 768) {
//     await page.goto('/login')
//   } else {
//     await page.getByRole('link', { name: 'Entrar' }).click()
//   }
//   await expect(page.getByRole('dialog')).toBeVisible()

//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page).toHaveURL((url) => url.pathname === '/')
//   await expect.poll(() =>
//     page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
//   ).toContain('mock-token-collector-ana-')
// })

// test('maps invalid login credentials to a field error', async ({ page }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('incorrect-password')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   const passwordInput = page.getByLabel('Senha', { exact: true })
//   const describedBy = await passwordInput.getAttribute('aria-describedby')

//   await expect(page.getByRole('alert').first()).toContainText(
//     'E-mail ou senha incorretos.',
//   )
//   expect(describedBy).toBeTruthy()
//   await expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
//   await expect(page.locator(`#${describedBy}`)).toContainText(
//     'E-mail ou senha incorretos.',
//   )
// })

// test('creates an account through the signup API', async ({ page }) => {
//   await page.goto('/signup')
//   await page.getByLabel('Nome', { exact: true }).fill('Nova Pessoa')
//   await page.getByLabel('E-mail', { exact: true }).fill('nova.pessoa@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!Nova2026')
//   await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

//   await expect(page).toHaveURL((url) => url.pathname === '/')
//   await expect.poll(() =>
//     page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
//   ).toContain('mock-token-collector-signup-')
// })

// test('maps duplicate signup email to the email field', async ({ page }) => {
//   await page.goto('/signup')
//   await page.getByLabel('Nome', { exact: true }).fill('Ana duplicada')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!Nova2026')
//   await page.getByRole('button', { name: 'Criar conta', exact: true }).click()

//   await expect(page.getByLabel('E-mail', { exact: true })).toHaveAttribute(
//     'aria-invalid',
//     'true',
//   )
//   await expect(page.getByRole('alert').first()).toContainText(
//     'Este e-mail já está cadastrado.',
//   )
// })

// test('social and password recovery actions explain they are unavailable', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByRole('button', { name: 'Esqueceu a senha?' }).click()
//   await expect(page.getByRole('alert').first()).toContainText(
//     'A recuperação de senha não está disponível nesta demonstração.',
//   )

//   await page.getByRole('button', { name: 'Continuar com Google' }).click()
//   await expect(page.getByRole('status')).toContainText(
//     'A autenticação com Google não está disponível nesta demonstração.',
//   )
// })

// test('auth dialog fits required viewports and has no axe violations', async ({
//   page,
// }) => {
//   await page.goto('/login')

//   for (const width of [390, 768, 1440]) {
//     await page.setViewportSize({ width, height: 900 })
//     const dialog = page.getByRole('dialog')
//     await expect(dialog).toBeVisible()
//     const bounds = await dialog.boundingBox()
//     expect(bounds).not.toBeNull()
//     expect(bounds?.width).toBeLessThanOrEqual(width)

//     const accessibility = await new AxeBuilder({ page }).analyze()
//     expect(accessibility.violations).toEqual([])
//   }
// })

// test('keeps focus inside the auth dialog and closes it on escape', async ({
//   page,
// }) => {
//   await page.goto('/login')

//   const emailInput = page.getByLabel('E-mail', { exact: true })
//   await expect(emailInput).toBeVisible()
//   await emailInput.focus()

//   await page.keyboard.press('Tab')
//   await expect(page.getByLabel('Senha', { exact: true })).toBeFocused()

//   await page.keyboard.press('Shift+Tab')
//   await expect(emailInput).toBeFocused()

//   await page.keyboard.press('Escape')
//   await expect(page.getByRole('dialog')).toHaveCount(0)
// })

// test('opens the desktop auth dialog over the route the visitor came from', async ({
//   page,
// }) => {
//   test.skip((page.viewportSize()?.width ?? 0) < 768, 'Desktop modal only')
//   await page.goto('/indisponivel')
//   await page.getByRole('link', { name: 'Entrar' }).click()

//   await expect(page.getByRole('dialog')).toBeVisible()
//   await expect(
//     page.locator('h1').filter({
//       hasText: 'Esta funcionalidade ainda não está disponível.',
//     }),
//   ).toBeVisible()
//   await expect(
//     page.locator('h1').filter({
//       hasText: 'Seja dono do futuro da arte digital',
//     }),
//   ).toHaveCount(0)
// })

// test('does not request an auth session for a visitor without a token', async ({
//   page,
// }) => {
//   await page.evaluate(() =>
//     window.sessionStorage.removeItem('kurio.session.token'),
//   )
//   const sessionRequests: string[] = []
//   page.on('request', (request) => {
//     if (request.url().endsWith('/api/auth/session')) {
//       sessionRequests.push(request.url())
//     }
//   })

//   await page.goto('/')
//   const heroTitle =
//     test.info().project.name === 'chromium-mobile'
//       ? 'Seja dono da cultura digital'
//       : 'Seja dono do futuro da arte digital'
//   await expect(
//     page.getByRole('heading', { name: heroTitle }),
//   ).toBeVisible()
//   expect(sessionRequests).toEqual([])
// })

// test('persists login token, restores the session after reload, and authenticates session request', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page.getByText('Ana Oliveira', { exact: true })).toBeVisible()

//   const token = await page.evaluate(() =>
//     window.sessionStorage.getItem('kurio.session.token'),
//   )
//   expect(token).toContain('mock-token-collector-ana-')

//   const sessionRequest = page.waitForRequest((request) =>
//     request.url().endsWith('/api/auth/session'),
//   )
//   await page.reload()
//   const request = await sessionRequest

//   expect(request.headers().authorization).toBe(`Bearer ${token}`)
//   await expect(page.getByText('Ana Oliveira', { exact: true })).toBeVisible()
// })

// test('clears an expired session token and offers retry feedback', async ({
//   page,
// }) => {
//   await page.addInitScript(() => {
//     window.sessionStorage.setItem(
//       'kurio.session.token',
//       'expired-session-token',
//     )
//   })
//   await page.goto('/?mockScenario=expired-session')
//   await waitForMockControl(page)

//   await expect(page.getByRole('alert')).toContainText(
//     'Sua sessão expirou. Entre novamente para continuar.',
//   )
//   await expect.poll(() =>
//     page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
//   ).toBeNull()
//   await expect(page.getByText('Ana Oliveira', { exact: true })).toHaveCount(0)
// })

// test('guards direct access to private routes and returns there after login', async ({
//   page,
// }) => {
//   await page.goto('/carrinho?item=emerald-ape&quantity=2')

//   await expect(page).toHaveURL(/\/login\?/)
//   await expect(page.getByRole('dialog')).toBeVisible()
//   expect(new URL(page.url()).searchParams.get('redirect')).toBe(
//     '/carrinho?item=emerald-ape&quantity=2',
//   )

//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page).toHaveURL(
//     (url) =>
//       url.pathname === '/carrinho' &&
//       url.searchParams.get('item') === 'emerald-ape' &&
//       url.searchParams.get('quantity') === '2',
//   )
// })

// test('allows authenticated direct access and does not redirect to login', async ({
//   page,
// }) => {
//   await withMockControl(page, (mocks) => mocks.reset('success'))
//   await page.goto('/perfil?tab=profile')

//   await expect(page).toHaveURL(
//     (url) =>
//       url.pathname === '/perfil' &&
//       url.searchParams.get('tab') === 'profile',
//   )
//   await expect(page.getByRole('dialog')).toHaveCount(0)
// })

// test('expired session during a protected route redirects with the context and resumes after login', async ({
//   page,
// }) => {
//   await page.evaluate(() => {
//     window.__KURIO_MOCKS__.reset('expired-session')
//     window.sessionStorage.setItem(
//       'kurio.checkout.draft',
//       JSON.stringify({ collector: { displayName: 'Ana Oliveira' } }),
//     )
//     window.sessionStorage.setItem(
//       'kurio.checkout.idempotency-key',
//       'checkout-attempt-42',
//     )
//   })
//   await page.goto('/pagamento?step=review')

//   await expect(page).toHaveURL(/\/login\?/)
//   const loginUrl = new URL(page.url())
//   expect(loginUrl.searchParams.get('redirect')).toBe('/pagamento?step=review')
//   expect(loginUrl.searchParams.get('reason')).toBe('expired')
//   await expect(page.getByRole('status')).toContainText('Sua sessão expirou.')
//   await expect.poll(() =>
//     page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
//   ).toBeNull()

//   const savedContext = await page.evaluate(() =>
//     window.sessionStorage.getItem('kurio.auth.return-context'),
//   )
//   expect(savedContext).toContain('checkout-attempt-42')
//   await page.evaluate(() => {
//     window.sessionStorage.removeItem('kurio.checkout.draft')
//     window.sessionStorage.removeItem('kurio.checkout.idempotency-key')
//   })

//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page).toHaveURL(
//     (url) =>
//       url.pathname === '/pagamento' &&
//       url.searchParams.get('step') === 'review',
//   )
//   await expect(page).toHaveURL((url) => !url.searchParams.has('redirect'))
//   await expect.poll(() =>
//     page.evaluate(() =>
//       window.sessionStorage.getItem('kurio.checkout.idempotency-key'),
//     ),
//   ).toBe('checkout-attempt-42')
//   await expect.poll(() =>
//     page.evaluate(() =>
//       window.sessionStorage.getItem('kurio.checkout.draft'),
//     ),
//   ).toContain('Ana Oliveira')
// })

// test('session expiry from an Axios-protected request saves checkout state and returns after login', async ({
//   page,
// }) => {
//   await page.goto('/')
//   await withMockControl(page, (mocks) => {
//     mocks.reset('success')
//   })
//   await page.reload()
//   await page.goto('/login?redirect=%2Fpagamento%3Fstep%3Dreview')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
//   await expect(page).toHaveURL(
//     (url) =>
//       url.pathname === '/pagamento' &&
//       url.searchParams.get('step') === 'review',
//   )
//   await page.goto('/pagamento?step=review')
//   await page.evaluate(() => {
//     const draft = JSON.stringify({
//       displayName: 'Ana Oliveira',
//       email: 'ana@kurio.example.test',
//       step: 'review',
//     })
//     window.sessionStorage.setItem('kurio.checkout.draft', draft)
//     window.sessionStorage.setItem(
//       'kurio.checkout.idempotency-key',
//       'pending-order-attempt',
//     )
//   })
//   await expect(
//     page.getByRole('heading', { name: 'Finalizar compra' }),
//   ).toBeVisible()
//   await page.getByLabel('Nome completo').fill('Ana Oliveira')
//   await withMockControl(page, (mocks) => {
//     mocks.reset('expired-session')
//   })
//   await page.evaluate(() => {
//     window.sessionStorage.setItem(
//       'kurio.checkout.draft',
//       JSON.stringify({
//         displayName: 'Ana Oliveira',
//         email: 'ana@kurio.example.test',
//         step: 'review',
//       }),
//     )
//     window.sessionStorage.setItem(
//       'kurio.checkout.idempotency-key',
//       'pending-order-attempt',
//     )
//   })
//   await withMockControl(page, async (mocks) => {
//     await mocks.requestProfile().catch(() => undefined)
//   })
//   await expect(page).toHaveURL(/\/login\?/)
//   const loginUrl = new URL(page.url())
//   expect(loginUrl.searchParams.get('redirect')).toBe('/pagamento?step=review')
//   expect(loginUrl.searchParams.get('reason')).toBe('expired')
//   await expect(page.getByRole('status')).toContainText('Sua sessão expirou.')

//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page).toHaveURL(
//     (url) =>
//       url.pathname === '/pagamento' &&
//       url.searchParams.get('step') === 'review',
//   )
//   await expect.poll(() =>
//     page.evaluate(() =>
//       window.sessionStorage.getItem('kurio.checkout.idempotency-key'),
//     ),
//   ).toBe('pending-order-attempt')
//   await expect.poll(() =>
//     page.evaluate(() =>
//       window.sessionStorage.getItem('kurio.checkout.draft'),
//     ),
//   ).toContain('review')
// })

// test('navigates through the authenticated profile layout and its routes', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page.getByText('Ana Oliveira', { exact: true })).toBeVisible()

//   await page.goto('/perfil')
//   await expect(page).toHaveURL(/\/perfil$/)
//   await expect(page.getByRole('heading', { name: 'Dados do perfil' })).toBeVisible()

//   await page.goto('/carteiras')
//   await expect(page).toHaveURL(/\/carteiras$/)
//   await expect(page.getByRole('heading', { name: 'Carteiras' })).toBeVisible()

//   await page.goto('/favoritos')
//   await expect(page).toHaveURL(/\/favoritos$/)
//   await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
// })

// test('renders the favorites list for authenticated users and prompts guests to login', async ({
//   page,
// }) => {
//   await page.goto('/favoritos')
//   await expect(page).toHaveURL(/\/login\?redirect=%2Ffavoritos/)

//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await page.goto('/favoritos')
//   await expect(page.getByRole('heading', { name: 'Lista de interesse' })).toBeVisible()
//   await expect(page.getByText('Emerald Ape #042', { exact: true })).toBeVisible()

// })

// test('updates wallet settings with validation and saves the primary wallet', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await page.goto('/carteiras')
//   await expect(page.getByRole('heading', { name: 'Carteiras' })).toBeVisible()
//   await expect(page.getByText('MetaMask', { exact: true })).toBeVisible()

//   await page.getByRole('button', { name: 'Editar' }).first().click()
//   await page.getByLabel('Endereço', { exact: true }).fill('0x4444444444444444444444444444444444444444')
//   await page.getByRole('button', { name: 'Salvar carteira', exact: true }).click()

//   await expect(page.getByText('Carteira salva com sucesso.')).toBeVisible()
//   await expect(page.getByText('0x4444444444444444444444444444444444444444', { exact: true })).toBeVisible()
// })

// test('shows wallet validation errors and preserves profile changes after refresh', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await page.goto('/perfil')
//   await page.getByLabel('Nome completo').fill('Ana Oliveira Atualizada')
//   await page.getByRole('button', { name: 'Salvar dados' }).click()
//   await expect(page.getByText('Perfil atualizado com sucesso.')).toBeVisible()

//   await page.reload()
//   await expect(
//     page.getByText('Ana Oliveira Atualizada', { exact: true }).first(),
//   ).toBeVisible()

//   await page.goto('/carteiras')
//   await page.getByRole('button', { name: 'Editar' }).first().click()
//   await page.getByLabel('Endereço', { exact: true }).fill('0x1234')
//   await page.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
//   await expect(page.getByRole('alert').first()).toContainText('Invalid ethereum wallet address')
// })

// test('updates profile data and password with validation feedback', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await page.goto('/perfil')
//   await expect(page.getByRole('heading', { name: 'Dados do perfil' })).toBeVisible()

//   await page.getByLabel('Nome completo').fill('Ana Beatriz Oliveira')
//   await page.getByLabel('Usuário').fill('ana.beatriz')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana.beatriz@kurio.example.test')
//   await page.getByLabel('ENS').fill('ana.beatriz.kurio.eth')
//   await page.getByLabel('Apelido da carteira').fill('Pessoal')
//   await page.getByRole('button', { name: 'Salvar dados' }).click()
//   await expect(page.getByText('Perfil atualizado com sucesso.')).toBeVisible()
//   await expect(page.getByText('Ana Beatriz Oliveira', { exact: true })).toBeVisible()

//   await page.locator('input[name="currentPassword"]').fill('KurioDemo!A2026')
//   await page.locator('input[name="newPassword"]').fill('KurioDemo!Nova2026')
//   await page.locator('input[name="confirmPassword"]').fill('KurioDemo!Nova2026')
//   await page.getByRole('button', { name: 'Atualizar senha' }).click()
//   await expect(page.getByText('Senha atualizada com sucesso.')).toBeVisible()

//   await page.locator('input[name="currentPassword"]').fill('senha-incorreta')
//   await page.locator('input[name="newPassword"]').fill('KurioDemo!Nova2027')
//   await page.locator('input[name="confirmPassword"]').fill('KurioDemo!Nova2027')
//   await page.getByRole('button', { name: 'Atualizar senha' }).click()
//   await expect(page.getByText('A senha atual informada está incorreta.')).toBeVisible()
// })

// test('logout calls the API and clears the client session, checkout data, and sockets', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
//   await expect(page.getByText('Ana Oliveira', { exact: true })).toBeVisible()
//   const authenticatedToken = await page.evaluate(() =>
//     window.sessionStorage.getItem('kurio.session.token'),
//   )
//   if (!authenticatedToken) {
//     throw new Error('Expected the login flow to persist Ana’s session token')
//   }

//   await withMockControl(page, async (_mocks, browserWindow) => {
//     const testWindow = browserWindow as Window & {
//       __KURIO_TEST_SOCKET__?: MockSocketForTests & { connected: boolean }
//     }
//     const socket = await _mocks.connectSocketClient()
//     testWindow.__KURIO_TEST_SOCKET__ = socket
//     if (!socket.connected) {
//       await new Promise<void>((resolve) => {
//         socket.once('connect', () => resolve())
//       })
//     }
//   })
//   await page.evaluate(() => {
//     window.sessionStorage.setItem('kurio.checkout.draft', '{"step":"review"}')
//     window.sessionStorage.setItem('kurio.checkout.idempotency-key', 'logout-attempt')
//     window.sessionStorage.setItem('kurio.pending-order-id', 'order-pending')
//   })
//   await expect.poll(() =>
//     page.evaluate(() => window.__KURIO_TEST_SOCKET__?.connected),
//   ).toBe(true)

//   const logoutRequest = page.waitForRequest((request) =>
//     request.url().endsWith('/api/auth/logout'),
//   )
//   await page.getByText('Ana Oliveira', { exact: true }).click()
//   await page.getByRole('button', { name: 'Sair' }).click()
//   await logoutRequest

//   await expect.poll(() =>
//     page.evaluate(() => window.sessionStorage.getItem('kurio.session.token')),
//   ).toBeNull()
//   await expect(
//     page.getByRole('link', { name: 'Entrar', includeHidden: true }),
//   ).toHaveCount(1)
//   await expect(page.getByText('Ana Oliveira', { exact: true })).toHaveCount(0)
//   await expect.poll(() =>
//     page.evaluate(() => window.__KURIO_TEST_SOCKET__?.connected ?? false),
//   ).toBe(false)
//   const privateState = await page.evaluate(() => {
//     return {
//       draft: window.sessionStorage.getItem('kurio.checkout.draft'),
//       idempotencyKey: window.sessionStorage.getItem(
//         'kurio.checkout.idempotency-key',
//       ),
//       pendingOrderId: window.sessionStorage.getItem('kurio.pending-order-id'),
//     }
//   })
//   expect(privateState).toEqual({
//     draft: null,
//     idempotencyKey: null,
//     pendingOrderId: null,
//   })
// })

// test('switching from Ana to Caio removes Ana from the UI and disconnects her socket', async ({
//   page,
// }) => {
//   await page.goto('/login')
//   await page.getByLabel('E-mail', { exact: true }).fill('ana@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!A2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()
//   await expect(page.getByText('Ana Oliveira', { exact: true })).toBeVisible()
//   const authenticatedToken = await page.evaluate(() =>
//     window.sessionStorage.getItem('kurio.session.token'),
//   )
//   if (!authenticatedToken) {
//     throw new Error('Expected the login flow to persist Ana’s session token')
//   }

//   await withMockControl(page, async (_mocks, browserWindow) => {
//     const socket = await _mocks.connectSocketClient()
//     const testWindow = browserWindow as Window & {
//       __KURIO_TEST_SOCKET__?: MockSocketForTests & {
//         connected: boolean
//       }
//     }
//     testWindow.__KURIO_TEST_SOCKET__ = socket
//     await new Promise<void>((resolve) => {
//       socket.once('connect', () => resolve())
//     })
//   })
//   await page.evaluate(() =>
//     window.sessionStorage.setItem('kurio.checkout.draft', '{"user":"ana"}'),
//   )
//   await expect.poll(() =>
//     page.evaluate(() => window.__KURIO_TEST_SOCKET__?.connected),
//   ).toBe(true)

//   await page.evaluate((token) =>
//     window.sessionStorage.setItem('kurio.session.token', token),
//     authenticatedToken,
//   )
//   await page.evaluate(async () => {
//     const routerUrl = new URL('/src/router.tsx', location.origin).href
//     const routerModule = (await import(
//       /* @vite-ignore */ routerUrl
//     )) as { router: { navigate: (options: { to: string }) => Promise<void> } }
//     await routerModule.router.navigate({ to: '/login' })
//   })
//   await page.getByLabel('E-mail', { exact: true }).fill('caio@kurio.example.test')
//   await page.getByLabel('Senha', { exact: true }).fill('KurioDemo!B2026')
//   await page.getByRole('button', { name: 'Entrar', exact: true }).click()

//   await expect(page.getByText('Caio Martins', { exact: true })).toBeVisible()
//   await expect(page.getByText('Ana Oliveira', { exact: true })).toHaveCount(0)
//   await expect.poll(() =>
//     page.evaluate(() => window.__KURIO_TEST_SOCKET__?.connected ?? false),
//   ).toBe(false)
//   const privateState = await page.evaluate(() => {
//     return {
//       draft: window.sessionStorage.getItem('kurio.checkout.draft'),
//     }
//   })
//   expect(privateState).toEqual({ draft: null })

//   const profile = await page.evaluate(async () => {
//     const response = await window.__KURIO_MOCKS__.requestProfile()
//     return response.data
//   })
//   expect(profile).toMatchObject({
//     displayName: 'Caio Martins',
//     email: 'caio@kurio.example.test',
//   })
// })
