import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** White bordered pill with a black tag, as above the template's hero headline. */
export function AnnouncementPill({ tag = 'New', href, children, className }) {
  const Comp = href ? 'a' : 'span'
  return (
    <Comp
      href={href}
      className={cn(
        'inline-flex items-center gap-2.5 rounded-md border border-mint-pale bg-white p-1 pr-3 text-sm font-medium text-ink shadow-sm transition-colors',
        href && 'hover:border-mint',
        className,
      )}
    >
      <span className="rounded-[4px] bg-black px-2.5 py-1 text-xs font-semibold text-white">{tag}</span>
      <span>{children}</span>
      <ArrowRight className="size-3.5" />
    </Comp>
  )
}
