import { createColumnHelper } from '@tanstack/react-table'
import { CheckCircle2, CircleDot, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { formatPrice } from '@/lib/format'
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../../paymentTypes'

const helper = createColumnHelper(listFeatures)
const dmy = (iso) => iso.split('-').reverse().join('-')
const TONE_ICONS = { success: CheckCircle2, danger: XCircle, warning: RotateCcw }
const statusOf = Object.fromEntries(PAYMENT_STATUSES.map((s) => [s.value, s]))
const methodOf = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]))

export const PAYMENT_COLUMN_OPTIONS = [
  { id: 'date', label: 'Date' },
  { id: 'number', label: 'Payment No.', required: true },
  { id: 'party', label: 'Party Name', required: true },
  { id: 'method', label: 'Payment Type' },
  { id: 'comment', label: 'Comment' },
  { id: 'collectedBy', label: 'Collected By' },
  { id: 'amount', label: 'Amount' },
  { id: 'status', label: 'Status' },
]
export const DEFAULT_PAYMENT_VISIBILITY = { comment: false }

/**
 * row = { ...payment, party, totals, collectorName }
 *
 * `staffColumn` swaps Collected By for the two people the payment counts
 * towards, which is what Payment In records now — targets are worked out of
 * money in, so the column has to say whose money it was. Payment Out has no
 * such people and keeps Collected By.
 */
export function buildPaymentColumns({ onEdit, onSetStatus, onDelete, staffColumn }) {
  return helper.columns([
    helper.accessor('date', { header: 'Date', cell: (i) => <span className="font-mono text-xs whitespace-nowrap">{dmy(i.getValue())}</span> }),
    helper.accessor('number', {
      header: 'Payment No.',
      cell: ({ row, getValue }) => (
        <div>
          <p className="font-mono text-xs font-semibold whitespace-nowrap text-black">{getValue()}</p>
          <p className="font-mono text-xs whitespace-nowrap text-ink-muted">{row.original.allocations.map((a) => a.number).join(', ') || 'On account'}</p>
        </div>
      ),
    }),
    helper.accessor((r) => r.party?.name ?? 'Deleted party', {
      id: 'party',
      header: 'Party Name',
      cell: ({ row, getValue }) => (
        <div className="min-w-[10rem]">
          <p className="font-semibold text-black">{getValue()}</p>
          {row.original.party?.mobile && <p className="text-xs text-ink-muted">+91 {row.original.party.mobile}</p>}
        </div>
      ),
    }),
    helper.accessor('method', {
      header: 'Payment Type',
      cell: ({ row, getValue }) => (
        <div>
          <p className="text-sm font-medium text-black">{methodOf[getValue()] ?? getValue()}</p>
          {row.original.reference && <p className="font-mono text-xs text-ink-muted">{row.original.reference}</p>}
        </div>
      ),
    }),
    helper.accessor('comment', {
      header: 'Comment',
      enableSorting: false,
      meta: { className: 'max-w-[11rem]' },
      cell: (i) => <span title={i.getValue()} className="block truncate text-ink">{i.getValue()}</span>,
    }),
    staffColumn
      ? helper.accessor((r) => r.executiveName || r.managerName || '—', {
          id: 'collectedBy',
          header: 'Manager / Executive',
          cell: ({ row }) => (
            <div className="min-w-[8rem] whitespace-nowrap">
              <p className="text-xs font-semibold text-black uppercase">{row.original.executiveName || '—'}</p>
              <p className="text-xs text-ink-muted">{row.original.managerName || 'No manager on the party'}</p>
            </div>
          ),
        })
      : helper.accessor('collectorName', { header: 'Collected By', cell: (i) => <span className="text-xs font-semibold whitespace-nowrap text-black uppercase">{i.getValue()}</span> }),
    helper.accessor((r) => r.totals.amount, {
      id: 'amount',
      header: 'Amount',
      meta: { align: 'right' },
      cell: (i) => <span className="font-mono font-medium whitespace-nowrap text-black tabular-nums">{formatPrice(i.getValue())}</span>,
    }),
    helper.accessor('status', {
      header: 'Status',
      cell: (i) => {
        const s = statusOf[i.getValue()]
        return <StatusPill tone={s?.tone ?? 'neutral'}>{s?.label ?? i.getValue()}</StatusPill>
      },
    }),
    helper.display({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      meta: { align: 'right', className: 'w-12' },
      cell: ({ row }) => {
        const p = row.original
        const actions = [{ label: 'Edit', icon: Pencil, onSelect: () => onEdit(p) }]
        // Approving is what makes money real, so a screen that does not hand
        // over `onSetStatus` is saying this user may not decide — the actions
        // are left off rather than offered and then refused.
        if (onSetStatus) {
          PAYMENT_STATUSES.filter((s) => s.value !== p.status).forEach((s) =>
            actions.push({ label: s.action, icon: TONE_ICONS[s.tone] ?? CircleDot, onSelect: () => onSetStatus(p, s.value) }),
          )
        }
        actions.push({ label: 'Delete', icon: Trash2, onSelect: () => onDelete(p), destructive: true, separatorBefore: true })
        return <RowActions label={`Actions for ${p.number}`} actions={actions} />
      },
    }),
  ])
}
