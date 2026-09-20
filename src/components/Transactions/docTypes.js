/**
 * Everything that differs between sales documents. Every Sales tab is one
 * entry here and reuses TransactionListPage / TransactionEditor — add a tab
 * by adding an entry, not a page.
 *
 * statuses[].action   — ⋯ menu label for moving a document to that status
 * excludedStatuses    — not counted in "Total" and have nothing due
 * convertsTo          — ⋯ "Convert to …": copies the document into a new one of
 *                       that type; `sourceStatus` is set on the source once saved
 * limitToSource       — line quantities may not exceed the source document's
 * party               — 'CUSTOMER' (sales) or 'SUPPLIER' (purchase; "Bill from",
 *                       rates come from the item's purchase price)
 * tally.inward        — party is credited, not debited (returns, credit notes,
 *                       and every purchase bill)
 */
import { ClipboardList, FileMinus, FileText, PackageCheck, ReceiptIndianRupee, RotateCcw, ShoppingCart, Truck, Undo2 } from 'lucide-react'

const PENDING = { value: 'PENDING', label: 'Pending', tone: 'warning', action: 'Move to pending' }
const APPROVED = { value: 'APPROVED', label: 'Approved', tone: 'success', action: 'Approve' }
const REJECTED = { value: 'REJECTED', label: 'Rejected', tone: 'danger', action: 'Reject' }
const CONFIRMED = { value: 'CONFIRMED', label: 'Confirmed', tone: 'info', action: 'Confirm' }
const DISPATCHED = { value: 'DISPATCHED', label: 'Dispatched', tone: 'info', action: 'Mark dispatched' }
const DELIVERED = { value: 'DELIVERED', label: 'Delivered', tone: 'success', action: 'Mark delivered' }
const CANCELLED = { value: 'CANCELLED', label: 'Cancelled', tone: 'danger', action: 'Cancel' }

