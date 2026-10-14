import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

function NotFoundPage() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="kurio-container flex min-h-88 flex-col items-start justify-center py-12"
    >
      <p className="mb-4 text-sm font-bold uppercase tracking-wide text-highlight">
        KURIO · 404
      </p>
      <h1
        className="text-3xl font-bold leading-tight text-foreground sm:text-4xl"
        id="not-found-title"
      >
        Página não encontrada.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
        O endereço pode estar incorreto ou esta página não existe.
      </p>
      <Button asChild className="mt-8">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}

export { NotFoundPage }
