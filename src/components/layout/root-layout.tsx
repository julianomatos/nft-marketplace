import {
  Outlet,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-navigation'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { HomeIntro } from '@/components/home/home-intro'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { queryClient } from '@/lib/query-client'
import { SESSION_EXPIRED_EVENT, setSessionToken } from '@/services/api-client'
import { saveAuthReturnContext } from '@/utils/auth-return-context'
import type { RouterSession } from '@/types/router'

function AuthBackground({ pathname }: { pathname: string }) {
  if (pathname === '/indisponivel') {
    return (
      <section className="kurio-container py-8 md:py-12">
        <div className="flex min-h-88 flex-col items-start justify-center border-y border-border py-12">
          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
            KURIO · Aviso
          </p>
          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Esta funcionalidade ainda não está disponível.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Nenhuma ação foi realizada. Volte ao início para continuar explorando
            a demonstração.
          </p>
        </div>
      </section>
    )
  }

  return <HomeIntro background />
}

function RootLayout() {
  const router = useRouter()
  const sessionQuery = useSession()
  const handledSessionExpiry = useRef(false)
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  const [backgroundPath, setBackgroundPath] = useState(
    isAuthRoute ? '/' : pathname,
  )
  const session = useMemo<RouterSession>(() => {
    const data = sessionQuery.data
    return data?.authenticated
      ? {
          status: 'authenticated',
          userId: data.user.id,
          displayName: data.user.displayName,
        }
      : { status: 'guest' }
  }, [sessionQuery.data])

  useEffect(
    () =>
      router.subscribe('onResolved', () => {
        const resolvedPath = router.state.location.pathname
        if (resolvedPath !== '/login' && resolvedPath !== '/signup') {
          setBackgroundPath(resolvedPath)
        }
      }),
    [router],
  )

  useEffect(() => {
    const currentSession = router.options.context.session
    if (
      currentSession.status === session.status &&
      (currentSession.status === 'guest' ||
        (session.status === 'authenticated' &&
          currentSession.userId === session.userId &&
          currentSession.displayName === session.displayName))
    ) {
      return
    }

    router.update({ context: { session } })
    void router.invalidate()
  }, [router, session])

  useEffect(() => {
    if (session.status === 'authenticated') {
      handledSessionExpiry.current = false
    }
  }, [session.status])

  useEffect(() => {
    function handleSessionExpired() {
      if (handledSessionExpiry.current) return
      handledSessionExpiry.current = true
      const currentLocation = router.state.location
      const returnTarget = saveAuthReturnContext(currentLocation.href)
      queryClient.clear()
      setSessionToken(null)
      router.update({ context: { session: { status: 'guest' } } })
      void router.navigate({
        to: '/login',
        search: {
          redirect: returnTarget ?? undefined,
          reason: 'expired',
        },
      })
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [router])

  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 text-foreground antialiased md:pb-0">
      <a
        className="sr-only z-100 bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader session={session} />
      <main id="main-content" className="flex-1">
        {sessionQuery.isError && (
          <div
            aria-live="assertive"
            className="kurio-container flex items-center justify-between gap-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <span>
              {sessionQuery.error instanceof Error
                ? sessionQuery.error.message
                : 'Não foi possível recuperar sua sessão.'}
            </span>
            <Button
              onClick={() => void sessionQuery.refetch()}
              size="sm"
              type="button"
              variant="outline"
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {isAuthRoute && (
          <div
            aria-hidden="true"
            className="pointer-events-none hidden md:block"
            inert
          >
            <AuthBackground pathname={backgroundPath} />
          </div>
        )}
        <Outlet />
      </main>
      <SiteFooter />
      <MobileBottomNavigation />
    </div>
  )
}

export { RootLayout }
