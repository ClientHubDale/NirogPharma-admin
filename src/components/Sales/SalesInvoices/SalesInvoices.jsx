import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Sales › Sales Invoices — the shared sales list configured for invoices (see shared/docTypes.js). */
export default function SalesInvoices() {
  return <TransactionListPage key="SALES_INVOICE" type="SALES_INVOICE" />
}
