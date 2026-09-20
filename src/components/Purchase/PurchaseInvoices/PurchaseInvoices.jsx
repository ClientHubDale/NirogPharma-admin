import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Purchase › Purchase Invoices — the shared transaction list configured for purchase invoices (see Transactions/docTypes.js). */
export default function PurchaseInvoices() {
  return <TransactionListPage key="PURCHASE_INVOICE" type="PURCHASE_INVOICE" />
}
