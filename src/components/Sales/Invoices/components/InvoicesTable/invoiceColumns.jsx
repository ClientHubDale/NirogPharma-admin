import { createColumnHelper } from '@tanstack/react-table'
import { Ban, CheckCircle2, Pencil, Trash2, Truck } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'
import { STATUS_LABEL, STATUS_TONE } from '../../invoiceModel'

const helper = createColumnHelper(listFeatures)
const dmy = (iso) => (iso ? iso.split('-').reverse().join('-') : '—')

/** Column ids + labels for the ⚙ column settings menu. */
export const INVOICE_COLUMN_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'number', label: 'Invoice No', required: true },
  { id: 'party', label: 'Party Name', required: true },
  { id: 'gstin', label: 'GSTIN' },
  { id: 'taxable', label: 'Taxable' },
  { id: 'tax', label: 'GST' },
  { id: 'total', label: 'Amount' },
  { id: 'due', label: 'Due' },
  { id: 'comment', label: 'Comment' },
  { id: 'status', label: 'Status' },
]

/** Hidden until switched on in the Filters popover's Columns tab. */
export const DEFAULT_INVOICE_VISIBILITY = { gstin: false, taxable: false, tax: false, comment: false }

/**
 * The sales invoice table, laid out the way the other sales documents are.
 *
 * Created By is gone on purpose — the client has one admin, so the column said
 * the same thing on every row.
 */
export function buildInvoiceColumns({ onEdit, onSetStatus, onDelete }) {
  return helper.columns([
    helper.accessor('invoiceDate', {
      id: 'date',
      header: 'Date',
      cell: (i) => <span className="font-mono text-xs whitespace-nowrap">{dmy(i.getValue())}</span>,
    }),
    helper.accessor('invoiceNo', {
      id: 'number',
      header: 'Invoice No',
      cell: (i) => <span className="font-mono text-xs font-semibold whitespace-nowrap text-black">{i.getValue()}</span>,
    }),
    helper.accessor('distributorName', {
      id: 'party',
      header: 'Party Name',
      cell: ({ row, getValue }) => {
        const units = row.original.lines.reduce((sum, line) => sum + line.quantity, 0)
        return (
          <div className="min-w-[10rem]">
            <p className="font-semibold text-black">{getValue() || 'Deleted distributor'}</p>
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
    // Nothing is received against a bill yet, so everything but a cancelled
    // one is still owed. The date it falls due sits under it.
    helper.accessor((row) => (row.status === 'CANCELLED' ? 0 : row.total), {
      id: 'due',
      header: 'Due',
      meta: { align: 'right' },
      cell: ({ row, getValue }) => (
        <span className="inline-flex flex-col items-end whitespace-nowrap">
          <span className="font-mono text-ink tabular-nums">{formatPrice(getValue())}</span>
          {row.original.dueDate && row.original.status !== 'CANCELLED' && (
            <span className="text-xs text-ink-muted">by {dmy(row.original.dueDate)}</span>
          )}
        </span>
      ),
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
        const invoice = row.original
        const actions = [{ label: 'Open', icon: Pencil, onSelect: () => onEdit(invoice) }]

        if (invoice.status === 'CONFIRMED') actions.push({ label: 'Mark dispatched', icon: Truck, onSelect: () => onSetStatus(invoice, 'DISPATCHED') })
        if (invoice.status === 'DISPATCHED') actions.push({ label: 'Mark delivered', icon: CheckCircle2, onSelect: () => onSetStatus(invoice, 'DELIVERED') })
        if (invoice.status !== 'CANCELLED') {
          actions.push({ label: 'Cancel invoice', icon: Ban, destructive: true, separatorBefore: true, onSelect: () => onSetStatus(invoice, 'CANCELLED') })
        }
        if (invoice.status === 'PENDING' || invoice.status === 'CANCELLED') {
          actions.push({ label: 'Delete', icon: Trash2, destructive: true, onSelect: () => onDelete(invoice) })
        }

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions label={`Actions for ${invoice.invoiceNo}`} actions={actions} />
          </div>
        )
      },
    }),
  ])
}
