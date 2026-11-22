import { createColumnHelper } from '@tanstack/react-table'
import { Ban, CheckCircle2, PauseCircle, Pencil, ReceiptIndianRupee, RotateCcw, Trash2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'
import { OPEN_STATUSES, STATUS_LABEL, STATUS_TONE } from '../../orderModel'

const helper = createColumnHelper(listFeatures)
const dmy = (iso) => (iso ? iso.split('-').reverse().join('-') : '—')

/** Column ids + labels for the ⚙ column settings menu. */
export const ORDER_COLUMN_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'number', label: 'Order No', required: true },
  { id: 'party', label: 'Party Name', required: true },
  { id: 'gstin', label: 'GSTIN' },
  { id: 'takenBy', label: 'Booked By' },
  { id: 'taxable', label: 'Taxable' },
  { id: 'tax', label: 'GST' },
  { id: 'total', label: 'Amount' },
  { id: 'comment', label: 'Comment' },
  { id: 'status', label: 'Status' },
]

/** Hidden until switched on in the Filters popover's Columns tab. */
export const DEFAULT_ORDER_VISIBILITY = { gstin: false, taxable: false, tax: false, comment: false }

/**
 * The sales order table, laid out the way the sales invoice list is.
 *
 * Two columns are the order's own. **Booked By** is here because an order is
 * taken wherever the customer is, so who took it is real information — on a
 * bill it would say "the office" every time. And there is no **Due**: nothing
 * is owed on a promise, only on the bill it becomes.
 */
export function buildOrderColumns({ onEdit, onSetStatus, onDelete, onConvert }) {
  return helper.columns([
    helper.accessor('orderDate', {
      id: 'date',
      header: 'Date',
      cell: (i) => <span className="font-mono text-xs whitespace-nowrap">{dmy(i.getValue())}</span>,
    }),
    helper.accessor('orderNo', {
      id: 'number',
      header: 'Order No',
      cell: ({ row, getValue }) => (
        <span className="inline-flex flex-col whitespace-nowrap">
          <span className="font-mono text-xs font-semibold text-black">{getValue()}</span>
          {/* Once it has become a bill, the bill's number is the useful one. */}
          {row.original.invoiceNo && <span className="font-mono text-[0.7rem] text-ink-muted">→ {row.original.invoiceNo}</span>}
        </span>
      ),
    }),
    helper.accessor('distributorName', {
      id: 'party',
      header: 'Party Name',
      cell: ({ row, getValue }) => {
        const units = row.original.lines.reduce((sum, line) => sum + line.quantity, 0)
        return (
          <div className="min-w-[10rem]">
            <p className="font-semibold text-black">{getValue() || 'Deleted customer'}</p>
            <p className="text-xs text-ink-muted">
              {row.original.lines.length} item{row.original.lines.length === 1 ? '' : 's'} · {units} units
            </p>
          </div>
        )
      },
    }),
    helper.accessor('distributorGstin', {
      id: 'gstin',
      header: 'GSTIN',
      cell: (i) => <span className="font-mono text-xs">{i.getValue() || '—'}</span>,
    }),
    helper.accessor('takenByName', {
      id: 'takenBy',
      header: 'Booked By',
      cell: ({ row, getValue }) => (
        <span className="inline-flex flex-col">
          <span className="text-ink">{getValue() || '—'}</span>
          {row.original.takenByRole && <span className="text-xs text-ink-muted capitalize">{row.original.takenByRole.toLowerCase()}</span>}
        </span>
      ),
    }),
    helper.accessor('taxableValue', {
      id: 'taxable',
      header: 'Taxable',
      meta: { align: 'right' },
      cell: (i) => <span className="font-mono whitespace-nowrap tabular-nums">{formatPrice(i.getValue())}</span>,
    }),
    helper.accessor('taxAmount', {
      id: 'tax',
      header: 'GST',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="inline-flex flex-col items-end whitespace-nowrap">
          <span className="font-mono tabular-nums">{formatPrice(row.original.taxAmount)}</span>
          <span className="text-xs text-ink-muted">{row.original.interState ? 'IGST' : 'CGST + SGST'}</span>
        </span>
      ),
    }),
    helper.accessor('total', {
      id: 'total',
      header: 'Amount',
      meta: { align: 'right' },
      cell: (i) => <span className="font-mono font-medium whitespace-nowrap text-black tabular-nums">{formatPrice(i.getValue())}</span>,
    }),
    helper.accessor('note', {
      id: 'comment',
      header: 'Comment',
      enableSorting: false,
      meta: { className: 'max-w-[11rem]' },
      cell: (i) => (
        <span title={i.getValue()} className="block truncate text-ink">
          {i.getValue() || '—'}
        </span>
      ),
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: (i) => <StatusPill tone={STATUS_TONE[i.getValue()]}>{STATUS_LABEL[i.getValue()]}</StatusPill>,
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => {
        const order = row.original
        const open = OPEN_STATUSES.includes(order.status)
        const actions = [{ label: 'Open', icon: Pencil, onSelect: () => onEdit(order) }]

        if (order.status === 'PENDING') actions.push({ label: 'Put on hold', icon: PauseCircle, onSelect: () => onSetStatus(order, 'ONHOLD') })
        if (open) actions.push({ label: 'Confirm', icon: CheckCircle2, onSelect: () => onSetStatus(order, 'CONFIRMED') })
        // Only a confirmed order becomes a bill: the customer has agreed to it,
        // and the bill is what takes the goods out.
        if (order.status === 'CONFIRMED' && onConvert) {
          actions.push({ label: 'Convert to invoice', icon: ReceiptIndianRupee, separatorBefore: true, onSelect: () => onConvert(order) })
        }
        if (order.status === 'CONFIRMED') {
          actions.push({ label: 'Back to pending', icon: RotateCcw, onSelect: () => onSetStatus(order, 'PENDING') })
        }
        if (order.status !== 'CANCELLED' && order.status !== 'INVOICED') {
          actions.push({ label: 'Cancel order', icon: Ban, destructive: true, separatorBefore: true, onSelect: () => onSetStatus(order, 'CANCELLED') })
        }
        if (open || order.status === 'CANCELLED') {
          actions.push({ label: 'Delete', icon: Trash2, destructive: true, onSelect: () => onDelete(order) })
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions label={`Actions for ${order.orderNo}`} actions={actions} />
          </div>
        )
      },
    }),
  ])
}
