import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { formatINR, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Executive Secondary, opened from the dashboard.
 *
 * Secondary sales are what the executive books standing in the shop or the
 * clinic; the distributor is who fulfils it and who we bill. So every row has
 * both — the firm that will be billed, and the shop or doctor it was actually
 * booked from, which is the column the client asked for by name.
 *
 * The status light is his too: green once the distributor has confirmed the
 * goods went out, red until then, and the office can set it either way.
 * Pressing the shop's name opens the bill it became, when there is one.
 */
export function SecondaryDetail({ report, open, onClose }) {
  const navigate = useNavigate()
  const [openPerson, setOpenPerson] = useState(null)

  const executives = report?.executives ?? []

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOpenPerson(null)
          onClose()
        }
      }}
      title={`Executive Secondary — ${report?.label ?? ''}`}
      description="What the field booked this month, against the target, with the shop or doctor behind each order."
      className="max-w-5xl"
    >
      {executives.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Nothing has been booked this month.</p>
      ) : (
        <div className="space-y-3">
          {/* Where the month itself has got to — the figure that makes a
              percentage mean anything. "आज पंद्रह तारीख है, इतना बाकी है". */}
          <p className="rounded-xl bg-mint-pale/50 px-4 py-3 text-sm text-ink">
            Day <span className="font-semibold text-black">{report.asOfDay}</span> of {report.daysInMonth} —{' '}
            <span className="font-semibold text-black">{report.elapsed}%</span> of the month gone. Booked{' '}
            <span className="font-mono font-semibold text-black">{formatINR(report.booked)}</span>
            {report.target > 0 && (
              <>
                {' '}
                of <span className="font-mono font-semibold text-black">{formatINR(report.target)}</span>, leaving{' '}
                <span className="font-mono font-semibold text-danger">{formatINR(report.remaining)}</span>
              </>
            )}
            .
          </p>

          {executives.map((person) => {
            const id = person.executiveId || 'none'
            const isOpen = openPerson === id
            return (
              <section key={id} className="overflow-hidden rounded-xl border border-mint-pale">
                <button
                  type="button"
                  onClick={() => setOpenPerson(isOpen ? null : id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 bg-mint-pale/50 px-4 py-3 text-left hover:bg-mint-pale"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {isOpen ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-black">{person.executiveName}</span>
                      <span className="block text-xs text-ink-muted">
                        {person.orders} order{person.orders === 1 ? '' : 's'}
                        {person.target > 0 && ` · target ${formatINR(person.target)}`}
                        {person.pending > 0 && ` · ${person.pending} not dispatched`}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono font-semibold text-black tabular-nums">{formatINR(person.booked)}</span>
                    {person.percent !== null && (
                      /* Behind where the calendar says they should be, or not. */
                      <span className={cn('block text-xs font-semibold', person.onTrack ? 'text-green-deep' : 'text-danger')}>
                        {person.percent}% {person.onTrack ? 'on track' : `behind ${formatINR(person.expected)}`}
                      </span>
                    )}
                  </span>
                </button>

                {isOpen &&
                  (person.rows.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-ink-muted">{person.executiveName} booked nothing this month.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-mint-pale bg-bg text-left text-[10px] font-bold tracking-wide text-ink-muted uppercase">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Order no</th>
                          <th className="px-3 py-2">Distributor</th>
                          <th className="px-3 py-2">Shop / Doctor</th>
                          <th className="px-3 py-2">Mobile</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mint-pale">
                        {person.rows.map((row) => (
                          <tr key={row.id}>
                            <td className="px-3 py-2 whitespace-nowrap text-xs text-ink-muted">{formatShortDate(row.orderDate)}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/sales/orders/${row.id}/edit`)}
                                className="font-mono text-xs font-semibold text-green-deep hover:underline"
                              >
                                {row.orderNo}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-ink">{row.distributorName}</td>
                            <td className="px-3 py-2">
                              {/* "डॉक्टर का नाम क्लिक करे तो इनवाइस खुल जाए" —
                                  the name opens the bill, once it has one. */}
                              {row.shopName ? (
                                row.invoiceId ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/admin/sales/invoices/${row.invoiceId}/edit`)}
                                    className="font-semibold text-green-deep hover:underline"
                                  >
                                    {row.shopName}
                                  </button>
                                ) : (
                                  <span className="text-ink">{row.shopName}</span>
                                )
                              ) : (
                                <span className="text-ink-muted">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-ink-muted">{row.mobile || '—'}</td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">{formatINR(row.amount)}</td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                  row.dispatched ? 'bg-green-deep/10 text-green-deep' : 'bg-danger/10 text-danger',
                                )}
                              >
                                <span className={cn('size-1.5 rounded-full', row.dispatched ? 'bg-green-deep' : 'bg-danger')} />
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-mint bg-mint-pale/40 font-semibold">
                          <td className="px-3 py-2" colSpan={5}>
                            {person.executiveName} total
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">{formatINR(person.booked)}</td>
                          <td className="px-3 py-2" />
                        </tr>
                      </tfoot>
                    </table>
                  ))}
              </section>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
