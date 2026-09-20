import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Teardrop pin with initials. Green = active, grey = inactive. */
export function PartyPin({ party, selected }) {
  return (
    <span
      className={cn(
        'grid rotate-45 place-items-center rounded-full rounded-br-none border-2 border-white shadow-lift transition-transform',
        party.status === 'ACTIVE' ? 'bg-green-deep' : 'bg-ink-muted',
        selected ? 'size-11 scale-110 bg-black' : 'size-8',
      )}
    >
      <span className="-rotate-45 text-[0.65rem] font-bold text-white">{initialsOf(party.name)}</span>
    </span>
  )
}
