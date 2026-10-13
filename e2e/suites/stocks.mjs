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
await page.evaluate((value) => {
  const input = document.querySelector('#batch-received')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}, iso(lastMonth))
await sleep(300)

await clickText(page, 'header button, footer button', 'Save')
await page.waitForFunction(() => !document.querySelector('#batch-no'), { timeout: 15000 }).catch(() => {})
has('a toast confirms the batch', await waitForToast(page), 'Batch added')
await sleep(800)

const listed = await pageText(page)
has('the batch is on the table', listed, BATCH)
has('with the product beside it', listed, ITEM.name)

const stored = (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)
eq('the factory holds all 500', stored?.available, 500)
eq('and the catalogue agrees', (await api(`/items/${item.id}`)).data.item.stock, 500)

/* ── the four figures follow the period ───────────────────────────────── */

const figures = (await api(`/stocks/batches?from=${iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}&to=${iso(new Date())}`)).data.batches.find(
  (b) => b.batchNo === BATCH,
)
eq('this month opens at 500, carried over', figures?.opening, 500)
eq('with nothing coming in', figures?.in, 0)

/* ── issuing moves it to the other screen ─────────────────────────────── */

await page.click(`button[aria-label="Actions for batch ${BATCH}"]`)
await page.waitForSelector('[data-slot=dropdown-menu-item]')
await sleep(300)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /issue/i.test(el.textContent)).click())
await page.waitForSelector('#move-quantity')
await sleep(500)

has('the drawer says what the batch holds', await pageText(page), '500')
await pickOption(page, '#move-distributor', distributor.name)
await sleep(300)
await page.type('#move-quantity', '40')
await clickText(page, 'header button, footer button', 'Issue')
await page.waitForFunction(() => !document.querySelector('#move-quantity'), { timeout: 15000 }).catch(() => {})
has('a toast confirms it went out', await waitForToast(page), 'Stock issued')
await sleep(900)

const afterIssue = (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)
eq('the factory is down to 460', afterIssue?.available, 460)

await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
await sleep(800)
const holdings = await pageText(page)
has('the distributor now holds the batch', holdings, BATCH)
has('against their own name', holdings, distributor.name)

const held = (await api('/stocks/distributors')).data.rows.find((row) => row.batchNo === BATCH)
eq('and the figure is the 40 that went out', held?.held, 40)

/* ── a return sends it back ───────────────────────────────────────────── */

await page.click(`button[aria-label="Actions for ${distributor.name} batch ${BATCH}"]`)
await page.waitForSelector('[data-slot=dropdown-menu-item]')
await sleep(300)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /return/i.test(el.textContent)).click())
await page.waitForSelector('#move-quantity')
await sleep(500)

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

const backHeld = (await api('/stocks/distributors')).data.rows.find((row) => row.batchNo === BATCH)
eq('they are left holding 25', backHeld?.held, 25)
eq('the factory has 475 again', (await api('/stocks/batches')).data.batches.find((b) => b.batchNo === BATCH)?.available, 475)

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
has('an expired batch says so', await pageText(page), 'Expired')

await pickOption(page, 'input[aria-label="Filter by expiry"], #stock-expiry, [aria-label="Filter by expiry"]', 'Expired')
await sleep(700)
const onlyExpired = await page.$$eval('tbody tr', (trs) => trs.map((tr) => tr.innerText))
ok('the expiry filter keeps only those', onlyExpired.every((text) => text.includes('Expired')), String(onlyExpired.length))

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/stocks/factory', { heading: 'Factory Stocks' })
ok('the factory screen fits a phone', !(await overflows(page)))
await goto(page, '/admin/stocks/distributor', { heading: 'Distributor Stocks' })
ok('and the distributor screen does too', !(await overflows(page)))

await cleanup()
const left = await api('/stocks/batches')
ok('the suite leaves nothing behind', !(left.data?.batches ?? []).some((b) => b.batchNo.startsWith('E2E-B')))

await finish(browser, errors, { ignore: /status of (400|404|409)/ })
