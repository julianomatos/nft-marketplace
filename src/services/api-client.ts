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
const SESSION_EXPIRED_EVENT = 'kurio:session-expired'
const SESSION_CHANGED_EVENT = 'kurio:session-changed'
const SESSION_EXPIRY_RETURN_TARGET_KEY = 'kurio.session.expiry-return-target'

function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY)
}

function setSessionToken(token: string | null): void {
  if (typeof window === 'undefined') return
  const previousToken = getSessionToken()
  if (token) {
    window.sessionStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token)
  } else {
    window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY)
  }
  if (previousToken !== token) {
    notifySessionChanged()
  }
}

function notifySessionChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHANGED_EVENT))
  }
}

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

  const token = getSessionToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalizedError = normalizeApiError(error)
    const requestUrl = axios.isAxiosError(error) ? error.config?.url : undefined
    const isSessionLookup = requestUrl?.includes(API_ENDPOINTS.auth.session)
    const isLogout = requestUrl?.includes(API_ENDPOINTS.auth.logout)

    if (
      normalizedError.code === 'SESSION_EXPIRED' &&
      !isSessionLookup &&
      !isLogout
    ) {
      if (typeof window !== 'undefined') {
        const storedAuthReturnContext = window.sessionStorage.getItem(
          'kurio.auth.return-context',
        )
        let storedRedirect = ''
        if (storedAuthReturnContext) {
          try {
            const parsedContext = JSON.parse(storedAuthReturnContext) as {
              redirect?: unknown
            }
            if (typeof parsedContext.redirect === 'string') {
              storedRedirect = parsedContext.redirect
            }
          } catch {
            storedRedirect = ''
          }
        }
        const currentPath =
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        window.sessionStorage.setItem(
          SESSION_EXPIRY_RETURN_TARGET_KEY,
          currentPath === '/login' || currentPath.startsWith('/login?')
            ? storedRedirect
            : currentPath,
        )
      }
      setSessionToken(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
      }
    }

    return Promise.reject(normalizedError)
  },
)

export {
  API_BASE_URL,
  API_TIMEOUT_MS,
  API_ENDPOINTS,
  API_ERROR_STATUS,
  IDEMPOTENCY_KEY_HEADER,
  SESSION_EXPIRED_EVENT,
  SESSION_CHANGED_EVENT,
  SESSION_EXPIRY_RETURN_TARGET_KEY,
  SESSION_TOKEN_STORAGE_KEY,
  getSessionToken,
  notifySessionChanged,
  setSessionToken,
  apiClient,
}
