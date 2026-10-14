import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

type ModalSurfaceProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  variant: 'dialog' | 'drawer'
}

function ModalSurface({
  open,
  onOpenChange,
  title,
  description,
  children,
  variant,
}: ModalSurfaceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const generatedId = useId()
  const titleId = `${generatedId}-title`
  const descriptionId = `${generatedId}-description`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onOpenChange(false)
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onOpenChange(false)
  }

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className={`kurio-dialog ${variant === 'drawer' ? 'kurio-dialog--drawer' : ''}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      ref={dialogRef}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-lg font-bold text-foreground" id={titleId}>
            {title}
          </h2>
          {description && (
            <p
              className="mt-2 text-sm leading-6 text-muted-foreground"
              id={descriptionId}
            >
              {description}
            </p>
          )}
        </div>
        <Button
          aria-label="Fechar"
          onClick={() => onOpenChange(false)}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" size={16} />
        </Button>
      </header>
      <div className="overflow-y-auto p-6">{children}</div>
    </dialog>
  )
}

type DialogProps = Omit<ModalSurfaceProps, 'variant'>

function Dialog(props: DialogProps) {
  return <ModalSurface {...props} variant="dialog" />
}

export { Dialog, ModalSurface, type DialogProps }
