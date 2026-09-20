import { createColumnHelper } from '@tanstack/react-table'
import { Images, MapPin } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { StatusPill } from '@/components/data/StatusPill'
import { cn } from '@/lib/utils'
import { googleMapsUrl } from '@/lib/geo'
import { checkoutPlace, dmy, durationLabel, visitStatus } from '../../visitModel'

const helper = createColumnHelper(listFeatures)

export const VISIT_COLUMN_OPTIONS = [
  { id: 'party', label: 'Name', required: true },
  { id: 'date', label: 'Date' },
  { id: 'inAt', label: 'In' },
  { id: 'outAt', label: 'Out' },
  { id: 'duration', label: 'Duration' },
  { id: 'comment', label: 'Comment' },
  { id: 'visitedBy', label: 'Visited by' },
  { id: 'images', label: 'Image' },
  { id: 'status', label: 'Status' },
]
export const DEFAULT_VISIT_COLUMN_VISIBILITY = { status: false }

const PIN_STYLE = {
  'on-site': 'text-green-deep',
  far: 'text-danger',
  'no-shop-location': 'text-ink-muted',
}

/** Pin with a hover tooltip ("12 m from shop"); opens the check-out point in Google Maps. */
function CheckoutPin({ visit, place }) {
  return (
    <a
      href={googleMapsUrl(visit.outLat, visit.outLng)}
      target="_blank"
      rel="noreferrer"
      aria-label={`${place.label} — open check-out location`}
      className={cn('group/pin relative inline-grid size-7 place-items-center rounded-md hover:bg-mint-pale', PIN_STYLE[place.state])}
    >
      <MapPin className="size-4" fill="currentColor" fillOpacity={0.15} />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 rounded-md bg-black px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 transition-opacity group-hover/pin:opacity-100 group-focus-visible/pin:opacity-100"
      >
        {place.label}
      </span>
    </a>
  )
}

export function buildVisitColumns({ partiesById, placeOf, staffById, onOpenImages }) {
  return helper.columns([
    helper.accessor((v) => partiesById[v.partyId]?.name ?? 'Deleted party', {
      id: 'party',
      header: 'Name',
      cell: ({ row, getValue }) => {
        const party = partiesById[row.original.partyId]
        const place = party ? placeOf(party) : null
        return (
          <div className="min-w-[12rem]">
            <p className={cn('font-semibold', party ? 'text-black' : 'text-ink-muted italic')}>{getValue()}</p>
            {place?.city && <p className="text-xs text-ink-muted">{place.route}, {place.city}</p>}
          </div>
        )
      },
    }),
    helper.accessor('date', { header: 'Date', cell: (i) => <span className="font-mono text-xs whitespace-nowrap">{dmy(i.getValue())}</span> }),
    helper.accessor('inAt', { header: 'In', cell: (i) => <span className="font-mono">{i.getValue()}</span> }),
    helper.accessor((v) => v.outAt ?? '', {
      id: 'outAt',
      header: 'Out',
      cell: ({ row }) => {
        const v = row.original
        if (!v.outAt) return <StatusPill tone="warning">In shop</StatusPill>
        const place = checkoutPlace(v, partiesById[v.partyId])
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono">{v.outAt}</span>
            {place.state !== 'none' && <CheckoutPin visit={v} place={place} />}
          </span>
        )
      },
    }),
    helper.accessor((v) => durationLabel(v) ?? '', {
      id: 'duration',
      header: 'Duration',
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap text-ink">{durationLabel(row.original) ?? '—'}</span>,
    }),
    helper.accessor('comment', { header: 'Comment', enableSorting: false, cell: (i) => <span className="text-ink">{i.getValue() || ''}</span> }),
    helper.accessor((v) => staffById[v.userId]?.name ?? '', {
      id: 'visitedBy',
      header: 'Visited by',
      cell: (i) => <span className="font-semibold whitespace-nowrap text-black uppercase">{i.getValue()}</span>,
    }),
    helper.accessor((v) => v.images.length, {
      id: 'images',
      header: 'Image',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const v = row.original
        if (!v.images.length) return null
        return (
          <button
            type="button"
            onClick={() => onOpenImages(v)}
            aria-label={`View ${v.images.length} photo${v.images.length === 1 ? '' : 's'}`}
            className="relative inline-grid size-9 place-items-center rounded-lg text-forest hover:bg-mint-pale"
          >
            <Images className="size-5" />
            <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-danger text-[0.65rem] font-bold text-white ring-2 ring-white">
              {v.images.length}
            </span>
          </button>
        )
      },
    }),
    helper.accessor((v) => visitStatus(v), {
      id: 'status',
      header: 'Status',
      cell: (i) => (i.getValue() === 'PENDING' ? <StatusPill tone="warning">Pending</StatusPill> : <StatusPill tone="success">Completed</StatusPill>),
    }),
  ])
}
