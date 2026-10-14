import { createFileRoute, Link } from '@tanstack/react-router'
import { Breadcrumb } from '@/components/layout/breadcrumb'

export const Route = createFileRoute('/indisponivel')({
  component: () => (
    <section className="kurio-container py-8 md:py-12">
      <Breadcrumb
        items={[
          { label: 'Início', to: '/' },
          { label: 'Indisponível nesta demonstração' },
        ]}
      />
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
        <Link
          className="mt-8 inline-flex min-h-10 items-center justify-center rounded-sm bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-highlight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          to="/"
        >
          Voltar ao início
        </Link>
      </div>
    </section>
  ),
})
