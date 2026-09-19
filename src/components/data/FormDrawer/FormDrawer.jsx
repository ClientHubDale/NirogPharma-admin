import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'

/**
 * Right-side drawer for create/edit forms: sticky header with title and
 * Save / Cancel, scrolling body. The body is a <form> so Enter submits.
 */
export function FormDrawer({ open, onOpenChange, title, description, onSubmit, saving, saveLabel = 'Save', children }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Same modifiers as the Sheet's defaults (w-3/4, sm:max-w-sm) so these win.
        className="gap-0 bg-bg p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
        onOpenAutoFocus={(event) => {
          // Start on the first field instead of the Cancel button. Phones keep
          // focus on the panel so the keyboard doesn't pop up immediately.
          event.preventDefault()
          if (window.matchMedia('(min-width: 640px)').matches) {
            event.currentTarget.querySelector('form [data-autofocus], form input:not([type=hidden])')?.focus()
          }
        }}
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
          className="flex h-full min-h-0 flex-col"
        >
          <header className="flex items-center justify-between gap-3 border-b border-mint-pale bg-white px-4 py-3.5 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <SheetTitle className="truncate text-lg font-extrabold text-black sm:text-xl">{title}</SheetTitle>
              {description ? (
                <SheetDescription className="hidden truncate text-xs text-ink-muted sm:block">{description}</SheetDescription>
              ) : (
                <SheetDescription className="sr-only">{title}</SheetDescription>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="lg" className="px-3.5 sm:px-5" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" className="px-3.5 sm:px-5" disabled={saving}>
                {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
                {saveLabel}
              </Button>
            </div>
          </header>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">{children}</div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
