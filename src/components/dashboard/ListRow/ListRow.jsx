import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { TONE_CLASSES } from '@/lib/status'

/**
 * Icon tile + title + subtitle, with an optional trailing element.
 * Pass `to` to make the whole row a link (adds a chevron).
 */
export function ListRow({ icon: Icon, tone = 'success', title, subtitle, trailing, to }) {
  const toneClass = TONE_CLASSES[tone]
  const content = (
    <>
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', toneClass.soft)}>
        <Icon className={cn('size-[1.1rem]', toneClass.text)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-black">{title}</p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-ink-muted sm:text-sm">{subtitle}</p>}
      </div>
      {trailing}
      {to && <ChevronRight className="size-4 shrink-0 text-ink-muted" />}
    </>
  )

  const base = 'flex items-center gap-3.5 py-3.5'
  return (
    <li>
      {to ? (
        <Link to={to} className={cn(base, '-mx-2 rounded-lg px-2 transition-colors hover:bg-bg')}>
          {content}
        </Link>
      ) : (
        <div className={base}>{content}</div>
      )}
    </li>
  )
}
