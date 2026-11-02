/**
 * Sales › Credit Notes against the real API.
 *
 * The heart of it: a return raises a note on its own number series, and that
 * note prints as the client's own paper — "सिमिलर फॉर्मेट है, बस जहाँ टैक्स
 * इनवाइस लिखा है वहाँ क्रेडिट नोट लिखेंगे".
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, overflows, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const ITEM = { name: 'E2E Note Syrup', code: 'E2E-CN-ITEM' }
const BATCH = 'E2E-CN-A'

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

const cleanup = async () => {
  for (const note of (await api('/credit-notes?limit=300')).data?.notes ?? []) {
    if (note.itemName === ITEM.name) await api(`/credit-notes/${note.id}`, { method: 'DELETE' })
  }
  for (const batch of (await api('/stocks/batches?limit=300')).data?.batches ?? []) {
    if (batch.batchNo === BATCH) await api(`/stocks/batches/${batch.id}`, { method: 'DELETE' })
  }
  for (const item of (await api('/items?limit=300')).data?.items ?? []) {
    if (item.code === ITEM.code) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}
await cleanup()

// An existing firm inside UP, so the note credits CGST + SGST rather than
// IGST. Appointing one needs a manager, a region, a city and an area, which is
// the distributors suite's job, not this one's.
const firm = ((await api('/distributors?limit=200')).data?.distributors ?? []).find(
  (row) => (row.state ?? '').toUpperCase() === 'UP',
)
if (!firm) {
  console.log('FAIL  a distributor inside UP is needed to credit — none in the database')
  process.exit(1)
}

// MRP 600 at 5% GST: the credit has to come out of the rate they bought at.
const item = (await api('/items', {
  method: 'POST',
  body: JSON.stringify({ ...ITEM, unit: 'BTL', category: 'Syrup', mrp: 600, gst: 5, hsn: '300490' }),
})).data.item

const batch = (await api('/stocks/batches', {
  method: 'POST',
  body: JSON.stringify({ itemId: item.id, batchNo: BATCH, quantity: 100 }),
})).data.batch

await api('/stocks/issue', {
  method: 'POST',
  body: JSON.stringify({ batchId: batch.id, distributorId: firm.id, quantity: 40, invoiceNo: 'E2E/CN/777' }),
})

/* ── a return raises the note ─────────────────────────────────────────── */

const returned = await api('/stocks/return', {
  method: 'POST',
  body: JSON.stringify({ batchId: batch.id, distributorId: firm.id, quantity: 6, invoiceNo: 'E2E/CN/777' }),
})
const raised = returned.data?.batch?.creditNote
ok('a return raises a credit note', Boolean(raised?.noteNo), JSON.stringify(returned).slice(0, 160))
ok('…on its own series, never the bill number', raised?.noteNo?.startsWith('CN/'), raised?.noteNo)
eq('…for what came back', raised?.quantity, 6)
eq('…as one line on the note', raised?.lines?.length, 1)
// The rate they bought at already includes the 5% GST, so the note has to
// take it back out: taxable + tax is what we owe, and the tax is 5% of it.
const owed = Math.round((raised.taxableValue + raised.taxAmount) * 100) / 100
eq('…taxable and tax add back up to what we owe', owed, raised.total)
eq('…with the GST taken back out of the rate', Math.round((raised.taxAmount / raised.taxableValue) * 1000) / 1000, 0.05)

const note = (await api(`/credit-notes/${raised.id}`)).data.note
eq('the note knows which bill it is against', note.againstInvoiceNo, 'E2E/CN/777')
ok('and inside UP it credits CGST and SGST', note.interState === false && note.igst === 0, JSON.stringify({ i: note.interState, igst: note.igst }))

const { browser, page, errors } = await start()
await login(page)

/* ── the list ─────────────────────────────────────────────────────────── */

await goto(page, '/admin/sales/credit-notes', { heading: 'Credit Notes' })
await sleep(900)
const list = await pageText(page)
has('the note is on the list', list, raised.noteNo)
has('…against the distributor it is owed to', list, firm.name)
has('…with a way to write one by hand', list, 'Create credit note')
// Sales returns and credit notes were two entries for one act; the note won.
const sidebar = await page.$eval('nav[aria-label=Dashboard]', (el) => el.innerText)
ok('Sales Returns is gone from the menu', !sidebar.includes('Sales Returns'), sidebar.slice(0, 200))
has('and Credit Notes is in its place', sidebar, 'Credit Notes')

