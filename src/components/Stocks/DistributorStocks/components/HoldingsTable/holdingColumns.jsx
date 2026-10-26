import { createColumnHelper } from '@tanstack/react-table'
import { Undo2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { cn } from '@/lib/utils'
import { EXPIRY_TONE } from '../../../stockModel'

const helper = createColumnHelper(listFeatures)

const qty = (value) => (Number(value) ? Number(value).toLocaleString('en-IN') : '—')

/**
 * The traffic light, in the client's own words: green for a product that is
 * moving, orange for one that has sat on their shelf, and red once it is
 * nearly gone. Expired stock colours the whole row, which the table does.
 */
export const MOVEMENT_DOT = {
  MOVING: { tone: 'bg-success', title: 'Selling well' },
  SLOW: { tone: 'bg-warning', title: 'Not selling' },
  NONE: { tone: 'bg-ink-muted/40', title: 'Nothing left with them' },
}

/** Expired stock shouts loudest, so it takes the whole row. */
export const holdingRowClass = (row) =>
  row.expired ? 'bg-danger-soft/50 hover:bg-danger-soft/70' : undefined
const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/**
 * What one distributor holds of one ITEM. Batch is deliberately not a column:
 * "बैच को रिमूव करना है… नेम वाइज में टोटल" — once they sell, we never learn
 * which batch left their shelf, so a batch-level holding would be invented.
 */
export function buildHoldingColumns({ onReturn, onEditOpening }) {
  return helper.columns([
    helper.accessor('distributorName', {
      header: 'Distributor',
      cell: (info) => <span className="font-semibold text-black">{info.getValue() || '—'}</span>,
    }),
    helper.accessor('itemName', {
      header: 'Item',
      cell: ({ row }) => {
        const dot = MOVEMENT_DOT[row.original.movementState] ?? MOVEMENT_DOT.NONE
        const sat = row.original.daysSinceMove
        return (
          <div className="flex min-w-[11rem] items-start gap-2">
            <span
              aria-label={dot.title}
              title={
                sat === null
                  ? dot.title
                  : `${dot.title} — last moved ${sat === 0 ? 'today' : `${sat} day${sat === 1 ? '' : 's'} ago`}`
              }
              className={cn('mt-1.5 size-2 shrink-0 rounded-full', dot.tone)}
            />
            <div className="min-w-0">
              <p className="truncate">{row.original.itemName}</p>
              {row.original.itemCode && <p className="truncate font-mono text-xs text-ink-muted">{row.original.itemCode}</p>}
            </div>
          </div>
        )
      },
    }),
    // "इसमें ये डिस्ट्रीब्यूटर का इनवॉइस नंबर भी आएगा… किस इनवाइस का कितना
    // स्टॉक है तो पता लगेगा — डेट वाइज, इनवाइस की डेट, इनवाइस का नंबर."
    helper.accessor('invoiceNo', {
      header: 'Invoice',
      cell: ({ row }) => {
        const more = row.original.invoices.length - 1
        return (
          <div className="min-w-[8rem]">
            <p className="font-mono text-sm font-semibold text-black">{row.original.invoiceNo || '—'}</p>
            <p className="text-xs text-ink-muted">
              {row.original.invoiceAt ? shortDate(row.original.invoiceAt) : '—'}
              {more > 0 && <span className="ml-1 text-forest">· +{more} more</span>}
            </p>
          </div>
        )
      },
    }),
    helper.accessor('expiryDate', {
      header: 'Expiry',
      cell: ({ row }) =>
        !row.original.expiryDate ? (
          <span className="text-ink-muted">—</span>
        ) : row.original.expiryState === 'OK' ? (
          <span className="whitespace-nowrap">{shortDate(row.original.expiryDate)}</span>
        ) : (
          <StatusPill tone={EXPIRY_TONE[row.original.expiryState]}>
            {row.original.expiryState === 'EXPIRED' ? 'Expired' : shortDate(row.original.expiryDate)}
          </StatusPill>
        ),
    }),
    // The admin's own figure for stock they already held before this system
    // started counting — "हम खुद से डाल के" — so it is typed, not computed.
    helper.accessor('opening', {
      header: 'Opening',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEditOpening(row.original)
          }}
          title="Set what they already held"
          className="rounded px-1.5 py-0.5 font-mono tabular-nums underline decoration-dotted underline-offset-4 hover:bg-mint-pale"
        >
          {qty(row.original.opening)}
        </button>
      ),
    }),
    helper.accessor('issued', {
      header: 'Issued',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono tabular-nums text-green-deep">{qty(info.getValue())}</span>,
    }),
    helper.accessor('returned', {
      header: 'Returned',
      meta: { align: 'right' },
      cell: (info) => <span className="font-mono tabular-nums text-ink-muted">{qty(info.getValue())}</span>,
    }),
    // Called Closing, to read the same way as the factory's closing figure.
    helper.accessor('held', {
      header: 'Closing',
      meta: { align: 'right' },
      cell: ({ row }) => {
        // "जब इसका स्टॉक कम होगा तो… सिर्फ उसी को रेड करें" — only the closing
        // figure goes red, not the row; the row is reserved for expired stock.
        const low = row.original.stockState === 'LOW' || row.original.stockState === 'OUT'
        return (
          <span className="inline-flex flex-col items-end">
            <span
              title={low ? `Running low — only ${qty(row.original.held)} ${row.original.unit} left` : undefined}
              className={cn('font-mono font-semibold tabular-nums', low ? 'rounded bg-danger-soft px-1.5 py-0.5 text-danger-ink' : 'text-black')}
            >
              {qty(row.original.held)}
            </span>
            <span className="text-xs text-ink-muted">{row.original.unit}</span>
          </span>
        )
      },
    }),
    helper.display({
      id: 'actions',
      header: '',
      meta: { align: 'right', className: 'w-16' },
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowActions
            label={`Actions for ${row.original.distributorName} ${row.original.itemName}`}
            actions={[{ label: 'Record a return', icon: Undo2, onSelect: () => onReturn(row.original) }]}
          />
        </div>
      ),
    }),
  ])
}
