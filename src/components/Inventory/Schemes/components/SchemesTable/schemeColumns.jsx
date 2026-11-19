import { createColumnHelper } from '@tanstack/react-table'
import { CircleCheck, CircleDashed, Copy, Pencil, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import {
  describeScheme,
  formatDisplayDate,
  kindOf,
  SCHEME_KIND_LABEL,
  SCHEME_REWARDS,
  SCHEME_TRIGGERS,
  schemeState,
} from '../../schemeModel'

const helper = createColumnHelper(listFeatures)
const TRIGGER = Object.fromEntries(SCHEME_TRIGGERS.map((t) => [t.value, t]))
const REWARD = Object.fromEntries(SCHEME_REWARDS.map((r) => [r.value, r]))

export function buildSchemeColumns({ itemsById, giftsById = {}, onEdit, onToggleStatus, onDuplicate, onDelete }) {
  return helper.columns([
    helper.accessor('name', {
      header: 'Name',
      cell: ({ row }) => (
        <div className="min-w-[16rem]">
          <p className="font-semibold text-black">{row.original.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{describeScheme(row.original, itemsById, giftsById)}</p>
        </div>
      ),
    }),
    // What earns it and what it gives, which is the whole of what a scheme
    // is — shown as the pair rather than as a type nobody chose.
    helper.accessor((scheme) => kindOf(scheme), {
      id: 'type',
      header: 'Earns → Gives',
      cell: ({ row }) => {
        const scheme = row.original
        const Trigger = TRIGGER[scheme.trigger]?.icon
        const Reward = REWARD[scheme.reward]?.icon
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-ink">
            <span className="grid size-7 place-items-center rounded-md bg-mint-pale text-forest">
              {Trigger && <Trigger className="size-3.5" />}
            </span>
            <span className="text-ink-muted">→</span>
            <span className="grid size-7 place-items-center rounded-md bg-mint-pale text-forest">
              {Reward && <Reward className="size-3.5" />}
            </span>
            {SCHEME_KIND_LABEL[kindOf(scheme)] ?? '—'}
          </span>
        )
      },
    }),
    helper.accessor('startDate', {
      header: 'Validity period',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap text-ink">
          {formatDisplayDate(row.original.startDate)} → {formatDisplayDate(row.original.endDate)}
        </span>
      ),
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
  { id: 'type', label: 'Earns → Gives' },
  { id: 'startDate', label: 'Validity period' },
  { id: 'status', label: 'Status', required: true },
]