export const DOC_TYPES = {
  ESTIMATE: {
    type: 'ESTIMATE',
    noun: 'estimate',
    plural: 'estimates',
    title: 'Estimates',
    icon: FileText,
    prefix: 'EST',
    basePath: '/admin/sales/estimates',
    tally: { voucherType: 'Quotation', ledger: 'Sales' },
    statuses: [PENDING, APPROVED, REJECTED],
    defaultStatus: 'PENDING',
    excludedStatuses: ['REJECTED'],
    convertsTo: [{ type: 'SALES_ORDER', sourceStatus: 'APPROVED' }],
    // Nobody pays against an estimate, so Due always equals Amount — hidden by default.
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Create a quote for a customer — prices come from their price list and schemes apply in one click.',
  },
  SALES_ORDER: {
    type: 'SALES_ORDER',
    noun: 'sales order',
    plural: 'sales orders',
    title: 'Sales Orders',
    icon: ShoppingCart,
    prefix: 'SO',
    basePath: '/admin/sales/orders',
    tally: { voucherType: 'Sales Order', ledger: 'Sales' },
    statuses: [
      PENDING,
      { value: 'ONHOLD', label: 'On hold', tone: 'neutral', action: 'Put on hold' },
      CONFIRMED,
      { value: 'INVOICED', label: 'Invoiced', tone: 'info', action: 'Mark invoiced' },
      DISPATCHED,
      DELIVERED,
      CANCELLED,
    ],
    defaultStatus: 'PENDING',
    excludedStatuses: ['CANCELLED'],
    convertsTo: [
      { type: 'SALES_INVOICE', sourceStatus: 'INVOICED' },
      { type: 'DELIVERY_CHALLAN', sourceStatus: 'DISPATCHED' },
    ],
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Orders booked by your field staff or the office land here — confirm them, then convert to an invoice.',
  },
  SALES_INVOICE: {
    type: 'SALES_INVOICE',
    noun: 'sales invoice',
    plural: 'sales invoices',
    title: 'Sales Invoices',
    icon: ReceiptIndianRupee,
    prefix: 'INV',
    basePath: '/admin/sales/invoices',
    tally: { voucherType: 'Sales', ledger: 'Sales' },
    statuses: [PENDING, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED],
    defaultStatus: 'PENDING',
    excludedStatuses: ['CANCELLED'],
    convertsTo: [
      { type: 'DELIVERY_CHALLAN', sourceStatus: 'DISPATCHED' },
      { type: 'SALES_RETURN' },
    ],
    // Invoices are what customers pay against, so Due stays visible — Comment
    // gives up its place so Status still fits on a laptop screen.
    hiddenColumns: { gstin: false, comment: false },
    emptyText: 'Bill a customer with GST — or open a sales order and choose “Convert to sales invoice”.',
  },
  DELIVERY_CHALLAN: {
    type: 'DELIVERY_CHALLAN',
    noun: 'delivery challan',
    plural: 'delivery challans',
    title: 'Delivery Challans',
    icon: Truck,
    prefix: 'DC',
    basePath: '/admin/sales/delivery-challans',
    tally: { voucherType: 'Delivery Note', ledger: 'Sales' },
    statuses: [PENDING, DISPATCHED, DELIVERED, CANCELLED],
    defaultStatus: 'PENDING',
    excludedStatuses: ['CANCELLED'],
    convertsTo: [{ type: 'SALES_INVOICE' }],
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Send goods out with a challan — vehicle and e-way bill numbers can be switched on in ⚙ settings.',
  },
  SALES_RETURN: {
    type: 'SALES_RETURN',
    noun: 'sales return',
    plural: 'sales returns',
    title: 'Sales Returns',
    icon: Undo2,
    prefix: 'SR',
    basePath: '/admin/sales/returns',
    tally: { voucherType: 'Credit Note', ledger: 'Sales Return', inward: true },
    statuses: [PENDING, APPROVED, REJECTED],
    defaultStatus: 'PENDING',
    excludedStatuses: ['REJECTED'],
    convertsTo: [{ type: 'CREDIT_NOTE', sourceStatus: 'APPROVED' }],
    limitToSource: true, // can't return more than the invoice sold
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Record goods a customer sent back — or open an invoice and choose “Convert to sales return”.',
  },
  CREDIT_NOTE: {
    type: 'CREDIT_NOTE',
    noun: 'credit note',
    plural: 'credit notes',
    title: 'Credit Notes',
    icon: FileMinus,
    prefix: 'CN',
    basePath: '/admin/sales/credit-notes',
    tally: { voucherType: 'Credit Note', ledger: 'Sales Return', inward: true },
    statuses: [PENDING, APPROVED, { value: 'CLOSED', label: 'Closed', tone: 'neutral', action: 'Close' }],
    defaultStatus: 'PENDING',
    excludedStatuses: [],
    convertsTo: [],
    limitToSource: true,
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Credit a customer for returns, rate differences or damage — approved notes reduce what they owe.',
  },

  /* ── Purchase ─────────────────────────────────────────── */
  PURCHASE_ORDER: {
    type: 'PURCHASE_ORDER',
    noun: 'purchase order',
    plural: 'purchase orders',
    title: 'Purchase Orders',
    icon: ClipboardList,
    prefix: 'PO',
    basePath: '/admin/purchase/orders',
    party: 'SUPPLIER',
    tally: { voucherType: 'Purchase Order', ledger: 'Purchase', inward: true },
    statuses: [PENDING, APPROVED, REJECTED],
    defaultStatus: 'PENDING',
    excludedStatuses: ['REJECTED'],
    convertsTo: [{ type: 'PURCHASE_INVOICE', sourceStatus: 'APPROVED' }],
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Order stock from a supplier — rates start at the item’s purchase price.',
  },
  PURCHASE_INVOICE: {
    type: 'PURCHASE_INVOICE',
    noun: 'purchase invoice',
    plural: 'purchase invoices',
    title: 'Purchase Invoices',
    icon: PackageCheck,
    prefix: 'PI',
    basePath: '/admin/purchase/invoices',
    party: 'SUPPLIER',
    poNumber: true, // the supplier's own order number, as in the reference
    tally: { voucherType: 'Purchase', ledger: 'Purchase', inward: true },
    statuses: [PENDING, APPROVED, REJECTED],
    defaultStatus: 'PENDING',
    excludedStatuses: ['REJECTED'],
    convertsTo: [{ type: 'PURCHASE_RETURN' }],
    // What we still owe the supplier.
    hiddenColumns: { gstin: false, comment: false },
    emptyText: 'Enter the supplier’s bill — or open a purchase order and choose “Convert to purchase invoice”.',
  },
  PURCHASE_RETURN: {
    type: 'PURCHASE_RETURN',
    noun: 'purchase return',
    plural: 'purchase returns',
    title: 'Purchase Returns',
    icon: RotateCcw,
    prefix: 'PR',
    basePath: '/admin/purchase/returns',
    party: 'SUPPLIER',
    tally: { voucherType: 'Debit Note', ledger: 'Purchase Return' },
    statuses: [], // no status on this screen, as in the reference
    defaultStatus: '',
    excludedStatuses: [],
    convertsTo: [],
    limitToSource: true,
    hiddenColumns: { gstin: false, due: false },
    emptyText: 'Send stock back to a supplier — or open a purchase invoice and choose “Convert to purchase return”.',
  },
}

/** Default "Transaction Settings" (⚙) per document type. */
export const DEFAULT_DOC_SETTINGS = {
  vehicleNo: false,
  ewayBillNo: false,
  creditPeriod: true,
  creditLimit: false,
  creditBillLimit: false,
  terms: false,
  termsText: 'Goods once sold will not be taken back. Subject to Meerut jurisdiction.',
  minOrderValue: 0,
  discountFields: [], // labels of extra "−" rows on the bill, e.g. "Cash discount"
  chargeFields: [], // labels of extra "+" rows, e.g. "Freight"
}

/** "sales order" → "Sales Order" */
export const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())
