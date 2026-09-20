/**
 * Everything that differs between Payment In (money from customers) and
 * Payment Out (money to suppliers). Both use the same list page and drawer.
 */
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'COUPON', label: 'Coupon' },
]

export const PAYMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending', tone: 'warning', action: 'Move to pending' },
  { value: 'APPROVED', label: 'Approved', tone: 'success', action: 'Approve' },
  { value: 'REJECTED', label: 'Rejected', tone: 'danger', action: 'Reject' },
]

export const PAYMENT_TYPES = {
  IN: {
    type: 'IN',
    title: 'Payment In',
    noun: 'payment in',
    plural: 'payments in',
    createLabel: 'Create Payment In',
    icon: ArrowDownLeft,
    prefix: 'PIN',
    basePath: '/admin/finance/payment-in',
    partyType: 'CUSTOMER',
    partyNoun: 'customer',
    billType: 'SALES_INVOICE',
    billNoun: 'invoice',
    emptyText: 'Record money received from a customer and settle it against their unpaid invoices.',
  },
  OUT: {
    type: 'OUT',
    title: 'Payment Out',
    noun: 'payment out',
    plural: 'payments out',
    createLabel: 'Create Payment Out',
    icon: ArrowUpRight,
    prefix: 'POUT',
    basePath: '/admin/finance/payment-out',
    partyType: 'SUPPLIER',
    partyNoun: 'supplier',
    billType: 'PURCHASE_INVOICE',
    billNoun: 'purchase invoice',
    emptyText: 'Record money paid to a supplier and settle it against their bills.',
  },
}
