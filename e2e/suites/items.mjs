/**
 * Inventory › Items against the real API, and the per-item tier prices.
 */
import ExcelJS from 'exceljs'
import { start, login, goto, sleep, ok, eq, has, finish, pageText, overflows, clickText, pickOption, waitFile, ADMIN, waitForToast } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
// The form no longer has an Item Code field, so this suite is named-based.
const ITEM = { name: 'E2E Pathri Safa Capsule' }

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
    if (item.name.startsWith('E2E ')) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
  for (const gift of (await api('/gifts')).data?.gifts ?? []) {
    if (gift.name.startsWith('E2E ')) await api(`/gifts/${gift.id}`, { method: 'DELETE' })
  }
  // A rate column the admin added is global — never leave one behind.
  for (const tier of (await api('/price-tiers?all=true')).data?.tiers ?? []) {
    if (!tier.isBuiltIn) await api(`/price-tiers/${tier.id}`, { method: 'DELETE' })
  }
}
await cleanup()

const { browser, page, errors, dl } = await start()
await login(page)
await goto(page, '/admin/inventory/items', { heading: 'Items' })

/** The pager's total, not the rendered rows — the table pages at 10. */
const total = () =>
  page
    .$eval('[aria-live=polite]', (el) => Number(el.textContent.replace(/\s+/g, ' ').match(/of (\d+)/)?.[1] ?? 0))
    .catch(() => 0)

const startCount = await total()

/**
 * Saves and waits for the drawer to close — the only reliable signal that the
 * server answered. Sleeping a fixed time makes this suite flaky when the
 * machine is busy with the other suites.
 */
async function save(label) {
  await clickText(page, 'header button, footer button', label)
  await page
    .waitForFunction(() => !document.querySelector('#item-name'), { timeout: 15000 })
    .catch(() => {})
  return waitForToast(page)
}
const tierValue = (tier) => page.$eval(`#item-tier-${tier}`, (el) => el.value)

/* ── the four rows, filled in from MRP ────────────────────────────────── */

await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#item-name')
await sleep(500)

const form = await pageText(page)
has('the form has a tier prices block', form, 'Tier prices')
ok('and no Stock Details section', !form.includes('Stock Details'))
ok('and nothing about warehouses', !form.toLowerCase().includes('warehouse'))

// Dropped on 8 Oct: the distributor's price is the rate column, the counter
// price is the MRP, and nothing else has a job.
for (const id of [
  'item-sell-price',
  'item-code',
  'item-erp-id',
  'item-purchase-price',
  'item-cess',
  'item-discount',
  // Stock is its own module; creating a product does not touch it.
  'item-stock',
  'item-opening-stock-date',
  'item-weight',
  'item-secondary-unit',
  'item-conversion',
]) {
  ok(`${id} is gone from the form`, (await page.$(`#${id}`)) === null)
}
ok('Brand is gone, Quantity is in its place', (await page.$('#item-brand')) === null && Boolean(await page.$('#item-quantity')))
ok('GST is typed, not picked from a list', (await page.$('input#item-gst')) !== null)
ok('the description box is labelled Box Packing', form.includes('Box Packing') && !form.includes('Item Description'))
has('and the pictures say Product Image', form, 'Upload Product Image')
for (const label of ['Default — full MRP', '−50% −12%', '−50% −15%', '−45% −10%']) {
  has(`it lists ${label}`, form, label)
}

await page.evaluate(() => document.querySelector('#item-mrp').scrollIntoView({ block: 'center' }))
await sleep(300)
ok('with no MRP the prices read as —', (await page.$$eval('#item-tier-MRP', (els) => els.length)) === 0)

await page.type('#item-name', ITEM.name)

// A unit the list does not have yet. It is typed here and selected straight away.
await page.click('button[aria-label="Add unit"]')
await page.waitForSelector('input[aria-label="e.g. SACHET"]')
await page.type('input[aria-label="e.g. SACHET"]', 'sachet')
await page.click('button[aria-label="Add"]')
await sleep(500)
has('a new unit is added and chosen', await page.$eval('#item-unit', (el) => el.textContent), 'SACHET')

