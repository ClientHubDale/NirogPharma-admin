import { Tabs as RadixTabs } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Underlined tabs. tabs: [{ value, label, content }].
 * Keyboard (← →) and ARIA come from Radix.
 */
export function Tabs({ value, onValueChange, tabs, className }) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="flex gap-6 overflow-x-auto border-b border-mint-pale">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="-mb-px shrink-0 border-b-2 border-transparent pb-3 text-[0.95rem] font-semibold whitespace-nowrap text-ink-muted outline-none hover:text-black focus-visible:text-black data-[state=active]:border-black data-[state=active]:text-black"
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content key={tab.value} value={tab.value} className={cn('pt-5 outline-none')}>
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  )
}
