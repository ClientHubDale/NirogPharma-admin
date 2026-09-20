import { BadgeCheck, Navigation, Pencil, Phone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { googleMapsUrl } from '@/lib/geo'
import { balanceLabel } from '../../partyModel'

export function PartyInfoCard({ party: c, place, onEdit, onClose }) {
  const b = balanceLabel(c)
  return (
    <div className="w-72 rounded-xl bg-white p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-bold text-black">
            <span className="truncate">{c.name}</span>
            {c.verified && <BadgeCheck className="size-4 shrink-0 text-green-deep" />}
          </p>
          <p className="text-xs text-ink-muted">
            ID {c.id}
            {place.city ? ` · ${place.city}, ${place.route}` : ''}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-ink-muted hover:text-black">
          <X className="size-4" />
        </button>
      </div>
      {c.billingAddress && <p className="mt-2 text-sm text-ink">{c.billingAddress}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-mint-pale pt-3 text-sm">
        <span className="text-ink-muted">Balance</span>
        <span className="font-mono font-medium text-black">
          {b.amount} <span className="font-sans text-xs text-ink-muted">{b.note}</span>
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button type="button" size="sm" className="h-9" onClick={() => onEdit(c)}>
          <Pencil /> Edit
        </Button>
        <Button asChild size="sm" variant="outline" className="h-9">
          <a href={c.mobile ? `tel:+91${c.mobile}` : undefined} aria-disabled={!c.mobile}>
            <Phone /> Call
          </a>
        </Button>
        <Button asChild size="sm" variant="outline" className="h-9">
          <a href={googleMapsUrl(c.lat, c.lng)} target="_blank" rel="noreferrer">
            <Navigation /> Go
          </a>
        </Button>
      </div>
    </div>
  )
}
