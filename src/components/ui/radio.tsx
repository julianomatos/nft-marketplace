import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FieldError, FieldLabel } from './field'

type RadioProps = Omit<ComponentProps<'input'>, 'id' | 'type'> & {
  id?: string
  label: ReactNode
  error?: string
  containerClassName?: string
}

function Radio({
  id: providedId,
  label,
  error,
  containerClassName,
  className,
  ...props
}: RadioProps) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const errorId = `${id}-error`
  const describedBy = [props['aria-describedby'], error ? errorId : undefined]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={containerClassName}>
      <div className="flex items-start gap-2">
        <input
          {...props}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : props['aria-invalid']}
          className={cn(
            'mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          id={id}
          type="radio"
        />
        <FieldLabel className="mb-0" htmlFor={id} required={props.required}>
          {label}
        </FieldLabel>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

export { Radio, type RadioProps }
