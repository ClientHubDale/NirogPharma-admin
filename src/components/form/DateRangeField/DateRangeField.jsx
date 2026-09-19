import { ArrowRight, CalendarDays } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** From → To date pair in one box (YYYY-MM-DD values). */
export function DateRangeField({ id, label, required, start, end, onChange, error, className }) {
  const errorId = error ? `${id}-error` : undefined
  const input = 'h-full min-w-0 flex-1 bg-transparent px-2 font-mono text-sm text-ink outline-none'
  return (
    <div className={className}>
      <Label htmlFor={`${id}-start`} className="mb-2 font-semibold text-ink">
        {label}
        {required && <span className="text-danger">*</span>}
      </Label>
      <div
        className={cn(
          'flex h-11 items-center gap-1 rounded-lg border bg-white px-2 transition-[border-color,box-shadow]',
          error ? 'border-destructive' : 'border-mint focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25',
        )}
      >
        <CalendarDays className="ml-1 size-4 shrink-0 text-green-deep" aria-hidden />
        <input
          id={`${id}-start`}
          type="date"
          aria-label={`${label} from`}
          aria-describedby={errorId}
          value={start}
          max={end || undefined}
          onChange={(e) => onChange({ start: e.target.value, end })}
          className={input}
        />
        <ArrowRight className="size-3.5 shrink-0 text-ink-muted" aria-hidden />
        <input
          id={`${id}-end`}
          type="date"
          aria-label={`${label} to`}
          aria-describedby={errorId}
          value={end}
          min={start || undefined}
          onChange={(e) => onChange({ start, end: e.target.value })}
          className={input}
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
