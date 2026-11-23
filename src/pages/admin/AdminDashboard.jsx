import {
  AlarmClock,
  BellRing,
  Building2,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  Clock3,
  Hourglass,
  IndianRupee,
  ReceiptText,
  Send,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { AppDownloadStrip } from '@/components/dashboard/AppDownloadStrip'
import { BarList } from '@/components/dashboard/BarList'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { ListRow } from '@/components/dashboard/ListRow'
import { OverdueBillsTable } from '@/components/dashboard/OverdueBillsTable'
import { SalesTrendChart } from '@/components/dashboard/SalesTrendChart'
import { SetupBanner } from '@/components/dashboard/SetupBanner'
import { StatCard } from '@/components/dashboard/StatCard'
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ManagerSalesDetail } from '@/components/dashboard/ManagerSalesDetail'
import { DateRangeFilter } from '@/components/form/DateRangeFilter'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/ui/button'
import * as reportsService from '@/services/reportsService'
import * as distributorsService from '@/services/distributorsService'
import { PartyDues } from '@/components/Finance/Outstanding/PartyDues'
import { presetRange } from '@/lib/dateRange'
import { formatINR, formatINRCompact, formatShortDate } from '@/lib/format'
import * as paymentsService from '@/services/paymentsService'
import { toneForOverdueDays, toneForVisits } from '@/lib/status'
import {
  adminKpis as kpi,
  adminSetupSteps,
  attentionItems,
  creditNotes,
  distributorVisits,
  salesTrend,
  VISIT_TARGET_PER_MONTH,
} from '@/mocks/dashboard'
import { selectUser } from '@/store/authSlice'

const ATTENTION = {
  pending: { icon: Hourglass, tone: 'warning' },
  overdue: { icon: BellRing, tone: 'danger' },
  late: { icon: AlarmClock, tone: 'warning' },
}

const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

/** Scale a list's values to 0–100 against its largest entry. */
const asPercent = (value, max) => (max ? (value / max) * 100 : 0)

