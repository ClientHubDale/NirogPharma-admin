import { createColumnHelper } from '@tanstack/react-table'
import { BadgeCheck, CircleCheck, CircleDashed, MapPin, MapPinOff, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { cn } from '@/lib/utils'
import { googleMapsUrl } from '@/lib/geo'
import { balanceLabel, PARTY_GROUP_OPTIONS, signedBalance } from '../../partyModel'

const helper = createColumnHelper(listFeatures)
const GROUP = Object.fromEntries(PARTY_GROUP_OPTIONS.map((g) => [g.value, g.label]))

export const PARTY_COLUMN_OPTIONS = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Name', required: true },
  { id: 'code', label: 'Party code' },
  { id: 'contactPerson', label: 'Contact person' },
  { id: 'mobile', label: 'Mobile' },
  { id: 'place', label: 'City / route' },
  { id: 'group', label: 'Group' },
  { id: 'gstin', label: 'GSTIN' },
  { id: 'balance', label: 'Balance' },
  { id: 'geo', label: 'Geo location' },
]
export const DEFAULT_PARTY_COLUMN_VISIBILITY = { contactPerson: false, group: false, gstin: false }

export function buildPartyColumns({ placeOf, placeLabel = 'City / route', onEdit, onToggleStatus, onToggleVerified, onDelete }) {
  return helper.columns([
    helper.accessor('id', { header: 'ID', cell: (i) => <span className="font-mono text-xs text-ink-muted">{i.getValue()}</span> }),
    helper.accessor('name', {
      header: 'Name',
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="min-w-[14rem]">
            <p className="flex items-center gap-1.5 font-semibold text-black">
              {c.name}
              {c.verified && <BadgeCheck className="size-4 shrink-0 text-green-deep" aria-label="Verified" />}
            </p>
            {c.status === 'INACTIVE' && <StatusPill tone="neutral" className="mt-1">Inactive</StatusPill>}
          </div>
        )
      },
    }),
    helper.accessor('code', { header: 'Party code', cell: (i) => <span className="font-mono text-xs">{i.getValue() || '—'}</span> }),
    helper.accessor('contactPerson', { header: 'Contact person', cell: (i) => i.getValue() || '—' }),
    helper.accessor('mobile', {
      header: 'Mobile',
      cell: (i) =>
        i.getValue() ? (
          <a href={`tel:+91${i.getValue()}`} onClick={(e) => e.stopPropagation()} className="font-mono whitespace-nowrap text-ink hover:text-green-deep">
            {i.getValue()}
          </a>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    }),
    helper.accessor((c) => placeOf(c).label, {
      id: 'place',
      header: placeLabel,
      cell: ({ row }) => {
        const p = placeOf(row.original)
        return p.city ? (
          <span className="whitespace-nowrap">
            <span className="text-ink">{p.city}</span>
            <span className="block text-xs text-ink-muted">{p.route}</span>
          </span>
        ) : (
          <span className="text-ink-muted">No route</span>
        )
      },
    }),
    helper.accessor((c) => GROUP[c.groupId] ?? '', { id: 'group', header: 'Group' }),
    helper.accessor('gstin', { header: 'GSTIN', cell: (i) => <span className="font-mono text-xs">{i.getValue() || '—'}</span> }),
    helper.accessor((c) => signedBalance(c), {
      id: 'balance',
      header: 'Balance',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const b = balanceLabel(row.original)
        return (
          <span className="inline-flex flex-col items-end whitespace-nowrap">
            <span className="font-mono font-medium text-black tabular-nums">{b.amount}</span>
            {b.note && <span className={cn('text-xs', b.note === 'to pay' ? 'text-danger' : 'text-ink-muted')}>{b.note}</span>}
          </span>
        )
      },
    }),
    helper.accessor((c) => (c.lat === null ? 0 : 1), {
      id: 'geo',
      header: 'Geo location',
      meta: { align: 'center' },
      cell: ({ row }) => {
        const c = row.original
        return c.lat !== null ? (
          <a
            href={googleMapsUrl(c.lat, c.lng)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`${c.lat}, ${c.lng} — open in Google Maps`}
            aria-label={`Open ${c.name} in Google Maps`}
            className="inline-grid size-8 place-items-center rounded-md text-green-deep hover:bg-mint-pale"
          >
            <MapPin className="size-4" />
          </a>
        ) : (
          <span title="Location not captured" className="inline-grid size-8 place-items-center text-ink-muted/60">
            <MapPinOff className="size-4" />
          </span>
        )
      },
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-24' },
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(c)
              }}
              aria-label={`Edit ${c.name}`}
              className="grid size-8 place-items-center rounded-md border border-mint-pale text-ink hover:border-mint hover:bg-mint-pale"
            >
              <Pencil className="size-3.5" />
            </button>
            <RowActions
              label={`More actions for ${c.name}`}
              actions={[
                { label: c.verified ? 'Mark unverified' : 'Mark verified', icon: ShieldCheck, onSelect: () => onToggleVerified(c) },
                { label: c.status === 'ACTIVE' ? 'Deactivate' : 'Activate', icon: c.status === 'ACTIVE' ? CircleDashed : CircleCheck, onSelect: () => onToggleStatus(c) },
                { label: 'Delete', icon: Trash2, onSelect: () => onDelete(c), destructive: true, separatorBefore: true },
              ]}
            />
          </div>
        )
      },
    }),
  ])
}
