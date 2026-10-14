import { createFileRoute, Link } from '@tanstack/react-router'

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
      <Link
        className="mt-8 inline-flex min-h-10 items-center justify-center gap-2 rounded-sm bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        to="/indisponivel"
      >
        Conheça as áreas em desenvolvimento
      </Link>
    </section>
  ),
})
