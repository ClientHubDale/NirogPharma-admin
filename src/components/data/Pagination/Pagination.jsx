import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** "1 - 10 of 22" with previous/next buttons. */
export function Pagination({ pageIndex, pageSize, total, onPageChange, className }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(total, (pageIndex + 1) * pageSize)

  const button = 'grid size-11 place-items-center text-ink transition-colors hover:bg-bg disabled:pointer-events-none disabled:opacity-35'

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <p className="text-sm whitespace-nowrap text-ink" aria-live="polite">
        <span className="font-mono">
          {from} - {to}
        </span>{' '}
        of <span className="font-mono">{total}</span>
      </p>
      <div className="flex overflow-hidden rounded-lg border border-mint bg-white">
        <button
          type="button"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex === 0}
          aria-label="Previous page"
          className={button}
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= pageCount - 1}
          aria-label="Next page"
          className={cn(button, 'border-l border-mint')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
