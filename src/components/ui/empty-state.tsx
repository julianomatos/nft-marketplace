type EmptyStateProps = {
  title: string
  description: string
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section
      className="border border-border bg-card px-6 py-8 text-center"
      role="status"
    >
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </section>
  )
}

export { EmptyState, type EmptyStateProps }
