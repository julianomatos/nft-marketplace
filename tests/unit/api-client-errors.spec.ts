import { AxiosError, CanceledError } from 'axios'
import { expect, test } from '@playwright/test'
import {
  ApiClientError,
  getUserFacingErrorMessage,
  normalizeApiError,
} from '../../src/utils/errors'

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
            fieldErrors: { email: ['Invalid email'] },
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
    fieldErrors: { email: ['Invalid email'] },
    details: { trace: 'test' },
  })
})

test('maps authentication, coupon, and unknown error messages', () => {
  expect(getUserFacingErrorMessage('INVALID_CREDENTIALS')).toBe(
    'E-mail ou senha incorretos.',
  )
  expect(getUserFacingErrorMessage('COUPON_INVALID')).toBe(
    'Este cupom não é válido.',
  )
  expect(getUserFacingErrorMessage('COUPON_EXPIRED')).toBe(
    'Este cupom expirou.',
  )
  expect(getUserFacingErrorMessage('UNKNOWN_API_CODE', '   ')).toBe(
    'Ocorreu um erro inesperado. Tente novamente.',
  )
  expect(getUserFacingErrorMessage('UNKNOWN_API_CODE', 'Server message')).toBe(
    'Server message',
  )
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
})
