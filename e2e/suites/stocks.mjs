/**
 * Stocks › Factory Stocks and Distributor Stocks against the real API.
 *
 * The two screens are one ledger seen from both ends, so the heart of this
 * suite is: issue stock on the factory screen, then find it on the other one.
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, overflows, clickText, pickOption, ADMIN, waitForToast } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const ITEM = { name: 'E2E Stock Syrup', code: 'E2E-STK-1' }
const BATCH = 'E2E-B-100'

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

// Deleting the product takes its batches and their ledger with it.
/**
 * Opens a row's ⋯ menu. The row is scrolled to the middle first: near the
 * bottom of a long table it sits under the floating help button, which
 * swallows the click. It has to be a real click — Radix opens on pointerdown,
 * which a synthetic el.click() does not fire.
 */
/** Opens an item's batches, so the batch lines (and their menus) exist. */
const openItem = async (name) => {
  const selector = `button[aria-label="Show batches of ${name}"]`
  if (!(await page.$(selector))) return
  await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center' }))
  await sleep(200)
  await page.click(selector)
  await sleep(700)
}

const openRowMenu = async (label) => {
  const selector = `button[aria-label="${label}"]`
  await page.$eval(selector, (el) => el.scrollIntoView({ block: 'center' }))
  await sleep(300)
  await page.click(selector)
  await page.waitForSelector('[data-slot=dropdown-menu-item]')
  await sleep(300)
}

