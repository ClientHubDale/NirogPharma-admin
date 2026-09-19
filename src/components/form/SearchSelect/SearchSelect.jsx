import { useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Searchable single-select (the "Select Status" / "Select Warehouse" control).
 * options: [{ value, label, hint? }] — hint is a muted second line (code, price…). Keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 */
export function SearchSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select',
  searchable = true,
  clearable = false,
  invalid = false,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const listRef = useRef(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q)) : options
  }, [options, query])

  const choose = (option) => {
    onChange(option.value)
    setOpen(false)
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (filtered[highlight]) choose(filtered[highlight])
    }
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery('')
          setHighlight(Math.max(0, options.findIndex((o) => o.value === value)))
        }
      }}
    >
      <div className={cn('relative', className)}>
        <Popover.Trigger
          id={id}
          type="button"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-lg border bg-white px-3.5 text-left text-sm transition-[border-color,box-shadow] outline-none',
            invalid
              ? 'border-destructive focus-visible:ring-3 focus-visible:ring-destructive/15'
              : 'border-mint focus-visible:border-green-fresh focus-visible:ring-3 focus-visible:ring-ring/25',
            open && !invalid && 'border-green-fresh ring-3 ring-ring/25',
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', selected ? 'text-ink' : 'text-ink-muted/70')}>
            {selected?.label ?? placeholder}
          </span>
          {!(clearable && selected) && (
            <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
          )}
        </Popover.Trigger>
        {clearable && selected && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear selection"
            className="absolute top-1/2 right-2.5 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-muted hover:bg-bg hover:text-black"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => {
            if (!searchable) {
              e.preventDefault()
              listRef.current?.focus()
            }
          }}
          onKeyDown={onKeyDown}
          className="z-50 w-(--radix-popover-trigger-width) min-w-48 overflow-hidden rounded-xl border border-mint-pale bg-white shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          {searchable && (
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
                aria-activedescendant={filtered[highlight] ? `${listId}-${highlight}` : undefined}
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-muted/70"
              />
            </label>
          )}
          <ul ref={listRef} id={listId} role="listbox" tabIndex={-1} className="max-h-64 overflow-y-auto p-1.5 outline-none">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-ink-muted">No matches</li>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value
                return (
                  <li
                    key={option.value}
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(option)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm',
                      index === highlight && 'bg-mint-pale',
                      isSelected ? 'font-semibold text-black' : 'text-ink',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{option.label}</span>
                      {option.hint && <span className="block truncate text-xs font-normal text-ink-muted">{option.hint}</span>}
                    </span>
                    {isSelected && <Check className="size-4 shrink-0 text-green-deep" />}
                  </li>
                )
              })
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
