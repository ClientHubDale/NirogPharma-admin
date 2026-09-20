import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Popover } from 'radix-ui'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

/**
 * "Filters" button → popover with two tabs:
 *  - Filters: the page's extra filters (render prop gets a draft + setter)
 *  - Columns: show/hide table columns
 * Nothing changes until Apply. Shows a count badge of active filters.
 */
export function FiltersPopover({ filters, onApply, renderFilters, columns, visibility, onVisibilityChange }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('filters')
  const [draft, setDraft] = useState(filters)
  const [draftVis, setDraftVis] = useState(visibility)
  const active = Object.values(filters).filter(Boolean).length

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDraft(filters)
          setDraftVis(visibility)
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button variant="outline" size="lg" className="h-11">
          <Filter data-icon="inline-start" /> Filters
          {active > 0 && <span className="ml-1 grid size-5 place-items-center rounded-full bg-black text-[0.7rem] text-white">{active}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-mint-pale bg-white p-5 shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Tabs
            value={tab}
            onValueChange={setTab}
            tabs={[
              { value: 'filters', label: 'Filters', content: <div className="space-y-4">{renderFilters(draft, (k, v) => setDraft((d) => ({ ...d, [k]: v })))}</div> },
              {
                value: 'columns',
                label: 'Columns',
                content: (
                  <ul className="space-y-1">
                    {columns.map((c) => (
                      <li key={c.id}>
                        <label className={cn('flex items-center gap-3 rounded-lg px-2 py-2 text-sm', c.required ? 'text-ink-muted' : 'cursor-pointer text-ink hover:bg-bg')}>
                          <Checkbox
                            checked={draftVis[c.id] !== false}
                            disabled={c.required}
                            onCheckedChange={(v) => setDraftVis((d) => ({ ...d, [c.id]: v === true }))}
                          />
                          {c.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
          <div className="mt-5 flex items-center justify-between border-t border-mint-pale pt-4">
            <button
              type="button"
              className="text-sm font-semibold text-ink-muted hover:text-black"
              onClick={() => {
                // Reset both tabs: every filter cleared, every column back to default.
                setDraft(Object.fromEntries(Object.keys(draft).map((k) => [k, ''])))
                setDraftVis({})
              }}
            >
              Reset
            </button>
            <Button
              size="lg"
              onClick={() => {
                onApply(draft)
                onVisibilityChange(draftVis)
                setOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
