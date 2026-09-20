import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Purchase › Purchase Orders — the shared transaction list configured for purchase orders (see Transactions/docTypes.js). */
export default function PurchaseOrders() {
  return <TransactionListPage key="PURCHASE_ORDER" type="PURCHASE_ORDER" />
}
