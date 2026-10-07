/**
 * Inventory › Items against the real API, and the per-item tier prices.
 */
import ExcelJS from 'exceljs'
import { start, login, goto, sleep, ok, eq, has, finish, rows, pageText, overflows, clickText, waitFile, ADMIN, waitForToast } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const ITEM = { name: 'E2E Pathri Safa Capsule', code: 'E2E-ITEM-1' }

/* ── a token of our own, to clean up with ─────────────────────────────── */

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
  for (const item of (await api('/items?limit=200')).data?.items ?? []) {
    if (item.code.startsWith('E2E-ITEM')) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const { browser, page, errors, dl } = await start()
await login(page)
await goto(page, '/admin/inventory/items', { heading: 'Items' })

const startCount = (await rows(page)).length
const toastText = () => waitForToast(page)
const tierValue = (tier) => page.$eval(`#item-tier-${tier}`, (el) => el.value)

/* ── the four rows, filled in from MRP ────────────────────────────────── */

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#item-name')
await sleep(500)

const form = await pageText(page)
has('the form has a tier prices block', form, 'Tier prices')
for (const label of ['Default — full MRP', '−50% −12%', '−50% −15%', '−45% −10%']) {
  has(`it lists ${label}`, form, label)
}

await page.evaluate(() => document.querySelector('#item-mrp').scrollIntoView({ block: 'center' }))
await sleep(300)
ok('with no MRP the prices read as —', (await page.$$eval('#item-tier-MRP', (els) => els.length)) === 0)

await page.type('#item-name', ITEM.name)
await page.type('#item-code', ITEM.code)
// Unit and sell price are required before the item can be saved.
await page.click('#item-unit')
await page.waitForSelector('[role=listbox]')
await sleep(300)
await page.evaluate(() => document.querySelectorAll('[role=option]')[0].click())
await sleep(300)
await page.type('#item-sell-price', '210')
await page.type('#item-mrp', '280')
await sleep(500)

eq('MRP tier follows the MRP', await tierValue('MRP'), '280')
eq('−50% −12% is 123.2', await tierValue('D50_12'), '123.2')
eq('−50% −15% is 119', await tierValue('D50_15'), '119')
eq('−45% −10% is 138.6', await tierValue('D45_10'), '138.6')

// Change the MRP and they all follow.
await page.click('#item-mrp', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#item-mrp', '345')
await sleep(500)
eq('changing the MRP moves them', await tierValue('D50_12'), '151.8')
eq('and rounds the way the sheet does', await tierValue('D45_10'), '170.78')

/* ── a custom price stops following ───────────────────────────────────── */

await page.click('#item-tier-D45_10', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#item-tier-D45_10', '130')
await sleep(400)
has('an edited row is marked Custom', await pageText(page), 'Custom')

await page.click('#item-mrp', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#item-mrp', '280')
await sleep(500)
eq('the formula rows follow the new MRP', await tierValue('D50_12'), '123.2')
eq('the custom row keeps its price', await tierValue('D45_10'), '130')

/* ── it saves, and comes back the same ────────────────────────────────── */

await clickText(page, 'header button, footer button', 'Save')
await sleep(1800)
has('a toast confirms the item', await toastText(), 'Item created')

await page.reload({ waitUntil: 'networkidle0' })
await sleep(1800)
const listed = await rows(page)
eq('the list grew by one', listed.length, startCount + 1)

const stored = (await api(`/items?q=${encodeURIComponent(ITEM.name)}`)).data.items[0]
const tiers = Object.fromEntries((stored?.tierPrices ?? []).map((row) => [row.tier, row]))
eq('the formula prices are stored', tiers.D50_12?.price, 123.2)
eq('the custom price is stored', tiers.D45_10?.price, 130)
ok('and marked as custom', tiers.D45_10?.isCustom === true)

await page.click(`button[aria-label="Actions for ${ITEM.name}"]`)
await page.waitForSelector('[data-slot=dropdown-menu-item]')
await sleep(300)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /tier prices/i.test(el.textContent)).click())
await page.waitForSelector('[role=dialog]')
await sleep(400)
const popover = await page.$eval('[role=dialog]', (el) => el.innerText)
has('the row menu shows the tier prices', popover, '₹123.20')
has('including the custom one', popover, '₹130')
await page.keyboard.press('Escape')
// Wait for the dialog to actually go before touching the row again.
await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 })
await sleep(400)

/* ── reopening keeps the custom row, and Reset undoes it ──────────────── */

// Clicking the row is the other way into the editor, and avoids a second menu.
await page.evaluate(
  (name) => [...document.querySelectorAll('tbody tr')].find((tr) => tr.textContent.includes(name)).click(),
  ITEM.name,
)
await page.waitForSelector('#item-tier-D45_10')
await sleep(600)
eq('the custom price survived the round trip', await tierValue('D45_10'), '130')

await page.click('button[aria-label="Reset −45% −10% to the formula"]')
await sleep(400)
eq('Reset puts the formula back', await tierValue('D45_10'), '138.6')

/* ── one price for every tier ─────────────────────────────────────────── */

await page.click('#item-flat-tier')
await sleep(400)
ok('the toggle collapses them to one field', Boolean(await page.$('#item-tier-flat')))
// It carries over whatever price was there; replace it.
await page.click('#item-tier-flat', { clickCount: 3 })
await page.keyboard.press('Backspace')
await page.type('#item-tier-flat', '95.83')
await clickText(page, 'header button, footer button', 'Save changes')
await sleep(1800)

const flat = (await api(`/items?q=${encodeURIComponent(ITEM.name)}`)).data.items[0]
ok('every tier gets that one price', (flat?.tierPrices ?? []).every((row) => row.price === 95.83), JSON.stringify((flat?.tierPrices ?? []).map((r) => r.price)))
ok('and the item is marked flat-priced', flat?.flatTierPricing === true)

/* ── the sheet carries the tier prices ────────────────────────────────── */

// Download the sample sheet and read its headers — the file is the contract.
await goto(page, '/admin/inventory/items', { heading: 'Items' })
await clickText(page, 'button', 'Import', { exact: false })
await page.waitForSelector('[role=dialog]')
await sleep(400)
await clickText(page, 'button', 'Download Sample', { exact: false })

const sheetFile = await waitFile(dl, { match: /sample-import-items.*\.xlsx$/ })
const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(sheetFile)
const headerRow = workbook.getWorksheet('Items')?.getRow(workbook.getWorksheet('Items').rowCount > 1 ? 1 : 1)
const headers = (headerRow?.values ?? []).map((v) => String(v?.richText?.map((t) => t.text).join('') ?? v ?? '').trim())
const tierHeaders = ['Price Default — full MRP', 'Price −50% −12%', 'Price −50% −15%', 'Price −45% −10%']
ok(
  'the import sheet has a column per tier',
  tierHeaders.every((h) => headers.includes(h)),
  headers.filter((h) => h.startsWith('Price')).join(' | '),
)
await page.keyboard.press('Escape')
await sleep(400)

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/inventory/items', { heading: 'Items' })
ok('the list fits a phone screen', !(await overflows(page)))

await cleanup()
const left = await api('/items?limit=200')
ok('the suite leaves nothing behind', !(left?.data?.items ?? []).some((i) => i.code.startsWith('E2E-ITEM')))

await finish(browser, errors, { ignore: /status of (400|409)/ })
