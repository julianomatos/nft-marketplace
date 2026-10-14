import { Outlet, useRouteContext } from '@tanstack/react-router'
import { MobileBottomNavigation } from '@/components/layout/mobile-bottom-navigation'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

function RootLayout() {
  const { session } = useRouteContext({ from: '__root__' })

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased">
      <a
        className="sr-only z-100 bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader session={session} />
      <main id="main-content" className="flex-1 pb-24 md:pb-0">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileBottomNavigation />
    </div>
  )
}

export { RootLayout }
