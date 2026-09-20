import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Sales › Sales Returns — the shared sales list configured for sales returns (see shared/docTypes.js). */
export default function SalesReturns() {
  return <TransactionListPage key="SALES_RETURN" type="SALES_RETURN" />
}
