import { createColumnHelper } from '@tanstack/react-table'
import { Pencil, Send, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { EXPIRY_TONE } from '../../../stockModel'

const helper = createColumnHelper(listFeatures)

/** Column ids + labels for the ⚙ column settings menu. */
export const BATCH_COLUMN_OPTIONS = [
  { id: 'item', label: 'Item', required: true },
  { id: 'category', label: 'Category' },
  { id: 'unit', label: 'Unit' },
  { id: 'batchNo', label: 'Batch No', required: true },
  { id: 'mfgDate', label: 'Manufactured' },
  { id: 'expiryDate', label: 'Expiry' },
  { id: 'opening', label: 'Opening' },
  { id: 'in', label: 'In' },
  { id: 'out', label: 'Out' },
  { id: 'closing', label: 'Closing' },
]

/** Hidden until switched on in ⚙. */
export const DEFAULT_BATCH_COLUMN_VISIBILITY = { mfgDate: false }

const qty = (value) => (Number(value) ? Number(value).toLocaleString('en-IN') : '—')

/** A date as the client reads it, or a dash. */
const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function ExpiryCell({ batch }) {
  if (!batch.expiryDate) return <span className="text-ink-muted">—</span>
  if (batch.expiryState === 'OK') return <span className="whitespace-nowrap">{shortDate(batch.expiryDate)}</span>
  return (
    <StatusPill tone={EXPIRY_TONE[batch.expiryState]}>
      {batch.expiryState === 'EXPIRED' ? 'Expired' : shortDate(batch.expiryDate)}
    </StatusPill>
  )
}

/** Columns for the Factory Stocks table. Handlers come from the page. */
export function buildBatchColumns({ onEdit, onIssue, onDelete }) {
  return helper.columns([
    helper.accessor('itemName', {
      id: 'item',
      header: 'Item',
      cell: ({ row }) => (
        <div className="min-w-[12rem]">
          <p className="truncate font-semibold text-black">{row.original.itemName}</p>
          {row.original.itemCode && <p className="truncate font-mono text-xs text-ink-muted">{row.original.itemCode}</p>}
        </div>
      ),
    }),
    helper.accessor('category', { header: 'Category', cell: (info) => info.getValue() || '—' }),
    helper.accessor('unit', { header: 'Unit', cell: (info) => <span className="font-mono text-xs">{info.getValue() || '—'}</span> }),
    helper.accessor('batchNo', {
      header: 'Batch No',
      cell: (info) => <span className="font-mono text-sm font-semibold text-black">{info.getValue()}</span>,
    }),
    helper.accessor('mfgDate', { header: 'Manufactured', cell: (info) => <span className="whitespace-nowrap">{shortDate(info.getValue())}</span> }),
    helper.accessor('expiryDate', { header: 'Expiry', cell: ({ row }) => <ExpiryCell batch={row.original} /> }),
    helper.accessor('opening', { header: 'Opening', meta: { align: 'right' }, cell: (info) => <span className="font-mono tabular-nums">{qty(info.getValue())}</span> }),
    helper.accessor('in', {
      header: 'In',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono tabular-nums text-green-deep">{qty(info.getValue())}</span>,
    }),
    helper.accessor('out', {
      header: 'Out',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono tabular-nums text-ink-muted">{qty(info.getValue())}</span>,
    }),
    helper.accessor('closing', {
      header: 'Closing',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="inline-flex flex-col items-end">
          <span className="font-mono font-semibold text-black tabular-nums">{qty(row.original.closing)}</span>
          <span className="text-xs text-ink-muted">{row.original.unit}</span>
        </span>
      ),
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { align: 'right', className: 'w-16' },
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions
            label={`Actions for batch ${row.original.batchNo}`}
            actions={[
              { label: 'Edit batch', icon: Pencil, onSelect: () => onEdit(row.original) },
              { label: 'Issue to distributor', icon: Send, onSelect: () => onIssue(row.original) },
              { label: 'Delete batch', icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => onDelete(row.original) },
            ]}
          />
        </div>
      ),
    }),
  ])
}
