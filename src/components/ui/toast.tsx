import { X } from 'lucide-react'
import { Button } from './button'

type ToastVariant = 'success' | 'info' | 'error'

type ToastProps = {
  open: boolean
  message: string
  variant?: ToastVariant
  onDismiss?: () => void
}

function Toast({
  open,
  message,
  variant = 'info',
  onDismiss,
}: ToastProps) {
  if (!open) return null
  if (!message.trim()) throw new Error('An open toast requires a message.')

  const isError = variant === 'error'
  const role = isError ? 'alert' : 'status'

  return (
    <div
      aria-live={isError ? 'assertive' : 'polite'}
      className={`flex items-center justify-between gap-4 border bg-card px-4 py-3 text-sm shadow-lg ${
        isError
          ? 'border-destructive text-destructive'
          : 'border-primary text-foreground'
      }`}
      data-variant={variant}
      role={role}
    >
      <p>{message}</p>
      {onDismiss && (
        <Button
          aria-label="Fechar aviso"
          onClick={onDismiss}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" size={14} />
        </Button>
      )}
    </div>
  )
}

export { Toast, type ToastProps, type ToastVariant }