/* ── writing one by hand ──────────────────────────────────────────────── */

await goto(page, '/admin/sales/credit-notes/new')
await sleep(1500)
const blank = await pageText(page)
has('the create screen is the note itself', blank, 'CREDIT NOTE')
has('…headed as a sales return invoice', blank, 'SALES RETURN INVOICE')
has('…and says what Save and Issue each do', blank, 'Save records the note')
ok('with the letterhead to edit, as the bill has', Boolean(await page.$('#note-no')))

/* ── the printed note ─────────────────────────────────────────────────── */

await goto(page, `/admin/sales/credit-notes/${raised.id}/print`)
await sleep(1800)
const sheet = await pageText(page)

// The two lines over the client's own note.
has('the sheet is headed CREDIT NOTE', sheet, 'CREDIT NOTE')
has('…over SALES RETURN INVOICE', sheet, 'SALES RETURN INVOICE')
ok('and not TAX INVOICE', !sheet.includes('TAX INVOICE'), sheet.slice(0, 120))
ok('with none of the panel around it', !sheet.includes('Live Location'), sheet.slice(0, 120))
has('it names the note', sheet, raised.noteNo)
has('…and the party it is for', sheet, firm.name)

// Their paper, which is what a credit note is raised against.
has('the sheet asks for their debit note number', sheet, 'DEBIT NOTE NO.')
has('…and its date', sheet, 'DEBIT NOTE DATE')
// A note is goods coming back, so nothing is shipped anywhere.
ok('there is no ship-to on a credit note', !sheet.includes('SHIP TO'), sheet.slice(0, 200))
// The e-way bill belongs to a consignment going out, not one coming back.
ok('and no e-way bill line', !sheet.includes('E-WAY BILL'), sheet.slice(0, 200))

// The client's own columns: no batch, manufacturing, expiry or MRP.
for (const gone of ['BATCH NO.', 'MFD.', 'MRP']) {
  ok(`the goods table drops ${gone}`, !sheet.includes(gone), gone)
}
has('and carries the HSN code', sheet, 'HSN')
has('…with OTHER CHARGES in the summary', sheet, 'OTHER CHARGES')
has('…and the total spelled out', sheet.toLowerCase(), 'total in words rs.')

// CGST, SGST and IGST each print their rate beside their amount.
// Three copies print on three pages, so only the first sheet is counted.
const taxHeads = await page.evaluate(
  () => [...document.querySelector('article').querySelectorAll('th')].filter((th) => th.textContent.trim() === 'AMOUNT').length,
)
eq('CGST, SGST and IGST each print a rate and an amount', taxHeads, 3)

// Ruled down the full page like their pad: items, then blanks.
const ruled = await page.evaluate(() => {
  const head = [...document.querySelectorAll('th')].find((th) => th.textContent.includes('HSN'))
  const rows = [...(head?.closest('table')?.querySelector('tbody')?.rows ?? [])]
  // The last row carries the totals.
  return rows.length - 1
})
eq('the note is ruled to twenty goods rows', ruled, 20)

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/sales/credit-notes', { heading: 'Credit Notes' })
await sleep(600)
ok('the list fits a phone screen', !(await overflows(page)))

/* ── cancelling puts it all back ──────────────────────────────────────── */

// Only this suite's own item: the firm is a real one and holds plenty else.
const heldOfOurs = async () =>
  ((await api(`/stocks/distributors?distributorId=${firm.id}`)).data?.rows ?? [])
    .filter((row) => row.itemId === item.id)
    .reduce((sum, row) => sum + Number(row.held || 0), 0)

eq('they hold what is left after the return', await heldOfOurs(), 34)

await api(`/credit-notes/${raised.id}`, { method: 'DELETE' })
eq('cancelling the note puts the goods back with them', await heldOfOurs(), 40)
ok(
  'and the note is gone',
  !((await api('/credit-notes?limit=200')).data?.notes ?? []).some((row) => row.noteNo === raised.noteNo),
)

await cleanup()
const left = (await api('/credit-notes?limit=300')).data?.notes ?? []
ok('the suite leaves nothing behind', !left.some((row) => row.itemName === ITEM.name))

await finish(browser, errors, { ignore: /status of (400|404|409)/ })
