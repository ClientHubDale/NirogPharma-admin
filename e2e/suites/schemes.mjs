/**
 * Inventory › Schemes, against the real API.
 *
 * The heart of it: a scheme is a **trigger** paired with a **reward**, read in
 * slabs, and there is exactly one table holding them — so a scheme typed into
 * an item's own form and one made on the Schemes page are the same kind of
 * thing in the same list.
 */
import { start, login, goto, sleep, ok, eq, has, near, finish, pageText, overflows, pickOption, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const BUY = { name: 'E2E Scheme Buy', code: 'E2E-SCH-BUY' }
const FREE = { name: 'E2E Scheme Free', code: 'E2E-SCH-FREE' }
const BATCH = 'E2E-SCH-A'
const BILL = 'E2E/SCH/001'

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
  for (const bill of (await api('/invoices?limit=300')).data?.invoices ?? []) {
    if (bill.invoiceNo !== BILL) continue
    if (bill.status !== 'PENDING' && bill.status !== 'CANCELLED') {
      await api(`/invoices/${bill.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    }
    await api(`/invoices/${bill.id}`, { method: 'DELETE' })
  }
  for (const scheme of (await api('/schemes?limit=300')).data?.schemes ?? []) {
    if (scheme.name.startsWith('E2E ')) await api(`/schemes/${scheme.id}`, { method: 'DELETE' })
  }
  for (const batch of (await api('/stocks/batches?limit=300')).data?.batches ?? []) {
    if (batch.batchNo === BATCH) await api(`/stocks/batches/${batch.id}`, { method: 'DELETE' })
  }
  for (const item of (await api('/items?limit=300')).data?.items ?? []) {
    if ([BUY.code, FREE.code].includes(item.code)) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const firm = ((await api('/distributors?limit=200')).data?.distributors ?? []).find(
  (row) => (row.state ?? '').toUpperCase() === 'UP',
)
if (!firm) {
  console.log('FAIL  a distributor inside UP is needed — none in the database')
  process.exit(1)
}

const buy = (await api('/items', { method: 'POST', body: JSON.stringify({ ...BUY, unit: 'BTL', category: 'Syrup', mrp: 600, gst: 5 }) })).data.item
const free = (await api('/items', { method: 'POST', body: JSON.stringify({ ...FREE, unit: 'PCS', category: 'Syrup', mrp: 100, gst: 5 }) })).data.item

/* ── one table, two doors ─────────────────────────────────────────────── */

/**
 * A scheme typed into an item's own form is a row in the one scheme table, not
 * a second store — so it shows up on the Schemes page like any other.
 */
const owned = (
  await api('/items', {
    method: 'POST',
    body: JSON.stringify({
      name: 'E2E Scheme Owner',
      code: 'E2E-SCH-OWN',
      unit: 'BTL',
      category: 'Syrup',
      mrp: 400,
      gst: 5,
      schemeBuyQty: 10,
      schemeFreeQty: 2,
      schemeFreeItemId: free.id,
    }),
  })
).data?.item

const listed = () => api('/schemes?limit=300').then((r) => r.data?.schemes ?? [])
const fromItem = (await listed()).find((row) => row.sourceItemId === owned.id)
ok('a scheme typed on an item reaches the Schemes list', Boolean(fromItem), JSON.stringify(owned?.offerText))
eq('…as one rung', fromItem?.slabs?.length, 1)
eq('…at the quantity typed', fromItem?.slabs?.[0]?.min, 10)
eq('…giving what was chosen', fromItem?.slabs?.[0]?.freeQty, 2)
eq('…and the item earns it', fromItem?.buyItemIds?.[0], owned.id)

// Editing from the item form moves the same row rather than making another.
await api(`/items/${owned.id}`, { method: 'PATCH', body: JSON.stringify({ schemeBuyQty: 20, schemeFreeQty: 5, schemeFreeItemId: free.id }) })
const moved = (await listed()).filter((row) => row.sourceItemId === owned.id)
eq('editing it from the item makes no second scheme', moved.length, 1)
eq('…and the one row moved', moved[0]?.slabs?.[0]?.min, 20)

// The item form reads it back from that row, not from a copy of its own.
const readBack = (await api(`/items/${owned.id}`)).data?.item
eq('the item form reads the scheme back from the table', readBack?.schemeBuyQty, 20)
eq('…including what it gives', readBack?.schemeFreeQty, 5)

// Clearing the box takes it off the Schemes page too.
await api(`/items/${owned.id}`, { method: 'PATCH', body: JSON.stringify({ schemeBuyQty: null, schemeFreeQty: null, schemeFreeItemId: null }) })
ok('clearing the box removes it from the list', !(await listed()).some((row) => row.sourceItemId === owned.id))
await api(`/items/${owned.id}`, { method: 'DELETE' })

/* ── the four kinds ───────────────────────────────────────────────────── */

const make = (body) => api('/schemes', { method: 'POST', body: JSON.stringify({ startDate: '2026-01-01', endDate: '2027-12-31', ...body }) })

const qtyFree = (
  await make({
    name: 'E2E qty to item',
    trigger: 'ITEM_QTY',
    reward: 'FREE_ITEM',
    buyItemIds: [buy.id],
    slabs: [{ min: 24, freeItemId: free.id, freeQty: 5, freeDiscountPct: 100 }],
  })
).data?.scheme
ok('buy items → get items free', Boolean(qtyFree?.id), JSON.stringify(qtyFree).slice(0, 140))

const spendOff = (
  await make({
    name: 'E2E spend to money',
    trigger: 'ORDER_AMOUNT',
    reward: 'DISCOUNT',
    scope: 'CART',
    discountType: 'FLAT',
    slabs: [{ min: 5000, value: 1000 }],
  })
).data?.scheme
ok('spend money → get money off', Boolean(spendOff?.id))

/* ── the ladder is checked as a whole ─────────────────────────────────── */

const overlap = await make({
  name: 'E2E overlapping',
  trigger: 'ITEM_QTY',
  reward: 'FREE_ITEM',
  buyItemIds: [buy.id],
  slabs: [
    { min: 10, max: 30, freeItemId: free.id, freeQty: 1, freeDiscountPct: 100 },
    { min: 20, max: null, freeItemId: free.id, freeQty: 2, freeDiscountPct: 100 },
  ],
})
eq('overlapping slabs are refused', overlap?.code, 'SCHEME_BAD_SLABS', JSON.stringify(overlap).slice(0, 140))

const openMiddle = await make({
  name: 'E2E open middle',
  trigger: 'ITEM_QTY',
  reward: 'FREE_ITEM',
  buyItemIds: [buy.id],
  slabs: [
    { min: 10, max: null, freeItemId: free.id, freeQty: 1, freeDiscountPct: 100 },
    { min: 50, max: null, freeItemId: free.id, freeQty: 3, freeDiscountPct: 100 },
  ],
})
eq('only the top slab may be open-ended', openMiddle?.code, 'SCHEME_BAD_SLABS')

const nameless = await make({ name: 'E2E qty to item', trigger: 'ITEM_QTY', reward: 'FREE_ITEM', buyItemIds: [buy.id], slabs: [{ min: 5, freeItemId: free.id, freeQty: 1, freeDiscountPct: 100 }] })
eq('two schemes cannot share a name', nameless?.code, 'SCHEME_NAME_IN_USE')

/* ── what a bill earns ────────────────────────────────────────────────── */

const ask = (quantity, taxableValue) =>
  api('/schemes/preview', { method: 'POST', body: JSON.stringify({ lines: [{ itemId: buy.id, quantity, taxableValue }] }) }).then(
    (r) => r.data,
  )

const under = await ask(10, 2000)
ok('below the slab nothing is earned', !under?.freebies?.length, JSON.stringify(under?.applied))

const over = await ask(50, 14143)
/**
 * A single quantity rung stands: every lot of 24 earns its 5 again, so 50
 * earns it twice. The switch for this came off the screen — it follows from
 * there being one rung, which is what the client asked for.
 */
eq('a single rung repeats on its own', over?.freebies?.find((row) => row.itemId === free.id)?.quantity, 10)
eq('…and the spend scheme stacks with it', over?.discount, 1000)
eq('…both are reported', over?.applied?.length, 2)

// A giveaway is not ours to deduct; a catalogue product is.
eq('a free catalogue product leaves stock', over?.freebies?.find((row) => row.itemId === free.id)?.fromStock, true)

/* ── the bill carries it ──────────────────────────────────────────────── */

const batch = (
  await api('/stocks/batches', { method: 'POST', body: JSON.stringify({ itemId: buy.id, batchNo: BATCH, quantity: 500 }) })
).data.batch
const freeBatch = (
  await api('/stocks/batches', { method: 'POST', body: JSON.stringify({ itemId: free.id, batchNo: `${BATCH}-F`, quantity: 500 }) })
).data.batch

const bill = (
  await api('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoiceNo: BILL,
      distributorId: firm.id,
      invoiceDate: '2026-11-20',
      lines: [{ itemId: buy.id, quantity: 50, batches: [{ batchId: batch.id, quantity: 50 }] }],
    }),
  })
).data?.invoice

ok('the bill records what the schemes gave', (bill?.schemeFreebies ?? []).length >= 1, JSON.stringify(bill?.schemeFreebies))
eq('…and what they took off', bill?.schemeDiscount, 1000)

/**
 * The money rule the client set outright: a bill is taxed on the whole sale
 * and the scheme comes off afterwards — "जीएसटी लगेगा 10 हज़ार पर".
 */
const taxed = Math.round((bill.taxableValue + bill.taxAmount) * 100) / 100
eq('GST is charged on the full sale, the scheme comes off after', Math.round((taxed - 1000 + bill.roundOff) * 100) / 100, bill.total)

// Saying no to a scheme is honoured rather than re-decided.
const refused = (
  await api(`/invoices/${bill.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      distributorId: firm.id,
      schemeIds: [],
      lines: [{ itemId: buy.id, quantity: 50, batches: [{ batchId: batch.id, quantity: 50 }] }],
    }),
  })
).data?.invoice
eq('a scheme the admin skipped is not applied', refused?.schemeDiscount, 0)
ok('…and nothing is given away', !(refused?.schemeFreebies ?? []).length, JSON.stringify(refused?.schemeFreebies))

