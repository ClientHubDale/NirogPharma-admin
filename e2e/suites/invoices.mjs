/**
 * Sales › Invoices against the real API.
 *
 * The heart of it: saving a bill records it and moves nothing, issuing it
 * takes the stock out of the factory under that invoice number, and the tax
 * comes out of a price that already included it.
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, overflows, clickText, pickOption, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const ITEM = { name: 'E2E Bill Syrup', code: 'E2E-INV-ITEM' }
const NUMBER = 'E2E/26-27/001'

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

/**
 * Toasts sit over the top-right, which is where Save and Issue are, so a click
 * sent while one is up lands on the toast instead.
 */
const settle = async (page) => {
  await page.waitForFunction(() => document.querySelectorAll('[data-toast]').length === 0, { timeout: 10000 }).catch(() => {})
  await sleep(200)
}

const cleanup = async () => {
  for (const invoice of (await api('/invoices?limit=100')).data?.invoices ?? []) {
    if (invoice.invoiceNo.startsWith('E2E/')) {
      if (invoice.status !== 'PENDING' && invoice.status !== 'CANCELLED') {
        await api(`/invoices/${invoice.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
      }
      await api(`/invoices/${invoice.id}`, { method: 'DELETE' })
    }
  }
  for (const item of (await api('/items?limit=200')).data?.items ?? []) {
    if (item.code === ITEM.code) await api(`/items/${item.id}`, { method: 'DELETE' })
  }
}
await cleanup()

// MRP 600 at 5% GST, so the tax has to be taken back out of the rate column.
const item = (await api('/items', {
  method: 'POST',
  body: JSON.stringify({ ...ITEM, unit: 'BTL', category: 'Syrup', mrp: 600, gst: 5 }),
})).data.item

const firm = (await api('/distributors?limit=100')).data.distributors[0]
if (!firm) {
  console.log('FAIL  a distributor is needed to bill — none in the database')
  process.exit(1)
}

// Two batches so the line can be split, as the client described.
const _first = (await api('/stocks/batches', { method: 'POST', body: JSON.stringify({ itemId: item.id, batchNo: 'E2E-BILL-A', quantity: 10 }) })).data.batch
const second = (await api('/stocks/batches', { method: 'POST', body: JSON.stringify({ itemId: item.id, batchNo: 'E2E-BILL-B', quantity: 15 }) })).data.batch

const { browser, page, errors } = await start()
await login(page)

/* ── the list ─────────────────────────────────────────────────────────── */

await goto(page, '/admin/sales/invoices', { heading: 'Sales Invoices' })
// The list keeps the layout every other sales document uses.
const list = await pageText(page)
// The subtitle goes singular with exactly one bill on screen.
has('the invoice list keeps the sales layout', list, 'in this view')
has('with the running total in the header', list, 'Total:')
has('and the usual way to start one', list, 'Create sales invoice')

/* ── making a bill ────────────────────────────────────────────────────── */

await clickText(page, 'button', 'Create sales invoice', { exact: false })
await page.waitForSelector('#invoice-no')
await sleep(600)

has('the editor says what Save and Issue each do', await pageText(page), 'Save records the bill')
await page.type('#invoice-no', NUMBER)
await pickOption(page, '#invoice-distributor', firm.name)
await sleep(400)
has('picking the firm shows its address', await pageText(page), firm.name)
has('and whether it has a GST number', await pageText(page), firm.gstin ? firm.gstin : 'unregistered')

await page.type('#invoice-credit-days', '30')

// Items are added from the product search under the table, as on every
// other sales document.
await pickOption(page, '[aria-label="Add product"]', ITEM.name)
await sleep(600)
has('the item lands on the table', await pageText(page), ITEM.name)

// 12 bottles, split 10 + 2 across the two batches.
await page.type(`input[aria-label="Quantity of ${ITEM.name}"]`, '12')
await sleep(400)

await page.click('button[aria-label="Add a batch to line 1"]')
await page.waitForSelector('#line-0-batch-0')
await sleep(300)
await pickOption(page, '#line-0-batch-0', 'E2E-BILL-A')
await page.type('input[aria-label="Quantity from batch 1"]', '10')

await page.click('button[aria-label="Add a batch to line 1"]')
await page.waitForSelector('#line-0-batch-1')
await sleep(300)
await pickOption(page, '#line-0-batch-1', 'E2E-BILL-B')
await page.type('input[aria-label="Quantity from batch 2"]', '2')
await sleep(400)
has('the line says how much of it is covered', await pageText(page), '12 of 12 picked')
has('and the rate shows with the GST taken off', (await pageText(page)).toLowerCase(), 'taxable')

await clickText(page, 'button', 'Save')
await page.waitForFunction(() => location.pathname === '/admin/sales/invoices', { timeout: 15000 })
await sleep(900)
has('saving goes back to the list', await pageText(page), 'saved —')
has('with the bill on it', await pageText(page), NUMBER)

const saved = (await api(`/invoices?q=${encodeURIComponent(NUMBER)}`)).data.invoices[0]
ok('the bill is saved as pending', saved?.status === 'PENDING', saved?.status)

// Back into it to look at the figures and send it. A saved bill opens as the
// bill now, so the form is one click behind Edit.
await goto(page, `/admin/sales/invoices/${saved.id}/edit`)
await sleep(1500)
has('a saved bill opens in the bill format', (await pageText(page)).toLowerCase(), 'tax invoice')
await clickText(page, 'button', 'Edit')
await page.waitForSelector('#invoice-no')
await sleep(1000)
has('and the number is settled once it exists', await pageText(page), 'Settled when the bill was made')

// PDF sits first, before Cancel, and prints the sheet on screen — so a bill
// that has not been saved yet prints just the same.
const buttons = await page.$$eval('button', (els) => els.map((b) => b.innerText.trim()).filter(Boolean))
const pdfAt = buttons.findIndex((label) => label === 'PDF')
ok('there is a PDF button', pdfAt !== -1, JSON.stringify(buttons.slice(0, 8)))
ok('…and it comes before Cancel', pdfAt < buttons.indexOf('Cancel'), JSON.stringify(buttons.slice(0, 8)))

await page.emulateMediaType('print')
await sleep(400)
const onPaper = await page.evaluate(() => {
  const sheet = document.querySelector('#bill-sheet')
  const nav = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Live Location'))
  return {
    sheet: sheet ? getComputedStyle(sheet).visibility : 'absent',
    nav: nav ? getComputedStyle(nav).visibility : 'absent',
  }
})
ok('the bill goes on the paper', onPaper.sheet === 'visible', JSON.stringify(onPaper))
ok('and the panel around it does not', onPaper.nav === 'hidden', JSON.stringify(onPaper))

// What goes on paper is the bill, never the editing table behind it.
const paper = await page.evaluate(() => document.querySelector('#bill-sheet')?.innerText ?? '')
ok('the editing table is not printed', !/of \d+ picked/.test(paper), paper.slice(0, 160))
has('…the bill table is', paper, 'DESCRIPTION')
has('…and it names the buyer', paper, 'M/S')
ok('editor-only rows stay off the paper', !/CREDIT PERIOD/i.test(paper), paper.slice(0, 200))

// "जी एस टी के नीचे ड्रॉपडाउन बना देना, उसमें तीनों डाल देना" — which copy to
// print, chosen where it prints, and the sheet lays out what was asked for.
await page.emulateMediaType('screen')
ok('the copy to print can be chosen', Boolean(await page.$('#invoice-copy')))
const copyOptions = await page.$$eval('#invoice-copy option', (els) => els.map((e) => e.value))
ok('…all three, plus all of them at once', copyOptions.join(',') === 'all,original,duplicate,triplicate', copyOptions.join(','))

for (const [choice, expected] of [
  ['all', ['ORIGINAL FOR BUYER', 'DUPLICATE FOR TRANSPORTER', 'TRIPLICATE FOR OFFICE']],
  ['original', ['ORIGINAL FOR BUYER']],
  ['duplicate', ['DUPLICATE FOR TRANSPORTER']],
  ['triplicate', ['TRIPLICATE FOR OFFICE']],
]) {
  await goto(page, `/admin/sales/invoices/${saved.id}/print?copy=${choice}`)
  await sleep(1400)
  const labels = await page.$$eval('[class*="uppercase"]', (els) =>
    els.map((e) => e.textContent.trim()).filter((x) => /FOR (BUYER|TRANSPORTER|OFFICE)/.test(x)),
  )
  ok(`copy=${choice} prints ${expected.length} page(s)`, labels.join('|') === expected.join('|'), labels.join(' · '))
}
await page.emulateMediaType('screen')

// Those checks walked off to the print sheet; the next ones are about the
// form, so come back to it and open it.
await goto(page, `/admin/sales/invoices/${saved.id}/edit`)
await sleep(1600)
await clickText(page, 'button', 'Edit')
await page.waitForSelector('#invoice-no')
await sleep(600)
ok('so the field cannot be typed into', await page.$eval('#invoice-no', (el) => el.disabled))

/* ── the money ────────────────────────────────────────────────────────── */

const line = saved.lines[0]
ok('the rate on the bill is lower than what they pay', line.rate < line.grossRate, `${line.rate} vs ${line.grossRate}`)
ok('because the GST was taken out of it', Math.abs(line.rate * (1 + line.gstRate / 100) - line.grossRate) < 0.02)
ok('taxable plus tax is what they pay', Math.abs(line.taxableValue + line.taxAmount - line.total) < 0.01)
ok('the total is whole rupees', Number.isInteger(saved.total), String(saved.total))
ok('the tax is split for the state', saved.interState ? saved.igst === saved.taxAmount : Math.abs(saved.cgst + saved.sgst - saved.taxAmount) < 0.01)

const summary = await pageText(page)
has('the totals panel shows the taxable value', summary.toLowerCase(), 'taxable value')
has('and the round off', summary.toLowerCase(), 'round off')
has('and which tax applies', summary, saved.interState ? 'IGST' : 'CGST')

/* ── saving is not issuing ────────────────────────────────────────────── */

const stock = (await api('/stocks/batches')).data.batches
eq('saving moved no stock at all', stock.find((b) => b.batchNo === 'E2E-BILL-A')?.available, 10)

await settle(page)
await clickText(page, 'button', 'Issue')
await page.waitForSelector('[role=dialog]')
await sleep(400)
has('issuing asks first', await page.$eval('[role=dialog]', (el) => el.innerText), 'cannot be undone')
await clickText(page, '[role=dialog] button', 'Yes, issue it')
await page.waitForFunction(() => location.pathname === '/admin/sales/invoices', { timeout: 15000 })
await sleep(1200)
has('issuing goes back to the list too', await pageText(page), 'issued — the stock is out of the factory')

const afterIssue = (await api('/stocks/batches')).data.batches
eq('the first batch is empty', afterIssue.find((b) => b.batchNo === 'E2E-BILL-A')?.available, 0)
eq('and the second gave up 2', afterIssue.find((b) => b.batchNo === 'E2E-BILL-B')?.available, 13)

const movements = (await api(`/stocks/batches/${second.id}/movements`)).data.movements
ok('the factory ledger carries the invoice number', movements.some((move) => move.invoiceNo === NUMBER))

const issued = (await api(`/invoices?q=${encodeURIComponent(NUMBER)}`)).data.invoices[0]
eq('the bill is confirmed', issued.status, 'CONFIRMED')

/* ── an issued bill is locked ─────────────────────────────────────────── */

await goto(page, `/admin/sales/invoices/${saved.id}/edit`)
await sleep(1500)
has('an issued bill opens as the bill as well', (await pageText(page)).toLowerCase(), 'tax invoice')
await clickText(page, 'button', 'Edit')
await page.waitForSelector('#invoice-no')
await sleep(1000)
ok('its number can no longer be edited', await page.$eval('#invoice-no', (el) => el.disabled))
ok('and Issue is spent', await page.$$eval('button', (els) => els.find((b) => b.textContent.trim() === 'Issue')?.disabled === true))

/* ── cancelling puts the stock back ───────────────────────────────────── */

await goto(page, '/admin/sales/invoices', { heading: 'Sales Invoices' })
await sleep(900)
has('the bill is on the list', await pageText(page), NUMBER)

await page.$eval(`button[aria-label="Actions for ${NUMBER}"]`, (el) => el.scrollIntoView({ block: 'center' }))
await sleep(300)
await page.click(`button[aria-label="Actions for ${NUMBER}"]`)
await page.waitForSelector('[data-slot=dropdown-menu-item]')
await sleep(300)
await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((el) => /cancel invoice/i.test(el.textContent)).click())
await sleep(1500)

const backAgain = (await api('/stocks/batches')).data.batches
eq('the first batch is full again', backAgain.find((b) => b.batchNo === 'E2E-BILL-A')?.available, 10)
eq('and so is the second', backAgain.find((b) => b.batchNo === 'E2E-BILL-B')?.available, 15)
eq('the bill reads cancelled', (await api(`/invoices?q=${encodeURIComponent(NUMBER)}`)).data.invoices[0].status, 'CANCELLED')

/* ── phone ────────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/sales/invoices', { heading: 'Sales Invoices' })
ok('the list fits a phone screen', !(await overflows(page)))

/* ── Settings › Billing: what a bill must carry ──────────────────────── */

await goto(page, '/admin/settings', { heading: 'Settings' })
await sleep(1200)
await clickText(page, 'nav button', 'Billing')
await sleep(800)
has('Settings has a Billing tab', await pageText(page), 'What a bill must carry')
ok('with a vehicle-number switch', Boolean(await page.$('#billing-vehicle')))
ok('and an e-way bill switch', Boolean(await page.$('#billing-eway')))
// The conditions moved to the bill template, where the rest of the printed
// words live — two boxes claiming to set them was one too many.
ok('and what the bill shows', Boolean(await page.$('#billing-show-vehicle')))

// The bank is the admin's to fill, and its name is typed — a fixed list could
// not say "KOTAK MAHINDRA BANK" when it only carried "Kotak Bank".
await clickText(page, 'nav button', 'Company')
await sleep(800)
const bankName = await page.$('#bank-name')
ok('the bank name is a field the admin types', Boolean(bankName))
ok('…not a fixed list to pick from', await page.$eval('#bank-name', (el) => el.tagName === 'INPUT'))
for (const id of ['#bank-branch', '#bank-ifsc', '#bank-account', '#bank-holder']) {
  ok(`and ${id.slice(1)} can be filled too`, Boolean(await page.$(id)))
}

/* ── a saved bill opens as the bill ──────────────────────────────────── */

// "सेम ऐसे ही खुल के आएगा… सब भरा हुआ है… ऐसे फॉर्मेट में दिखाई दीजिये."
const anyBill = (await api('/invoices?limit=20')).data.invoices.find((row) => row.lines?.length)
await goto(page, `/admin/sales/invoices/${anyBill.id}/edit`)
await sleep(2000)
const billView = await pageText(page)
has('a saved bill opens in the bill format', billView.toLowerCase(), 'tax invoice')
has('…with the amount spelled out', billView.toLowerCase(), 'total in words rs.')
has('…and a way back to the form', billView, 'Edit')

/* ── the printable sheet behind the PDF ──────────────────────────────── */

await goto(page, `/admin/sales/invoices/${anyBill.id}/print`)
await sleep(1800)
const sheet = await pageText(page)
has('the bill prints on its own page', sheet.toLowerCase(), 'tax invoice')
ok('with none of the panel around it', !sheet.includes('Live Location'), sheet.slice(0, 120))
has('and it names the bill', sheet, anyBill.invoiceNo)
// A bill has to say who it is for — the firm comes back flattened onto the
// invoice, not nested, which once left Bill to blank on every printed sheet.
has('and says who it is for', sheet, anyBill.distributorName)

// The bank on the bill is whatever the admin saved in Settings — never a
// value baked into the code.
const bankBefore = (await api('/settings')).data.settings.bank
await api('/settings/bank', { method: 'PATCH', body: JSON.stringify({ bankName: 'E2E TEST BANK', ifsc: 'E2EB0001234', accountNumber: '9988776655', branch: 'E2E BRANCH' }) })
await goto(page, `/admin/sales/invoices/${anyBill.id}/print`)
await sleep(1800)
const withBank = await pageText(page)
has('the bill shows the bank the admin saved', withBank, 'E2E TEST BANK')
has('…with its IFSC', withBank, 'E2EB0001234')
has('…and the account number', withBank, '9988776655')

await api('/settings/bank', { method: 'PATCH', body: JSON.stringify(bankBefore) })
await goto(page, `/admin/sales/invoices/${anyBill.id}/print`)
await sleep(1800)
ok('and it follows Settings back again', !(await pageText(page)).includes('E2E TEST BANK'))

await cleanup()
const left = await api('/invoices?limit=100')
ok('the suite leaves nothing behind', !(left.data?.invoices ?? []).some((row) => row.invoiceNo.startsWith('E2E/')))

await finish(browser, errors, { ignore: /status of (400|404|409)/ })
