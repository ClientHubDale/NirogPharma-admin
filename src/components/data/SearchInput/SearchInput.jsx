import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Search box with a black search button (as in the reference). Filters as you
 * type; the × clears. Fully controlled by `value`, so resetting it from the
 * page (e.g. "Clear filters") also clears the box.
 */
export function SearchInput({ value, onChange, placeholder = 'Search', className }) {
  const inputRef = useRef(null)

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        inputRef.current?.blur()
      }}
      className={cn(
        'flex h-11 overflow-hidden rounded-lg border border-mint bg-white transition-[border-color,box-shadow] focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none placeholder:text-ink-muted/70 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className="grid w-9 place-items-center text-ink-muted hover:text-black"
        >
          <X className="size-4" />
        </button>
      )}
      <button type="submit" aria-label="Search" className="grid w-12 shrink-0 place-items-center bg-black text-white hover:bg-black/85">
        <Search className="size-4" />
      </button>
    </form>
  )
}
