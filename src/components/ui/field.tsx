import type { ReactNode } from 'react'

type FieldLabelProps = {
  htmlFor: string
  required?: boolean
  className?: string
  children: ReactNode
}

function FieldLabel({
  htmlFor,
  required = false,
  className,
  children,
}: FieldLabelProps) {
  return (
    <label
      className={`mb-1.5 block text-xs font-medium text-foreground ${className ?? ''}`}
      htmlFor={htmlFor}
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-1 text-destructive">
          *
        </span>
      )}
    </label>
  )
}

type FieldErrorProps = {
  id: string
  children?: string
}

function FieldError({ id, children }: FieldErrorProps) {
  if (!children) return null

  return (
    <p className="mt-1.5 text-xs text-destructive" id={id} role="alert">
      {children}
    </p>
  )
}

export { FieldError, FieldLabel }