const cleanup = async () => {
  for (const item of (await api('/items?limit=200')).data?.items ?? []) {
    if (item.code?.startsWith('E2E-STK')) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const item = (await api('/items', { method: 'POST', body: JSON.stringify({ ...ITEM, unit: 'BTL', category: 'Syrup', mrp: 180 }) })).data.item
const distributor = (await api('/distributors?limit=1')).data?.distributors?.[0]
if (!distributor) {
  console.log('FAIL  a distributor is needed to issue stock to — none in the database')
  process.exit(1)
}

const { browser, page, errors } = await start()
await login(page)

/* ── the sidebar carries the new section ──────────────────────────────── */

await goto(page, '/admin/inventory/items', { heading: 'Items' })
const sidebar = await page.$eval('nav[aria-label=Dashboard]', (el) => el.innerText)
has('the sidebar has a Stocks section', sidebar, 'Stocks')

await clickText(page, 'nav[aria-label=Dashboard] button', 'Stocks')
await sleep(500)
const opened = await page.$eval('nav[aria-label=Dashboard]', (el) => el.innerText)
has('it opens onto Factory Stocks', opened, 'Factory Stocks')
has('and Distributor Stocks', opened, 'Distributor Stocks')

/* ── a batch, with the dates on the carton ────────────────────────────── */

await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
// The card labels are upper-cased by CSS, which innerText carries through.
ok('the summary cards are there', (await pageText(page)).toLowerCase().includes('expiring in 90 days'))

// The books run 1 April to 31 March, picked by year and month — not two dates.
const fyNow = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1
const header = await pageText(page)
has('the page says which financial year is on screen', header, `${fyNow}–${String((fyNow + 1) % 100)}`)
ok('the loose date pickers are gone', (await page.$('#stock-from')) === null && (await page.$('#stock-to')) === null)
ok('a financial year picker is there', Boolean(await page.$('[aria-label="Financial year"]')))
ok('and a month picker', Boolean(await page.$('[aria-label="Month"]')))

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#batch-no')
await sleep(500)

// Nothing typed yet, so there is nothing to save.
const saveButton = () => page.$eval('footer button[type=submit], header button[type=submit]', (el) => el.disabled)
ok('Save is dark on an empty batch form', await saveButton())

await pickOption(page, '#batch-item', ITEM.name)
await sleep(300)
await page.type('#batch-no', BATCH)
await page.type('#batch-quantity', '500')
ok('and lights up once the batch is filled in', !(await saveButton()))
has('the quantity is counted in the item\'s unit', await page.$eval('#batch-quantity', (el) => el.parentElement.textContent), 'BTL')

// Received last month, so this month's figures open at 500 rather than take it in.
const lastMonth = new Date()
lastMonth.setMonth(lastMonth.getMonth() - 1, 15)
const iso = (d) => d.toISOString().slice(0, 10)
const setDate = (selector, value) =>
  page.evaluate(
    (sel, v) => {
      const input = document.querySelector(sel)
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, v)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    },
    selector,
    value,
  )

// Everything but the note and the entry date is required.
await clickText(page, 'header button, footer button', 'Save')
await sleep(600)
has('the manufacturing date is required', await pageText(page), 'Enter the manufacturing date')

const made = new Date()
made.setMonth(made.getMonth() - 2, 10)
const expires = new Date()
expires.setFullYear(expires.getFullYear() + 2)
await setDate('#batch-mfg', iso(made))
await sleep(200)

await clickText(page, 'header button, footer button', 'Save')
await sleep(600)
has('and so is the expiry date', await pageText(page), 'Enter the expiry date')

await setDate('#batch-expiry', iso(expires))
await setDate('#batch-received', iso(lastMonth))
await sleep(300)

await clickText(page, 'header button, footer button', 'Save')
await page.waitForFunction(() => !document.querySelector('#batch-no'), { timeout: 15000 }).catch(() => {})
has('a toast confirms the batch', await waitForToast(page), 'Batch added')
await sleep(800)

const listed = await pageText(page)
has('the product is on the table', listed, ITEM.name)
has('as one line saying how many batches it holds', listed, '1 batch')

await openItem(ITEM.name)
has('and the batch is underneath', await pageText(page), BATCH)

const stored = (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)
eq('the factory holds all 500', stored?.available, 500)
eq('and the catalogue agrees', (await api(`/items/${item.id}`)).data.item.stock, 500)

/* ── the four figures follow the period ───────────────────────────────── */

const figures = (await api(`/stocks/batches?from=${iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}&to=${iso(new Date())}`)).data.batches.find(
  (b) => b.batchNo === BATCH,
)
eq('this month opens at 500, carried over', figures?.opening, 500)
eq('with nothing coming in', figures?.in, 0)

/* ── the period: a month opens where the month before closed ──────────── */

// Whole year: the batch was made this financial year, so it counts as IN —
// nothing was carried in from last year.
await pickOption(page, '[aria-label="Month"]', 'Whole year')
await sleep(1200)
const wholeYear = (await api(`/stocks/batches?from=${iso(new Date(fyNow, 3, 1))}&to=${iso(new Date(fyNow + 1, 2, 31))}`)).data.batches.find(
  (b) => b.batchNo === BATCH,
)
eq('across the whole year it counts as coming in', wholeYear?.in, 500)
eq('with nothing opening the year', wholeYear?.opening, 0)
eq('and it closes the year at 500', wholeYear?.closing, 500)

// Back to the month it was made in: there it is IN, not opening.
const madeIn = new Date()
madeIn.setMonth(madeIn.getMonth() - 1, 15)
await pickOption(page, '[aria-label="Month"]', madeIn.toLocaleString('en-IN', { month: 'long' }))
await sleep(1200)
const ownMonth = (await api(
  `/stocks/batches?from=${iso(new Date(madeIn.getFullYear(), madeIn.getMonth(), 1))}&to=${iso(new Date(madeIn.getFullYear(), madeIn.getMonth() + 1, 0))}`,
)).data.batches.find((b) => b.batchNo === BATCH)
eq('in the month it was made it shows as in', ownMonth?.in, 500)
eq('and that month opened at nothing', ownMonth?.opening, 0)

await pickOption(page, '[aria-label="Month"]', new Date().toLocaleString('en-IN', { month: 'long' }))
await sleep(1200)

/* ── issuing moves it to the other screen ─────────────────────────────── */

await openItem(ITEM.name)
await openRowMenu(`Actions for batch ${BATCH}`)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /issue/i.test(el.textContent)).click())
await page.waitForSelector('#issue-quantity-0')
await sleep(500)

