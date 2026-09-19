import { Label } from '@/components/ui/label'
import { SearchSelect } from '../SearchSelect'

/** Labelled SearchSelect with an optional "+ New"-style action and an error line. */
export function SelectField({ id, label, required, labelAction, error, className, ...selectProps }) {
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label htmlFor={id} className="font-semibold text-ink">
          {label}
          {required && <span className="text-danger">*</span>}
        </Label>
        {labelAction}
      </div>
      <SearchSelect id={id} invalid={Boolean(error)} aria-describedby={errorId} {...selectProps} />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
