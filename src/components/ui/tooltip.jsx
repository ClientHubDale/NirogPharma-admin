import { Tooltip as RadixTooltip } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Dark label on hover / focus — used by the collapsed sidebar rail. */
export function Tooltip({ label, side = 'right', children }) {
  return (
    <RadixTooltip.Root delayDuration={150}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={8}
          className={cn(
            'z-50 rounded-lg bg-black px-2.5 py-1.5 text-xs font-semibold text-white shadow-lift',
            'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
          )}
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  )
}

export const TooltipProvider = RadixTooltip.Provider