// The bill the stock goes out on — typed from the paper, not generated.
ok('the issue drawer asks for an invoice number', Boolean(await page.$('#move-invoice')))
ok('and starts on the batch it was opened from', (await page.$eval('#issue-batch-0', (el) => el.textContent)).includes(BATCH))

await pickOption(page, '#move-distributor', distributor.name)
await sleep(300)
await page.type('#move-invoice', 'E2E-INV-1')
await page.type('#issue-quantity-0', '40')
await clickText(page, 'header button, footer button', 'Issue')
await page.waitForFunction(() => !document.querySelector('#issue-quantity-0'), { timeout: 15000 }).catch(() => {})
has('a toast confirms it went out', await waitForToast(page), 'Stock issued')
await sleep(900)

const afterIssue = (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)
eq('the factory is down to 460', afterIssue?.available, 460)
eq('and the movement carries the invoice number', (await api(`/stocks/batches/${afterIssue.id}/movements`)).data.movements[0].invoiceNo, 'E2E-INV-1')

await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
await sleep(800)
const holdings = await pageText(page)
// The holding is item-wise now, so the screen names the item, not the batch.
has('the distributor now holds the item', holdings, ITEM.name)
has('against their own name', holdings, distributor.name)

const held = (await api('/stocks/distributors')).data.rows.find(
  (row) => row.distributorId === distributor.id && row.itemName === ITEM.name,
)
eq('and the figure is the 40 that went out', held?.held, 40)
ok('the batch it came on still travels with the row', (held?.batches ?? []).some((b) => b.batchNo === BATCH), JSON.stringify(held?.batches))

/* ── a return sends it back ───────────────────────────────────────────── */

await openRowMenu(`Actions for ${distributor.name} ${ITEM.name}`)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /return/i.test(el.textContent)).click())
await page.waitForSelector('#move-quantity')
await sleep(500)

// Stock goes back to the batch it came out on, so the drawer states the
// distributor and the batch instead of offering a fresh pick.
const returnDrawer = await pageText(page)
has('the return names the batch it came out on', returnDrawer, BATCH)
has('…and the distributor it is coming back from', returnDrawer, distributor.name)
ok('the batch cannot be swapped for another', !(await page.$('#move-batch')))
ok('nor the distributor', !(await page.$('#move-distributor')))

// More than they hold is refused before it reaches the server.
await page.type('#move-quantity', '90')
await clickText(page, 'header button, footer button', 'Record return')
await sleep(600)
has('returning more than they hold is refused', await pageText(page), 'Only 40 available')

await page.click('#move-quantity', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#move-quantity', '15')
await clickText(page, 'header button, footer button', 'Record return')
await page.waitForFunction(() => !document.querySelector('#move-quantity'), { timeout: 15000 }).catch(() => {})
has('a toast confirms the return', await waitForToast(page), 'Return recorded')
await sleep(900)

const backHeld = (await api('/stocks/distributors')).data.rows.find(
  (row) => row.distributorId === distributor.id && row.itemName === ITEM.name,
)
eq('they are left holding 25', backHeld?.held, 25)
eq('the factory has 475 again', (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)?.available, 475)

/* ── one bill, several batches ────────────────────────────────────────── */

await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(900)
await openItem(ITEM.name)
await openRowMenu(`Actions for batch ${BATCH}`)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /issue/i.test(el.textContent)).click())
await page.waitForSelector('#issue-quantity-0')
await sleep(500)

await pickOption(page, '#move-distributor', distributor.name)
await page.type('#move-invoice', 'E2E-INV-2')
await page.type('#issue-quantity-0', '10')