export default function AdminDashboard() {
  const user = useSelector(selectUser)
  const today = salesTrend[salesTrend.length - 1]

  /**
   * The dues are real, read from the same place Finance › Outstanding reads
   * them — "इसको होम पेज पे भी डालना है" (21:42). The rest of this page is
   * still the sample data it was built against.
   */
  const [dues, setDues] = useState(null)
  /// The firm whose bills are open, straight from the dues already loaded.
  const [openFirm, setOpenFirm] = useState(null)

  /**
   * Sales month by month. The tile shows this month; the rupee sign opens
   * into the six behind it — "छह महीने का तो दिखाओ पीछे का" — with Custom
   * underneath for any other stretch of days.
   */
  const [sales, setSales] = useState(null)
  const [custom, setCustom] = useState(null) // { preset, start, end } while picking
  const [customTotal, setCustomTotal] = useState(null)
  /// Which month the tile is showing; null means the current one.
  const [shownMonth, setShownMonth] = useState(null)

  /// Manager-wise sales for the month, and whether the breakdown is open.
  const [managerReport, setManagerReport] = useState(null)
  const [managersOpen, setManagersOpen] = useState(false)

  /// Firms put on the books lately, to be grouped under whoever added them.
  const [firms, setFirms] = useState([])
  const [openAdder, setOpenAdder] = useState(null)

  useEffect(() => {
    let alive = true
    reportsService
      .salesMonthly({ months: 6 })
      .then((fresh) => alive && setSales(fresh))
      .catch(() => alive && setSales(null))
    reportsService
      .salesByManager()
      .then((fresh) => alive && setManagerReport(fresh))
      .catch(() => alive && setManagerReport(null))
    distributorsService
      .listDistributors({ limit: 500 })
      .then((fresh) => alive && setFirms(fresh.distributors ?? []))
      .catch(() => alive && setFirms([]))
    return () => {
      alive = false
    }
  }, [])

  /**
   * New distributors, gathered under the manager who owns them — the list
   * repeated a manager's name once per firm before, which is what the client
   * was pointing at. Three months back, as he asked.
   */
  const NEW_FIRM_MONTHS = 3
  const addedByManager = useMemo(() => {
    const since = new Date()
    since.setMonth(since.getMonth() - NEW_FIRM_MONTHS)
    const cutoff = since.toISOString().slice(0, 10)

    const groups = new Map()
    for (const firm of firms) {
      if (!firm.createdAt || firm.createdAt < cutoff) continue
      const key = firm.managerId || 'none'
      if (!groups.has(key)) groups.set(key, { id: key, name: firm.managerName || 'No manager', firms: [] })
      groups.get(key).firms.push(firm)
    }
    for (const group of groups.values()) group.firms.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return [...groups.values()].sort((a, b) => b.firms.length - a.firms.length)
  }, [firms])

  /// The month on the tile: whichever was picked, else the current one.
  const shown = (sales?.months ?? []).find((m) => m.key === shownMonth) ?? sales?.current ?? null
  useEffect(() => {
    let alive = true
    paymentsService
      .outstanding()
      .then((fresh) => alive && setDues(fresh))
      .catch(() => alive && setDues(null))
    return () => {
      alive = false
    }
  }, [])

  /** The oldest unpaid bills across every firm — what to chase first. */
  const overdueBills = useMemo(
    () =>
      (dues?.rows ?? [])
        .flatMap((row) => row.bills.map((bill) => ({ ...bill, party: row.distributorName })))
        .sort((a, b) => b.days - a.days)
        .slice(0, 5)
        .map((bill) => ({ id: bill.id, date: bill.invoiceDate, party: bill.party, pending: bill.due, days: bill.days })),
    [dues],
  )

  const distributorOutstanding = useMemo(
    () =>
      (dues?.rows ?? [])
        .filter((row) => row.outstanding > 0)
        .slice(0, 5)
        .map((row) => ({
          id: row.distributorId,
          name: row.distributorName,
          amount: row.outstanding,
          oldestDays: row.oldestDays,
          bills: row.bills.length,
        })),
    [dues],
  )
  const maxOutstanding = Math.max(1, ...distributorOutstanding.map((d) => d.amount))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <WelcomeHeader align="left" name={user.name.toUpperCase()} subtitle="Here’s how the business is doing today." />
        <p className="text-sm font-medium text-ink-muted">{todayLabel}</p>
      </div>

      <SetupBanner steps={adminSetupSteps} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/**
         * The month is named rather than left as "this month" — "यहाँ पर मंथ
         * का नाम आना चाहिए" — and the rupee sign opens into the months behind
         * it, each with its own total, with Custom for anything else.
         */}
        <StatCard
          label={shown ? `Sales — ${shown.label}` : 'Sales this month'}
          value={sales ? formatINRCompact(shown?.total ?? 0) : '—'}
          hint={
            shownMonth
              ? `${shown?.invoices ?? 0} bill${shown?.invoices === 1 ? '' : 's'}`
              : sales?.changePct === null || sales?.changePct === undefined
                ? sales
                  ? 'No month before this to compare'
                  : 'Adding up…'
                : `${sales.changePct > 0 ? '+' : ''}${sales.changePct}% vs last month`
          }
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Sales month by month"
                className="grid size-9 shrink-0 place-items-center rounded-lg bg-mint-pale text-green-deep transition-colors hover:bg-mint focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <IndianRupee className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>Sales, month by month</DropdownMenuLabel>
                {(sales?.months ?? []).map((month) => (
                  <DropdownMenuItem
                    key={month.key}
                    onSelect={() => {
                      setShownMonth(month.key === sales.current?.key ? null : month.key)
                      setCustomTotal(null)
                    }}
                    className="justify-between gap-4"
                  >
                    <span>{month.label}</span>
                    <span className="font-mono text-xs tabular-nums">{formatINRCompact(month.total)}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {/* Opened after the menu has closed. A dialog raised from
                    inside an open menu fights it for the focus and loses. */}
                <DropdownMenuItem onSelect={() => setTimeout(() => setCustom({ preset: 'thisMonth', ...presetRange('thisMonth') }), 0)}>
                  Custom dates…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
        <StatCard
          icon={UsersRound}
          label="Active field staff"
          value={`${kpi.staffActive} / ${kpi.staffTotal}`}
          hint={`${kpi.staffTotal - kpi.staffActive} not checked in yet`}
          tone={kpi.staffTotal - kpi.staffActive > 0 ? 'warning' : 'success'}
        />
        <StatCard
          icon={ReceiptText}
          label="Outstanding dues"
          value={dues ? formatINRCompact(dues.totals.outstanding) : '—'}
          /**
           * Bills, not firms — "एक पार्टी के 23 बिल हैं जो 30 दिन से ऊपर की
           * हो रही है". One firm standing on twenty-three old bills is
           * twenty-three things to chase; calling that "1 party" hides the
           * size of the job.
           */
          hint={dues ? `${dues.totals.invoicesPast30Days} invoice${dues.totals.invoicesPast30Days === 1 ? '' : 's'} past 30 days` : 'Adding up…'}
          tone="danger"
        />
        <StatCard
          icon={Hourglass}
          label="Pending confirmations"
          value={kpi.pendingConfirmations}
          hint={`${formatINRCompact(kpi.pendingConfirmationAmount)} in punched payments`}
          tone="warning"
        />
      </div>

      {/* Trend + overdue */}
      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <DashboardCard
          title="Sales trend — last 7 days"
          meta={
            <p className="shrink-0 font-mono text-sm font-medium text-green-deep">
              {formatINRCompact(today.amount)} today
            </p>
          }
        >
          <SalesTrendChart data={salesTrend} />
        </DashboardCard>

        <DashboardCard title="Outstanding — overdue bills" action={{ label: 'View all', to: '/admin/finance/outstanding' }}>
          {overdueBills.length ? (
            <OverdueBillsTable bills={overdueBills} />
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">{dues ? 'Nothing is standing unpaid.' : 'Adding up the dues…'}</p>
          )}
          <Link
            to="/admin/finance/outstanding"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
          >
            <Send className="size-3.5" /> Send reminders
          </Link>
        </DashboardCard>
      </div>

      {/* Manager-wise sales. Executive Secondary comes in beside it, which is
          why Distributor outstanding has moved out of this row and below. */}
      <DashboardCard
        title={`Manager-wise sales${managerReport ? ` — ${managerReport.label}` : ''}`}
        action={{ label: 'View sales', onClick: () => setManagersOpen(true) }}
      >
        {managerReport ? (
          managerReport.managers.length ? (
            <>
              <BarList
                rows={managerReport.managers.map((m) => ({
                  id: m.managerId || 'none',
                  label: m.managerName,
                  sublabel: `${m.bills.length} bill${m.bills.length === 1 ? '' : 's'}`,
                  value: formatINRCompact(m.sales),
                  percent: asPercent(m.sales, Math.max(1, ...managerReport.managers.map((row) => row.sales))),
                  onClick: () => setManagersOpen(true),
                }))}
              />
              <p className="mt-3 text-xs text-ink-muted">Press a manager to see their parties, bills and what is unpaid.</p>
            </>
          ) : (
            <p className="py-6 text-center text-sm text-ink-muted">No bills went out this month.</p>
          )
        ) : (
          <p className="py-6 text-center text-sm text-ink-muted">Adding up the month…</p>
        )}
      </DashboardCard>

      {/**
       * Distributor outstanding, moved down from beside Manager-wise sales —
       * "ये नीचे करेंगे" — and now opening its own detail: a firm is pressed
       * and the bills behind its figure come up, oldest first. "ये 8.43 लाख
       * कितने बिलों का है, इसकी डिटेल अन्दर खुले."
       */}
      <DashboardCard title="Distributor outstanding" action={{ label: 'View finance', to: '/admin/finance/outstanding' }}>
        {distributorOutstanding.length ? (
          <>
            <BarList
              rows={distributorOutstanding.map((d) => ({
                id: d.id,
                label: d.name,
                sublabel: `oldest ${d.oldestDays} days · ${d.bills} bill${d.bills === 1 ? '' : 's'}`,
                value: formatINRCompact(d.amount),
                percent: asPercent(d.amount, maxOutstanding),
                tone: toneForOverdueDays(d.oldestDays),
                onClick: () => setOpenFirm(dues.rows.find((row) => row.distributorId === d.id) ?? null),
              }))}
            />
            <p className="mt-3 text-xs text-ink-muted">Press a firm to see the bills behind its figure.</p>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-ink-muted">{dues ? 'No firm owes anything.' : 'Adding up the dues…'}</p>
        )}
      </DashboardCard>

      {/**
       * New distributors, under the manager who owns them.
       *
       * The list used to repeat a manager's name once for every firm they
       * added — "फिर से देशमुख आ गया, दोबारा" — so the name is the heading
       * now and the firms sit under it. Each one opens its own form, filled
       * in and ready for the printer, because that is what goes in the file.
       */}
      <DashboardCard
        title={`New distributors added by managers — last ${NEW_FIRM_MONTHS} months`}
        action={{ label: 'View parties', to: '/admin/parties/distributors' }}
        bodyClassName="pt-1"
      >
        {addedByManager.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            {firms.length ? `No firms added in the last ${NEW_FIRM_MONTHS} months.` : 'Looking…'}
          </p>
        ) : (
          <ul className="divide-y divide-mint-pale">
            {addedByManager.map((group) => {
              const open = openAdder === group.id
              return (
                <li key={group.id}>
                  <button
                    type="button"
                    onClick={() => setOpenAdder(open ? null : group.id)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-mint-pale/40"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                      <span className="truncate font-semibold text-black">{group.name}</span>
                    </span>
                    <span className="shrink-0 text-sm text-ink-muted">
                      {group.firms.length} firm{group.firms.length === 1 ? '' : 's'}
                    </span>
                  </button>

                  {open && (
                    <ul className="space-y-1 pb-3 pl-6">
                      {group.firms.map((firm) => (
                        <li key={firm.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-mint-pale/40">
                          <span className="flex min-w-0 items-center gap-2">
                            <Building2 className="size-3.5 shrink-0 text-ink-muted" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-ink">{firm.name}</span>
                              <span className="block text-xs text-ink-muted">
                                {firm.locationName || firm.address || 'No address'} · {formatShortDate(firm.createdAt)}
                              </span>
                            </span>
                          </span>
                          {/* "उनके आगे एक बटन दे देना फॉर्म का" — the form
                              they filled in, with their documents, ready to
                              print and put in the file. */}
                          <Link
                            to={`/admin/parties/distributors/${firm.id}/form`}
                            target="_blank"
                            rel="noopener"
                            className="shrink-0 rounded-lg border border-mint px-2.5 py-1 text-xs font-semibold text-green-deep hover:bg-mint-pale"
                          >
                            Form
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </DashboardCard>

      {/* Credit notes */}
      <DashboardCard title="Credit notes" action={{ label: 'View all', to: '/admin/sales/credit-notes' }} bodyClassName="pt-1">
        <ul className="divide-y divide-mint-pale">
          {creditNotes.map((note) => (
            <ListRow
              key={note.id}
              icon={note.sent ? CheckCheck : ReceiptText}
              tone={note.sent ? 'success' : 'warning'}
              title={`${note.id} · ${note.party}`}
              subtitle={`${formatINR(note.amount)} · ${note.reason} · ${formatShortDate(note.date)}`}
              trailing={
                note.sent ? (
                  <span className="shrink-0 text-xs font-semibold text-ink-muted">Sent</span>
                ) : (
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-black px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/85"
                  >
                    Send
                  </button>
                )
              }
            />
          ))}
        </ul>
      </DashboardCard>

      {/* Visits */}
      <DashboardCard
        title="Distributor visits — this month"
        meta={<p className="hidden text-sm text-ink-muted sm:block">Target {VISIT_TARGET_PER_MONTH} visits</p>}
        action={{ label: 'View routes', to: '/admin/routes/areas' }}
      >
        <BarList
          rows={distributorVisits.map((d) => ({
            id: d.id,
            label: d.name,
            value: `${d.visits} visits`,
            percent: asPercent(d.visits, VISIT_TARGET_PER_MONTH),
            tone: toneForVisits(d.visits, VISIT_TARGET_PER_MONTH),
          }))}
        />
      </DashboardCard>

      {/* Needs attention */}
      <DashboardCard title="Needs attention" bodyClassName="pt-1">
        <ul className="divide-y divide-mint-pale">
          {attentionItems.map((item) => {
            const { icon, tone } = ATTENTION[item.type] ?? { icon: Clock3, tone: 'neutral' }
            return <ListRow key={item.id} icon={icon} tone={tone} title={item.title} subtitle={item.subtitle} to={item.path} />
          })}
        </ul>
      </DashboardCard>

      {/* The same detail Finance › Outstanding opens, so a firm's bills read
          identically wherever they are pressed. */}
      <PartyDues firm={openFirm} onClose={() => setOpenFirm(null)} />

      <ManagerSalesDetail report={managerReport} open={managersOpen} onClose={() => setManagersOpen(false)} />

      {/* Any stretch of days, for when the six months on offer are not the
          ones being asked about. */}
      <Modal
        open={Boolean(custom)}
        onOpenChange={(open) => !open && setCustom(null)}
        title="Sales over any dates"
        description="Issued bills only — a draft has not sold anything, and a cancelled one has unsold it."
        footer={
          <>
            <Button variant="outline" onClick={() => setCustom(null)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                const range = await reportsService.salesBetween(custom.start, custom.end).catch(() => null)
                setCustomTotal(range)
              }}
            >
              Add it up
            </Button>
          </>
        }
      >
        {custom && (
          <div className="space-y-4">
            <DateRangeFilter value={custom} onChange={(r) => setCustom(r)} />
            {customTotal && (
              <p id="custom-sales" className="rounded-xl bg-mint-pale px-4 py-3 text-sm">
                <span className="font-semibold text-black">{formatINR(customTotal.total)}</span> across {customTotal.invoices} bill
                {customTotal.invoices === 1 ? '' : 's'}, {formatShortDate(customTotal.from)} to {formatShortDate(customTotal.to)}.
              </p>
            )}
          </div>
        )}
      </Modal>

      <AppDownloadStrip text="Orders and payments from the field app sync here automatically, and confirmed orders turn into GST invoices." />
    </div>
  )
}
