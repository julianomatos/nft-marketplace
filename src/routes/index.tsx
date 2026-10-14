import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: () => (
    <section
      id="catalog"
      className="mx-auto flex min-h-96 max-w-300 flex-col items-start justify-center px-6 py-16 md:px-12"
    >
      <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
        KURIO · Cultura digital
      </p>
      <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
        O marketplace está em construção.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
        A experiência de explorar coleções e NFTs será construída nas próximas
        etapas.
      </p>
      <Button asChild className="mt-8" size="lg">
        <Link to="/indisponivel">Conheça as áreas em desenvolvimento</Link>
      </Button>
    </section>
  ),
})
