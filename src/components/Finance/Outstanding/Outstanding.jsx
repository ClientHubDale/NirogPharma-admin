import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, IndianRupee, Loader2, Package, ReceiptText, Users } from 'lucide-react'
import { DataTable } from '@/components/data/DataTable'
import { EmptyState } from '@/components/data/EmptyState'
import { Notice } from '@/components/data/Notice'
import { PageHeader } from '@/components/data/PageHeader'
import { Pagination } from '@/components/data/Pagination'
import { SearchInput } from '@/components/data/SearchInput'
import { StatCard } from '@/components/dashboard/StatCard'
import { formatINR } from '@/lib/format'
import { cn } from '@/lib/utils'
import * as paymentsService from '@/services/paymentsService'
import { AGE_BUCKETS, buildItemColumns, buildPartyColumns } from './outstandingColumns'
import { PartyDues } from './PartyDues'

const PAGE_SIZE = 20
const getRowId = (row) => row.distributorId
const getItemId = (row) => row.itemId

/**
 * Finance › Outstanding — what the distributors still owe.
 *
 * Three questions the client asked in one sitting, answered on one screen
 * because they are the same money looked at from three sides:
 *
 *  · which firms owe, and how old the oldest bill is;
 *  · bill by bill, how many days each has been standing — "कितने दिन का है";
 *  · and item-wise — "बकाया किस किस आइटम का है".
 *
 * Money is owed on a **bill**, never on an item, so an item's share has to be
 * apportioned: each line takes the part of its bill's due that matches what
 * the line is worth. That is the only split nobody can argue with, since the
 * cash that came in was never "for the syrup and not the capsules".
 *
 * The figures are the ones Payment In already runs on — a bill counts once it
 * has gone out, a credit note once issued, and a payment **only once the
 * office approves it**. The total here can never disagree with the
 * Outstanding column on the distributor list.
 */