// A second line on the same bill, for a batch of another product.
// Picked by item name in the dropdown below, so the item must own exactly one
// batch — otherwise the API's choice and the dropdown's can differ.
const allBatches = (await api('/stocks/batches')).data.batches
const otherBatch = allBatches.find(
  (b) => b.itemId !== item.id && b.available > 20 && allBatches.filter((row) => row.itemId === b.itemId).length === 1,
)
await page.click('button[aria-label="Add another batch"]')
await page.waitForSelector('#issue-batch-1')
await sleep(300)
await pickOption(page, '#issue-batch-1', otherBatch.itemName.slice(0, 14))
await page.type('#issue-quantity-1', '5')
await sleep(300)
has('the bill says how many lines it carries', await pageText(page), '2 lines on this bill')

await clickText(page, 'header button, footer button', 'Issue')
await page.waitForFunction(() => !document.querySelector('#issue-quantity-0'), { timeout: 15000 }).catch(() => {})
has('one toast for the whole bill', await waitForToast(page), '2 batches')
await sleep(900)

const both = (await api('/stocks/batches')).data.batches
eq('the first batch went down by 10', both.find((b) => b.batchNo === BATCH)?.available, 465)
eq('and the other by 5', both.find((b) => b.id === otherBatch.id)?.available, otherBatch.available - 5)

/* ── the goes behind one total ────────────────────────────────────────── */

await openItem(ITEM.name)
await openRowMenu(`Actions for batch ${BATCH}`)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /movements/i.test(el.textContent)).click())
await page.waitForSelector('[role=dialog]')
// The ledger is fetched when the modal opens; wait for the rows, not a clock.
await page.waitForFunction(() => document.querySelector('[role=dialog] tbody tr'), { timeout: 15000 })
await sleep(300)
const moves = await page.$eval('[role=dialog]', (el) => el.innerText)
has('the movements list shows the first bill', moves, 'E2E-INV-1')
has('and the second', moves, 'E2E-INV-2')
has('with the distributor it went to', moves, distributor.name)
has('and the production that started it', moves.toLowerCase(), 'produced')
await page.keyboard.press('Escape')
await sleep(500)

/* ── one line per item, its batches underneath ────────────────────────── */

// A second batch of the same product: the item must stay on one line.
await api('/stocks/batches', {
  method: 'POST',
  body: JSON.stringify({
    itemId: item.id,
    batchNo: 'E2E-B-200',
    quantity: 60,
    expiryDate: iso(new Date(new Date().getFullYear() + 2, 0, 1)),
  }),
})

// And empty the first one, so a finished batch is in the mix.
const remaining = (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)
await api('/stocks/issue', {
  method: 'POST',
  body: JSON.stringify({ batchId: remaining.id, distributorId: distributor.id, quantity: remaining.available }),
})

await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(1500)

const closed = await pageText(page)
// Two batches exist, but the emptied one is gone — only the live one counts.
has('the item is one line, counting only what is still in stock', closed, '1 batch')
ok('and no batch number shows until it is opened', !closed.includes(BATCH) && !closed.includes('E2E-B-200'))

const itemRow = await page.$eval('tbody', (body) => {
  const row = [...body.querySelectorAll('tr')].find((tr) => tr.innerText.includes('E2E Stock Syrup'))
  return row.innerText.replace(/\s+/g, ' ')
})
has('the item line carries its own figures', itemRow, 'Syrup')
has('counted in the item unit', itemRow, 'BTL')

await page.click('button[aria-label^="Show batches of E2E Stock Syrup"]')
await sleep(900)
const open = await pageText(page)
has('opening the item lists the batch that still has stock', open, 'E2E-B-200')
ok('and the finished one is gone from the list entirely', !open.includes(BATCH))

// Each batch line carries its own four figures, so you can see which batch
// holds what — the item line above is the total.
const batchLine = await page.$eval('tbody', (body) => {
  const row = [...body.querySelectorAll('tr')].find((tr) => tr.innerText.includes('E2E-B-200'))
  return row.innerText.replace(/\s+/g, ' ').trim()
})
has('a batch line carries its own figures', batchLine, '60')

