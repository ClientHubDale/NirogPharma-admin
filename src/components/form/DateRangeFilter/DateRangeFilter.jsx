import { useState } from 'react'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { Popover } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DATE_PRESETS, presetRange, toDMY } from '@/lib/dateRange'
import { DateRangeField } from '../DateRangeField'

/**
 * Date filter button: "19/09/2026 – 19/09/2026" opening presets
 * (Today … Last Month) and a Custom Range picker.
 * value: { preset, start, end } — onChange gets the same shape.
 */
export function DateRangeFilter({ value, onChange, className }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const [draft, setDraft] = useState({ start: value.start, end: value.end })
  const label = value.start === value.end ? toDMY(value.start) : `${toDMY(value.start)} – ${toDMY(value.end)}`
  const presetLabel = DATE_PRESETS.find((p) => p.value === value.preset)?.label

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setCustom(value.preset === 'custom')
          setDraft({ start: value.start, end: value.end })
        }
      }}
    >
      <Popover.Trigger
        aria-label={`Date range: ${presetLabel}, ${label}`}
        className={cn(
          'flex h-11 w-full items-center gap-2.5 rounded-lg border border-mint bg-white px-3 text-left text-sm outline-none focus-visible:border-green-fresh focus-visible:ring-3 focus-visible:ring-ring/25',
          open && 'border-green-fresh ring-3 ring-ring/25',
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-green-deep" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block text-[0.7rem] font-semibold text-ink-muted">{presetLabel}</span>
          <span className="block truncate font-mono text-xs text-ink">{label}</span>
        </span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 overflow-hidden rounded-xl border border-mint-pale bg-white shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <ul role="listbox" aria-label="Date presets" className="p-1.5">
            {DATE_PRESETS.map((p) => {
              const selected = p.value === 'custom' ? custom : !custom && value.preset === p.value
              return (
                <li key={p.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      if (p.value === 'custom') return setCustom(true)
                      onChange({ preset: p.value, ...presetRange(p.value) })
                      setOpen(false)
                    }}
                    className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-mint-pale', selected ? 'font-semibold text-black' : 'text-ink')}
                  >
                    {p.label}
                    {selected && <Check className="size-4 text-green-deep" />}
                  </button>
                </li>
              )
            })}
          </ul>
          {custom && (
            <div className="space-y-3 border-t border-mint-pale p-3">
              <DateRangeField id="range-custom" label="From – to" start={draft.start} end={draft.end} onChange={setDraft} />
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={!draft.start || !draft.end || draft.end < draft.start}
                onClick={() => {
                  onChange({ preset: 'custom', start: draft.start, end: draft.end })
                  setOpen(false)
                }}
              >
                Apply
              </Button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
