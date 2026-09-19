import { createColumnHelper } from '@tanstack/react-table'
import { Copy, FileDown, Pencil, Tags, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { formatDisplayDate } from '@/lib/format'
import { PARTY_GROUPS } from '@/mocks/parties'
import { describeStrategy } from '../../priceListModel'

const helper = createColumnHelper(listFeatures)
const GROUP = Object.fromEntries(PARTY_GROUPS.map((g) => [g.value, g.label]))
const ICON = { FIXED: Tags, INCREASE: TrendingUp, DECREASE: TrendingDown }

export function buildPriceListColumns({ onEdit, onDuplicate, onExport, onDelete }) {
  return helper.columns([
    helper.accessor('name', {
      header: 'Name',
      cell: (info) => <span className="font-semibold whitespace-nowrap text-black">{info.getValue()}</span>,
    }),
    helper.accessor('description', {
      header: 'Description',
      enableSorting: false,
      cell: (info) => <span className="line-clamp-2 min-w-[14rem] text-ink-muted">{info.getValue() || '—'}</span>,
    }),
    helper.accessor('strategy', {
      header: 'Type',
      cell: ({ row }) => {
        const Icon = ICON[row.original.strategy]
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-ink">
            <span className="grid size-7 place-items-center rounded-md bg-mint-pale text-forest">
              <Icon className="size-3.5" />
            </span>
            {describeStrategy(row.original)}
          </span>
        )
      },
    }),
    helper.accessor('partyGroup', {
      header: 'Party group',
      cell: (info) => <span className="whitespace-nowrap">{GROUP[info.getValue()] ?? '—'}</span>,
    }),
    helper.accessor('updatedAt', {
      header: 'Updated',
      cell: (info) => <span className="font-mono text-xs whitespace-nowrap">{formatDisplayDate(info.getValue())}</span>,
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => (
        <RowActions
          label={`Actions for ${row.original.name}`}
          actions={[
            { label: 'Edit', icon: Pencil, onSelect: () => onEdit(row.original) },
            { label: 'Duplicate', icon: Copy, onSelect: () => onDuplicate(row.original) },
            { label: 'Export to Excel', icon: FileDown, onSelect: () => onExport(row.original) },
            { label: 'Delete', icon: Trash2, onSelect: () => onDelete(row.original), destructive: true, separatorBefore: true },
          ]}
        />
      ),
    }),
  ])
}
