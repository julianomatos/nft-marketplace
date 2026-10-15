import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { mockScenarioSchema } from './scenario-contract'
import { createMockSocketHandler } from './socket'
import { resetMockState } from './store'

export let worker: ReturnType<typeof setupWorker> | null = null

function handleUnhandledRequest(request: Request, print: {
  error: () => void
  warning: () => void
}): void {
  const url = new URL(request.url)
  const isSameOrigin = url.origin === window.location.origin
  const isApiRequest = url.pathname.startsWith('/api/')

  if (isSameOrigin && isApiRequest) {
    print.error()
    throw new Error(`No mock handler matched API request: ${url.pathname}`)
  }

  print.warning()
}

export async function startMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return
  }

  const scenarioParam = new URLSearchParams(window.location.search).get('mockScenario')
  if (scenarioParam !== null) {
    const parsedScenario = mockScenarioSchema.safeParse(scenarioParam)
    resetMockState(parsedScenario.success ? parsedScenario.data : undefined)
  }

  const socketHandler = createMockSocketHandler(window.location.origin)
  worker = setupWorker(...handlers, socketHandler)
  await worker.start({
    onUnhandledRequest: handleUnhandledRequest,
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
