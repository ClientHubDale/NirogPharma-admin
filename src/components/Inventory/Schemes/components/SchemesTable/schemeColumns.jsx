import { createColumnHelper } from '@tanstack/react-table'
import { CircleCheck, CircleDashed, Copy, Pencil, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { PARTY_GROUPS } from '@/mocks/parties'
import { describeScheme, formatDisplayDate, SCHEME_TYPES, schemeState } from '../../schemeModel'

const helper = createColumnHelper(listFeatures)
const TYPE = Object.fromEntries(SCHEME_TYPES.map((t) => [t.value, t]))
const GROUP = Object.fromEntries(PARTY_GROUPS.map((g) => [g.value, g.label]))

export function buildSchemeColumns({ itemsById, onEdit, onToggleStatus, onDuplicate, onDelete }) {
  return helper.columns([
    helper.accessor('name', {
      header: 'Name',
      cell: ({ row }) => (
        <div className="min-w-[16rem]">
          <p className="font-semibold text-black">{row.original.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{describeScheme(row.original, itemsById)}</p>
        </div>
      ),
    }),
    helper.accessor('type', {
      header: 'Type',
      cell: (info) => {
        const t = TYPE[info.getValue()]
        const Icon = t.icon
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-ink">
            <span className="grid size-7 place-items-center rounded-md bg-mint-pale text-forest">
              <Icon className="size-3.5" />
            </span>
            {t.title}
          </span>
        )
      },
    }),
    helper.accessor('partyGroup', {
      header: 'Party group',
      cell: (info) => <span className="whitespace-nowrap">{GROUP[info.getValue()] ?? '—'}</span>,
    }),
    helper.accessor('startDate', {
      header: 'Validity period',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap text-ink">
          {formatDisplayDate(row.original.startDate)} → {formatDisplayDate(row.original.endDate)}
        </span>
      ),
    }),
    helper.accessor('priority', {
      header: 'Priority',
      meta: { align: 'center' },
      cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    }),
    helper.accessor('status', {
      header: 'Status',
      sortingFn: (a, b) => schemeState(a.original).label.localeCompare(schemeState(b.original).label),
      cell: ({ row }) => {
        const state = schemeState(row.original)
        return (
          <span className="inline-flex flex-col items-start gap-0.5">
            <StatusPill tone={state.tone}>{state.label}</StatusPill>
            {state.note && <span className="text-xs text-ink-muted">{state.note}</span>}
          </span>
        )
      },
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => {
        const scheme = row.original
        const active = scheme.status === 'ACTIVE'
        return (
          <RowActions
            label={`Actions for ${scheme.name}`}
            actions={[
              { label: 'Edit', icon: Pencil, onSelect: () => onEdit(scheme) },
              { label: 'Duplicate', icon: Copy, onSelect: () => onDuplicate(scheme) },
              { label: active ? 'Deactivate' : 'Activate', icon: active ? CircleDashed : CircleCheck, onSelect: () => onToggleStatus(scheme) },
              { label: 'Delete', icon: Trash2, onSelect: () => onDelete(scheme), destructive: true, separatorBefore: true },
            ]}
          />
        )
      },
    }),
  ])
}

export const SCHEME_COLUMN_OPTIONS = [
  { id: 'name', label: 'Name', required: true },
  { id: 'type', label: 'Type' },
  { id: 'partyGroup', label: 'Party group' },
  { id: 'startDate', label: 'Validity period' },
  { id: 'priority', label: 'Priority' },
  { id: 'status', label: 'Status', required: true },
]
