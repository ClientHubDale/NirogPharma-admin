import { cn } from '@/lib/utils'

/**
 * The cards above the attendance table. They double as filters: the selected
 * one is underlined, as in the reference.
 */
export function StatTabs({ tabs, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tabs.map((tab) => {
        const selected = value === tab.id
        const clickable = Boolean(onChange) && !tab.readOnly
        const Tag = clickable ? 'button' : 'div'
        return (
          <Tag
            key={tab.id}
            {...(clickable && { type: 'button', onClick: () => onChange(selected ? '' : tab.id), 'aria-pressed': selected })}
            className={cn(
              'relative overflow-hidden rounded-2xl border bg-white px-4 py-5 text-center transition-[border-color,box-shadow]',
              selected ? 'border-green-fresh shadow-glow' : 'border-mint-pale',
              clickable && 'hover:border-green-soft focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
            )}
          >
            <p className="font-mono text-3xl font-medium tracking-tight text-black tabular-nums">{tab.value}</p>
            <p className={cn('mt-1 text-sm font-semibold', selected ? 'text-green-deep' : 'text-ink-muted')}>{tab.label}</p>
            {selected && <span className="absolute inset-x-0 bottom-0 h-1 bg-green-deep" />}
          </Tag>
        )
      })}
    </div>
  )
}
