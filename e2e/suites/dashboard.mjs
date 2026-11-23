/**
 * The admin dashboard.
 *
 * Most of this page is still the sample data it was built against; what is
 * checked here is the part that reads the real book — the dues — and the two
 * things the client asked for when he walked through it:
 *
 *  · the Outstanding tile counts **bills**, not firms. "एक पार्टी के 23 बिल
 *    हैं जो 30 दिन से ऊपर की हो रही है" — one firm standing on twenty-three
 *    old bills is twenty-three things to chase, and calling it one party
 *    hides the size of the job.
 *  · Distributor outstanding moved down out of the Manager-wise row, and a
 *    firm on it opens to the bills behind its figure: "ये 8.43 लाख कितने
 *    बिलों का है, इसकी डिटेल अन्दर खुले".
 *
 * Every firm on this book has paid ahead, so a bill is seeded to make a real
 * due exist — otherwise the card is empty and there is nothing to open.
 */
import { ok, eq, finish, clickText, goto, login, pageText, sleep, start, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'

const token = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mobile: ADMIN.mobile, password: ADMIN.password }),
})
  .then((r) => r.json())
  .then((r) => r?.data?.accessToken)

const api = (path, init = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  }).then((r) => r.json())

const BILL = 'E2E/DASH/001'
/// A second bill, dated today, so the current month has sales on it.
const BILL_NOW = 'E2E/DASH/THISMONTH'

/**
 * A bill that is out in the world has to be cancelled before it will delete.
 * This one is a past bill, so cancelling it moves no stock either.
 */
