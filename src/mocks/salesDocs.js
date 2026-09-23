/**
 * MOCK DATA (UI phase) — every sales and purchase document, linked the way
 * real data flows: sales orders → invoices → delivery challans, a few invoices
 * → sales returns → credit notes; purchase orders → purchase invoices → a few
 * purchase returns. Backend: GET /sales|purchase/<type> → same shape.
 * Lines are stored; totals are always computed (transactionModel.docTotals).
 */
import { docTotals } from '@/components/Transactions/transactionModel'
import { INITIAL_CUSTOMERS } from './customers'
import { INITIAL_SUPPLIERS } from './suppliers'
import { INITIAL_ITEMS } from './items'
import { fieldStaff } from './liveLocation'

function rng(seed) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fy = (isoDate) => {
  const [y, m] = isoDate.split('-').map(Number)
  const s = m >= 4 ? y : y - 1
  return `${String(s).slice(2)}-${String(s + 1).slice(2)}`
}
const addDays = (isoDate, n) => {
  const [y, m, d] = isoDate.split('-').map(Number)
  return iso(new Date(y, m - 1, d + n))
}
const r2 = (n) => Math.round(n * 100) / 100

const PREFIX = { ESTIMATE: 'EST', SALES_ORDER: 'SO', SALES_INVOICE: 'INV', DELIVERY_CHALLAN: 'DC', SALES_RETURN: 'SR', CREDIT_NOTE: 'CN', PURCHASE_ORDER: 'PO', PURCHASE_INVOICE: 'PI', PURCHASE_RETURN: 'PR' }
const COMMENTS = {
  ESTIMATE: ['', '', 'Quote for monthly stock', 'Needs approval from owner', 'Festive season order', 'Revised rates', ''],
  SALES_ORDER: ['', '', 'Deliver before Saturday', 'Booked on beat visit', 'Urgent — shop out of stock', 'Call before delivery', ''],
  SALES_INVOICE: ['', '', '', 'Payment on delivery', 'Cheque promised in 15 days', ''],
  DELIVERY_CHALLAN: ['', 'Handed to shop owner', 'Deliver via Route van', ''],
  SALES_RETURN: ['Expiry near', 'Damaged in transit', 'Wrong item sent', 'Slow-moving stock'],
  CREDIT_NOTE: ['Against sales return', 'Rate difference', 'Damaged goods', 'Scheme settlement'],
  PURCHASE_ORDER: ['', '', 'Monthly stock refill', 'Urgent — running low', 'Confirm batch expiry'],
  PURCHASE_INVOICE: ['', '', 'Bill against PO', 'Freight paid by us', ''],
  PURCHASE_RETURN: ['Short expiry batch', 'Damaged cartons', 'Wrong batch supplied', 'Excess supply'],
}

