import { useEffect, useMemo, useState } from 'react'
import { BellRing, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import { formatINR, formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import * as remindersService from '@/services/remindersService'

/**
 * Reminders on bills that have gone unpaid.
 *
 * Two audiences, deliberately not treated the same. The manager and the
 * executive who look after a firm are told automatically once a bill passes
 * thirty days, and told again every alternate day until it is paid — that
 * happens on the server and there is nothing to press here.
 *
 * The firm itself is only ever told on purpose. The client was plain about
 * why: "डिस्ट्रीब्यूटर नाराज़ हो जाते हैं" — a distributor takes offence at
 * being chased by a machine. So the office ticks the bills it is willing to
 * chase and presses Send, and what was sent stays on the record.
 */
export function RemindersDetail({ open, onClose, onSent }) {
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [sentLog, setSentLog] = useState([])
  const [ticked, setTicked] = useState(() => new Set())
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState('')

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    setFailed('')
    Promise.all([remindersService.overdue(), remindersService.sent({ limit: 20 })])
      .then(([found, log]) => {
        if (!alive) return
        setReport(found)
        setSentLog(log)
        setTicked(new Set())
      })
      .catch((error) => alive && setFailed(remindersService.errorFrom(error)))
    return () => {
      alive = false
    }
  }, [open])

  const bills = report?.bills ?? []
  const chosen = useMemo(() => bills.filter((bill) => ticked.has(bill.invoiceId)), [bills, ticked])
  const chosenTotal = chosen.reduce((sum, bill) => sum + bill.due, 0)

  const toggle = (id) =>
    setTicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const allTicked = bills.length > 0 && ticked.size === bills.length

  const send = async () => {
    if (!chosen.length) return
    setSending(true)
    setFailed('')
    try {
      await remindersService.sendToDistributors(chosen.map((bill) => bill.invoiceId))
      const [found, log] = await Promise.all([remindersService.overdue(), remindersService.sent({ limit: 20 })])
      setReport(found)
      setSentLog(log)
      setTicked(new Set())
      onSent?.(chosen.length)
    } catch (error) {
      setFailed(remindersService.errorFrom(error))
    } finally {
      setSending(false)
    }
  }

  /** When this firm was last told about this bill, if it ever was. */
  const lastToldOf = (bill) =>
    sentLog.find((row) => row.invoiceId === bill.invoiceId)?.raisedAt ??
    sentLog.find((row) => row.distributorId === bill.distributorId)?.raisedAt ??
    null

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={`Payment reminders — bills past ${report?.afterDays ?? 30} days`}
      description="The manager and executive are told automatically, every alternate day, until the bill is paid. A firm is told only when you tick it and press Send."
      className="max-w-4xl"
    >
      {failed && <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{failed}</p>}

      {!report ? (
        <p className="py-8 text-center text-sm text-ink-muted">Reading the dues…</p>
      ) : bills.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Nothing has gone past {report.afterDays} days. There is nobody to chase.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mint-pale/50 px-4 py-3">
            <p className="text-sm text-ink">
              <span className="font-semibold text-black">{bills.length}</span> bill{bills.length === 1 ? '' : 's'} across{' '}
              <span className="font-semibold text-black">{report.parties}</span> firm{report.parties === 1 ? '' : 's'}, worth{' '}
              <span className="font-mono font-semibold text-black">{formatINR(report.amount)}</span>
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={allTicked}
                onChange={() => setTicked(allTicked ? new Set() : new Set(bills.map((bill) => bill.invoiceId)))}
                className="size-4 accent-green-deep"
                data-testid="reminder-tick-all"
              />
              Tick every bill
            </label>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mint-pale text-left text-[10px] font-bold tracking-wide text-ink-muted uppercase">
                <th className="w-10 px-3 py-2">Send</th>
                <th className="px-3 py-2">Firm</th>
                <th className="px-3 py-2">Bill</th>
                <th className="px-3 py-2 text-right">Days</th>
                <th className="px-3 py-2 text-right">Unpaid</th>
                <th className="px-3 py-2">Last told</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mint-pale">
              {bills.map((bill) => {
                const told = lastToldOf(bill)
                return (
                  <tr key={bill.invoiceId} className={cn(ticked.has(bill.invoiceId) && 'bg-mint-pale/30')}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={ticked.has(bill.invoiceId)}
                        onChange={() => toggle(bill.invoiceId)}
                        aria-label={`Send a reminder to ${bill.distributorName} about ${bill.invoiceNo}`}
                        className="size-4 accent-green-deep"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="block text-ink">{bill.distributorName}</span>
                      <span className="block font-mono text-xs text-ink-muted">{bill.mobile || '—'}</span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/sales/invoices/${bill.invoiceId}/edit`)}
                        className="font-mono text-xs font-semibold text-green-deep hover:underline"
                      >
                        {bill.invoiceNo}
                      </button>
                      <span className="block text-xs text-ink-muted">{formatShortDate(bill.invoiceDate)}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {/* Past ninety days is a different conversation from past thirty. */}
                      <span className={cn(bill.days > 90 ? 'font-semibold text-danger' : bill.days > 60 ? 'text-warning' : 'text-ink')}>
                        {bill.days}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-danger">{formatINR(bill.due)}</td>
                    <td className="px-3 py-2 text-xs text-ink-muted">{told ? formatShortDate(told.slice(0, 10)) : 'Never'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mint-pale pt-3">
            <p className="text-sm text-ink-muted">
              {chosen.length ? `${chosen.length} ticked · ${formatINR(chosenTotal)}` : 'Tick the bills whose firms you want chased.'}
            </p>
            <Button type="button" onClick={send} disabled={!chosen.length || sending} data-testid="reminder-send">
              <Send data-icon="inline-start" />
              {sending ? 'Sending…' : `Send to ${chosen.length || 'nobody'}`}
            </Button>
          </div>

          {sentLog.length > 0 && (
            <section className="rounded-xl border border-mint-pale p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-ink-muted uppercase">
                <BellRing className="size-3.5" /> Already told
              </h3>
              <ul className="space-y-1 text-xs text-ink-muted">
                {sentLog.slice(0, 6).map((row) => (
                  <li key={row.id}>
                    {formatShortDate(row.raisedAt?.slice(0, 10))} — {row.distributorName} about{' '}
                    <span className="font-mono">{row.invoiceNo}</span>
                    {row.raisedByName && `, by ${row.raisedByName}`}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  )
}
