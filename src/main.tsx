import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './lib/query-client'
import { router } from './router'
import './index.css'

const devtoolsModule = import.meta.env.DEV
  ? import('@tanstack/react-query-devtools')
  : Promise.resolve(null)

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const ready = Promise.all([
    import('./mocks/browser'),
    import('./mocks/control'),
  ]).then(([{ startMocking }]) => startMocking())
  const testWindow = window as Window & {
    __KURIO_MOCKS_READY__?: Promise<void>
    __KURIO_MOCKS_FAILED__?: unknown
    __KURIO_MOCKS_ERROR__?: string
  }
  testWindow.__KURIO_MOCKS_READY__ = ready
  ready.catch((error: unknown) => {
    testWindow.__KURIO_MOCKS_FAILED__ = error
    testWindow.__KURIO_MOCKS_ERROR__ =
      error instanceof Error ? error.message : String(error)
    console.error('Failed to initialize the demo mocks.', error)
  })
}

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const testWindow = window as Window & {
      __KURIO_MOCKS_READY__?: Promise<void>
    }
    await testWindow.__KURIO_MOCKS_READY__
  }

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