function build(now = new Date()) {
  const rand = rng(7719)
  const pick = (list) => list[Math.floor(rand() * list.length)]
  const customers = INITIAL_CUSTOMERS.filter((c) => c.status === 'ACTIVE')
  const items = INITIAL_ITEMS.filter((i) => i.status === 'ACTIVE' && i.stock > 0)
  const creators = [{ id: 'admin', name: 'Office Admin' }, ...fieldStaff.filter((u) => u.role !== 'DISTRIBUTOR')]
  const today = iso(now)
  const suppliers = INITIAL_SUPPLIERS.filter((s) => s.status === 'ACTIVE')
  const docs = { ESTIMATE: [], SALES_ORDER: [], SALES_INVOICE: [], DELIVERY_CHALLAN: [], SALES_RETURN: [], CREDIT_NOTE: [], PURCHASE_ORDER: [], PURCHASE_INVOICE: [], PURCHASE_RETURN: [] }

  const freshLines = () =>
    [...items]
      .sort(() => rand() - 0.5)
      .slice(0, 1 + Math.floor(rand() * 4))
      .map((item, i) => ({
        key: `l${i}`,
        itemId: item.id,
        name: item.name,
        code: item.code,
        unit: item.unit,
        mrp: item.mrp,
        gst: item.gst,
        cess: 0,
        qty: pick([5, 10, 12, 20, 24, 50]),
        rate: item.sellTaxMode === 'INCL' ? r2(item.sellPrice / (1 + item.gst / 100)) : item.sellPrice,
        discount: rand() < 0.2 ? 1 : 0,
        schemeDiscount: 0,
        free: false,
        schemeName: '',
        priceSource: 'Catalog',
      }))

  /** Purchase lines are costed at the item's purchase price, not the sell price. */
  const costLines = (lines) => lines.map((l) => ({ ...l, rate: r2((INITIAL_ITEMS.find((i) => i.id === l.itemId)?.purchasePrice ?? l.rate)), priceSource: 'Purchase price' }))

  const add = (type, { date, party, lines, status, source, createdBy, ...extra }) => {
    const doc = {
      id: `${type.toLowerCase().replace('_', '-')}-${docs[type].length + 1}`,
      type,
      number: '', // assigned in date order below
      date,
      partyId: party.id,
      partyType: type.startsWith('PURCHASE') ? 'SUPPLIER' : 'CUSTOMER',
      warehouseId: 'wh-meerut',
      createdBy: createdBy ?? pick(creators).id,
      creditPeriodDays: String(party.creditPeriodDays || ''),
      status,
      comment: pick(COMMENTS[type]),
      vehicleNo: '',
      ewayBillNo: '',
      terms: '',
      adjustments: [],
      schemeDiscount: 0,
      documents: [],
      lines,
      ...(source && { sourceRef: { type: source.type, id: source.id } }),
      ...extra,
    }
    docs[type].push(doc)
    return doc
  }

  const days = (back) => {
    const out = []
    for (let b = back; b >= 0; b--) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - b)
      if (day.getDay() !== 0) out.push([b, iso(day)])
    }
    return out
  }

  // Estimates — a couple on most days.
  for (const [back, date] of days(44)) {
    if (rand() < 0.35) continue
    for (let k = 1 + Math.floor(rand() * 2); k > 0; k--) {
      const status = back > 7 ? (rand() < 0.7 ? 'APPROVED' : 'REJECTED') : rand() < 0.6 ? 'PENDING' : 'APPROVED'
      add('ESTIMATE', { date, party: pick(customers), lines: freshLines(), status })
    }
  }

  // Sales orders — the busiest document; older ones have moved along the pipeline.
  for (const [back, date] of days(50)) {
    if (rand() < 0.2) continue
    for (let k = 1 + Math.floor(rand() * 3); k > 0; k--) {
      const r = rand()
      const status =
        back > 10
          ? r < 0.12 ? 'CANCELLED' : r < 0.7 ? 'DELIVERED' : r < 0.85 ? 'DISPATCHED' : 'INVOICED'
          : back > 2
          ? r < 0.3 ? 'CONFIRMED' : r < 0.55 ? 'INVOICED' : r < 0.75 ? 'DISPATCHED' : r < 0.85 ? 'ONHOLD' : 'PENDING'
          : r < 0.55 ? 'PENDING' : r < 0.75 ? 'CONFIRMED' : r < 0.85 ? 'ONHOLD' : 'CANCELLED'
      add('SALES_ORDER', { date, party: pick(customers), lines: freshLines(), status })
    }
  }

  // Every field user books their own beat over the last two weeks, so opening
  // anyone in Live Location shows their secondary sales for that day.
  const field = creators.filter((c) => c.id !== 'admin')
  for (const [back, date] of days(13)) {
    for (const user of field) {
      if (back > 0 && rand() < 0.25) continue // a day off, or a day spent on collections
      for (let k = 1 + Math.floor(rand() * 2); k > 0; k--) {
        const r = rand()
        const status = back > 6 ? (r < 0.65 ? 'DELIVERED' : r < 0.85 ? 'INVOICED' : 'CONFIRMED') : r < 0.45 ? 'PENDING' : r < 0.8 ? 'CONFIRMED' : 'INVOICED'
        add('SALES_ORDER', { date, party: pick(customers), lines: freshLines(), status, createdBy: user.id })
      }
    }
  }

  const partyById = Object.fromEntries(customers.map((c) => [c.id, c]))
  const supplierById = Object.fromEntries(suppliers.map((c) => [c.id, c]))
  const later = (date, max) => {
    const d = addDays(date, Math.floor(rand() * (max + 1)))
    return d > today ? today : d
  }

  // Invoices for every order that got that far, plus some direct counter sales.
  for (const so of docs.SALES_ORDER.filter((d) => ['INVOICED', 'DISPATCHED', 'DELIVERED'].includes(d.status))) {
    const date = later(so.date, 2)
    const status = so.status === 'INVOICED' ? pick(['PENDING', 'CONFIRMED']) : so.status
    const old = date < addDays(today, -20)
    add('SALES_INVOICE', {
      date,
      party: partyById[so.partyId],
      lines: so.lines.map((l) => ({ ...l })),
      status,
      source: so,
      createdBy: so.createdBy,
      comment: so.comment,
      paidShare: status === 'DELIVERED' ? (old ? pick([1, 1, 1, 0.5]) : pick([1, 0.5, 0, 0])) : 0,
    })
  }
  for (const [, date] of days(40)) if (rand() < 0.25) add('SALES_INVOICE', { date, party: pick(customers), lines: freshLines(), status: pick(['CONFIRMED', 'DELIVERED', 'DELIVERED', 'CANCELLED']), paidShare: pick([1, 0]) })

  // Challans for invoices that left the warehouse.
  for (const inv of docs.SALES_INVOICE.filter((d) => ['DISPATCHED', 'DELIVERED'].includes(d.status))) {
    add('DELIVERY_CHALLAN', {
      date: later(inv.date, 1),
      party: partyById[inv.partyId],
      lines: inv.lines.map((l) => ({ ...l })),
      status: inv.status,
      source: inv,
      createdBy: inv.createdBy,
      vehicleNo: `MP09 ${pick(['GA', 'HB', 'CD'])} ${1000 + Math.floor(rand() * 8999)}`,
    })
  }

  // Delivered invoices that come back (part quantity, one or two lines), plus walk-in returns.
  for (const inv of docs.SALES_INVOICE.filter((d) => d.status === 'DELIVERED' && rand() < 0.35)) {
    const lines = inv.lines.slice(0, 1 + Math.floor(rand() * Math.min(2, inv.lines.length))).map((l) => ({ ...l, qty: Math.max(1, Math.round(l.qty * pick([0.2, 0.25, 0.5]))) }))
    const date = later(inv.date, 10)
    const status = date > addDays(today, -3) ? 'PENDING' : rand() < 0.8 ? 'APPROVED' : 'REJECTED'
    add('SALES_RETURN', { date, party: partyById[inv.partyId], lines, status, source: inv, comment: pick(COMMENTS.SALES_RETURN) })
  }

  for (const [, date] of days(40)) {
    if (rand() > 0.18) continue
    add('SALES_RETURN', { date, party: pick(customers), lines: freshLines().slice(0, 2).map((l) => ({ ...l, qty: pick([2, 3, 5]) })), status: pick(['PENDING', 'APPROVED', 'APPROVED', 'REJECTED']) })
  }

  // Credit notes for approved returns, plus standalone ones (rate difference, damage).
  for (const ret of docs.SALES_RETURN.filter((d) => d.status === 'APPROVED')) {
    const date = later(ret.date, 2)
    add('CREDIT_NOTE', { date, party: partyById[ret.partyId], lines: ret.lines.map((l) => ({ ...l })), status: date < addDays(today, -15) ? 'CLOSED' : 'APPROVED', source: ret, comment: 'Against sales return' })
  }
  for (const [, date] of days(30)) {
    if (rand() > 0.2) continue
    add('CREDIT_NOTE', { date, party: pick(customers), lines: freshLines().slice(0, 1).map((l) => ({ ...l, qty: 2 })), status: pick(['PENDING', 'APPROVED']), comment: pick(COMMENTS.CREDIT_NOTE.slice(1)) })
  }

  /* ── Purchase: orders → invoices → a few returns ── */
  for (const [back, date] of days(50)) {
    if (rand() < 0.35) continue
    // Recent orders are still waiting for approval; older ones are settled.
    const status = back > 6 ? (rand() < 0.85 ? 'APPROVED' : 'REJECTED') : back > 2 ? (rand() < 0.5 ? 'PENDING' : 'APPROVED') : 'PENDING'
    add('PURCHASE_ORDER', { date, party: pick(suppliers), lines: costLines(freshLines()), status })
  }
  for (const po of docs.PURCHASE_ORDER.filter((d) => d.status === 'APPROVED')) {
    const date = later(po.date, 4)
    add('PURCHASE_INVOICE', {
      date,
      party: supplierById[po.partyId],
      lines: po.lines.map((l) => ({ ...l })),
      status: date < addDays(today, -10) ? 'APPROVED' : pick(['PENDING', 'APPROVED']),
      source: po,
      createdBy: po.createdBy,
      poNumber: `SUP/${1000 + Math.floor(rand() * 8999)}`,
      received: 0,
    })
  }
  for (const pi of docs.PURCHASE_INVOICE.filter(() => rand() < 0.3)) {
    const lines = pi.lines.slice(0, 1).map((l) => ({ ...l, qty: Math.max(1, Math.round(l.qty * pick([0.2, 0.25, 0.5]))) }))
    add('PURCHASE_RETURN', { date: later(pi.date, 8), party: supplierById[pi.partyId], lines, status: '', source: pi, comment: pick(COMMENTS.PURCHASE_RETURN) })
  }

  // What each customer has paid on an invoice — Finance › Payments In will record this.
  for (const inv of docs.SALES_INVOICE) {
    inv.received = Math.round(docTotals(inv).total * inv.paidShare)
    delete inv.paidShare
  }

  // Numbers in date order per FY series; then link sources by number. Newest first.
  const byId = {}
  for (const [type, list] of Object.entries(docs)) {
    list.sort((a, b) => a.date.localeCompare(b.date))
    const counters = {}
    for (const d of list) {
      const series = `${PREFIX[type]}/${fy(d.date)}/`
      counters[series] = (counters[series] ?? 0) + 1
      d.number = `${series}${String(counters[series]).padStart(4, '0')}`
      byId[d.id] = d
    }
    list.reverse()
  }
  for (const list of Object.values(docs)) {
    for (const d of list) if (d.sourceRef) d.sourceRef.number = byId[d.sourceRef.id].number
  }
  return docs
}

export const INITIAL_SALES_DOCS = build()
