import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Round avatar: the person's photo when one was uploaded, else their initials.
 * Colour comes from the caller (e.g. live status).
 */
export function UserAvatar({ name, photo, className, onOpen }) {
  if (photo) {
    const image = <img src={photo} alt={onOpen ? name : ''} className={cn('size-11 shrink-0 rounded-full object-cover', className)} />
    // Given a way to open it, the photo becomes a button — the same gesture as
    // the product photo on Stocks: click it to see it properly.
    return onOpen ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        title={`See ${name} larger`}
        className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {image}
      </button>
    ) : (
      image
    )
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
