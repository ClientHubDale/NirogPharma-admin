import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Purchase › Purchase Returns — the shared transaction list configured for purchase returns (see Transactions/docTypes.js). */
export default function PurchaseReturns() {
  return <TransactionListPage key="PURCHASE_RETURN" type="PURCHASE_RETURN" />
}
