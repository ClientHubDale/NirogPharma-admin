import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Centred dialog with a title bar, scrolling body and optional footer. */
export function Modal({ open, onOpenChange, title, description, footer, children, className }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-mint-pale bg-white shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            className,
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-mint-pale px-5 py-4">
            <div>
              <Dialog.Title className="text-lg font-extrabold text-black">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-xs text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-bg hover:text-black" aria-label="Close">
              <X className="size-4" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-mint-pale bg-bg px-5 py-3.5">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
