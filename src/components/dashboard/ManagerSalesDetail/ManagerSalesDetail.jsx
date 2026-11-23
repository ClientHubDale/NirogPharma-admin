import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { formatINR, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Manager-wise sales, opened from the dashboard.
 *
 * The manager's name first, and under it every bill their firms were sent
 * that month — party, bill number, what it came to and what is still unpaid
 * — then that manager's total. Then the next manager. That is the shape the
 * client described, and the reason it is grouped rather than a flat list:
 * the question being asked is "how is each manager doing", not "what sold".
 *
 * Pressing a bill opens the bill, so the figure can always be traced back to
 * the paper it came from.
 */
export function ManagerSalesDetail({ report, open, onClose }) {
  const navigate = useNavigate()
  const [openManager, setOpenManager] = useState(null)

  const managers = report?.managers ?? []

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOpenManager(null)
          onClose()
        }
      }}
      title={`Manager-wise sales — ${report?.label ?? ''}`}
      description="Each manager's firms, the bills they were sent this month, and what is still unpaid on them."
      // Wider than the usual modal: five columns of figures need the room.
      className="max-w-4xl"
    >
      {managers.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No bills went out this month.</p>
      ) : (
        <div className="space-y-3">
          {managers.map((manager) => {
            const id = manager.managerId || 'none'
            const isOpen = openManager === id
            return (
              <section key={id} className="overflow-hidden rounded-xl border border-mint-pale">
                <button
                  type="button"
                  onClick={() => setOpenManager(isOpen ? null : id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 bg-mint-pale/50 px-4 py-3 text-left hover:bg-mint-pale"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-black">{manager.managerName}</span>
                      <span className="block text-xs text-ink-muted">
                        {manager.bills.length} bill{manager.bills.length === 1 ? '' : 's'}
                        {manager.outstanding > 0 && ` · ${formatINR(manager.outstanding)} still unpaid`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-black tabular-nums">{formatINR(manager.sales)}</span>
                </button>

                {isOpen && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-mint-pale bg-bg text-left text-[10px] font-bold tracking-wide text-ink-muted uppercase">
                        <th className="w-10 px-3 py-2">#</th>
                        <th className="px-3 py-2">Party</th>
                        <th className="px-3 py-2">Invoice</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-right">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mint-pale">
                      {manager.bills.map((bill, index) => (
                        <tr key={bill.invoiceId}>
                          <td className="px-3 py-2 font-mono text-xs text-ink-muted">{index + 1}</td>
                          <td className="px-3 py-2">
                            <span className="block text-ink">{bill.party}</span>
                            <span className="block text-xs text-ink-muted">{formatShortDate(bill.invoiceDate)}</span>
                          </td>
                          <td className="px-3 py-2">
                            {/* The bill itself is a press away — "उसका इनवाइस
                                क्लिक करे तो उसका इनवाइस आ जाए सामने". */}
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/sales/invoices/${bill.invoiceId}/edit`)}
                              className="font-mono text-xs font-semibold text-green-deep hover:underline"
                            >
                              {bill.invoiceNo}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{formatINR(bill.amount)}</td>
                          <td
                            className={cn(
                              'px-3 py-2 text-right font-mono tabular-nums',
                              bill.outstanding > 0 ? 'text-danger' : 'text-ink-muted',
                            )}
                          >
                            {formatINR(bill.outstanding)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-mint bg-mint-pale/40 font-semibold">
                        <td className="px-3 py-2" colSpan={3}>
                          {manager.managerName} total
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatINR(manager.sales)}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatINR(manager.outstanding)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </section>
            )
          })}

          <p className="pt-1 text-right text-sm font-semibold text-black">
            All managers: <span className="font-mono">{formatINR(report?.totals?.sales ?? 0)}</span>
          </p>
        </div>
      )}
    </Modal>
  )
}
