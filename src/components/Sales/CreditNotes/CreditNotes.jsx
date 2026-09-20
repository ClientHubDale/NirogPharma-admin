import TransactionListPage from '@/components/Transactions/TransactionListPage'

/** Sales › Credit Notes — the shared sales list configured for credit notes (see shared/docTypes.js). */
export default function CreditNotes() {
  return <TransactionListPage key="CREDIT_NOTE" type="CREDIT_NOTE" />
}
