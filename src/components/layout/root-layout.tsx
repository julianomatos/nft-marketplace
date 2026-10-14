import {
  Outlet,
  useRouteContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-navigation'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { HomeIntro } from '@/components/home/home-intro'

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
  const { session } = useRouteContext({ from: '__root__' })
  const router = useRouter()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isAuthRoute = pathname === '/login' || pathname === '/signup'
  const [backgroundPath, setBackgroundPath] = useState(
    isAuthRoute ? '/' : pathname,
  )

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
