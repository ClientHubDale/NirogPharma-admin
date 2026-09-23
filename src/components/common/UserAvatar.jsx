import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Round avatar: the person's photo when one was uploaded, else their initials.
 * Colour comes from the caller (e.g. live status).
 */
export function UserAvatar({ name, photo, className }) {
  if (photo) {
    return <img src={photo} alt="" className={cn('size-11 shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      className={cn('grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold', className)}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  )
}
