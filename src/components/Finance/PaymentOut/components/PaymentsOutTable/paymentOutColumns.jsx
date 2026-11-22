import { createColumnHelper } from '@tanstack/react-table'
import { CheckCircle2, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'
import { METHOD_LABEL, STATUS_LABEL, STATUS_TONE } from '../../paymentOutModel'

const helper = createColumnHelper(listFeatures)
const dmy = (iso) => (iso ? iso.split('-').reverse().join('-') : '—')

export const PAYMENT_OUT_COLUMN_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'number', label: 'Payment No.', required: true },
  { id: 'supplier', label: 'Supplier', required: true },
  { id: 'method', label: 'Paid By' },
  { id: 'billRef', label: 'Their Bill' },
  { id: 'comment', label: 'Comment' },
  { id: 'recordedBy', label: 'Recorded By' },
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status' },
]

export const DEFAULT_PAYMENT_OUT_VISIBILITY = { comment: false, recordedBy: false }

/**
 * Money paid out, row by row.
 *
 * There is no "settled against" column the way money coming in has one: with
 * no purchase module there are no supplier bills to settle, so what stands in
 * its place is **Their Bill** — the supplier's own number, as somebody typed
 * it off the paper.
 */
export function buildPaymentOutColumns({ onEdit, onSetStatus, onDelete }) {
  return helper.columns([
    helper.accessor('at', {
      id: 'date',
      header: 'Date',
      cell: (i) => <span className="font-mono text-xs whitespace-nowrap">{dmy(i.getValue())}</span>,
    }),
    helper.accessor('number', {
      id: 'number',
      header: 'Payment No.',
      cell: (i) => <span className="font-mono text-xs font-semibold whitespace-nowrap text-black">{i.getValue()}</span>,
    }),
    helper.accessor('supplierName', {
      id: 'supplier',
      header: 'Supplier',
      cell: ({ row, getValue }) => (
        <div className="min-w-[10rem]">
          <p className="font-semibold text-black">{getValue() || 'Deleted supplier'}</p>
          {row.original.supplierMobile && <p className="text-xs text-ink-muted">+91 {row.original.supplierMobile}</p>}
        </div>
      ),
    }),
    helper.accessor('method', {
      id: 'method',
      header: 'Paid By',
      cell: ({ row, getValue }) => (
        <div className="whitespace-nowrap">
          <p className="text-ink">{METHOD_LABEL[getValue()] ?? getValue()}</p>
          {row.original.reference && <p className="font-mono text-xs text-ink-muted">{row.original.reference}</p>}
          {/* A cheque written for a later day has not actually gone yet. */}
          {row.original.chequeDate && <p className="text-xs text-warning-ink">dated {dmy(row.original.chequeDate)}</p>}
        </div>
      ),
    }),
    helper.accessor('billRef', {
      id: 'billRef',
      header: 'Their Bill',
      enableSorting: false,
      cell: (i) => <span className="font-mono text-xs">{i.getValue() || '—'}</span>,
    }),
    helper.accessor('comment', {
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
    helper.accessor('recordedByName', {
      id: 'recordedBy',
      header: 'Recorded By',
      cell: ({ row, getValue }) => (
        <span className="inline-flex flex-col whitespace-nowrap">
          <span className="text-ink">{getValue() || '—'}</span>
          {row.original.approvedByName && <span className="text-xs text-ink-muted">ok’d by {row.original.approvedByName}</span>}
        </span>
      ),
    }),
    helper.accessor('amount', {
      id: 'amount',
      header: 'Amount',
      meta: { align: 'right' },
      cell: (i) => <span className="font-mono font-medium whitespace-nowrap text-black tabular-nums">{formatPrice(i.getValue())}</span>,
    }),
    helper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: (i) => <StatusPill tone={STATUS_TONE[i.getValue()]}>{STATUS_LABEL[i.getValue()]}</StatusPill>,
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => {
        const payment = row.original
        const approved = payment.status === 'APPROVED'
        const actions = []

        // An approved payment is on the books. Changing or removing it has to
        // start with rejecting it, which is a deliberate act with a trail.
        if (!approved) actions.push({ label: 'Open', icon: Pencil, onSelect: () => onEdit(payment) })
        if (payment.status !== 'APPROVED') actions.push({ label: 'Approve', icon: CheckCircle2, onSelect: () => onSetStatus(payment, 'APPROVED') })
        if (payment.status !== 'REJECTED') {
          actions.push({ label: 'Reject', icon: XCircle, destructive: true, onSelect: () => onSetStatus(payment, 'REJECTED') })
        }
        if (payment.status !== 'PENDING') {
          actions.push({ label: 'Back to pending', icon: RotateCcw, onSelect: () => onSetStatus(payment, 'PENDING') })
        }
        if (!approved) {
          actions.push({ label: 'Delete', icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => onDelete(payment) })
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions label={`Actions for ${payment.number}`} actions={actions} />
          </div>
        )
      },
    }),
  ])
}