const wipe = async () => {
  for (const invoice of (await api('/invoices?limit=300')).data?.invoices ?? []) {
    if (invoice.invoiceNo !== BILL && invoice.invoiceNo !== BILL_NOW) continue
    if (invoice.status !== 'PENDING' && invoice.status !== 'CANCELLED') {
      await api(`/invoices/${invoice.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    }
    await api(`/invoices/${invoice.id}`, { method: 'DELETE' })
  }
}
await wipe()

/* ── a real due to look at ───────────────────────────────────────────── */

/**
 * The firm carrying the least credit is billed comfortably more than it, so
 * the bill cannot simply vanish into money they already paid ahead. Dated
 * forty days back, and marked a past bill — the one kind that goes out owing
 * money without moving any stock, which is what lets this run anywhere.
 */
const book = (await api('/payments/outstanding')).data
const leastCredit = [...(book.rows ?? [])].sort((a, b) => (a.onAccount ?? 0) - (b.onAccount ?? 0))[0]
const firms = (await api('/distributors?limit=200')).data.distributors
const firm = firms.find((d) => d.id === leastCredit?.distributorId) ?? firms[0]
const item = ((await api('/items?limit=200')).data.items ?? []).find((row) => Number(row.mrp) > 0)
ok('there is a firm and a priced item to bill', Boolean(firm) && Boolean(item))

const credit = Math.max(0, leastCredit?.onAccount ?? 0)
const quantity = Math.ceil((credit + 5000) / Math.max(1, Number(item.mrp)))
const fortyDaysAgo = new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10)

const seeded = await api('/invoices', {
  method: 'POST',
  body: JSON.stringify({
    invoiceNo: BILL,
    distributorId: firm.id,
    invoiceDate: fortyDaysAgo,
    pastBill: true,
    schemeIds: [],
    lines: [{ itemId: item.id, quantity }],
  }),
})
ok('a forty-day-old bill is seeded', Boolean(seeded.data?.invoice), seeded.message)
await api(`/invoices/${seeded.data.invoice.id}/issue`, { method: 'POST' })

/**
 * And one dated today, under a manager — the live book has no sales this
 * month, so without it the Sales tile and the manager card would both read
 * zero and prove nothing.
 */
const managed = firms.find((d) => d.managerId) ?? firm
const todaysBill = await api('/invoices', {
  method: 'POST',
  body: JSON.stringify({
    invoiceNo: BILL_NOW,
    distributorId: managed.id,
    pastBill: true,
    schemeIds: [],
    lines: [{ itemId: item.id, quantity: 7 }],
  }),
})
ok('a bill dated today is seeded', Boolean(todaysBill.data?.invoice), todaysBill.message)
await api(`/invoices/${todaysBill.data.invoice.id}/issue`, { method: 'POST' })

/* ── the tile counts bills, not firms ────────────────────────────────── */

const dues = (await api('/payments/outstanding')).data
const totals = dues.totals
ok('the server counts overdue invoices', typeof totals.invoicesPast30Days === 'number', String(totals.invoicesPast30Days))

// Counted off the same bills the rows carry, so the tile cannot drift from
// the list it is summarising.
const byHand = (dues.rows ?? []).reduce((sum, row) => sum + row.bills.filter((bill) => bill.days > 30).length, 0)
eq('…and it agrees with the bills themselves', totals.invoicesPast30Days, byHand)
ok(
  '…counting bills, of which there are never fewer than there are firms',
  totals.invoicesPast30Days >= totals.partiesPast30Days,
  `${totals.invoicesPast30Days} invoices across ${totals.partiesPast30Days} parties`,
)

const { browser, page } = await start()
const noise = []
page.on('pageerror', (e) => noise.push(String(e).slice(0, 160)))
await login(page)
await goto(page, '/admin')
await sleep(3000)

const text = await pageText(page)
ok(
  'the tile reads in invoices',
  new RegExp(`${totals.invoicesPast30Days} invoices? past 30 days`).test(text),
  text.match(/\d+ (invoices?|parties) past 30 days/)?.[0] ?? '(not found)',
)
ok('…and no longer in parties', !/parties past 30 days/.test(text))

/* ── the card moved down, and opens ──────────────────────────────────── */

const cards = await page.evaluate(() => [...document.querySelectorAll('h2, h3')].map((h) => h.textContent.trim()))
const manager = cards.findIndex((c) => c.startsWith('Manager-wise sales'))
const outstanding = cards.indexOf('Distributor outstanding')
ok('both cards are on the page', manager !== -1 && outstanding !== -1, cards.join(' | ').slice(0, 160))
ok('Distributor outstanding sits below Manager-wise sales', outstanding > manager, `manager ${manager}, outstanding ${outstanding}`)

const owing = (dues.rows ?? []).filter((row) => row.outstanding > 0)[0]
ok('a firm owes something, so the card has a row', Boolean(owing), owing?.distributorName)

const selector = `button[aria-label^="${owing.distributorName} —"]`
await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), selector)
await sleep(400)
ok('the firm can be pressed', Boolean(await page.$(selector)), owing.distributorName)
await page.click(selector)
await sleep(1200)

const dialog = await page.$eval('[role="dialog"]', (d) => d.innerText.replace(/\n/g, ' · ')).catch(() => '')
ok('…and the bills behind its figure come up', dialog.includes(owing.distributorName), dialog.slice(0, 140))
const listed = (owing.bills ?? []).filter((bill) => dialog.includes(bill.invoiceNo)).length
eq('…every one of them', listed, (owing.bills ?? []).length)
ok('…each saying how old it is and what is still due', /AGE/i.test(dialog) && /DUE/i.test(dialog))
ok('…with money paid on account kept apart from the bills', /on account/i.test(dialog) || owing.onAccount === 0)

/* ── the sales tile names its month, and opens into the six behind it ── */

// The dues modal is still up from the check above, and everything below is
// behind it.
await page.keyboard.press('Escape')
await sleep(700)


const monthly = (await api('/reports/sales-monthly?months=6')).data
ok('the tile names the month', text.includes(`Sales — ${monthly.current.label}`), monthly.current.label)

await page.click('button[aria-label="Sales month by month"]')
await sleep(900)
const menu = await page.evaluate(() =>
  [...document.querySelectorAll('[data-slot=dropdown-menu-item], [role=menuitem]')].map((i) => i.innerText.replace(/\s+/g, ' ').trim()),
)
ok(
  'the rupee sign opens all six months, each with its own total',
  (monthly.months ?? []).every((m) => menu.some((entry) => entry.startsWith(m.label))),
  menu.slice(0, 7).join(' | '),
)
ok('…with Custom underneath', menu.some((entry) => /Custom/i.test(entry)))

const past = monthly.months.find((m) => m.key !== monthly.current.key) ?? monthly.months[1]
await page.evaluate((label) => {
  const entry = [...document.querySelectorAll('[data-slot=dropdown-menu-item], [role=menuitem]')].find((i) => i.innerText.startsWith(label))
  entry?.click()
}, past.label)
await sleep(1200)
ok('picking a month behind us shows that month', (await pageText(page)).includes(`Sales — ${past.label}`), past.label)

await page.click('button[aria-label="Sales month by month"]')
await sleep(800)
await page.evaluate(() => {
  const entry = [...document.querySelectorAll('[data-slot=dropdown-menu-item], [role=menuitem]')].find((i) => /Custom/i.test(i.innerText))
  entry?.click()
})
await sleep(1100)
ok('Custom opens a date picker', /Sales over any dates/.test(await pageText(page)))
await clickText(page, 'button', 'Add it up', { exact: false })
await sleep(1500)
const custom = await page.$eval('#custom-sales', (el) => el.innerText.replace(/\s+/g, ' ')).catch(() => '')
ok('…and adds those days up, saying how many bills', /across \d+ bills?,/.test(custom), custom.slice(0, 120))
await page.keyboard.press('Escape')
await sleep(600)

/* ── manager-wise sales, and the bills behind it ─────────────────────── */

const byManager = (await api('/reports/sales-by-manager')).data
const headings = await page.evaluate(() => [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()))
ok(
  'the manager card names the month',
  headings.some((h) => h === `Manager-wise sales — ${byManager.label}`),
  headings.join(' | ').slice(0, 120),
)

const topManager = byManager.managers[0]
ok('it lists a real manager', Boolean(topManager), topManager?.managerName)

await clickText(page, 'button', 'View sales', { exact: false })
await sleep(1200)
ok('the breakdown opens, grouped under the manager', (await pageText(page)).includes(topManager.managerName))

await page.evaluate((name) => {
  const header = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.includes(name))
  header?.click()
}, topManager.managerName)
await sleep(900)
const opened = await page.$eval('[role="dialog"]', (d) => d.innerText.replace(/\n/g, ' · ')).catch(() => '')
ok('…to its parties, bills and what is unpaid', /PARTY/i.test(opened) && /INVOICE/i.test(opened) && /OUTSTANDING/i.test(opened))
const firstBill = topManager.bills[0]
ok('…naming the bill and the party it went to', opened.includes(firstBill.invoiceNo) && opened.includes(firstBill.party))
ok('…with that manager’s own total underneath', /total/i.test(opened))

// "उसका इनवाइस क्लिक करे तो उसका इनवाइस आ जाए सामने."
await page.evaluate((no) => {
  const link = [...document.querySelectorAll('[role="dialog"] button')].find((b) => b.innerText.trim() === no)
  link?.click()
}, firstBill.invoiceNo)
await sleep(1500)
ok('pressing a bill number opens that bill', page.url().includes(`/admin/sales/invoices/${firstBill.invoiceId}`), page.url())

/* ── new distributors, gathered under whoever added them ─────────────── */

/**
 * The list used to repeat a manager's name once for every firm they added —
 * "फिर से देशमुख आ गया, दोबारा". The name is the heading now, and the firms
 * sit under it.
 */
const allFirms = (await api('/distributors?limit=500')).data.distributors
const since = new Date()
since.setMonth(since.getMonth() - 3)
const cutoff = since.toISOString().slice(0, 10)
const recent = allFirms.filter((f) => f.createdAt && f.createdAt >= cutoff)
const adders = [...new Set(recent.map((f) => f.managerName || 'No manager'))]

await goto(page, '/admin')
await sleep(3000)
const board = await pageText(page)
ok('the card says how far back it looks', /New distributors added by managers — last 3 months/.test(board))
ok('a firm carries the day it was put on the books', recent.length > 0 && Boolean(recent[0].createdAt), recent[0]?.createdAt)

const adder = adders[0]
const theirs = recent.filter((f) => (f.managerName || 'No manager') === adder)
ok('the manager is a heading', board.includes(adder), `${adder} — ${theirs.length} firm(s)`)

await page.evaluate((name) => {
  const header = [...document.querySelectorAll('button')].find((b) => b.innerText.trim().startsWith(name) && /firm/.test(b.innerText))
  header?.scrollIntoView({ block: 'center' })
  header?.click()
}, adder)
await sleep(900)
const expanded = await pageText(page)
ok('pressing it opens their firms', theirs.every((f) => expanded.includes(f.name)), theirs.map((f) => f.name).join(', '))
ok(
  '…each with a Form button',
  (await page.evaluate(() => [...document.querySelectorAll('a')].filter((a) => a.innerText.trim() === 'Form').length)) >= theirs.length,
)

/* ── that form, printable, with the documents on it ──────────────────── */

const subject = theirs[0]
await goto(page, `/admin/parties/distributors/${subject.id}/form`)
await sleep(2500)
const sheet = await pageText(page)
ok('the form opens as a sheet', /Distributor Form/i.test(sheet), sheet.slice(0, 70))
ok('…with the firm, its manager and where it is', sheet.includes(subject.name) && /MANAGER/i.test(sheet) && /COORDINATES/i.test(sheet))
ok('…a place for both sides of the Aadhaar', /Aadhaar — front/i.test(sheet) && /Aadhaar — back/i.test(sheet))
ok('…and lines to sign', /Distributor signature/i.test(sheet))
// It is a form to print, so nothing of the panel is around it.
ok('it stands alone, ready for the printer', !(await page.evaluate(() => Boolean(document.querySelector('nav[aria-label=Dashboard]')))))

/* ── and the form asks for those documents in the first place ────────── */

await goto(page, '/admin/parties/distributors', { heading: 'Distributors' })
await sleep(2000)
await page.evaluate(() => {
  const create = [...document.querySelectorAll('button')].find((b) => /^New( distributor)?$/i.test(b.innerText.trim()))
  create?.click()
})
await sleep(1500)
const addForm = await pageText(page)
ok('the distributor form asks for the Aadhaar, both sides', /Aadhaar — front/i.test(addForm) && /Aadhaar — back/i.test(addForm))
await page.keyboard.press('Escape')
await sleep(600)

/* ── a phone ─────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin')
await sleep(1500)
ok('the dashboard fits a phone screen', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)))

/* ── nothing left behind ─────────────────────────────────────────────── */

await wipe()
const left = ((await api('/invoices?limit=300')).data?.invoices ?? []).filter(
  (invoice) => invoice.invoiceNo === BILL || invoice.invoiceNo === BILL_NOW,
)
eq('the seeded bills are cleared away', left.length, 0)

// A new distributor's form asks the device where it is; a browser with no
// location to give says so, and that is not the page breaking.
await finish(browser, noise, { ignore: /geolocation/i })
