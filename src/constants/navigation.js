import {
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Navigation,
  Package,
  Receipt,
  Route,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { ROLES } from './roles'

/**
 * Sidebar menus per role — the single source for the sidebar, the mobile
 * menu and the routes. Add a screen here and it appears everywhere.
 *
 * Item:  { label, icon, path }                       → a link
 * Group: { label, icon, children: [{ label, path }] } → a collapsible section
 * `footer: true` pins an item to the bottom block of the sidebar.
 */

const ADMIN = '/admin'

export const adminNav = [
  { label: 'Dashboard', icon: BarChart3, path: ADMIN, end: true },
  { label: 'Live Location', icon: Navigation, path: `${ADMIN}/live-location` },
  {
    label: 'Inventory',
    icon: Package,
    children: [
      { label: 'Items', path: `${ADMIN}/inventory/items` },
      { label: 'Schemes', path: `${ADMIN}/inventory/schemes` },
      { label: 'Price Lists', path: `${ADMIN}/inventory/price-lists` },
    ],
  },
  {
    label: 'Parties',
    icon: Users,
    children: [
      { label: 'Customers', path: `${ADMIN}/parties/customers` },
      { label: 'Suppliers', path: `${ADMIN}/parties/suppliers` },
      { label: 'Visited', path: `${ADMIN}/parties/visited` },
      { label: 'Groups', path: `${ADMIN}/parties/groups` },
    ],
  },
  {
    label: 'Sales',
    icon: Receipt,
    children: [
      { label: 'Estimates', path: `${ADMIN}/sales/estimates` },
      { label: 'Sales Orders', path: `${ADMIN}/sales/orders` },
      { label: 'Sales Invoices', path: `${ADMIN}/sales/invoices` },
      { label: 'Delivery Challans', path: `${ADMIN}/sales/delivery-challans` },
      { label: 'Sales Returns', path: `${ADMIN}/sales/returns` },
      { label: 'Credit Notes', path: `${ADMIN}/sales/credit-notes` },
    ],
  },
  {
    label: 'Purchase',
    icon: ShoppingCart,
    children: [
      { label: 'Purchase Orders', path: `${ADMIN}/purchase/orders` },
      { label: 'Purchase Invoices', path: `${ADMIN}/purchase/invoices` },
      { label: 'Purchase Returns', path: `${ADMIN}/purchase/returns` },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    children: [
      { label: 'Payment In', path: `${ADMIN}/finance/payment-in` },
      { label: 'Payment Out', path: `${ADMIN}/finance/payment-out` },
    ],
  },
  {
    label: 'Routes',
    icon: Route,
    children: [
      { label: 'Regions', path: `${ADMIN}/routes/regions` },
      { label: 'Cities', path: `${ADMIN}/routes/cities` },
      { label: 'Areas', path: `${ADMIN}/routes/areas` },
    ],
  },
  { label: 'Attendance', icon: CalendarClock, path: `${ADMIN}/attendance` },
  {
    label: 'User',
    icon: UserCog,
    children: [{ label: 'Users', path: `${ADMIN}/users` }],
  },
  { label: 'Reports', icon: ClipboardList, path: `${ADMIN}/reports` },
  { label: 'Settings', icon: Settings, path: `${ADMIN}/settings`, footer: true },
]

const DIST = '/distributor'

export const distributorNav = [
  { label: 'Dashboard', icon: LayoutDashboard, path: DIST, end: true },
  { label: 'Orders', icon: ClipboardList, path: `${DIST}/orders` },
  { label: 'My Stock', icon: Boxes, path: `${DIST}/stock` },
  { label: 'Bills', icon: FileText, path: `${DIST}/bills` },
  { label: 'Ledger & Outstanding', icon: Wallet, path: `${DIST}/ledger` },
  { label: 'Payments', icon: WalletCards, path: `${DIST}/payments` },
]

export const NAV_BY_ROLE = {
  [ROLES.ADMIN]: adminNav,
  [ROLES.DISTRIBUTOR]: distributorNav,
}

/** Flattens a menu into its leaf links: [{ label, path, section }]. */
export function flattenNav(nav) {
  return nav.flatMap((item) =>
    item.children
      ? item.children.map((child) => ({ ...child, section: item.label }))
      : [{ label: item.label, path: item.path, section: null, end: item.end }],
  )
}
