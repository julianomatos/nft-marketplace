import axios from 'axios'
import { normalizeApiError } from '@/utils/errors'
import {
  API_BASE_PATH,
  API_ENDPOINTS,
  API_ERROR_STATUS,
  IDEMPOTENCY_KEY_HEADER,
} from '@/types/endpoints'
import { serializeNftApiParams } from '@/utils/search-params'

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  API_BASE_PATH
const API_TIMEOUT_MS = 15_000
const SESSION_TOKEN_STORAGE_KEY = 'kurio.session.token'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  paramsSerializer: {
    serialize: serializeNftApiParams,
  },
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  const token = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
  if (token) config.headers.set('Authorization', `Bearer ${token}`)

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
)

export {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_ENDPOINTS,
  API_ERROR_STATUS,
  IDEMPOTENCY_KEY_HEADER,
  SESSION_TOKEN_STORAGE_KEY,
  apiClient,
}
