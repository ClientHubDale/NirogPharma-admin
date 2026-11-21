import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { formatINR, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ageTone } from './outstandingColumns'

/**
 * One firm's dues, opened from the Outstanding list.
 *
 * Bill by bill, oldest first, each saying how many days it has been standing
 * — "कितने दिन का है, डेट वाइज" — and each opening to show which items that
 * bill's money is sitting in. Under them, the same dues added up item-wise
 * across every bill, which is what the client asked outright at 8:27.
 */
export function PartyDues({ firm, onClose }) {
  const [openBill, setOpenBill] = useState(null)
  const [tab, setTab] = useState('bills')

  const bills = firm?.bills ?? []
  const items = firm?.items ?? []

  return (
    <Modal
      open={Boolean(firm)}
      onOpenChange={(open) => {
        if (!open) {
          setOpenBill(null)
          setTab('bills')
          onClose()
        }
      }}
      title={firm?.distributorName ?? ''}
      description={
        firm
          ? `${formatINR(firm.outstanding)} outstanding${firm.onAccount ? ` · ${formatINR(firm.onAccount)} paid on account` : ''}`
          : ''
      }
      className="max-w-3xl"
    >
      <div className="mb-4 inline-flex rounded-xl border border-mint-pale bg-bg p-1">
        {[
          { key: 'bills', label: `Bills (${bills.length})` },
          { key: 'items', label: `Items (${items.length})` },
        ].map((one) => (
          <button
            key={one.key}
            type="button"
            aria-pressed={tab === one.key}
            onClick={() => setTab(one.key)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm font-semibold',
              tab === one.key ? 'bg-white text-black shadow-sm' : 'text-ink-muted hover:text-black',
            )}
          >
            {one.label}
          </button>
        ))}
      </div>

      {tab === 'bills' ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
              <th className="py-2 pr-3">Invoice</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3 text-right">Age</th>
              <th className="py-2 pr-3 text-right">Bill</th>
              <th className="py-2 pr-3 text-right">Paid</th>
              <th className="py-2 text-right">Due</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => {
              const shown = openBill === bill.id
              return (
                <Fragment key={bill.id}>
                  <tr
                    onClick={() => setOpenBill(shown ? null : bill.id)}
                    className="cursor-pointer border-b border-mint-pale/70 hover:bg-bg"
                  >
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-black">
                        {shown ? <ChevronDown className="size-3.5 text-ink-muted" /> : <ChevronRight className="size-3.5 text-ink-muted" />}
                        {bill.invoiceNo}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-ink-muted">{formatShortDate(bill.invoiceDate)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      <span className={cn('rounded px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums', ageTone(bill.days))}>
                        {bill.days}d
                      </span>
                      {/* Past the credit period they were given, the money is
                          late rather than merely open. */}
                      {bill.creditDays > 0 && (
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {bill.overdueDays > 0 ? `${bill.overdueDays}d late` : `${bill.creditDays}d terms`}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-muted">{formatINR(bill.total)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-muted">
                      {bill.received || bill.credited ? formatINR(bill.received + bill.credited) : '—'}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-black">{formatINR(bill.due)}</td>
                  </tr>
                  {shown && (
                    <tr className="border-b border-mint-pale/70 bg-bg">
                      <td colSpan={6} className="px-3 py-3">
                        <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">What this bill's due sits in</p>
                        <ul className="space-y-1.5">
                          {bill.lines.map((line) => (
                            <li key={line.itemId} className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="min-w-0">
                                <span className="font-medium text-black">{line.itemName}</span>{' '}
                                <span className="text-xs text-ink-muted">
                                  {Number(line.quantity).toLocaleString('en-IN')} {line.unit}
                                  {line.credited > 0 && ` · ${formatINR(line.credited)} credited back`}
                                </span>
                              </span>
                              <span className="font-mono tabular-nums whitespace-nowrap">{formatINR(line.due)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
              <th className="py-2 pr-3">Item</th>
              <th className="py-2 pr-3 text-right">On bills</th>
              <th className="py-2 pr-3 text-right">Quantity</th>
              <th className="py-2 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.itemId} className="border-b border-mint-pale/70">
                <td className="py-2.5 pr-3">
                  <p className="font-medium text-black">{item.itemName}</p>
                  {item.itemCode && <p className="font-mono text-xs text-ink-muted">{item.itemCode}</p>}
                </td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-muted">{item.bills}</td>
                <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                  {Number(item.quantity).toLocaleString('en-IN')} <span className="text-xs text-ink-muted">{item.unit}</span>
                </td>
                <td className="py-2.5 text-right font-mono font-semibold tabular-nums text-black">{formatINR(item.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!bills.length && <p className="py-6 text-center text-sm text-ink-muted">Nothing is standing against this firm.</p>}

      {/* Money that named no bill. It is theirs, not any bill's, so it is said
          here rather than quietly knocked off one of the rows above. */}
      {firm?.onAccount > 0 && (
        <p className="mt-4 rounded-xl border border-mint-pale bg-bg px-3.5 py-2.5 text-xs text-ink-muted">
          <span className="font-semibold text-green-deep">{formatINR(firm.onAccount)}</span> was paid or credited without naming a bill,
          so it is set against the firm rather than against any one of these.
        </p>
      )}
    </Modal>
  )
}
