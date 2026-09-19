import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Round initials avatar. Colour comes from the caller (e.g. live status). */
export function UserAvatar({ name, className }) {
  return (
    <span
      className={cn('grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold', className)}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  )
}
