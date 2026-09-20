/**
 * MOCK DATA (UI phase) — payments in / out, generated from the invoices they
 * settle so the invoice "Due" column and Finance agree.
 * Backend: GET /finance/payments?type=IN|OUT → same shape.
 */
import { docTotals } from '@/components/Transactions/transactionModel'
import { INITIAL_SALES_DOCS } from './salesDocs'

const pad = (n) => String(n).padStart(4, '0')
const fy = (iso) => {
  const [y, m] = iso.split('-').map(Number)
  const s = m >= 4 ? y : y - 1
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`
}
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d + n)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}
const METHODS = ['CASH', 'CASH', 'ONLINE', 'CHEQUE', 'ONLINE', 'COUPON']
const COMMENTS = ['', '', 'Collected on beat visit', 'Part payment', 'Cleared full bill', '']

function build() {
  const today = new Date().toISOString().slice(0, 10)
  let seed = 4211
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const out = []
  const make = (kind, bill, amount, i) => {
    const date = addDays(bill.date, 1 + Math.floor(rand() * 6)) > today ? today : addDays(bill.date, 1 + Math.floor(rand() * 6))
    const method = METHODS[Math.floor(rand() * METHODS.length)]
    out.push({
      id: `pay-${kind.toLowerCase()}-${i}`,
      type: kind,
      number: '', // numbered in date order below
      date,
      partyType: kind === 'IN' ? 'CUSTOMER' : 'SUPPLIER',
      partyId: bill.partyId,
      collectedBy: bill.createdBy,
      method,
      reference: method === 'CHEQUE' ? `${100000 + Math.floor(rand() * 899999)}` : method === 'ONLINE' ? `UTR${100000000 + Math.floor(rand() * 899999999)}` : '',
      comment: COMMENTS[Math.floor(rand() * COMMENTS.length)],
      documents: [],
      allocations: [{ docId: bill.id, docType: bill.type, number: bill.number, amount }],
      otherPayment: 0,
      discount: 0,
      status: date < addDays(today, -4) ? 'APPROVED' : rand() < 0.6 ? 'PENDING' : 'APPROVED',
    })
  }

  // Payments in: every sales invoice that has been paid, in full or in part.
  INITIAL_SALES_DOCS.SALES_INVOICE.filter((inv) => inv.received > 0).forEach((inv, i) => make('IN', inv, inv.received, i + 1))
  // Payments out: roughly half of the approved purchase invoices are settled.
  INITIAL_SALES_DOCS.PURCHASE_INVOICE.filter((pi) => pi.status === 'APPROVED' && rand() < 0.55).forEach((pi, i) => {
    const total = docTotals(pi).total
    const amount = rand() < 0.7 ? total : Math.round(total * 0.5)
    pi.received = amount // keeps the purchase invoice's Due column in step
    make('OUT', pi, amount, i + 1)
  })

  // Numbers in date order per financial year.
  const counters = {}
  out.sort((a, b) => a.date.localeCompare(b.date))
  for (const p of out) {
    const series = `${p.type === 'IN' ? 'PIN' : 'POUT'}/${fy(p.date)}/`
    counters[series] = (counters[series] ?? 0) + 1
    p.number = `${series}${pad(counters[series])}`
  }
  return out.reverse()
}

export const INITIAL_PAYMENTS = build()