// The item total is bold; the batch breakdown under it is light.
const weights = await page.$$eval('tbody tr', (trs) => {
  const pick = (text) => trs.find((tr) => tr.innerText.includes(text))
  const weightOf = (tr) => {
    const cell = [...tr.querySelectorAll('td')].find((td) => /^\s*60\s*$/.test(td.innerText) || /^\s*60\b/.test(td.innerText))
    return cell ? getComputedStyle(cell.querySelector('span') ?? cell).fontWeight : ''
  }
  return { item: weightOf(pick('E2E Stock Syrup')), batch: weightOf(pick('E2E-B-200')) }
})
ok('the batch figures are lighter than the item total', Number(weights.batch) < 700, JSON.stringify(weights))

/* ── every batch of one item, for the whole year ──────────────────────── */

// "All batches of this item" belongs to the item line, not a batch line.
await openRowMenu(`Actions for ${ITEM.name}`)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /all batches/i.test(el.textContent)).click())
await page.waitForSelector('[role=dialog]')
await sleep(900)
const historyText = await page.$eval('[role=dialog]', (el) => el.innerText)
has('the item history opens for the whole year', historyText, '1 April to 31 March')
// The finished batch is off the main list, but the year's history still has it.
has('and the finished batch is still in the history', historyText, BATCH)
await page.keyboard.press('Escape')
await sleep(500)

await page.click('button[aria-label^="Hide batches of E2E Stock Syrup"]')
await sleep(700)
ok('closing the item puts the batches away again', !(await pageText(page)).includes('E2E-B-200'))

/* ── expiry warns, it never blocks ────────────────────────────────────── */

const soon = new Date(Date.now() + 30 * 86400000)
await api('/stocks/batches', {
  method: 'POST',
  body: JSON.stringify({ itemId: item.id, batchNo: 'E2E-B-SOON', quantity: 20, expiryDate: iso(soon) }),
})
await api('/stocks/batches', {
  method: 'POST',
  body: JSON.stringify({ itemId: item.id, batchNo: 'E2E-B-OLD', quantity: 20, expiryDate: '2020-01-01' }),
})

await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(900)
// Expiry lives on the batch lines now, so the item has to be opened.
await openItem(ITEM.name)
has('an expired batch says so', await pageText(page), 'Expired')

await pickOption(page, 'input[aria-label="Filter by expiry"], #stock-expiry, [aria-label="Filter by expiry"]', 'Expired')
await sleep(700)
const onlyExpired = await page.$$eval('tbody tr', (trs) => trs.map((tr) => tr.innerText))
ok('the expiry filter keeps only items holding such a batch', onlyExpired.length >= 1, String(onlyExpired.length))

/* ── a year with nothing in it says so ────────────────────────────────── */

await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(800)
// Far enough back that nothing can have been entered there — last year may
// legitimately hold stock someone back-dated.
const quiet = fyNow - 5
await pickOption(page, '[aria-label="Financial year"]', String(quiet))
await pickOption(page, '[aria-label="Month"]', 'Whole year')
await sleep(1200)

const emptyYear = await pageText(page)
has('an empty year names itself', emptyYear, `Nothing in ${quiet}–${String((quiet + 1) % 100)}`)
has('and says where the stock actually is', emptyYear, 'pick another year or month')
ok('rather than claiming there is no stock at all', !emptyYear.includes('No stock yet'))

await pickOption(page, '[aria-label="Financial year"]', String(fyNow))
await sleep(1000)

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
ok('the factory screen fits a phone', !(await overflows(page)))
await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
ok('and the distributor screen does too', !(await overflows(page)))

await cleanup()
const left = await api('/stocks/batches')
ok('the suite leaves nothing behind', !(left.data?.batches ?? []).some((b) => b.batchNo.startsWith('E2E-B')))

/* ── the traffic light ───────────────────────────────────────────────── */

// "अच्छा मूविंग प्रोडक्ट ग्रीन होगा, कम मूविंग वाला ऑरेंज, आउट ऑफ स्टॉक रेड"
has('the colours are explained in plain words', await pageText(page), 'Selling well')
has('…saying how long counts as not selling', await pageText(page), 'Not sold for')
has('…and what running low means, with the number', await pageText(page), 'Running low')

