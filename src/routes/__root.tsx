import { createRootRouteWithContext, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from '@/components/layout/not-found-page'
import { RootLayout } from '@/components/layout/root-layout'
import type { RouterContext } from '@/types/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  errorComponent: ({ reset }) => (
    <main className="mx-auto flex min-h-screen max-w-300 flex-col items-start justify-center px-6 py-16 md:px-12">
      <section aria-live="assertive" className="max-w-xl">
        <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
          KURIO · Erro
        </p>
        <h1 className="text-3xl font-bold text-foreground">Algo deu errado</h1>
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
  ),
  notFoundComponent: NotFoundPage,
})
