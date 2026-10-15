import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { mockScenarioSchema } from './scenario-contract'
import { resetMockState } from './store'

export let worker: ReturnType<typeof setupWorker> | null = null

let startPromise: Promise<void> | null = null
let socketAttachPromise: Promise<void> | null = null

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

async function startMockingOnce() {
  const scenarioParam = new URLSearchParams(window.location.search).get('mockScenario')
  if (scenarioParam !== null) {
    const parsedScenario = mockScenarioSchema.safeParse(scenarioParam)
    resetMockState(parsedScenario.success ? parsedScenario.data : undefined)
  }

  worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: handleUnhandledRequest,
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}

export function startMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return Promise.resolve()
  }

  if (!startPromise) {
    startPromise = startMockingOnce()
  }

  return startPromise
}

export function attachSocketMock() {
  if (socketAttachPromise) {
    return socketAttachPromise
  }


  socketAttachPromise = (async () => {
    await startMocking()
    if (!worker) {
      throw new Error('Mock worker is not started')
    }
    const { createMockSocketHandler } = await import('./socket')
    worker.use(createMockSocketHandler(window.location.origin))
  })()

  return socketAttachPromise
}
