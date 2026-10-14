import { Button } from './button'

type ErrorStateProps = {
  title: string
  description: string
  onRetry: () => void
  retrying?: boolean
}

function ErrorState({
  title,
  description,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <section className="border border-destructive bg-card px-6 py-8">
      <div aria-live="assertive" className="max-w-xl" role="alert">
        <h2 className="text-lg font-bold text-destructive">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <Button
        className="mt-5"
        loading={retrying}
        loadingLabel="Tentando novamente"
        onClick={onRetry}
        type="button"
        variant="outline"
      >
        Tentar novamente
      </Button>
    </section>
  )
}

export { ErrorState, type ErrorStateProps }
