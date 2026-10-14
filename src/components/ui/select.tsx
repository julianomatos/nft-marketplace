import { useId, type ComponentProps, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FieldError, FieldLabel } from './field'

type SelectProps = Omit<ComponentProps<'select'>, 'id'> & {
  id?: string
  label: ReactNode
  error?: string
  containerClassName?: string
  labelClassName?: string
}

function Select({
  id: providedId,
  label,
  error,
  containerClassName,
  labelClassName,
  className,
  children,
  ...props
}: SelectProps) {
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
      <div className="relative">
        <select
          {...props}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : props['aria-invalid']}
          className={cn(
            'min-h-10 w-full appearance-none border border-input bg-background py-2 pl-3 pr-10 text-sm text-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          id={id}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
          size={16}
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
}

export { Select, type SelectProps }
