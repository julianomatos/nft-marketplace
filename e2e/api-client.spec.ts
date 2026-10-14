import { AxiosError, CanceledError } from 'axios'
import { expect, test } from '@playwright/test'
import {
  ApiClientError,
  getUserFacingErrorMessage,
  normalizeApiError,
} from '../src/utils/errors'

test('normalizes API envelopes and maps known error codes', () => {
  const responseError = Object.assign(
    new AxiosError('Validation failed', 'ERR_BAD_REQUEST'),
    {
      response: {
        status: 422,
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid form',
            fieldErrors: { email: 'Invalid email' },
            details: { trace: 'test' },
          },
        },
      },
    },
  )

  const normalized = normalizeApiError(responseError)

  expect(normalized).toBeInstanceOf(ApiClientError)
  expect(normalized).toMatchObject({
    code: 'VALIDATION_ERROR',
    status: 422,
    message: 'Revise os campos destacados e tente novamente.',
    fieldErrors: { email: 'Invalid email' },
    details: { trace: 'test' },
  })
})

test('surfaces malformed, network, cancelled, and unknown failures explicitly', () => {
  const malformedResponse = Object.assign(
    new AxiosError('Request failed', 'ERR_BAD_RESPONSE'),
    { response: { status: 503, data: { message: 'no envelope' } } },
  )
  const networkError = new AxiosError('Network error', 'ERR_NETWORK')
  const clientConfigError = new AxiosError('Invalid option', 'ERR_BAD_OPTION')

  expect(normalizeApiError(malformedResponse)).toMatchObject({
    code: 'INVALID_ERROR_RESPONSE',
    status: 503,
    message: 'O serviço retornou uma resposta de erro inválida.',
  })
  expect(normalizeApiError(networkError)).toMatchObject({
    code: 'NETWORK_ERROR',
    message: 'Não foi possível conectar ao serviço. Tente novamente.',
  })
  expect(normalizeApiError(new CanceledError())).toMatchObject({
    code: 'REQUEST_CANCELLED',
  })
  expect(normalizeApiError(new Error('Unexpected'))).toMatchObject({
    code: 'UNEXPECTED_ERROR',
  })
  expect(normalizeApiError(clientConfigError)).toMatchObject({
    code: 'UNEXPECTED_ERROR',
  })
  expect(getUserFacingErrorMessage('UNKNOWN_API_CODE', '   ')).toBe(
    'Ocorreu um erro inesperado. Tente novamente.',
  )
  expect(getUserFacingErrorMessage('UNKNOWN_API_CODE', 'Server message')).toBe(
    'Server message',
  )
})

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