const lit = await page.$$eval('tbody tr', (trs) =>
  trs.map((tr) => ({
    item: tr.querySelectorAll('td')[1]?.innerText.split('\n')[0] ?? '',
    dot: tr.querySelector('span[aria-label]')?.getAttribute('aria-label') ?? '',
    lowBadge: Boolean(tr.querySelector('td:nth-last-child(2) .bg-danger-soft')),
    expiredRow: tr.className.includes('bg-danger-soft'),
  })),
)
ok('every row carries a movement colour', lit.every((r) => r.dot), JSON.stringify(lit.slice(0, 3)))
ok('some stock is selling', lit.some((r) => /selling well/i.test(r.dot)), JSON.stringify(lit.map((r) => r.dot)))

// A holding at or under the threshold marks only its closing figure.
const low = (await api('/stocks/distributors?from=2026-04-01&to=2027-03-31')).data.rows.find((r) => r.stockState === 'LOW' || r.stockState === 'OUT')
if (low) {
  const row = lit.find((r) => r.item === low.itemName)
  ok('stock running out marks its closing figure', row?.lowBadge, JSON.stringify(row))
  ok('…and does not redden the whole row', !row?.expiredRow, JSON.stringify(row))
}

// Expired stock is the loudest thing on the screen: the whole row. An issued
// batch can never be deleted, so rather than leaving one behind every run this
// borrows a batch they already hold, expires it, looks, and puts it back.
const heldNow = (await api('/stocks/distributors?from=2026-04-01&to=2027-03-31')).data.rows
const borrowed = heldNow.find((row) => row.batches.length)?.batches[0]
const originalExpiry = borrowed?.expiryDate || ''
if (borrowed) {
  await api(`/stocks/batches/${borrowed.batchId}`, { method: 'PATCH', body: JSON.stringify({ expiryDate: '2026-01-31' }) })
  await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
  await sleep(1800)
  const withExpired = await page.$$eval('tbody tr', (trs) => trs.map((tr) => tr.className.includes('bg-danger-soft')))
  ok('expired stock reddens the whole row', withExpired.some(Boolean), JSON.stringify(withExpired.slice(0, 6)))

  await api(`/stocks/batches/${borrowed.batchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ expiryDate: originalExpiry || null }),
  })
}

/* ── Distributor Stocks carries no Opening ───────────────────────────── */

// "ओपनिंग तो यहाँ पर रिमूव होगा, ओपनिंग का तो काम नहीं है" — a distributor's
// holding is what was issued less what came back, nothing more.
const holdingHeads = await page.$$eval('thead th', (ths) => ths.map((t) => t.innerText.trim().toLowerCase()))
// The holding is item-wise: "बैच को रिमूव करना है… नेम वाइज में टोटल". Once a
// distributor sells, nobody tells us which batch left their shelf.
ok('Distributor Stocks carries no Batch column', !holdingHeads.some((h) => h.includes('batch')), JSON.stringify(holdingHeads))
ok('…and shows Issued, Returned and Closing', ['issued', 'returned', 'closing'].every((h) => holdingHeads.includes(h)), JSON.stringify(holdingHeads))
ok('what they hold is called Closing, not Held', !holdingHeads.includes('held'), JSON.stringify(holdingHeads))

// Opening is back, but as the admin's own figure — "हम खुद से डाल के".
ok('Opening is back on Distributor Stocks', holdingHeads.includes('opening'), JSON.stringify(holdingHeads))
ok('…and it is a control the admin can open', Boolean(await page.$('button[title="Set what they already held"]')))

const firstHolding = (await api('/stocks/distributors?from=2026-04-01&to=2027-03-31')).data.rows[0]
const factoryBefore = (await api('/stocks/batches?limit=300')).data.batches.filter((b) => b.itemId === firstHolding.itemId).map((b) => `${b.batchNo}:${b.available}`).join(' ')

await page.$$eval('tbody tr td', (tds) => tds.map((td) => td.querySelector('button[title="Set what they already held"]')).find(Boolean).click())
await sleep(800)
has('the opening explains what it is', await pageText(page), 'already held before this system')
await page.click('#opening-quantity', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#opening-quantity', String(firstHolding.opening + 25))
await clickText(page, 'button', 'Save opening')
await sleep(1800)

const withOpening = (await api('/stocks/distributors?from=2026-04-01&to=2027-03-31')).data.rows.find((r) => r.id === firstHolding.id)
eq('the opening the admin typed is kept', withOpening.opening, firstHolding.opening + 25)
eq('and closing carries it', withOpening.held, firstHolding.held + 25)

// It is stock they had before us, so it can never move a factory figure.
const factoryAfter = (await api('/stocks/batches?limit=300')).data.batches.filter((b) => b.itemId === firstHolding.itemId).map((b) => `${b.batchNo}:${b.available}`).join(' ')
eq('a typed opening moves no factory stock', factoryAfter, factoryBefore)

// Put it back as it was.
await api('/stocks/distributors/opening', {
  method: 'PUT',
  body: JSON.stringify({ distributorId: firstHolding.distributorId, itemId: firstHolding.itemId, quantity: firstHolding.opening }),
})

// "इसमें ये डिस्ट्रीब्यूटर का इनवॉइस नंबर भी आएगा… डेट वाइज, इनवाइस की डेट,
// इनवाइस का नंबर." The bill the stock came on, and the date it came.
ok('the holding says which bill it came on', holdingHeads.includes('invoice'), JSON.stringify(holdingHeads))
has('…naming the invoice itself', await pageText(page), 'E2E-INV')

// Clicking the row opens every bill behind that holding.
await page.$$eval('tbody tr', (trs) => trs[0].click())
await sleep(800)
const billsModal = await pageText(page)
has('a row opens the bills behind it', billsModal, 'newest first')
ok('the bill list carries dates and amounts', /date\s+invoice\s+issued\s+returned/i.test(billsModal.replace(/\s+/g, ' ')), billsModal.slice(0, 200))
await page.keyboard.press('Escape')
await sleep(500)

/* ── the factory shouts before it runs out ───────────────────────────── */

// "फैक्ट्री के सौ कर दो" — the closing figure reddens at the threshold, and
// only on the item line. Nothing is that low today, so the bar is raised to
// prove it and put straight back.
const stockWas = (await api('/settings')).data.settings.stock
// Whatever the data happens to hold, the badge must agree with the threshold.
const readClosings = () =>
  page.$$eval('tbody tr', (trs) =>
    trs
      .map((tr) => {
        const tds = tr.querySelectorAll('td')
        const cell = tds[tds.length - 2]
        return { closing: Number((cell?.innerText ?? '').replace(/[^\d]/g, '')), low: Boolean(cell?.querySelector('.bg-danger-soft')) }
      })
      .filter((r) => r.closing),
  )

// Read the factory, not whichever screen the suite happened to leave open:
// the two have different thresholds and would disagree by design.
await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(1600)
const atUsual = await readClosings()
ok(
  `on the factory, every red figure is at or under ${stockWas.lowFactory}`,
  atUsual.every((r) => r.low === r.closing <= stockWas.lowFactory),
  JSON.stringify(atUsual.slice(0, 8)),
)

await api('/settings/stock', { method: 'PATCH', body: JSON.stringify({ lowFactory: 300 }) })
await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(1800)
const raised = await readClosings()
ok('raising the bar reddens what is under it', raised.some((r) => r.low), JSON.stringify(raised.slice(0, 5)))
ok('…and only what is under it', raised.every((r) => r.low === r.closing <= 300), JSON.stringify(raised.slice(0, 8)))

await api('/settings/stock', { method: 'PATCH', body: JSON.stringify(stockWas) })

/* ── the product photo opens larger ──────────────────────────────────── */

await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(1600)
const photoButton = await page.$('button[title^="See "]')
ok('the product photo is clickable', Boolean(photoButton))
await photoButton.click()
await sleep(900)

// It takes the whole screen, and the admin can zoom into it.
const viewer = await page.$eval('[role=dialog]', (el) => ({ w: el.clientWidth, h: el.clientHeight }))
const screen = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
ok('the photo fills the screen', viewer.w === screen.w && viewer.h === screen.h, `${viewer.w}×${viewer.h} vs ${screen.w}×${screen.h}`)

const scaleOf = () => page.$eval('[role=dialog] img', (el) => el.style.transform)
has('it opens fitted', await scaleOf(), 'scale(1)')
await page.click('button[aria-label="Zoom in"]')
await page.click('button[aria-label="Zoom in"]')
await sleep(400)
has('zooming in makes it bigger', await scaleOf(), 'scale(1.5)')
has('…and the level is shown', await page.$eval('button[aria-label="Fit to screen"]', (el) => el.innerText), '150%')

await page.keyboard.press('0')
await sleep(300)
has('pressing 0 fits it back', await scaleOf(), 'scale(1)')

await page.keyboard.press('Escape')
await sleep(500)
ok('and Escape closes it', (await page.$('[role=dialog]')) === null)

/* ── the columns the client asked for ────────────────────────────────── */

// The suite ends on Distributor Stocks; these are about the factory screen.
await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
await sleep(1500)

const factoryHeads = await page.$$eval('thead th', (ths) => ths.map((t) => t.innerText.trim().toLowerCase()))
ok('Factory Stocks still opens the year with an Opening column', factoryHeads.includes('opening'))
ok('Factory Stocks has a Return column', factoryHeads.includes('return'), JSON.stringify(factoryHeads))
ok('…sitting between Out and Closing', factoryHeads.indexOf('return') === factoryHeads.indexOf('out') + 1 && factoryHeads.indexOf('closing') === factoryHeads.indexOf('return') + 1)

// No overall totals row: "अलग अलग आइटम का टोटल… उसका तो मतलब नहीं होगा".
// Adding different products together says nothing, so each item totals itself.
ok('no overall totals row above the table', !/total · \d+ items?/i.test(await pageText(page)))

// Issuing stock must never land in Return: that column is only what came back.
// Out carries it, Closing drops by it, Return does not move.
const figuresOf = async () => {
  await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
  await sleep(1500)
  const cells = await page.$$eval('tbody tr td', (tds) => tds.map((td) => td.innerText.trim()))
  const heads = await page.$$eval('thead th', (ths) => ths.map((t) => t.innerText.trim().toLowerCase()))
  const width = heads.length
  return { out: cells[heads.indexOf('out')], returned: cells[heads.indexOf('return')], width }
}

const before = await figuresOf()
const anyBatch = (await api('/stocks/batches?from=2026-04-01&to=2027-03-31&limit=300')).data.batches.find((b) => b.available > 5)
const anyFirm = (await api('/distributors?limit=1')).data.distributors[0]
await api('/stocks/issue', {
  method: 'POST',
  body: JSON.stringify({ distributorId: anyFirm.id, invoiceNo: 'E2E/RET-CHECK', lines: [{ batchId: anyBatch.id, quantity: 5 }] }),
})
const after = await figuresOf()
ok('issuing stock leaves Return alone', after.returned === before.returned, `${before.returned} → ${after.returned}`)
ok('…and lands in Out instead', after.out !== before.out, `${before.out} → ${after.out}`)

// Put it straight back, or every run would shift the figures the rest of the
// suite asserts on.
await api('/stocks/return', {
  method: 'POST',
  body: JSON.stringify({ batchId: anyBatch.id, distributorId: anyFirm.id, quantity: 5, invoiceNo: 'E2E/RET-CHECK' }),
})

await finish(browser, errors, { ignore: /status of (400|404|409)/ })
