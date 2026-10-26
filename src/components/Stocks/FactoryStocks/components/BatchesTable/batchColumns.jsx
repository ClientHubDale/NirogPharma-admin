import { createColumnHelper } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, CornerDownRight, History, Layers, Pencil, Send, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/utils'
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
  { id: 'returned', label: 'Return' },
  { id: 'closing', label: 'Closing' },
]

/** Hidden until switched on in ⚙. */
export const DEFAULT_BATCH_COLUMN_VISIBILITY = {}

const qty = (value) => (Number(value) ? Number(value).toLocaleString('en-IN') : '—')

/** A date as the client reads it, or a dash. */
const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/**
 * A figure cell. The item line carries the total and is **bold** — that is the
 * stock figure; the batch lines underneath are the same four numbers broken up,
 * in light type, "समझने के लिए".
 */
const figure = (field, tone = '') => ({ row }) => {
  const value = qty(row.original[field])
  const isItem = row.original.kind === 'item'
  return (
    <span className={cn('font-mono tabular-nums', isItem ? 'font-bold text-black' : 'font-normal text-ink-muted', !isItem && tone)}>
      {value}
    </span>
  )
}

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
export function buildBatchColumns({ onEdit, onIssue, onDelete, onItemHistory, onLedger, onItemImage, expanded, onToggle, lowAt = 0 }) {
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
            {/* The product photo, falling back to its initials — the client
                asked for it here: "यहाँ पे ये नहीं दिख रहा न इमेज". */}
            {entry.itemImage ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onItemImage(entry)
                }}
                title={`See ${entry.itemName} larger`}
                className="shrink-0 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              >
                <img
                  src={entry.itemImage}
                  alt={entry.itemName}
                  className="size-9 rounded-lg border border-mint-pale object-cover transition-transform hover:scale-110"
                  loading="lazy"
                />
              </button>
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint-pale text-xs font-bold text-forest" aria-hidden>
                {initialsOf(entry.itemName.replace(/^Nirog\s+/, ''))}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-black">{entry.itemName}</p>
              {entry.itemCode && <p className="truncate font-mono text-xs text-ink-muted">{entry.itemCode}</p>}
            </div>
          </div>
        )
      },
    }),
    helper.accessor('category', {
      header: 'Category',
      cell: ({ row }) => (row.original.kind === 'item' ? row.original.category || '—' : null),
    }),
    helper.accessor('unit', {
      header: 'Unit',
      cell: ({ row }) => (row.original.kind === 'item' ? <span className="font-mono text-xs">{row.original.unit || '—'}</span> : null),
    }),
    helper.accessor('batchNo', {
      // Sorting would wrap the header in a button, and this column expands.
      enableSorting: false,
      header: 'Batch No',
      cell: ({ row }) => {
        const entry = row.original
        if (entry.kind === 'batch') {
          return <span className="font-mono text-sm text-ink">{entry.batchNo}</span>
        }

        // Nothing left in any batch: the figures still stand, but there is
        // nothing to open.
        if (entry.batches.length === 0) return <span className="text-ink-muted">—</span>

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
    helper.accessor('opening', { header: 'Opening', meta: { align: 'right' }, cell: figure('opening') }),
    helper.accessor('in', { header: 'In', meta: { align: 'right' }, cell: figure('in', 'text-green-deep/80') }),
    helper.accessor('out', { header: 'Out', meta: { align: 'right' }, cell: figure('out') }),
    // What came back from a distributor. It is already netted off Out, so this
    // column is there to say how much of the issue did not stick.
    helper.accessor('returned', { header: 'Return', meta: { align: 'right' }, cell: figure('returned', 'text-warning-ink/80') }),
    helper.accessor('closing', {
      header: 'Closing',
      meta: { align: 'right' },
      cell: ({ row }) => {
        if (row.original.kind !== 'item') {
          return <span className="font-mono font-normal text-ink-muted tabular-nums">{qty(row.original.closing)}</span>
        }
        // "फैक्ट्री के सौ कर दो" — only the closing figure goes red, and only
        // on the item line: a single batch running low says nothing on its own.
        const low = lowAt > 0 && row.original.closing <= lowAt
        return (
          <span className="inline-flex flex-col items-end">
            <span
              title={low ? `Running low — only ${qty(row.original.closing)} ${row.original.unit} left in the factory` : undefined}
              className={cn(
                'font-mono font-bold tabular-nums',
                low ? 'rounded bg-danger-soft px-1.5 py-0.5 text-danger-ink' : 'text-black',
              )}
            >
              {qty(row.original.closing)}
            </span>
            <span className="text-xs font-normal text-ink-muted">{row.original.unit}</span>
          </span>
        )
      },
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
                { label: 'Movements', icon: History, onSelect: () => onLedger(entry) },
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
