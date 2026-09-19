import { cn } from '@/lib/utils'
import { formatINR, formatShortDate } from '@/lib/format'
import { TONE_CLASSES, toneForOverdueDays } from '@/lib/status'

/** Unpaid bills, oldest first. Days is a status pill (label + colour, never colour alone). */
export function OverdueBillsTable({ bills }) {
  return (
    <div className="relative -mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[26rem] text-sm">
        <thead>
          <tr className="border-b border-mint-pale text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
            <th className="px-5 pb-2.5 font-semibold sm:pl-6">Date</th>
            <th className="px-2 pb-2.5 font-semibold">Party</th>
            <th className="px-2 pb-2.5 text-right font-semibold">Pending</th>
            <th className="px-5 pb-2.5 text-right font-semibold sm:pr-6">Days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-mint-pale">
          {bills.map((bill) => {
            const tone = TONE_CLASSES[toneForOverdueDays(bill.days)]
            return (
              <tr key={bill.id} className="hover:bg-bg">
                <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-ink-muted sm:pl-6">
                  {formatShortDate(bill.date)}
                </td>
                <td className="px-2 py-3 font-medium text-ink">{bill.party}</td>
                <td className="px-2 py-3 text-right font-mono font-medium whitespace-nowrap text-black tabular-nums">
                  {formatINR(bill.pending)}
                </td>
                <td className="px-5 py-3 text-right sm:pr-6">
                  <span
                    className={cn('inline-block min-w-9 rounded-full px-2 py-0.5 text-center font-mono text-xs font-semibold', tone.soft, tone.ink)}
                  >
                    {bill.days}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