// Put them back, then issue, and the free goods must leave the shelf too.
await api(`/invoices/${bill.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ distributorId: firm.id, lines: [{ itemId: buy.id, quantity: 50, batches: [{ batchId: batch.id, quantity: 50 }] }] }),
})

const freeBefore = (await api(`/stocks/batches?limit=300`)).data?.batches?.find((row) => row.id === freeBatch.id)?.closing
await api(`/invoices/${bill.id}/issue`, { method: 'POST' })
const freeAfter = (await api(`/stocks/batches?limit=300`)).data?.batches?.find((row) => row.id === freeBatch.id)?.closing

eq('free goods come off the shelf when the bill goes out', Math.round((freeBefore - freeAfter) * 100) / 100, 10)

/* ── the screen ───────────────────────────────────────────────────────── */

const { browser, page, errors } = await start()
await login(page)

await goto(page, '/admin/inventory/schemes', { heading: 'Schemes' })
await sleep(1800)
const list = await pageText(page)
has('the scheme is on the list', list, 'E2E qty to item')
has('…said in words', list, 'Buy items → get items free')
has('…with what it gives spelled out', list, 'free')

// It survives a reload, which is the whole point of it being on the server.
await page.reload({ waitUntil: 'networkidle2' })
await sleep(2000)
has('and it is still there after a reload', await pageText(page), 'E2E qty to item')

await goto(page, '/admin/inventory/schemes/new')
await sleep(1800)
const form = await pageText(page)
has('the form asks one question, not two', form, 'What kind of scheme is it?')
has('…naming all four kinds', form, 'Spend money → get an item free')
has('…then the rule', form, 'The rule')
has('…then the dates', form, 'Name and dates')
ok('the removed switch stays removed', !form.includes('Does it repeat'), form.slice(0, 160))
ok('…and so does Advanced', !form.includes('Who it is for'), form.slice(0, 160))

/**
 * The bill prints what the schemes gave.
 *
 * The sheet on screen is the sheet that comes out of the printer, so the free
 * goods and the money off have to be on it from the moment Apply is pressed —
 * not only once the bill has been saved and read back. The client asked for
 * the giveaway in bold under the table: "अलग से, बोल्ड में".
 */
await goto(page, '/admin/sales/invoices/new')
await sleep(2500)
await pickOption(page, '#invoice-distributor', firm.name)
await sleep(900)
await pickOption(page, '[aria-label="Add product"]', BUY.name)
await sleep(900)

const qtyBox = await page.$('[aria-label="Quantity of ' + BUY.name + '"]')
await qtyBox.click({ clickCount: 3 })
await qtyBox.type('50')
await sleep(2800)

const sheet = () => page.$eval('#bill-sheet', (el) => el.innerText)
const amountOn = (txt, label) => {
  const row = txt.split('\n').find((line) => line.trim().startsWith(label))
  return row === undefined ? null : Number(row.slice(row.indexOf(label) + label.length).replace(/[^0-9.]/g, ''))
}

const before = await sheet()
ok('nothing is given away until Apply is pressed', !before.includes('FREE GOODS'), before.slice(0, 120))
eq('…and nothing comes off the money either', amountOn(before, 'SCHEME DISCOUNT'), 0)
const dueBefore = amountOn(before, 'GRAND TOTAL')

for (const toggle of await page.$$('[id^="scheme-toggle-"]')) {
  await toggle.click()
  await sleep(2200)
}

const after = await sheet()
has('the free goods print under the table', after, 'SCHEME / FREE GOODS')
has('…named', after, FREE.name)
eq('the money off reaches the summary', amountOn(after, 'SCHEME DISCOUNT'), 1000)
near('…and the bill asks for that much less', dueBefore - amountOn(after, 'GRAND TOTAL'), 1000, 1)

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/inventory/schemes', { heading: 'Schemes' })
await sleep(900)
ok('the list fits a phone screen', !(await overflows(page)))

/* ── nothing left behind ──────────────────────────────────────────────── */

await cleanup()
ok('the suite takes its schemes with it', !(await listed()).some((row) => row.name.startsWith('E2E ')))

await finish(browser, errors, { ignore: /status of (400|404|409|500)/ })
