import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function TextAreaField({ id, label, error, className, rows = 3, ...props }) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-2 font-semibold text-ink">
        {label}
      </Label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={cn(
          'w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted/70 transition-[border-color,box-shadow] disabled:resize-none disabled:bg-bg disabled:text-ink-muted',
          error
            ? 'border-destructive focus:ring-3 focus:ring-destructive/15'
            : 'border-mint focus:border-green-fresh focus:ring-3 focus:ring-ring/25',
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
