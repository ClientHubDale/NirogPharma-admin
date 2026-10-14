import { createColumnHelper } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, CornerDownRight, Layers, Pencil, Send, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { initialsOf } from '@/lib/format'
import { EXPIRY_TONE } from '../../../stockModel'

const helper = createColumnHelper(listFeatures)

/** Column ids + labels for the ⚙ column settings menu. */
export const BATCH_COLUMN_OPTIONS = [
  { id: 'item', label: 'Item', required: true },
  { id: 'category', label: 'Category' },
  { id: 'unit', label: 'Unit' },
  { id: 'batchNo', label: 'Batch No', required: true },
  { id: 'expiryDate', label: 'Expiry' },
  { id: 'opening', label: 'Opening' },
  { id: 'in', label: 'In' },
  { id: 'out', label: 'Out' },
  { id: 'closing', label: 'Closing' },
]

/** Hidden until switched on in ⚙. */
export const DEFAULT_BATCH_COLUMN_VISIBILITY = {}

const qty = (value) => (Number(value) ? Number(value).toLocaleString('en-IN') : '—')

/** A date as the client reads it, or a dash. */
const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** Only the batch lines carry a quantity cell; the item line carries the total. */
const itemOnly = (render) => (context) => (context.row.original.kind === 'item' ? render(context) : null)

function ExpiryCell({ batch }) {
  if (!batch.expiryDate) return <span className="text-ink-muted">—</span>
  if (batch.expiryState === 'OK') return <span className="whitespace-nowrap">{shortDate(batch.expiryDate)}</span>
  return (
    <StatusPill tone={EXPIRY_TONE[batch.expiryState]}>
      {batch.expiryState === 'EXPIRED' ? 'Expired' : shortDate(batch.expiryDate)}
    </StatusPill>
  )
}

/**
 * Factory Stocks reads one line per item — "आइटम कैटेगरी यूनिट सिंगल सिंगल लाइन
 * में दिखेंगे" — carrying that item's opening, in, out and closing for the
 * period. One item holds many batches, so the batch number opens them: the
 * lines underneath are the batch numbers and their expiry dates, the finished
 * ones among them marked as such.
 */
export function buildBatchColumns({ onEdit, onIssue, onDelete, onItemHistory, expanded, onToggle }) {
  return helper.columns([
    helper.accessor('itemName', {
      id: 'item',
      header: 'Item',
      cell: ({ row }) => {
        const entry = row.original
        if (entry.kind === 'batch') {
          return (
            <span className="flex items-center gap-2 pl-3 text-ink-muted">
              <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
            </span>
          )
        }
        return (
          <div className="flex min-w-[12rem] items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint-pale text-xs font-bold text-forest" aria-hidden>
              {initialsOf(entry.itemName.replace(/^Nirog\s+/, ''))}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-black">{entry.itemName}</p>
              {entry.itemCode && <p className="truncate font-mono text-xs text-ink-muted">{entry.itemCode}</p>}
            </div>
          </div>
        )
      },
    }),
    helper.accessor('category', { header: 'Category', cell: itemOnly((info) => info.getValue() || '—') }),
    helper.accessor('unit', {
      header: 'Unit',
      cell: itemOnly((info) => <span className="font-mono text-xs">{info.getValue() || '—'}</span>),
    }),
    helper.accessor('batchNo', {
      // Sorting would wrap the header in a button, and this column expands.
      enableSorting: false,
      header: 'Batch No',
      cell: ({ row }) => {
        const entry = row.original
        if (entry.kind === 'batch') {
          return (
            <span className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-black">{entry.batchNo}</span>
              {entry.closing <= 0 && (
                <span className="rounded-full bg-bg px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-ink-muted uppercase">
                  Finished
                </span>
              )}
            </span>
          )
        }

        const open = expanded.has(entry.itemId)
        return (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggle(entry.itemId)
            }}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} batches of ${entry.itemName}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-green-deep hover:bg-mint-pale"
          >
            {entry.batches.length} {entry.batches.length === 1 ? 'batch' : 'batches'}
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        )
      },
    }),
    helper.accessor('expiryDate', {
      header: 'Expiry',
      cell: ({ row }) => (row.original.kind === 'batch' ? <ExpiryCell batch={row.original} /> : null),
    }),
    helper.accessor('opening', {
      header: 'Opening',
      meta: { align: 'right' },
      cell: itemOnly((info) => <span className="font-mono tabular-nums">{qty(info.getValue())}</span>),
    }),
    helper.accessor('in', {
      header: 'In',
      meta: { align: 'right' },
      cell: itemOnly((info) => <span className="font-mono tabular-nums text-green-deep">{qty(info.getValue())}</span>),
    }),
    helper.accessor('out', {
      header: 'Out',
      meta: { align: 'right' },
      cell: itemOnly((info) => <span className="font-mono tabular-nums text-ink-muted">{qty(info.getValue())}</span>),
    }),
    helper.accessor('closing', {
      header: 'Closing',
      meta: { align: 'right' },
      cell: itemOnly(({ row }) => (
        <span className="inline-flex flex-col items-end">
          <span className="font-mono font-semibold text-black tabular-nums">{qty(row.original.closing)}</span>
          <span className="text-xs text-ink-muted">{row.original.unit}</span>
        </span>
      )),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { align: 'right', className: 'w-16' },
      cell: ({ row }) => {
        const entry = row.original
        // Edit, issue and delete act on one batch, so they live on the batch
        // lines. The item line only offers what is about the item.
        const actions =
          entry.kind === 'batch'
            ? [
                { label: 'Edit batch', icon: Pencil, onSelect: () => onEdit(entry) },
                { label: 'Issue to distributor', icon: Send, onSelect: () => onIssue(entry) },
                { label: 'Delete batch', icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => onDelete(entry) },
              ]
            : [{ label: 'All batches of this item', icon: Layers, onSelect: () => onItemHistory(entry) }]

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions
              label={entry.kind === 'batch' ? `Actions for batch ${entry.batchNo}` : `Actions for ${entry.itemName}`}
              actions={actions}
            />
          </div>
        )
      },
    }),
  ])
}
