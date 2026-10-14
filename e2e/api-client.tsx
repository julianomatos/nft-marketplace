import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { apiClient, API_BASE_URL, API_TIMEOUT_MS } from '@/services/api-client'
import { ApiClientError } from '@/utils/errors'

function ApiClientSmokePage() {
  const [result, setResult] = useState('Aguardando ação.')

  async function makeRequest() {
    try {
      const response = await apiClient.get<unknown>('/client-test')
      setResult(String(JSON.stringify(response.data)))
    } catch (error) {
      setResult(
        error instanceof ApiClientError ? error.code : 'UNEXPECTED_TEST_ERROR',
      )
    }
  }

  async function cancelRequest() {
    const controller = new AbortController()
    const request = apiClient.get<unknown>('/client-test', {
      signal: controller.signal,
    })
    controller.abort()

    try {
      await request
      setResult('REQUEST_UNEXPECTEDLY_SUCCEEDED')
    } catch (error) {
      setResult(
        error instanceof ApiClientError ? error.code : 'UNEXPECTED_TEST_ERROR',
      )
    }
  }

  return (
    <main>
      <h1>Axios client smoke test</h1>
      <p data-testid="api-config">
        {JSON.stringify({ baseURL: API_BASE_URL, timeout: API_TIMEOUT_MS })}
      </p>
      <button onClick={makeRequest} type="button">
        Fazer requisição
      </button>
      <button onClick={cancelRequest} type="button">
        Cancelar requisição
      </button>
      <p aria-live="polite" data-testid="api-result" role="status">
        {result}
      </p>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Axios test root is missing.')

createRoot(root).render(<ApiClientSmokePage />)

export { ApiClientSmokePage }
