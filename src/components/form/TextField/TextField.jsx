import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Labelled input with an optional leading `icon`, a text `prefix` (e.g. "+91")
 * shown behind a divider, and a `suffix`
 * (e.g. a show-password button). The outer box owns the border, focus ring
 * and error state; the inner <input> is unstyled so there is only ever one
 * border — shadcn's <Input> draws its own and would double it up.
 */
export function TextField({ id, label, required, labelAction, icon: Icon, prefix, suffix, error, size = 'lg', className, inputClassName, ...inputProps }) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('space-y-2', className)}>
      {(label || labelAction) && (
        <div className="flex items-center justify-between">
          {label && (
            <Label htmlFor={id} className="font-semibold text-ink">
              {label}
              {required && <span className="text-danger">*</span>}
            </Label>
          )}
          {labelAction}
        </div>
      )}

      <div
        className={cn(
          'flex items-center overflow-hidden rounded-lg border bg-white transition-[border-color,box-shadow] has-[input:disabled]:bg-bg has-[input:disabled]:opacity-70',
          size === 'lg' ? 'h-12' : 'h-11',
          error
            ? 'border-destructive focus-within:ring-3 focus-within:ring-destructive/15'
            : 'border-mint focus-within:border-green-fresh focus-within:ring-3 focus-within:ring-ring/25',
        )}
      >
        {prefix && (
          <span className="flex h-full shrink-0 items-center border-r border-mint-pale px-3.5 text-sm font-semibold text-ink-muted">
            {prefix}
          </span>
        )}
        {Icon && <Icon className="ml-3.5 size-4 shrink-0 text-ink-muted" aria-hidden />}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn(
            'h-full w-full min-w-0 bg-transparent px-3.5 text-ink outline-none placeholder:text-ink-muted/70',
            size === 'lg' ? 'text-base' : 'text-sm',
            Icon && 'pl-2.5',
            inputClassName,
          )}
          {...inputProps}
        />
        {suffix}
      </div>

      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
