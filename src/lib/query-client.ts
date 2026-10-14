import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'

const queryStaleTimes = {
  catalog: 30_000,
  cart: 0,
  quote: 0,
  orders: 0,
  account: 60_000,
  session: Number.POSITIVE_INFINITY,
} as const

const MAX_QUERY_RETRIES = 2
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 30_000

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES || !axios.isAxiosError(error)) {
    return false
  }
  if (axios.isCancel(error) || error.code === 'ERR_CANCELED') return false
  if (error.response) {
    return error.response.status >= 500 && error.response.status < 600
  }

  return (
    error.request !== undefined ||
    ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT'].includes(error.code ?? '')
  )
}

function queryRetryDelay(attemptIndex: number): number {
  return Math.min(
    RETRY_BASE_DELAY_MS * 2 ** attemptIndex,
    RETRY_MAX_DELAY_MS,
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: queryStaleTimes.cart,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
    },
    mutations: {
      retry: false,
    },
  },
})

export {
  MAX_QUERY_RETRIES,
  queryClient,
  queryRetryDelay,
  queryStaleTimes,
  shouldRetryQuery,
}
