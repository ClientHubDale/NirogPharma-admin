/**
 * MOCK DATA (UI phase). Each export is replaced by an API call when that
 * screen is wired to the backend — keep the shapes identical.
 */

/** Admin "get started" checklist — mirrors the SOW's admin setup order. */
export const adminSetupSteps = [
  {
    id: 'account',
    title: 'Account set up',
    description: 'Congratulations! Your account has been set up.',
    done: true,
  },
  {
    id: 'party',
    title: 'Add your first party',
    description: 'Start importing or adding distributors and retailers.',
    done: true,
    action: { label: 'Add party', path: '/admin/parties/customers' },
  },
  {
    id: 'item',
    title: 'Add your first item',
    description: 'Import or add items so your team can take orders.',
    done: false,
    action: { label: 'Add item', path: '/admin/inventory/items' },
  },
  {
    id: 'team',
    title: 'Add your field team',
    description: 'Create managers and executives with their salary, TA/DA and targets.',
    done: false,
    action: { label: 'Add user', path: '/admin/users/employees' },
  },
]

/** Distributor dashboard numbers. */
export const distributorStats = [
  { id: 'orders', label: 'New orders', value: '6', hint: '2 received today' },
  { id: 'stock', label: 'Stock value', value: '₹4,82,300', hint: '12 items ageing > 30 days' },
  { id: 'outstanding', label: 'Outstanding', value: '₹1,18,450', hint: '3 bills overdue' },
  { id: 'paid', label: 'Paid this month', value: '₹76,000', hint: 'Last: ₹18,400 on 16 Sep' },
]

export const distributorRecentOrders = [
  { id: 'SO-1042', party: 'Shree Medicals', by: 'Rahul Singh', amount: '₹12,480', status: 'New' },
  { id: 'SO-1041', party: 'City Chemist', by: 'Rahul Singh', amount: '₹8,920', status: 'New' },
  { id: 'SO-1038', party: 'Om Medical Store', by: 'Aman Verma', amount: '₹21,300', status: 'Dispatched' },
  { id: 'SO-1033', party: 'Jain Pharmacy', by: 'Aman Verma', amount: '₹5,640', status: 'Delivered' },
]

/* ─── Admin dashboard ─────────────────────────────────────────── */

export const adminKpis = {
  salesThisMonth: 4280000,
  salesChangePct: 12.4,
  staffActive: 18,
  staffTotal: 24,
  outstanding: 1840000,
  partiesPast30Days: 14,
  pendingConfirmations: 7,
  pendingConfirmationAmount: 210000,
}

/** Last 7 days of sales (₹). The last entry is today. */
export const salesTrend = [
  { day: 'Mon', amount: 610000 },
  { day: 'Tue', amount: 740000 },
  { day: 'Wed', amount: 420000 },
  { day: 'Thu', amount: 880000 },
  { day: 'Fri', amount: 650000 },
  { day: 'Sat', amount: 790000 },
  { day: 'Sun', amount: 920000 },
]

export const overdueBills = [
  { id: 'INV-2291', date: '2026-07-24', party: 'Shri Shiv Ayurvedic Agency', pending: 14934, days: 50 },
  { id: 'INV-2304', date: '2026-07-28', party: 'Ganpati Agencies', pending: 35970, days: 46 },
  { id: 'INV-2377', date: '2026-08-20', party: 'Star Medical Store', pending: 28983, days: 23 },
  { id: 'INV-2412', date: '2026-09-02', party: 'Jai Shree Medicose', pending: 27230, days: 10 },
  { id: 'INV-2450', date: '2026-09-12', party: 'Shiv Medical Agency', pending: 137513, days: 1 },
]

export const managerSales = [
  { id: 'm1', name: 'S. Deshmukh', area: 'Malwa', amount: 462000 },
  { id: 'm2', name: 'P. Naidu', area: 'Nimar', amount: 310000 },
  { id: 'm3', name: 'A. Rathi', area: 'Saharanpur', amount: 148000 },
]

/** oldestDays = age of the oldest unpaid bill; drives the status colour. */
export const distributorOutstanding = [
  { id: 'd1', name: 'Shree Ganesh Distributors', amount: 843000, oldestDays: 52 },
  { id: 'd2', name: 'Nirmal Agencies', amount: 609000, oldestDays: 38 },
  { id: 'd3', name: 'Ganga Medico Supply', amount: 391000, oldestDays: 33 },
]

export const newDistributors = [
  { id: 'p1', name: 'Ganga Medico Supply', address: 'Sector D, Industrial Area, Meerut', addedBy: 'S. Deshmukh', daysAgo: 2 },
  { id: 'p2', name: 'Doab Pharma Traders', address: 'Sector D, Industrial Area, Meerut', addedBy: 'P. Naidu', daysAgo: 4 },
  { id: 'p3', name: 'Nirmal Agencies', address: 'Begum Bridge Road, Meerut', addedBy: 'S. Deshmukh', daysAgo: 6 },
]

export const creditNotes = [
  { id: 'CN-0091', party: 'Saraf Medico', amount: 2400, reason: 'damaged stock return', date: '2026-09-14', sent: false },
  { id: 'CN-0090', party: 'Krishna Medical', amount: 1150, reason: 'rate correction', date: '2026-09-11', sent: false },
  { id: 'CN-0089', party: 'Nirmal Agencies', amount: 3600, reason: 'already sent', date: '2026-09-08', sent: true },
]

export const VISIT_TARGET_PER_MONTH = 15

export const distributorVisits = [
  { id: 'd1', name: 'Shree Ganesh Distributors', visits: 14 },
  { id: 'd2', name: 'Nirmal Agencies', visits: 9 },
  { id: 'd3', name: 'Ganga Medico Supply', visits: 6 },
  { id: 'd4', name: 'Doab Pharma Traders', visits: 2 },
]

/** type → icon + tone in the UI. */
export const attentionItems = [
  {
    id: 'a1',
    type: 'pending',
    title: '7 payment punches awaiting confirmation',
    subtitle: '₹2,10,400 total · oldest from 2 days ago',
    path: '/admin/finance/confirmation',
  },
  {
    id: 'a2',
    type: 'overdue',
    title: '14 parties crossed the 30-day payment window',
    subtitle: 'Reminder SMS auto-queued for tonight',
    path: '/admin/finance/outstanding',
  },
  {
    id: 'a3',
    type: 'late',
    title: '3 executives checked in late today',
    subtitle: 'Past the 10:00 AM cut-off',
    path: '/admin/attendance',
  },
]
