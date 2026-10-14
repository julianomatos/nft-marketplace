import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-highlight",
        primary: "bg-primary text-primary-foreground hover:bg-highlight",
        outline:
          "border-border bg-transparent text-foreground hover:border-primary hover:bg-surface-raised",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-raised",
        ghost: "text-foreground hover:bg-surface-raised",
        destructive: "bg-destructive text-primary-foreground hover:opacity-80",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-9 gap-2 px-4",
        xs: "min-h-6 gap-1 px-2 text-xs",
        sm: "min-h-8 gap-1.5 px-3 text-xs",
        lg: "min-h-11 gap-2 px-5",
        icon: "size-9",
        "icon-xs":
          "size-6 px-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 px-0",
        "icon-lg": "size-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  loadingLabel = 'Carregando',
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingLabel?: string
  }) {
  if (asChild && (loading || props.disabled)) {
    throw new Error('Disabled and loading Buttons must render a native button.')
  }

  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      {...props}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      aria-disabled={loading || props.disabled || undefined}
      aria-label={loading ? loadingLabel : props['aria-label']}
      disabled={asChild ? undefined : loading || props.disabled}
      className={cn(buttonVariants({ variant, size, className }))}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <LoaderCircle
              aria-hidden="true"
              className="animate-spin"
              size={16}
            />
          )}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button }
