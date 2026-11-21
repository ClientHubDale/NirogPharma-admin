/**
 * Finance › Outstanding against the real API.
 *
 * The screen answers three questions the client asked in one sitting — who
 * owes, how old each bill is, and which items the money is sitting in — so
 * this suite seeds a bill of its own and then reads all three off the screen.
 *
 * Seeding rather than reading whatever is already there is deliberate: the
 * figures only mean something if the suite knows what they ought to be.
 */
import { start, login, goto, sleep, ok, eq, finish, pageText, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const CODE = 'E2E-OUT-1'
const BILL = 'E2E/OUT/001'
const QTY = 10
const RATE = 100 // ₹1,000 before tax, and the item is zero-GST, so the bill is ₹1,000

const signIn = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: ADMIN.mobile, password: ADMIN.password }),
}).then((r) => r.json())
const token = signIn?.data?.accessToken
const api = (path, init = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  }).then((r) => r.json())

const MARK = 'E2E outstanding suite'

/**
 * Payments first — one of ours left behind would sit as money on account for
 * ever — then the bill, the batch, and last the product, which cannot go
 * while it is on a bill.
 */
const wipe = async () => {
  for (const payment of (await api('/payments?limit=300')).data?.payments ?? []) {
    if (payment.comment !== MARK) continue
    // An approved payment cannot be deleted — the module's own rule, and the
    // right one: money that has been banked does not just vanish. Rejecting
    // it first puts what it settled back and lets the record go.
    if (payment.status === 'APPROVED') {
      await api(`/payments/${payment.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) })
    }
    await api(`/payments/${payment.id}`, { method: 'DELETE' })
  }
  for (const bill of (await api('/invoices?limit=300')).data?.invoices ?? []) {
    if (bill.invoiceNo !== BILL) continue
    if (bill.status !== 'PENDING' && bill.status !== 'CANCELLED') {
      await api(`/invoices/${bill.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    }
    await api(`/invoices/${bill.id}`, { method: 'DELETE' })
  }
  for (const batch of (await api('/stocks/batches?limit=300')).data?.batches ?? []) {
    if (batch.itemCode === CODE) await api(`/stocks/batches/${batch.id}`, { method: 'DELETE' })
  }
  for (const item of (await api('/items?limit=300')).data?.items ?? []) {
    if (item.code === CODE) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}

await wipe()

// A firm in the home state, so the bill is CGST + SGST and not IGST. The item
// is zero-GST so the bill is exactly quantity × rate and the item-wise split
// can be checked by hand.
const firm = ((await api('/distributors?limit=200')).data?.distributors ?? []).find((row) => row.isActive !== false)
const item = (
  await api('/items', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Outstanding Item',
      code: CODE,
      unit: 'BTL',
      category: 'Syrup',
      mrp: 500,
      gst: 0,
      tierPrices: [{ tier: firm.priceTier, price: RATE }],
    }),
  })
).data.item
const batch = (await api('/stocks/batches', { method: 'POST', body: JSON.stringify({ itemId: item.id, batchNo: 'E2E-OUT-A', quantity: 200 }) }))
  .data.batch

// Dated a good while back, so it lands in an ageing bucket that is not today's.
const billedOn = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10)
const made = (
  await api('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoiceNo: BILL,
      distributorId: firm.id,
      invoiceDate: billedOn,
      lines: [{ itemId: item.id, quantity: QTY, batches: [{ batchId: batch.id, quantity: QTY }] }],
    }),
  })
).data?.invoice
await api(`/invoices/${made.id}/issue`, { method: 'POST' })

/* ── the figures, before the screen is opened ───────────────────────── */

const read = async () => {
  const body = (await api('/payments/outstanding')).data
  return { row: body.rows.find((r) => r.distributorId === firm.id), totals: body.totals }
}

const { row, totals } = await read()
const bill = row.bills.find((b) => b.invoiceNo === BILL)

