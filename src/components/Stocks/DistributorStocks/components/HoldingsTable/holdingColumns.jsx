import { createColumnHelper } from '@tanstack/react-table'
import { Undo2 } from 'lucide-react'
import { listFeatures } from '@/components/data/DataTable'
import { RowActions } from '@/components/data/RowActions'
import { StatusPill } from '@/components/data/StatusPill'
import { EXPIRY_TONE } from '../../../stockModel'

const helper = createColumnHelper(listFeatures)

const qty = (value) => (Number(value) ? Number(value).toLocaleString('en-IN') : '—')
const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** What one distributor holds of one batch. */
export function buildHoldingColumns({ onReturn }) {
  return helper.columns([
    helper.accessor('distributorName', {
      header: 'Distributor',
      cell: (info) => <span className="font-semibold text-black">{info.getValue() || '—'}</span>,
    }),
    helper.accessor('itemName', {
      header: 'Item',
      cell: ({ row }) => (
        <div className="min-w-[11rem]">
          <p className="truncate">{row.original.itemName}</p>
          {row.original.itemCode && <p className="truncate font-mono text-xs text-ink-muted">{row.original.itemCode}</p>}
        </div>
      ),
    }),
    helper.accessor('batchNo', {
      header: 'Batch No',
      cell: (info) => <span className="font-mono text-sm font-semibold text-black">{info.getValue()}</span>,
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
    // No Opening here: "ओपनिंग तो यहाँ पर रिमूव होगा, ओपनिंग का तो काम नहीं है."
    // A distributor's holding is simply what was issued less what came back.
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
      cell: ({ row }) => (
        <span className="inline-flex flex-col items-end">
          <span className="font-mono font-semibold text-black tabular-nums">{qty(row.original.held)}</span>
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
            label={`Actions for ${row.original.distributorName} batch ${row.original.batchNo}`}
            actions={[{ label: 'Record a return', icon: Undo2, onSelect: () => onReturn(row.original) }]}
          />
        </div>
      ),
    }),
  ])
}
