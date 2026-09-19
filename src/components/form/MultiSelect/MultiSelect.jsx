import { useId, useMemo, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Searchable multi-select with removable chips (e.g. "Product Set").
 * options: [{ value, label, hint? }]; value: string[].
 */
export function MultiSelect({ id, label, required, value, onChange, options, placeholder = 'Search to add', error, className }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const listId = useId()
  const errorId = error ? `${id}-error` : undefined

  const selected = value.map((v) => options.find((o) => o.value === v)).filter(Boolean)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options
  }, [options, query])

  const toggle = (option) =>
    onChange(value.includes(option.value) ? value.filter((v) => v !== option.value) : [...value, option.value])

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="mb-2 font-semibold text-ink">
          {label}
          {required && <span className="text-danger">*</span>}
        </Label>
      )}
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) {
            setQuery('')
            setHighlight(0)
          }
        }}
      >
        <Popover.Trigger
          id={id}
          type="button"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          className={cn(
            'flex min-h-11 w-full items-center gap-2 rounded-lg border bg-white px-2.5 py-1.5 text-left text-sm outline-none transition-[border-color,box-shadow]',
            error ? 'border-destructive' : 'border-mint focus-visible:border-green-fresh focus-visible:ring-3 focus-visible:ring-ring/25',
            open && !error && 'border-green-fresh ring-3 ring-ring/25',
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selected.length === 0 && <span className="px-1 text-ink-muted/70">{placeholder}</span>}
            {selected.map((option) => (
              <span key={option.value} className="inline-flex max-w-full items-center gap-1 rounded-md bg-mint-pale py-1 pr-1 pl-2 text-xs font-semibold text-forest">
                <span className="truncate">{option.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option.label}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(option)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      toggle(option)
                    }
                  }}
                  className="grid size-4 place-items-center rounded hover:bg-mint"
                >
                  <X className="size-3" />
                </span>
              </span>
            ))}
          </span>
          <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlight((h) => Math.min(h + 1, filtered.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlight((h) => Math.max(h - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[highlight]) toggle(filtered[highlight])
              }
            }}
            className="z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-xl border border-mint-pale bg-white shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <label className="flex items-center gap-2 border-b border-mint-pale px-3">
              <Search className="size-4 text-ink-muted" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setHighlight(0)
                }}
                placeholder="Search…"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-muted/70"
              />
              {value.length > 0 && <span className="shrink-0 text-xs text-ink-muted">{value.length} selected</span>}
            </label>
            <ul id={listId} role="listbox" aria-multiselectable className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-ink-muted">No matches</li>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => toggle(option)}
                      className={cn('flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm', index === highlight && 'bg-mint-pale')}
                    >
                      <span className={cn('grid size-4 shrink-0 place-items-center rounded border', isSelected ? 'border-green-deep bg-green-deep text-white' : 'border-mint bg-white')}>
                        {isSelected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{option.label}</span>
                        {option.hint && <span className="block truncate text-xs text-ink-muted">{option.hint}</span>}
                      </span>
                    </li>
                  )
                })
              )}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
