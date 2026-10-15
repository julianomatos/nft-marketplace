import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './lib/query-client'
import { mockBootstrapWindow } from './mocks/globals'
import { router } from './router'
import './index.css'

const devtoolsModule = import.meta.env.DEV
  ? import('@tanstack/react-query-devtools')
  : Promise.resolve(null)

async function waitForRestMocks() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return
  }

  const restReady = mockBootstrapWindow().__KURIO_MOCKS_REST_READY__
  if (restReady) {
    await restReady
    return
  }

  const { startMocking } = await import('./mocks/browser')
  await startMocking()
}

async function bootstrap() {
  await waitForRestMocks()

  const devtools = await devtoolsModule
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {devtools && <devtools.ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
