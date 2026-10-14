import {
  createRootRouteWithContext,
  Link,
} from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-navigation'
import { NotFoundPage } from '@/components/layout/not-found-page'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { RootLayout } from '@/components/layout/root-layout'
import { queryClient } from '@/lib/query-client'
import { authSessionQueryOptions } from '@/hooks/use-session'
import { getSessionToken } from '@/services/api-client'
import { ApiClientError } from '@/utils/errors'
import { saveAuthReturnContext } from '@/utils/auth-return-context'
import { isPrivateRoute, requireAuthenticated } from '@/utils/route-guards'
import type { RouterContext } from '@/types/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, location }) => {
    if (!isPrivateRoute(location.pathname)) return

    let session = context.session
    let sessionExpired = false
    if (getSessionToken()) {
      try {
        const result = await queryClient.fetchQuery({
          ...authSessionQueryOptions(),
          staleTime: 0,
        })
        session = result.authenticated
          ? {
              status: 'authenticated',
              userId: result.user.id,
              displayName: result.user.displayName,
            }
          : { status: 'guest' }
      } catch (error) {
        if (
          !(error instanceof ApiClientError) ||
          (error.status !== 401 && error.code !== 'SESSION_EXPIRED')
        ) {
          throw error
        }
        sessionExpired = error.code === 'SESSION_EXPIRED'
        queryClient.clear()
        session = { status: 'guest' }
      }
    }

    if (session.status === 'guest') {
      saveAuthReturnContext(location.href)
    }
    requireAuthenticated({ context: { session }, location, sessionExpired })
  },
  component: RootLayout,
  errorComponent: ({ reset }) => (
    <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground antialiased md:pb-0">
      <a
        className="sr-only z-100 bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader session={{ status: 'guest' }} />
      <main
        className="kurio-container flex flex-1 flex-col items-start justify-center py-16"
        id="main-content"
      >
        <section aria-live="assertive" className="max-w-xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
            KURIO · Erro
          </p>
          <h1 className="text-3xl font-bold text-foreground">
            Algo deu errado
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Não foi possível carregar esta página. Tente novamente ou volte ao
            início.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={reset} type="button">
              Tentar novamente
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
      <MobileBottomNavigation />
    </div>
  ),
  notFoundComponent: NotFoundPage,
})
