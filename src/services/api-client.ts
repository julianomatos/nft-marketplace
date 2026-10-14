import axios from 'axios'
import { normalizeApiError } from '@/utils/errors'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const API_TIMEOUT_MS = 15_000
const SESSION_TOKEN_STORAGE_KEY = 'kurio.session.token'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
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
  SESSION_TOKEN_STORAGE_KEY,
  apiClient,
}