// Back to a real one for the rest of the run.
await page.click('#item-unit')
await page.waitForSelector('[role=listbox]')
await sleep(300)
await page.evaluate(() => document.querySelectorAll('[role=option]')[0].click())
await sleep(300)
await page.type('#item-mrp', '280')
await sleep(500)

// Quantity is counted in whatever the category is counted in.
const quantityUnit = () => page.$eval('#item-quantity', (el) => el.closest('div').parentElement.innerText.trim().split('\n').pop().trim())
await pickOption(page, '#item-category', 'Syrup')
await sleep(400)
has('a syrup is counted in ML', await quantityUnit(), 'ML')
await pickOption(page, '#item-category', 'Capsule')
await sleep(400)
has('a capsule in CAP', await quantityUnit(), 'CAP')

// A category of the admin's own: it says what it is counted in, and the
// Quantity field picks that up straight away.
await page.click('button[aria-label="Add category"]')
await page.waitForSelector('select[aria-label="Quantity unit"]')
await page.type('input[aria-label="Category name"]', 'E2E Tonic')
await page.select('select[aria-label="Quantity unit"]', 'L')
await page.click('button[aria-label="Add"]')
await sleep(500)
has('a new category brings its own unit', await quantityUnit(), 'L')

await pickOption(page, '#item-category', 'Capsule')
await sleep(400)
has('and switching back restores CAP', await quantityUnit(), 'CAP')
await page.type('#item-quantity', '60')

// Any rate, not just the five that used to be on the dropdown.
await page.type('#item-gst', '2.5')
await sleep(200)
eq('an off-list GST rate is accepted', await page.$eval('#item-gst', (el) => el.value), '2.5')

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

has('a toast confirms the item', await save('Save'), 'Item created')

await page.reload({ waitUntil: 'networkidle0' })
await sleep(1800)
eq('the list grew by one', await total(), startCount + 1)

const stored = (await api(`/items?q=${encodeURIComponent(ITEM.name)}`)).data.items[0]
eq('the quantity is stored', stored?.quantity, 60)
eq('and the GST rate the admin typed', stored?.gst, 2.5)
eq('with the unit it is counted in', stored?.quantityUnit, 'CAP')
eq('with the category it is counted by', stored?.category, 'Capsule')
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
await save('Save changes')

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

/* ── the scheme: buy 10, get 1 pen free ───────────────────────────────── */

await goto(page, '/admin/inventory/items', { heading: 'Items' })
await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#item-name')
await sleep(500)

const schemeForm = await pageText(page)
has('the offer line is now a Scheme', schemeForm, 'Scheme')
ok('and the free-text offer box is gone', (await page.$('#item-offer')) === null)

await page.type('#item-name', 'E2E Scheme Syrup')
await page.click('#item-unit')
await page.waitForSelector('[role=listbox]')
await sleep(300)
// BTL — the unit beside "Buy" must follow this choice.
await page.evaluate(() => [...document.querySelectorAll('[role=option]')].find((li) => li.textContent.startsWith('BTL')).click())
await sleep(400)

const unitBeside = (id) => page.$eval(id, (el) => el.parentElement.textContent.trim())
has('the buy quantity is counted in the item\'s own unit', await unitBeside('#item-scheme-buy'), 'BTL')

// A pen is not made in the factory, so it is a giveaway, not an item.
await page.click('button[aria-label="Add free item"]')
await page.waitForSelector('#gift-name')
await page.type('#gift-name', 'E2E Pen')
ok('a giveaway can carry a picture', (await page.$('#gift-name')) !== null && (await pageText(page)).includes('Picture'))
await sleep(300)
await clickText(page, 'button', 'Add giveaway')
await page.waitForFunction(() => !document.querySelector('#gift-name'), { timeout: 15000 }).catch(() => {})
await sleep(900)

const gift = (await api('/gifts')).data.gifts.find((row) => row.name === 'E2E Pen')
ok('the giveaway is saved', Boolean(gift), 'not found')
eq('counted in pieces', gift?.unit, 'PCS')
ok('and it is not in the catalogue', !((await api('/items?limit=200')).data.items ?? []).some((i) => i.name === 'E2E Pen'))

