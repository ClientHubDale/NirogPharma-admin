import { createColumnHelper } from '@tanstack/react-table'
import { listFeatures } from '@/components/data/DataTable'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'

const helper = createColumnHelper(listFeatures)

/**
 * The ageing ladder, in the order the client reads it. A due turns a shade
 * worse every month it sits — "तीन महीने से पड़ा है" — and past ninety days
 * it is simply old, so the last rung is one heap.
 */
export const AGE_BUCKETS = [
  { key: '0-30', label: 'This month', hint: 'Up to 30 days old', tone: 'text-ink' },
  { key: '31-60', label: '31 – 60 days', hint: 'One month late', tone: 'text-warning-ink' },
  { key: '61-90', label: '61 – 90 days', hint: 'Two months late', tone: 'text-warning-ink' },
  { key: '90+', label: 'Over 90 days', hint: 'Three months and more', tone: 'text-danger-ink' },
]

/** Older dues shout louder, the same ladder the ageing columns use. */
export const ageTone = (days) =>
  days > 90 ? 'bg-danger-soft text-danger-ink' : days > 30 ? 'bg-warning-soft text-warning-ink' : 'bg-mint-pale text-green-deep'

export const money = (value) => (value ? formatINR(value) : '—')

const DAYS = (days) => (days === 0 ? 'today' : days === 1 ? '1 day' : `${days} days`)

/** Firm by firm — who owes, how old the oldest is, and the ladder across. */
export function buildPartyColumns() {
  return helper.columns([
    helper.accessor('distributorName', {
      header: 'Distributor',
      cell: ({ row }) => (
        <div className="min-w-[11rem]">
          <p className="font-semibold text-black">{row.original.distributorName || '—'}</p>
          <p className="text-xs text-ink-muted">
            {row.original.bills.length ? `${row.original.bills.length} unpaid bill${row.original.bills.length === 1 ? '' : 's'}` : 'No unpaid bills'}
          </p>
        </div>
      ),
    }),
    helper.accessor('oldestDays', {
      header: 'Oldest',
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.bills.length ? (
          <span className={cn('rounded px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums', ageTone(row.original.oldestDays))}>
            {DAYS(row.original.oldestDays)}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    }),
    ...AGE_BUCKETS.map((bucket) =>
      helper.accessor((row) => row.buckets[bucket.key] ?? 0, {
        id: bucket.key,
        header: bucket.label,
        meta: { align: 'right' },
        cell: (info) => (
          <span className={cn('font-mono tabular-nums', info.getValue() ? bucket.tone : 'text-ink-muted')}>{money(info.getValue())}</span>
        ),
      }),
    ),
    // Money paid or credited without naming a bill. It belongs to the firm,
    // not to any one bill, so it is shown apart — otherwise the bills and the
    // firm's total would read as though they disagreed.
    helper.accessor('onAccount', {
      header: 'On account',
      meta: { align: 'right' },
      cell: (info) =>
        info.getValue() ? (
          <span title="Paid or credited without naming a bill" className="font-mono tabular-nums text-green-deep">
            −{formatINR(info.getValue())}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    }),
    helper.accessor('outstanding', {
      header: 'Outstanding',
      meta: { align: 'right' },
      cell: (info) => {
        const owed = info.getValue()
        // Below zero they are in credit with us, which is not a due at all.
        return (
          <span className={cn('font-mono font-semibold tabular-nums', owed > 0 ? 'text-black' : 'text-green-deep')}>
            {owed < 0 ? `${formatINR(Math.abs(owed))} in credit` : formatINR(owed)}
          </span>
        )
      },
    }),
  ])
}

/**
 * The same dues read item-wise — "बकाया किस किस आइटम का है".
 *
 * Money is owed on a bill, never on an item, so each item's share is
 * apportioned from its bill in proportion to what the line is worth. A part
 * payment therefore knocks a little off every item on that bill.
 */
export function buildItemColumns() {
  return helper.columns([
    helper.accessor('itemName', {
      header: 'Item',
      cell: ({ row }) => (
        <div className="min-w-[11rem]">
          <p className="font-semibold text-black">{row.original.itemName || '—'}</p>
          {row.original.itemCode && <p className="font-mono text-xs text-ink-muted">{row.original.itemCode}</p>}
        </div>
      ),
    }),
    helper.accessor('parties', {
      header: 'Parties',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono tabular-nums text-ink-muted">{info.getValue()}</span>,
    }),
    helper.accessor('quantity', {
      header: 'Quantity',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <span className="font-mono tabular-nums">
          {Number(row.original.quantity).toLocaleString('en-IN')} <span className="text-xs text-ink-muted">{row.original.unit}</span>
        </span>
      ),
    }),
    helper.accessor('due', {
      header: 'Outstanding',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono font-semibold tabular-nums text-black">{formatINR(info.getValue())}</span>,
    }),
  ])
}
