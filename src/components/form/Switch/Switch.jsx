import { Switch as RadixSwitch } from 'radix-ui'
import { cn } from '@/lib/utils'

/** On/off toggle with a label to its right. */
export function Switch({ id, checked, onCheckedChange, label, className }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-6 w-11 shrink-0 rounded-full bg-ink-muted/30 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-[state=checked]:bg-green-deep"
      >
        <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[1.375rem]" />
      </RadixSwitch.Root>
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
      )}
    </div>
  )
}