has('and the free quantity takes the gift\'s unit', await unitBeside('#item-scheme-free'), 'PCS')

await page.type('#item-scheme-buy', '10')
await page.type('#item-scheme-free', '1')
await sleep(400)
has('the form reads the scheme back in words', await pageText(page), 'Buy 10 BTL — get 1 PCS E2E Pen free')
has('and says that it repeats', await pageText(page), 'Repeats every 10')

// Half a scheme is refused before it reaches the server.
await page.click('#item-scheme-buy', { clickCount: 3 })
await page.keyboard.press('Backspace')
await sleep(300)
await clickText(page, 'header button, footer button', 'Save')
await sleep(800)
has('half a scheme is refused', await pageText(page), 'How many must they buy?')

await page.type('#item-scheme-buy', '10')
await sleep(300)
await save('Save')

const schemed = (await api(`/items?q=${encodeURIComponent('E2E Scheme Syrup')}`)).data.items[0]
eq('the scheme is stored', schemed?.schemeBuyQty, 10)
eq('with the free quantity', schemed?.schemeFreeQty, 1)
eq('and writes its own line for the table', schemed?.offerText, '10 + 1 E2E Pen free')
eq('as a giveaway, so nothing comes out of stock', schemed?.schemeFreeItemId, '')
eq('with the giveaway attached instead', schemed?.schemeFreeGift?.name, 'E2E Pen')

/* ── the free-item dropdown: ten at a time, search reaches the rest ───── */

await page.click(`button[aria-label="Actions for E2E Scheme Syrup"]`)
await page.waitForSelector('[data-slot=dropdown-menu-item]')
await sleep(300)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /edit/i.test(el.textContent)).click())
await page.waitForSelector('#item-scheme-item')
await sleep(600)

await page.click('#item-scheme-item')
await page.waitForSelector('[role=listbox]')
await sleep(400)
const shown = await page.$$eval('[role=option]', (els) => els.length)
ok('ten are listed at a time', shown <= 11, String(shown))
has('and it says how many more there are', await pageText(page), 'more — type to narrow')
// The group headings are upper-cased by CSS, which innerText carries through.
const listText = (await pageText(page)).toLowerCase()
has('the catalogue is marked as coming out of stock', listText, 'from stock')
has('and the giveaways as not', listText, 'giveaways')

// Search reaches an item that is not among the ten.
const far = (await api('/items?limit=200')).data.items.filter((i) => i.name !== 'E2E Scheme Syrup').slice(-1)[0]
await page.type('[role=combobox]', far.name.slice(0, 12))
await sleep(500)
has('search finds an item outside the first ten', await pageText(page), far.name)
await page.evaluate((name) => [...document.querySelectorAll('[role=option]')].find((li) => li.textContent.includes(name)).click(), far.name)
await sleep(500)

await page.click('#item-scheme-item')
await page.waitForSelector('[role=listbox]')
await sleep(400)
const stillThere = await page.$$eval('[role=option]', (els) => els.map((el) => el.textContent))
ok('a chosen item stays on the list, even past the tenth', stillThere.some((text) => text.includes(far.name)), stillThere.length + ' options')
await page.keyboard.press('Escape')
await sleep(300)
await page.keyboard.press('Escape')
await sleep(500)

/* ── the admin adds a rate column of their own ────────────────────────── */

await goto(page, '/admin/inventory/items', { heading: 'Items' })
await clickText(page, 'button', 'New', { exact: false })
await page.waitForSelector('#item-name')
await sleep(500)
await page.type('#item-mrp', '300')
await sleep(400)

eq('the form starts with the four rate columns', (await page.$$('[id^=item-tier-]')).length, 4)

// "+ New" and the toggle share the heading's row — with both there it used to
// wrap and push the toggle onto a line of its own.
const headerOneRow = () =>
  page.evaluate(() => {
    const heading = [...document.querySelectorAll('p')].find((p) => p.textContent.trim() === 'Tier prices')
    const block = heading.parentElement.getBoundingClientRect()
    const rect = (sel) => document.querySelector(sel)?.getBoundingClientRect()
    const add = rect('button[aria-label="Add rate column"]')
    const toggle = rect('#item-flat-tier')
    return [add, toggle].every((box) => box && box.top < block.bottom)
  })

