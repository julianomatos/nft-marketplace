import { expect, test } from '@playwright/test'

test('uses the configured base URL, timeout, and session token interceptor', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('kurio.session.token', 'smoke-token')
  })
  await page.route('**/api/client-test', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    }),
  )
  await page.goto('/e2e/api-client.html')

  const requestPromise = page.waitForRequest((request) =>
    request.url().endsWith('/api/client-test'),
  )
  await page.getByRole('button', { name: 'Fazer requisição' }).click()
  const request = await requestPromise

  await expect(page.getByTestId('api-config')).toHaveText(
    '{"baseURL":"/api","timeout":15000}',
  )
  await expect(page.getByTestId('api-result')).toHaveText('{"ok":true}')
  expect(request.headers()['authorization']).toBe('Bearer smoke-token')
})

test('passes AbortSignal through Axios and normalizes cancellation', async ({
  page,
}) => {
  await page.goto('/e2e/api-client.html')
  await page.getByRole('button', { name: 'Cancelar requisição' }).click()
  await expect(page.getByTestId('api-result')).toHaveText('REQUEST_CANCELLED')
})