export default function Outstanding() {
  const [data, setData] = useState({ rows: [], totals: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [view, setView] = useState('party') // 'party' | 'item'
  const [search, setSearch] = useState('')
  const [bucket, setBucket] = useState('')
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })
  const [columnVisibility, setColumnVisibility] = useState({})
  const [open, setOpen] = useState(null) // the firm whose bills are being read

  /**
   * One read answers the whole screen — firms, bills and items come back
   * together, because an item's share of a due is worked out bill by bill and
   * splitting that across three calls would only let them disagree.
   */
  useEffect(() => {
    let alive = true
    paymentsService
      .outstanding()
      .then((fresh) => {
        if (!alive) return
        setData(fresh)
        setError(null)
      })
      .catch((e) => alive && setError(paymentsService.errorFrom(e).message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const totals = data.totals
  const partyColumns = useMemo(() => buildPartyColumns(), [])
  const itemColumns = useMemo(() => buildItemColumns(), [])

  /**
   * A firm belongs here while it is carrying an unpaid bill, even if it has
   * paid enough on account to be in credit overall — the ageing ladder counts
   * that bill, so hiding the firm would make the two disagree. A firm with
   * nothing unpaid and money to its name simply has nothing to chase.
   */
  const parties = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.rows.filter(
      (row) =>
        (row.bills.length > 0 || row.outstanding > 0) &&
        (!q || row.distributorName.toLowerCase().includes(q) || (row.mobile ?? '').includes(q)) &&
        (!bucket || (row.buckets?.[bucket] ?? 0) > 0),
    )
  }, [data.rows, search, bucket])

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = totals?.items ?? []
    return q ? all.filter((row) => row.itemName.toLowerCase().includes(q) || (row.itemCode ?? '').toLowerCase().includes(q)) : all
  }, [totals, search])

  const rows = view === 'party' ? parties : items
  const pageCount = Math.max(1, Math.ceil(rows.length / pagination.pageSize))
  const page = pagination.pageIndex < pageCount ? pagination : { ...pagination, pageIndex: 0 }
  /**
   * What the rows on screen are carrying.
   *
   * Firm by firm this is what their unpaid **bills** still carry, not what
   * they net out at: a firm that has paid ahead is in credit, and letting
   * that credit subtract would make the heading read below zero while unpaid
   * bills were plainly listed under it. Credit is said on its own line.
   */
  const shown = rows.reduce((sum, row) => sum + (view === 'party' ? row.billsDue : row.due), 0)
  const shownCredit = view === 'party' ? rows.reduce((sum, row) => sum + Math.max(0, -row.outstanding), 0) : 0

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader title="Outstanding" subtitle="What the distributors still owe — bill by bill, and item by item.">
        {totals && (
          <span className="rounded-full border border-mint-pale bg-white px-3.5 py-2 text-sm font-semibold">
            Showing <span className="font-mono text-green-deep">{formatINR(shown)}</span> on bills{' '}
            {shownCredit > 0 && (
              <span className="ml-1.5 font-normal text-ink-muted">· {formatINR(shownCredit)} paid ahead</span>
            )}
          </span>
        )}
      </PageHeader>

      {error && <Notice tone="danger">{error}</Notice>}

      {totals && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={IndianRupee}
            label="Total outstanding"
            value={formatINR(totals.outstanding)}
            hint={
              totals.inCredit > 0
                ? `${totals.parties} parties owe us · ${formatINR(totals.inCredit)} paid ahead`
                : `${totals.parties} parties owe us`
            }
            tone="danger"
          />
          <StatCard
            icon={CalendarClock}
            label="Past 30 days"
            value={formatINR(totals.overdue)}
            hint={`${totals.partiesPast30Days} parties past a month`}
            tone="warning"
          />
          <StatCard icon={ReceiptText} label="Unpaid bills" value={totals.bills} hint="Still carrying something" />
          <StatCard icon={Package} label="Items owed on" value={totals.items.length} hint="Across every firm" />
        </div>
      )}

      {/* The ageing ladder, which doubles as the filter: tap a rung and the
          list below keeps only the firms carrying something that old. It ages
          the **bills**, so it can stand above what the firms net out at. */}
      {totals && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-muted">How old the unpaid bills are</h2>
            <p className="font-mono text-sm font-semibold">{formatINR(totals.billsDue)} on bills</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {AGE_BUCKETS.map((rung) => {
              const value = totals.buckets[rung.key] ?? 0
              const picked = bucket === rung.key
              return (
                <button
                  key={rung.key}
                  type="button"
                  title={rung.hint}
                  aria-pressed={picked}
                  onClick={() => {
                    setBucket(picked ? '' : rung.key)
                    setView('party')
                  }}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition',
                    picked ? 'border-green-deep bg-mint-pale' : 'border-mint-pale bg-white hover:border-green-deep/40',
                  )}
                >
                  <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{rung.label}</p>
                  <p className={cn('mt-1 font-mono text-xl font-semibold tabular-nums', value ? rung.tone : 'text-ink-muted')}>
                    {formatINR(value)}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-mint-pale bg-white">
        <div className="flex flex-col gap-3 border-b border-mint-pale p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Who owes, or what they owe it on. The client asked for both. */}
          <div className="inline-flex rounded-xl border border-mint-pale bg-bg p-1">
            {[
              { key: 'party', label: 'By party', icon: Users },
              { key: 'item', label: 'By item', icon: Package },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={view === tab.key}
                onClick={() => {
                  setView(tab.key)
                  setPagination((state) => ({ ...state, pageIndex: 0 }))
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold',
                  view === tab.key ? 'bg-white text-black shadow-sm' : 'text-ink-muted hover:text-black',
                )}
              >
                <tab.icon className="size-3.5" /> {tab.label}
              </button>
            ))}
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={view === 'party' ? 'Search distributor…' : 'Search item…'}
            className="sm:w-72"
          />
        </div>

        {view === 'item' && totals && (
          <p className="border-b border-mint-pale bg-bg px-4 py-2 text-xs text-ink-muted">
            An item's share is its part of each unpaid bill, worked out from what the line is worth — money is owed on a bill, never on an
            item. These add up to <span className="font-mono font-semibold">{formatINR(totals.billsDue)}</span> still on the bills, before
            anything paid without naming one.
          </p>
        )}
        {bucket && view === 'party' && (
          <p className="border-b border-mint-pale bg-bg px-4 py-2 text-xs text-ink-muted">
            Only firms carrying something {AGE_BUCKETS.find((rung) => rung.key === bucket)?.label.toLowerCase()} —{' '}
            <button type="button" onClick={() => setBucket('')} className="font-semibold text-green-deep hover:underline">
              show all
            </button>
          </p>
        )}

        {loading ? (
          <div className="grid place-items-center gap-2 py-16 text-ink-muted">
            <Loader2 className="size-5 animate-spin" />
            <p className="text-sm">Adding up the dues…</p>
          </div>
        ) : (
          <>
            <DataTable
              data={rows.slice(page.pageIndex * page.pageSize, (page.pageIndex + 1) * page.pageSize)}
              columns={view === 'party' ? partyColumns : itemColumns}
              getRowId={view === 'party' ? getRowId : getItemId}
              pagination={page}
              onPaginationChange={setPagination}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              onRowClick={view === 'party' ? setOpen : undefined}
              empty={
                <EmptyState
                  icon={ReceiptText}
                  title={search || bucket ? 'Nothing matches that' : 'Nothing is outstanding'}
                  description={
                    search || bucket
                      ? 'Try a different search, or clear the ageing filter.'
                      : 'Every bill that has gone out has been settled.'
                  }
                />
              }
            />
            {rows.length > page.pageSize && (
              <div className="flex justify-end border-t border-mint-pale p-3">
                <Pagination
                  pageIndex={page.pageIndex}
                  pageSize={page.pageSize}
                  total={rows.length}
                  onPageChange={(pageIndex) => setPagination((state) => ({ ...state, pageIndex }))}
                />
              </div>
            )}
          </>
        )}
      </section>

      <PartyDues firm={open} onClose={() => setOpen(null)} />
    </div>
  )
}