ok('+ New and the toggle sit beside the heading', await headerOneRow())

await page.click('button[aria-label="Add rate column"]')
await page.waitForSelector('#tier-discount-1')
await page.type('#tier-discount-1', '20')
await page.type('#tier-discount-2', '10')
await sleep(400)
has('the preview chains the discounts', await pageText(page), '0.72 × MRP')
has('and prices this MRP', await pageText(page), '₹216')

await clickText(page, 'button', 'Add column')
await page.waitForFunction(() => document.querySelectorAll('[id^=item-tier-]').length === 5, { timeout: 15000 }).catch(() => {})
await sleep(600)
eq('the column is added to the form', (await page.$$('[id^=item-tier-]')).length, 5)
eq('priced from the MRP like the others', await page.$eval('#item-tier-D20_10', (el) => el.value), '216')
has('and it is named after its discounts', await pageText(page), '−20% −10%')

const stored5 = (await api('/price-tiers')).data.tiers
eq('the server has five rate columns', stored5.length, 5)
ok('four of them are still built in', stored5.filter((t) => t.isBuiltIn).length === 4)

// Every item in the catalogue was priced on it, not just this unsaved one.
// A gift has no MRP, so it correctly has no prices at all — ask a priced one.
const anyItem = (await api('/items?limit=200')).data.items.find((row) => row.mrp > 0)
ok('items already in the catalogue got the new price', (anyItem?.tierPrices ?? []).some((row) => row.tier === 'D20_10'), anyItem?.name)

ok('a built-in column cannot be removed from here', await page.$eval('button[aria-label="Remove −50% −12%"]', (el) => el.disabled))

await page.click('button[aria-label="Remove −20% −10%"]')
// The row goes once the server answers and the catalogue reloads — wait for
// the form, not for a clock.
await page
  .waitForFunction(() => document.querySelectorAll('[id^=item-tier-]').length === 4, { timeout: 15000 })
  .catch(() => {})
await sleep(300)
eq('removing it puts the form back to four', (await page.$$('[id^=item-tier-]')).length, 4)
eq('and the server is back to four', (await api('/price-tiers')).data.tiers.length, 4)

await page.keyboard.press('Escape')
await sleep(500)

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
// MRP and GST came off the table on 13 Oct; the scheme moved under the name.
const columnHeaders = await page.$$eval('thead th', (els) => els.map((el) => el.textContent.trim()))
ok('MRP is not a column', !columnHeaders.includes('MRP'), columnHeaders.join(' | '))
ok('nor GST', !columnHeaders.some((h) => h.startsWith('GST')), columnHeaders.join(' | '))
ok('the scheme still shows, under the item name', (await pageText(page)).includes('10 + 1 E2E Pen free'))

await goto(page, '/admin/inventory/items', { heading: 'Items' })
ok('the list fits a phone screen', !(await overflows(page)))

await cleanup()
const left = await api('/items?limit=200')
ok('the suite leaves nothing behind', !(left?.data?.items ?? []).some((i) => i.name.startsWith('E2E ')))

/* ── a product photo opens full screen ───────────────────────────────── */

await goto(page, '/admin/inventory/items', { heading: 'Items' })
await sleep(1600)
const itemPhoto = await page.$('button[title^="See "]')
ok('a product photo can be opened', Boolean(itemPhoto))
if (itemPhoto) {
  await itemPhoto.click()
  await sleep(800)
  const viewer = await page.$eval('[role=dialog]', (el) => ({ w: el.clientWidth, h: el.clientHeight }))
  const screen = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
  ok('and it fills the screen', viewer.w === screen.w && viewer.h === screen.h, `${viewer.w}×${viewer.h} vs ${screen.w}×${screen.h}`)
  await page.click('button[aria-label="Zoom in"]')
  await sleep(300)
  has('…and zooms', await page.$eval('[role=dialog] img', (el) => el.style.transform), 'scale(1.25)')
  await page.keyboard.press('Escape')
  await sleep(400)
  ok('…and closes again', (await page.$('[role=dialog]')) === null)
}

await finish(browser, errors, { ignore: /status of (400|409)/ })
