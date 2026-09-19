import { Boxes, ClipboardList, IndianRupee, Wallet } from 'lucide-react'
import { useSelector } from 'react-redux'
import { DashboardCard } from '@/components/dashboard/DashboardCard'
import { StatCard } from '@/components/dashboard/StatCard'
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader'
import { cn } from '@/lib/utils'
import { distributorRecentOrders, distributorStats } from '@/mocks/dashboard'
import { selectUser } from '@/store/authSlice'

const STAT_ICONS = { orders: ClipboardList, stock: Boxes, outstanding: IndianRupee, paid: Wallet }

const STATUS_STYLES = {
  New: 'bg-black text-white',
  Dispatched: 'bg-mint-pale text-forest',
  Delivered: 'bg-bg text-ink-muted',
}

export default function DistributorDashboard() {
  const user = useSelector(selectUser)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-3xl bg-white p-6 sm:p-8">
        <WelcomeHeader name={user.name.toUpperCase()} subtitle="Here’s your orders, stock and dues at a glance." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {distributorStats.map((stat) => (
          <StatCard key={stat.id} icon={STAT_ICONS[stat.id]} {...stat} />
        ))}
      </div>

      <DashboardCard title="Recent orders" action={{ label: 'View all', to: '/distributor/orders' }} bodyClassName="px-0 pb-1 sm:px-0">
        <ul className="divide-y divide-mint-pale border-t border-mint-pale">
        {distributorRecentOrders.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
            <div>
              <p className="font-semibold text-black">{order.party}</p>
              <p className="text-sm text-ink-muted">
                <span className="font-mono">{order.id}</span> · booked by {order.by}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold text-black">{order.amount}</span>
              <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', STATUS_STYLES[order.status])}>
                {order.status}
              </span>
            </div>
          </li>
        ))}
        </ul>
      </DashboardCard>
    </div>
  )
}
