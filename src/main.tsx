import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { queryClient } from './lib/query-client'
import { router } from './router'
import './index.css'

const mocksModule =
  import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? Promise.all([import('./mocks/browser'), import('./mocks/control')])
    : Promise.resolve(null)
const devtoolsModule = import.meta.env.DEV
  ? import('@tanstack/react-query-devtools')
  : Promise.resolve(null)

declare global {
  interface Window {
    __KURIO_MOCKS__?: {
      reset: (scenario?: string) => unknown
    }
  }
}

async function bootstrap() {
  const mocks = await mocksModule
  if (mocks) {
    const [{ startMocking }] = mocks
    await startMocking()
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
