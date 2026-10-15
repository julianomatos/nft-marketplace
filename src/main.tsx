import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ReactQueryDevtools as Devtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/query-client'
import { router } from './router'
import { startMocking } from './mocks/browser'
import './mocks/control'
import './index.css'

declare global {
  interface Window {
    __KURIO_MOCKS__?: {
      reset: (scenario?: string) => unknown
    }
  }
}

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    await startMocking()
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV && (
          <Devtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