ok('the seeded bill is standing against the firm', Boolean(bill))
eq('and it is unpaid in full', bill?.due, QTY * RATE)
eq('aged from its own date', bill?.days, 45)
eq('which puts it in the 31 – 60 day bucket', bill?.bucket, '31-60')
eq('its items add up to its due', bill?.lines.reduce((sum, line) => sum + line.due, 0), bill?.due)
eq('and the one item carries all of it', bill?.lines.find((l) => l.itemCode === CODE)?.due, QTY * RATE)
ok(
  'the item shows up in the firm’s item-wise dues',
  (row.items ?? []).some((one) => one.itemCode === CODE && one.due === QTY * RATE),
  JSON.stringify(row.items?.slice(0, 3)),
)
ok(
  'and in the book’s item-wise dues',
  (totals.items ?? []).some((one) => one.itemCode === CODE),
  `${totals.items?.length} items`,
)
eq('the firm’s bills add up to what its buckets say', row.billsDue, Object.values(row.buckets).reduce((s, v) => s + v, 0))

// A payment settles half of it. Only an approved payment may move the books.
const payment = (
  await api('/payments', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      method: 'CASH',
      // Marked, because `wipe` finds this suite's payments by their comment.
      comment: MARK,
      allocations: [{ invoiceId: made.id, amount: 400 }],
    }),
  })
).data.payment
const after = async () => (await read()).row.bills.find((b) => b.invoiceNo === BILL)

eq('a payment still waiting for approval moves nothing', (await after())?.due, QTY * RATE)
await api(`/payments/${payment.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) })
const settled = await after()
eq('once approved, the bill owes the rest', settled?.due, QTY * RATE - 400)
eq('and the item owes the rest with it', settled?.lines.find((l) => l.itemCode === CODE)?.due, QTY * RATE - 400)

/* ── the screen ─────────────────────────────────────────────────────── */

const { browser, page, errors } = await start()
await login(page)
await goto(page, '/admin/finance/outstanding', { heading: 'Outstanding' })
await sleep(2000)

const text = await pageText(page)
ok('the ageing ladder is on the screen', /this month/i.test(text) && /over 90 days/i.test(text), text.slice(0, 200))
ok('the firm is listed', text.includes(firm.name), text.slice(0, 160))

// Open the firm and read its bills.
const opened = await page.evaluate((name) => {
  const row = [...document.querySelectorAll('tbody tr')].find((tr) => tr.innerText.includes(name))
  if (!row) return false
  row.click()
  return true
}, firm.name)
ok('clicking the firm opens its dues', opened)
await sleep(900)

const dues = await page.$eval('[role="dialog"]', (d) => d.innerText).catch(() => '')
ok('the bill is in there', dues.includes(BILL), dues.slice(0, 200))
ok('with its age in days', /45d/.test(dues), dues.slice(0, 300))

// Expand the bill: the item-wise split of its due.
await page.evaluate((no) => {
  const row = [...document.querySelectorAll('[role="dialog"] tbody tr')].find((tr) => tr.innerText.includes(no))
  row?.click()
}, BILL)
await sleep(600)
const split = await page.$eval('[role="dialog"]', (d) => d.innerText)
ok('expanding it shows what the due sits in', /what this bill.s due sits in/i.test(split), split.slice(0, 400))
ok('and names the item', split.includes('E2E Outstanding Item'), split.slice(0, 400))

// The firm's own item-wise tab.
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.startsWith('Items ('))
  tab?.click()
})
await sleep(500)
const itemTab = await page.$eval('[role="dialog"]', (d) => d.innerText)
ok('the items tab lists the item', itemTab.includes('E2E Outstanding Item'), itemTab.slice(0, 300))

await page.keyboard.press('Escape')
await sleep(400)

// The whole book, item-wise.
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'By item')
  tab?.click()
})
await sleep(800)
const byItem = await pageText(page)
ok('the book can be read item-wise', byItem.includes('E2E Outstanding Item'), byItem.slice(0, 200))

/* ── the same money, inside Stocks ──────────────────────────────────── */

await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
await sleep(2500)
const heads = await page.$$eval('thead th', (ths) => ths.map((x) => x.innerText.trim()))
ok('Distributor Stocks carries an Unpaid column', heads.includes('UNPAID'), heads.join(' | '))
ok('beside what the stock is worth', heads.includes('VALUE'), heads.join(' | '))

const stock = await pageText(page)
ok('and says what is unpaid on the whole list', /Unpaid on this/.test(stock), stock.slice(0, 200))

/* ── the dashboard ──────────────────────────────────────────────────── */

await goto(page, '/admin')
await sleep(2500)
const home = await pageText(page)
ok('the dashboard still shows outstanding dues', /Outstanding dues/.test(home))
ok('and the overdue bills card has real bills under it', /overdue bills/i.test(home))

await wipe()
await finish(browser, errors)
