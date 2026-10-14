import axios from 'axios'
import {
  apiErrorEnvelopeSchema,
  type ApiErrorEnvelope,
} from '../types/contracts'

const API_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  UNAUTHENTICATED: 'Entre na sua conta para continuar.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente para continuar.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'O conteúdo solicitado não foi encontrado.',
  EMAIL_TAKEN: 'Este e-mail já está cadastrado.',
  COUPON_INVALID: 'Este cupom não é válido.',
  COUPON_EXPIRED: 'Este cupom expirou.',
  AVAILABILITY_CONFLICT: 'A disponibilidade deste item foi alterada.',
  PRICE_CHANGED: 'O preço foi alterado. Revise os valores antes de continuar.',
  IDEMPOTENCY_KEY_REUSED: 'Esta tentativa de compra não pode ser reutilizada.',
  WALLET_KIND_CONFLICT: 'Já existe uma carteira deste tipo.',
  VALIDATION_ERROR: 'Revise os campos destacados e tente novamente.',
  TRANSIENT_FAILURE: 'O serviço está temporariamente indisponível.',
  REQUEST_CANCELLED: 'A solicitação foi cancelada.',
  NETWORK_ERROR: 'Não foi possível conectar ao serviço. Tente novamente.',
  INVALID_ERROR_RESPONSE: 'O serviço retornou uma resposta de erro inválida.',
  UNEXPECTED_ERROR: 'Ocorreu um erro inesperado. Tente novamente.',
}

type ApiClientErrorOptions = {
  code: string
  message?: string
  status?: number
  fieldErrors?: Readonly<Record<string, string[]>>
  details?: unknown
  cause?: unknown
}

class ApiClientError extends Error {
  readonly code: string
  readonly status?: number
  readonly fieldErrors?: Readonly<Record<string, string[]>>
  readonly details?: unknown

  constructor({
    code,
    message,
    status,
    fieldErrors,
    details,
    cause,
  }: ApiClientErrorOptions) {
    super(getUserFacingErrorMessage(code, message), {
      cause,
    })
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

function getUserFacingErrorMessage(code: string, responseMessage?: string) {
  return (
    API_ERROR_MESSAGES[code] ??
    (responseMessage?.trim() || API_ERROR_MESSAGES.UNEXPECTED_ERROR)
  )
}

function normalizeApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error

  if (axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')) {
    return new ApiClientError({
      code: 'REQUEST_CANCELLED',
      cause: error,
    })
  }

  if (!axios.isAxiosError(error)) {
    return new ApiClientError({
      code: 'UNEXPECTED_ERROR',
      cause: error,
    })
  }

  if (!error.response) {
    const isNetworkFailure =
      error.request !== undefined ||
      ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')

    return new ApiClientError({
      code: isNetworkFailure ? 'NETWORK_ERROR' : 'UNEXPECTED_ERROR',
      cause: error,
    })
  }

  const parsedEnvelope = apiErrorEnvelopeSchema.safeParse(error.response.data)
  if (!parsedEnvelope.success) {
    return new ApiClientError({
      code: 'INVALID_ERROR_RESPONSE',
      status: error.response.status,
      cause: error,
    })
  }

  const { error: responseError }: ApiErrorEnvelope = parsedEnvelope.data
  return new ApiClientError({
    code: responseError.code,
    message: responseError.message,
    status: error.response.status,
    fieldErrors: responseError.fieldErrors,
    details: responseError.details,
    cause: error,
  })
}

export {
  ApiClientError,
  apiErrorEnvelopeSchema,
  getUserFacingErrorMessage,
  normalizeApiError,
  type ApiErrorEnvelope,
}
