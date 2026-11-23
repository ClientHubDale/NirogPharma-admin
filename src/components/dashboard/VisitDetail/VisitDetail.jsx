import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, MapPin, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import * as visitsService from '@/services/visitsService'

/**
 * Who called on which firm, and who nobody reached.
 *
 * Read the way the client reads it: pick a manager, pick the days, and see
 * each of their firms with how many times it was called on, opening into the
 * dates themselves. The dashboard card used to say "View routes" and go to
 * the areas screen, which answered a different question entirely.
 *
 * Underneath, the firms nobody went to. He asked for those to flash, and the
 * reason is sound — a list of visits made cannot tell you what was skipped,
 * and the skipped ones are the whole point of looking.
 */
export function VisitDetail({ open, onClose, managers = [] }) {
  const [managerId, setManagerId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [report, setReport] = useState(null)
  const [openFirm, setOpenFirm] = useState(null)
  const [failed, setFailed] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    setLoading(true)
    setFailed('')
    visitsService
      .report({ managerId, from, to })
      .then((found) => alive && setReport(found))
      .catch((error) => alive && setFailed(visitsService.errorFrom(error)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [open, managerId, from, to])

  const rows = report?.rows ?? []
  const missed = report?.notVisited ?? []

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOpenFirm(null)
          onClose()
        }
      }}
      title="Distributor visits"
      description="Pick a manager and the days. Each firm shows how many times it was called on; press one for the dates."
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">Manager</span>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              data-testid="visit-manager"
              className="w-full rounded-lg border border-mint bg-white px-3 py-2 text-sm outline-none focus:border-green-deep"
            >
              <option value="">Every manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="visit-from"
              className="w-full rounded-lg border border-mint bg-white px-3 py-2 text-sm outline-none focus:border-green-deep"
            />
          </label>
          <label className="space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-wide text-ink-muted uppercase">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="visit-to"
              className="w-full rounded-lg border border-mint bg-white px-3 py-2 text-sm outline-none focus:border-green-deep"
            />
          </label>
        </div>

        {failed && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{failed}</p>}

        {loading ? (
          <p className="py-8 text-center text-sm text-ink-muted">Reading the visits…</p>
        ) : !report ? null : (
          <>
            <p className="rounded-xl bg-mint-pale/50 px-4 py-3 text-sm text-ink">
              <span className="font-semibold text-black">{report.visits}</span> visit{report.visits === 1 ? '' : 's'} on{' '}
              <span className="font-semibold text-black">{report.visited}</span> of {report.firms} firms, {formatShortDate(report.from)} to{' '}
              {formatShortDate(report.to)}.
            </p>

            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">
                Nobody was recorded as visiting anyone in these days. Visits are recorded by the field app.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mint-pale text-left text-[10px] font-bold tracking-wide text-ink-muted uppercase">
                    <th className="w-10 px-3 py-2">#</th>
                    <th className="px-3 py-2">Distributor</th>
                    <th className="px-3 py-2">Manager</th>
                    <th className="px-3 py-2 text-right">Visits</th>
                    <th className="px-3 py-2">Last</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mint-pale">
                  {rows.map((row, index) => {
                    const isOpen = openFirm === row.distributorId
                    return (
                      <Fragment key={row.distributorId}>
                        <tr>
                          <td className="px-3 py-2 font-mono text-xs text-ink-muted">{index + 1}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setOpenFirm(isOpen ? null : row.distributorId)}
                              aria-expanded={isOpen}
                              className="flex items-center gap-1.5 text-left font-medium text-ink hover:text-green-deep"
                            >
                              {isOpen ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                              {row.distributorName}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-xs text-ink-muted">{row.managerName || '—'}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">{row.visits}</td>
                          <td className="px-3 py-2 text-xs text-ink-muted">
                            {row.lastVisitedAt ? formatShortDate(row.lastVisitedAt) : '—'}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-bg">
                            <td />
                            <td className="px-3 py-2" colSpan={4}>
                              <ul className="space-y-1 text-xs">
                                {row.dates.map((visit) => (
                                  <li key={visit.id} className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-ink">{formatShortDate(visit.date)}</span>
                                    <span className="text-ink-muted">{visit.byName || 'Not recorded'}</span>
                                    <span
                                      className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                                        visit.status === 'VISITED' ? 'bg-green-deep/10 text-green-deep' : 'bg-mint-pale text-ink-muted',
                                      )}
                                    >
                                      {visit.status}
                                    </span>
                                    {visit.latitude != null && (
                                      /* Where the device was, so a visit can be
                                         told from a tick in a box. */
                                      <a
                                        href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-green-deep hover:underline"
                                      >
                                        <MapPin className="size-3" /> on the map
                                      </a>
                                    )}
                                    {visit.note && <span className="text-ink-muted italic">“{visit.note}”</span>}
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
            )}

            {missed.length > 0 && (
              <section className="rounded-xl border border-danger/30 bg-danger/5 p-3">
                <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-danger uppercase">
                  <TriangleAlert className="size-3.5 animate-pulse" />
                  Nobody went — {missed.length} firm{missed.length === 1 ? '' : 's'}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {missed.map((row) => (
                    <li
                      key={row.distributorId}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-danger ring-1 ring-danger/30"
                    >
                      {row.distributorName}
                      {row.managerName && <span className="font-normal text-ink-muted"> · {row.managerName}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
