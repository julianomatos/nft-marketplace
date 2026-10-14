import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { mockScenarioSchema } from './scenario-contract'
import { resetMockState } from './store'

export const worker = setupWorker(...handlers)

export async function startMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return
  }

  const scenarioParam = new URLSearchParams(window.location.search).get('mockScenario')
  if (scenarioParam !== null) {
    const parsedScenario = mockScenarioSchema.safeParse(scenarioParam)
    resetMockState(parsedScenario.success ? parsedScenario.data : undefined)
  }

  await worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
