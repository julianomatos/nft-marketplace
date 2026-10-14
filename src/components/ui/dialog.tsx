import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react'
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
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const generatedId = useId()
  const titleId = `${generatedId}-title`
  const descriptionId = `${generatedId}-description`

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      dialog.showModal()
      getFocusableElements(dialog)[0]?.focus()
    }
    if (!open && dialog.open) {
      dialog.close()
      previouslyFocusedRef.current?.focus()
    }
  }, [open])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onOpenChange(false)
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onOpenChange(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return

    const dialog = event.currentTarget
    const focusable = getFocusableElements(dialog)
    const first = focusable[0]
    const last = focusable.at(-1)

    if (!first || !last) {
      event.preventDefault()
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className={`kurio-dialog ${variant === 'drawer' ? 'kurio-dialog--drawer' : ''}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
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

function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.getAttribute('aria-hidden') !== 'true')
}

type DialogProps = Omit<ModalSurfaceProps, 'variant'>

function Dialog(props: DialogProps) {
  return <ModalSurface {...props} variant="dialog" />
}

export { Dialog, ModalSurface, type DialogProps }
