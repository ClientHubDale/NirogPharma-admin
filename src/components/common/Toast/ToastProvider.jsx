import { useCallback, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { Toast as RadixToast } from 'radix-ui'
import { cn } from '@/lib/utils'
import { ToastContext } from './ToastContext'

/**
 * Brief messages in the top-right corner — "Manager created", "User updated".
 * They announce what just happened and get out of the way; anything the user
 * has to act on (a failed page load, a blocked delete) stays on the page as a
 * Notice instead.
 */
const TONES = {
  success: { icon: CheckCircle2, bar: 'bg-green-fresh', text: 'text-green-deep' },
  danger: { icon: XCircle, bar: 'bg-danger', text: 'text-danger' },
  warning: { icon: AlertTriangle, bar: 'bg-warning', text: 'text-warning-ink' },
  info: { icon: Info, bar: 'bg-green-soft', text: 'text-forest' },
}

const DURATION = { success: 3500, info: 3500, warning: 6000, danger: 6000 }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback(({ title, description, tone = 'success' }) => {
    // The key has to be unique even for two identical messages in a row.
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((current) => [...current, { id, title, description, tone }])
    return id
  }, [])

  const dismiss = useCallback((id) => setToasts((current) => current.filter((t) => t.id !== id)), [])

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right">
        {children}

        {toasts.map(({ id, title, description, tone }) => {
          const { icon: Icon, bar, text } = TONES[tone] ?? TONES.success
          return (
            <RadixToast.Root
              key={id}
              // A stable hook for the browser suites — Radix's own attributes
              // differ between the root and the viewport it portals into.
              data-toast={tone}
              duration={DURATION[tone] ?? 3500}
              onOpenChange={(open) => !open && dismiss(id)}
              className={cn(
                'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-mint-pale bg-white py-3 pr-3 pl-4 shadow-lift',
                'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4 data-[state=open]:fade-in-0',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-4',
                'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x) data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0',
              )}
            >
              <span className={cn('absolute inset-y-0 left-0 w-1', bar)} aria-hidden />
              <Icon className={cn('mt-0.5 size-4 shrink-0', text)} aria-hidden />
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-sm font-semibold text-black">{title}</RadixToast.Title>
                {description && (
                  <RadixToast.Description className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    {description}
                  </RadixToast.Description>
                )}
              </div>
              <RadixToast.Close
                aria-label="Dismiss"
                className="grid size-6 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-bg hover:text-black"
              >
                <X className="size-3.5" />
              </RadixToast.Close>
            </RadixToast.Root>
          )
        })}

        {/* Below the top bar so it never covers the account menu. */}
        <RadixToast.Viewport className="pointer-events-none fixed top-20 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2.5 outline-none sm:right-6" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
