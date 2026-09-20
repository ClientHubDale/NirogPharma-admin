import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Sales › Sales Orders — the shared sales list configured for sales orders (see shared/docTypes.js). */
export default function SalesOrders() {
  return <TransactionListPage key="SALES_ORDER" type="SALES_ORDER" />
}
