import {
  AlarmClock,
  BellRing,
  Building2,
  CheckCheck,
  Clock3,
  Hourglass,
  IndianRupee,
  ReceiptText,
  Send,
  UsersRound,
} from 'lucide-react'
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
import { formatDaysAgo, formatINR, formatINRCompact, formatShortDate } from '@/lib/format'
import { toneForOverdueDays, toneForVisits } from '@/lib/status'
import {
  adminKpis as kpi,
  adminSetupSteps,
  attentionItems,
  creditNotes,
  distributorOutstanding,
  distributorVisits,
  managerSales,
  newDistributors,
  overdueBills,
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
  const maxManager = Math.max(...managerSales.map((m) => m.amount))
  const maxOutstanding = Math.max(...distributorOutstanding.map((d) => d.amount))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <WelcomeHeader align="left" name={user.name.toUpperCase()} subtitle="Here’s how the business is doing today." />
        <p className="text-sm font-medium text-ink-muted">{todayLabel}</p>
      </div>

      <SetupBanner steps={adminSetupSteps} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Sales this month"
          value={formatINRCompact(kpi.salesThisMonth)}
          hint={`${kpi.salesChangePct > 0 ? '+' : ''}${kpi.salesChangePct}% vs last month`}
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
          value={formatINRCompact(kpi.outstanding)}
          hint={`${kpi.partiesPast30Days} parties past 30 days`}
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
          <OverdueBillsTable bills={overdueBills} />
          <Link
            to="/admin/finance/outstanding"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-deep hover:underline hover:underline-offset-4"
          >
            <Send className="size-3.5" /> Send reminders
          </Link>
        </DashboardCard>
      </div>

      {/* Manager-wise + distributor outstanding */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard title="Manager-wise sales" action={{ label: 'View sales', to: '/admin/sales/orders' }}>
          <BarList
            rows={managerSales.map((m) => ({
              id: m.id,
              label: m.name,
              sublabel: m.area,
              value: formatINRCompact(m.amount),
              percent: asPercent(m.amount, maxManager),
            }))}
          />
        </DashboardCard>

        <DashboardCard title="Distributor outstanding" action={{ label: 'View finance', to: '/admin/finance/outstanding' }}>
          <BarList
            rows={distributorOutstanding.map((d) => ({
              id: d.id,
              label: d.name,
              sublabel: `oldest ${d.oldestDays} days`,
              value: formatINRCompact(d.amount),
              percent: asPercent(d.amount, maxOutstanding),
              tone: toneForOverdueDays(d.oldestDays),
            }))}
          />
        </DashboardCard>
      </div>

      {/* New distributors */}
      <DashboardCard title="New distributors added by managers" action={{ label: 'View parties', to: '/admin/parties/customers' }} bodyClassName="pt-1">
        <ul className="divide-y divide-mint-pale">
          {newDistributors.map((d) => (
            <ListRow
              key={d.id}
              icon={Building2}
              title={d.name}
              subtitle={`${d.address} · added by ${d.addedBy}, ${formatDaysAgo(d.daysAgo)}`}
            />
          ))}
        </ul>
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

      <AppDownloadStrip text="Orders and payments from the field app sync here automatically, and confirmed orders turn into GST invoices." />
    </div>
  )
}
