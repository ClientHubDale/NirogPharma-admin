import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react'
import { ImageLightbox } from '@/components/common/ImageLightbox'
import { googleMapsUrl } from '@/lib/geo'
import { cn } from '@/lib/utils'
import { formatWorkedHours } from '../../attendanceModel'

const EMPTY = <span className="text-ink-muted">-- : --</span>
export const Dash = () => <span className="text-ink-muted">--</span>

/** Check in / out: arrow, time and a pin that opens the spot in Google Maps. */
export function TimeCell({ time, lat, lng, direction }) {
  if (!time) return EMPTY
  const In = direction === 'in'
  const Icon = In ? ArrowDownRight : ArrowUpRight
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <Icon className={cn('size-4', In ? 'text-green-fresh' : 'text-danger')} />
      <span className="font-mono text-sm text-black">{time}</span>
      {lat != null && (
        <a
          href={googleMapsUrl(lat, lng)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Open the ${In ? 'check-in' : 'check-out'} location in Google Maps`}
          className="text-green-deep hover:text-forest"
        >
          <MapPin className="size-4" />
        </a>
      )}
    </span>
  )
}

/** Worked hours, red when short of the office window. */
export function WorkedCell({ minutes, partial }) {
  if (minutes == null) return EMPTY
  return <span className={cn('font-mono text-sm whitespace-nowrap', partial ? 'text-danger' : 'text-green-deep')}>{formatWorkedHours(minutes)}</span>
}

/** Check-in photos as thumbnails; clicking opens the lightbox. */
export function ImagesCell({ images, title }) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  if (!images?.length) return <Dash />
  return (
    <>
      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => {
              setIndex(i)
              setOpen(true)
            }}
            className="size-9 overflow-hidden rounded-md border border-mint-pale hover:border-green-fresh focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <img src={image.url} alt={`${title} photo ${i + 1}`} className="size-full object-cover" />
          </button>
        ))}
      </div>
      <ImageLightbox images={images} startIndex={index} open={open} onOpenChange={setOpen} title={title} />
    </>
  )
}
