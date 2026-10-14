import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FieldError, FieldLabel } from './field'

type InputProps = Omit<ComponentProps<'input'>, 'id'> & {
  id?: string
  label: ReactNode
  error?: string
  containerClassName?: string
  labelClassName?: string
}

function Input({
  id: providedId,
  label,
  error,
  containerClassName,
  labelClassName,
  className,
  ...props
}: InputProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const errorId = `${id}-error`
  const describedBy = [props['aria-describedby'], error ? errorId : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClassName}>
      <FieldLabel
        className={labelClassName}
        htmlFor={id}
        required={props.required}
      >
        {label}
      </FieldLabel>
      <input
        {...props}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : props['aria-invalid']}
        className={cn(
          'min-h-10 w-full border border-input bg-background px-3 text-sm text-foreground placeholder:text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        id={id}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

export { Input, type InputProps }
