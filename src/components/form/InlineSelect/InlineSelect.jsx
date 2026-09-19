import { ChevronDown } from 'lucide-react'

/**
 * Compact native select for use inside a TextField's suffix
 * (e.g. "Excl. of Tax / Incl. of Tax", "Amount / %").
 */
export function InlineSelect({ value, onChange, options, 'aria-label': ariaLabel }) {
  return (
    <span className="relative flex h-full shrink-0 items-center border-l border-mint-pale bg-bg">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="h-full cursor-pointer appearance-none bg-transparent pr-8 pl-3 text-sm font-medium text-ink outline-none focus-visible:bg-mint-pale"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-ink-muted" aria-hidden />
    </span>
  )
}
