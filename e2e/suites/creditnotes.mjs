/**
 * Sales › Credit Notes against the real API.
 *
 * The heart of it: a return raises a note on its own number series, and that
 * note prints as the client's own paper — "सिमिलर फॉर्मेट है, बस जहाँ टैक्स
 * इनवाइस लिखा है वहाँ क्रेडिट नोट लिखेंगे".
 */
import { start, login, goto, sleep, ok, eq, has, finish, pageText, overflows, pickOption, ADMIN } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'
const ITEM = { name: 'E2E Note Syrup', code: 'E2E-CN-ITEM' }
// A second product, sold on a real bill, so the rate a return is credited at
// can be checked against the rate it actually went out at.
const SOLD = { name: 'E2E Billed Syrup', code: 'E2E-CN-SOLD' }
const BATCH = 'E2E-CN-A'
const SOLD_BATCH = 'E2E-CN-B'
const SOLD_BILL = 'E2E/CN/901'

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
  /**
   * An issued note refuses to be deleted — it has already moved stock and
   * credited a firm, so it is cancelled first, which puts both back. Without
   * that step this suite left every note it ever issued on the books, and
   * they quietly piled up as credit against a real distributor.
   */
  for (const note of (await api('/credit-notes?limit=300')).data?.notes ?? []) {
    if (![ITEM.name, SOLD.name].includes(note.itemName)) continue
    if (note.status === 'ISSUED') await api(`/credit-notes/${note.id}/cancel`, { method: 'POST' })
    await api(`/credit-notes/${note.id}`, { method: 'DELETE' })
  }
  // The bill goes before its batch: an issued bill is holding stock out, and
  // an issued bill has to be cancelled before it can be deleted at all.
  for (const bill of (await api('/invoices?limit=300')).data?.invoices ?? []) {
    if (bill.invoiceNo !== SOLD_BILL) continue
    if (bill.status !== 'PENDING' && bill.status !== 'CANCELLED') {
      await api(`/invoices/${bill.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    }
    await api(`/invoices/${bill.id}`, { method: 'DELETE' })
  }
  for (const batch of (await api('/stocks/batches?limit=300')).data?.batches ?? []) {
    if ([BATCH, SOLD_BATCH].includes(batch.batchNo)) await api(`/stocks/batches/${batch.id}`, { method: 'DELETE' })
  }
  for (const item of (await api('/items?limit=300')).data?.items ?? []) {
    if ([ITEM.code, SOLD.code].includes(item.code)) await api(`/items/${item.id}`, { method: 'DELETE' })
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
// One note, one bill — but it is a list now, so it reads back as one row.
eq('…as a row the sheet can print', note.againstInvoices?.length, 1, JSON.stringify(note.againstInvoices))
eq('…carrying that number', note.againstInvoices?.[0]?.no, 'E2E/CN/777')
ok('and inside UP it credits CGST and SGST', note.interState === false && note.igst === 0, JSON.stringify({ i: note.interState, igst: note.igst }))

// The note keeps the letterhead it was written with, as a bill does: a new
// logo or a changed bank account must not reach back into one already out.
ok('the note keeps its own letterhead', Boolean(note.letterhead), JSON.stringify(note.letterhead))
ok('…the bank the credit refers to with it', 'accountNumber' in (note.letterhead?.bank ?? {}), JSON.stringify(note.letterhead?.bank))

const beforeLogo = note.letterhead?.company?.logoUrl
const realCompany = (await api('/settings')).data.settings.company
await api('/settings/company', { method: 'PATCH', body: JSON.stringify({ logoUrl: 'https://example.test/e2e-cn-logo.png' }) })
eq(
  'a new logo in settings leaves it alone',
  (await api(`/credit-notes/${raised.id}`)).data.note.letterhead?.company?.logoUrl,
  beforeLogo,
)
await api('/settings/company', { method: 'PATCH', body: JSON.stringify({ logoUrl: realCompany.logoUrl }) })
eq('and the real logo goes back as it was', (await api('/settings')).data.settings.company.logoUrl, realCompany.logoUrl)

/* ── against more than one bill ───────────────────────────────────────── */

// Goods from two bills can come back together — "बिल नंबर थ्री से कर रहा है या
// बिल नंबर फाइव से" — so the note names each one beside its own date.
const twoBills = (
  await api('/credit-notes', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      at: new Date().toISOString().slice(0, 10),
      station: 'E2E STATION',
      againstInvoices: [
        { no: 'E2E/CN/801', date: '2026-11-03' },
        { no: 'E2E/CN/802', date: '2026-11-07' },
      ],
      lines: [{ itemId: item.id, batchId: batch.id, quantity: 2 }],
    }),
  })
).data?.note

ok('a note can be written against two bills', Boolean(twoBills?.id), JSON.stringify(twoBills)?.slice(0, 200))
eq('…and keeps both', twoBills?.againstInvoices?.length, 2, JSON.stringify(twoBills?.againstInvoices))
eq('…the first with its date', twoBills?.againstInvoices?.[0]?.date, '2026-11-03')
eq('…the second with its own', twoBills?.againstInvoices?.[1]?.date, '2026-11-07')
// The list screen and its search still read one plain string, written here.
eq('…and the plain text follows from the list', twoBills?.againstInvoiceNo, 'E2E/CN/801, E2E/CN/802')

const foundByBill = ((await api('/credit-notes?q=E2E/CN/802&limit=50')).data?.notes ?? []).some((row) => row.id === twoBills.id)
ok('searching a bill number still finds the note', foundByBill)

// A row left blank by an untouched "+ Another bill" is dropped, not stored.
const oneBill = (
  await api(`/credit-notes/${twoBills.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      distributorId: firm.id,
      at: twoBills.at,
      againstInvoices: [{ no: 'E2E/CN/801', date: '2026-11-03' }, { no: '', date: '' }],
      lines: [{ itemId: item.id, batchId: batch.id, quantity: 2 }],
    }),
  })
).data?.note
eq('an empty bill row is thrown away', oneBill?.againstInvoices?.length, 1, JSON.stringify(oneBill?.againstInvoices))

// Put both back: the printed sheet is checked against this note below.
await api(`/credit-notes/${twoBills.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    distributorId: firm.id,
    at: twoBills.at,
    againstInvoices: [
      { no: 'E2E/CN/801', date: '2026-11-03' },
      { no: 'E2E/CN/802', date: '2026-11-07' },
    ],
    lines: [{ itemId: item.id, batchId: batch.id, quantity: 2 }],
  }),
})

/* ── the note's own settings ──────────────────────────────────────────── */

// A bill and a credit note are not the same paper, so the note keeps its own
// switches — "क्रेडिट नोट में भी सेटिंग होनी चाहिए जैसे इनवाइस में है".
const cnRules = (await api('/settings')).data.settings.creditNote
ok('the credit note has settings of its own', Boolean(cnRules), JSON.stringify((await api('/settings')).data.settings ?? {}).slice(0, 200))
for (const key of ['showDebitNote', 'showAgainstBill', 'showTransport', 'showVehicleNo', 'showStation', 'showOtherCharges']) {
  eq(`…${key} starts on`, cnRules?.[key], true)
}

// The copy on the note carries the note's switches, not the bill's.
const cnShow = twoBills?.letterhead?.show ?? {}
ok('the copy on the note carries its own switches', 'againstBill' in cnShow && 'station' in cnShow, JSON.stringify(cnShow))
ok('…and not the bill e-way switch', !('ewayBillNo' in cnShow), JSON.stringify(cnShow))

// Switched off, a field leaves the PDF — but only for notes written after it.
await api('/settings/creditNote', { method: 'PATCH', body: JSON.stringify({ showStation: false }) })
const afterOff = (
  await api('/credit-notes', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      at: new Date().toISOString().slice(0, 10),
      station: 'E2E STATION',
      lines: [{ itemId: item.id, batchId: batch.id, quantity: 1 }],
    }),
  })
).data?.note
eq('turning Station off takes it off the next note', afterOff?.letterhead?.show?.station, false)
eq('…and leaves the note already written alone', (await api(`/credit-notes/${twoBills.id}`)).data.note.letterhead?.show?.station, true)
await api('/settings/creditNote', { method: 'PATCH', body: JSON.stringify({ showStation: true }) })
eq('the switch goes back on', (await api('/settings')).data.settings.creditNote.showStation, true)

/* ── the rate comes off the bill the goods went out on ────────────────── */

/**
 * The point of the whole phase: a return is money going back on a sale that
 * already happened — "जिस रेट पे गया है उसी रेट पे वापस आएगा" — so the rate
 * column moving afterwards must not change what we owe.
 */
const sold = (
  await api('/items', {
    method: 'POST',
    body: JSON.stringify({ ...SOLD, unit: 'BTL', category: 'Syrup', mrp: 600, gst: 5, hsn: '300490' }),
  })
).data.item

const soldBatch = (
  await api('/stocks/batches', { method: 'POST', body: JSON.stringify({ itemId: sold.id, batchNo: SOLD_BATCH, quantity: 100 }) })
).data.batch

const bill = (
  await api('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoiceNo: SOLD_BILL,
      distributorId: firm.id,
      invoiceDate: '2026-11-03',
      lines: [{ itemId: sold.id, quantity: 5, batches: [{ batchId: soldBatch.id, quantity: 5 }] }],
    }),
  })
).data?.invoice
await api(`/invoices/${bill.id}/issue`, { method: 'POST' })

const soldRate = bill?.lines?.[0]?.grossRate
/// What prints in the RATE column: the same price with the GST taken back out.
const soldNet = bill?.lines?.[0]?.rate
ok('a bill goes out at the rate column of the day', Number(soldRate) > 0, JSON.stringify(bill?.lines?.[0]))

// Now the rate column moves. Everything below is about what that must not do.
await api(`/items/${sold.id}`, { method: 'PATCH', body: JSON.stringify({ mrp: 1200 }) })

const offered = (await api(`/credit-notes/against-bills?distributorId=${firm.id}`)).data?.bills ?? []
const mine = offered.find((row) => row.invoiceNo === SOLD_BILL)
ok('the bill is offered to credit against', Boolean(mine), JSON.stringify(offered.slice(0, 2)))
eq('…with its own date, to fill the box beside it', mine?.invoiceDate, '2026-11-03')
ok('…and its value, so the admin knows which bill it is', Number(mine?.total) > 0, String(mine?.total))
eq('…and what it charged for the item', mine?.lines?.find((row) => row.itemId === sold.id)?.grossRate, soldRate)
ok('a draft bill is not offered — nothing went out on it', !offered.some((row) => row.invoiceNo === 'E2E/26-27/009'))

const atOldRate = (
  await api('/credit-notes', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      at: new Date().toISOString().slice(0, 10),
      againstInvoices: [{ no: SOLD_BILL, date: '2026-11-03', invoiceId: bill.id }],
      lines: [{ itemId: sold.id, batchId: soldBatch.id, quantity: 2 }],
    }),
  })
).data?.note

eq('the credit is at the rate the goods went out at', atOldRate?.lines?.[0]?.grossRate, soldRate)
eq('…and the line says which bill set it', atOldRate?.lines?.[0]?.againstInvoiceNo, SOLD_BILL)
eq('…and the GST comes off that bill too', atOldRate?.lines?.[0]?.gstRate, bill?.lines?.[0]?.gstRate)

// Nobody named a bill, so the rate column is all there is — and it has moved,
// which is what makes the assertion above mean something.
const atNewRate = (
  await api('/credit-notes', {
    method: 'POST',
    body: JSON.stringify({
      distributorId: firm.id,
      at: new Date().toISOString().slice(0, 10),
      lines: [{ itemId: sold.id, batchId: soldBatch.id, quantity: 2 }],
    }),
  })
).data?.note

ok(
  'without a bill it falls back to the rate column, which has since moved',
  Number(atNewRate?.lines?.[0]?.grossRate) !== Number(soldRate),
  `${atNewRate?.lines?.[0]?.grossRate} vs ${soldRate}`,
)
eq('…and that line names no bill', atNewRate?.lines?.[0]?.againstInvoiceNo, '')

// The line takes the bill even when it was named only at the top of the note.
ok('naming the bill once prices every line off it', Boolean(atOldRate?.lines?.[0]?.againstInvoiceId))

// A bill nobody sent this firm cannot set the rate on their goods.
const strangersBill = await api('/credit-notes', {
  method: 'POST',
  body: JSON.stringify({
    distributorId: firm.id,
    at: new Date().toISOString().slice(0, 10),
    lines: [{ itemId: sold.id, batchId: soldBatch.id, quantity: 1, againstInvoiceId: 'not-a-bill-of-theirs' }],
  }),
})
eq('a bill that is not theirs is refused', strangersBill?.code, 'UNKNOWN_INVOICE', JSON.stringify(strangersBill).slice(0, 160))

// And a bill that never carried this item cannot price it either.
const notOnIt = await api('/credit-notes', {
  method: 'POST',
  body: JSON.stringify({
    distributorId: firm.id,
    at: new Date().toISOString().slice(0, 10),
    lines: [{ itemId: item.id, quantity: 1, againstInvoiceId: bill.id }],
  }),
})
eq('and so is an item that was never on it', notOnIt?.code, 'ITEM_NOT_ON_INVOICE', JSON.stringify(notOnIt).slice(0, 160))

for (const gone of [atNewRate]) if (gone) await api(`/credit-notes/${gone.id}`, { method: 'DELETE' })

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

// The note's own ⚙, beside Create, exactly as the bill has one.
ok('the list has a settings button of its own', Boolean(await page.$('[aria-label="Credit note settings"]')))
await page.click('[aria-label="Credit note settings"]')
await sleep(500)
const dialog = await pageText(page)
for (const label of ['Debit Note No. & Date', 'Against Bill & Date', 'Transport', 'Vehicle No.', 'Station', 'Other Charges']) {
  has(`…and offers ${label}`, dialog, label)
}
has('…saying it applies to every new credit note', dialog, 'every new credit note')
ok('…and the bill switches are not in it', !dialog.includes('E-way Bill No.'), dialog.slice(0, 300))
await page.keyboard.press('Escape')
await sleep(400)

/* ── a note against two bills, printed ────────────────────────────────── */

await goto(page, `/admin/sales/credit-notes/${twoBills.id}/print`)
await sleep(1800)
const twoSheet = await pageText(page)
has('both bills print on the one note', twoSheet, 'E2E/CN/801')
has('…the second beside the first', twoSheet, 'E2E/CN/802')
has('…each with its own date', twoSheet, 'dt 03-11-2026')
has('…including the second', twoSheet, 'dt 07-11-2026')

/* ── writing one by hand ──────────────────────────────────────────────── */

await goto(page, '/admin/sales/credit-notes/new')
await sleep(1500)
const blank = await pageText(page)
has('the create screen is the note itself', blank, 'CREDIT NOTE')
has('…headed as a sales return invoice', blank, 'SALES RETURN INVOICE')
has('…and says what Save and Issue each do', blank, 'Save records the note')
ok('with the letterhead to edit, as the bill has', Boolean(await page.$('#note-no')))

// The bills the goods came back against: a number, its date, and room for
// another pair when goods from two bills come back together.
has('the create screen asks which bill it is against', blank, 'AGAINST BILL & DATE')
ok('…with a box for the number', Boolean(await page.$('#note-against')))
ok('…and one for that bill date', Boolean(await page.$('#note-against-date')))
ok('…and no second row until one is asked for', !(await page.$('#note-against-1')))
await page.click('#note-against-add')
await sleep(250)
ok('+ Another bill gives a second pair', Boolean(await page.$('#note-against-1')) && Boolean(await page.$('#note-against-date-1')))
await page.click('#note-against-remove-1')
await sleep(250)
ok('…and × takes it away again', !(await page.$('#note-against-1')))

/* ── picking the bill, and taking its rate ────────────────────────────── */

// Nothing can be offered until we know whose goods came back.
const beforeFirm = await page.$$eval('#note-against-bills option', (opts) => opts.length)
eq('no bills are offered before a distributor is chosen', beforeFirm, 0)

await pickOption(page, '#note-distributor', firm.name)
await sleep(1600)

const listed = await page.$$eval('#note-against-bills option', (opts) => opts.map((o) => o.value))
ok('the bill box offers this firm’s own bills', listed.includes(SOLD_BILL), listed.slice(0, 5).join(', '))

// Typing a bill we really sent brings its date with it, and its rates.
await page.focus('#note-against')
await page.type('#note-against', SOLD_BILL)
await sleep(700)
eq('naming a bill fills its date in', await page.$eval('#note-against-date', (el) => el.value), '2026-11-03')
ok('…and says the rates now come off it', Boolean(await page.$('#note-against-priced')))

// A number from before the system still goes in; it just prices at today's.
await page.$eval('#note-against', (el) => el.select())
await page.type('#note-against', 'OLD/PAPER/12')
await sleep(600)
ok('a number we never sent is still allowed', !(await page.$('#note-against-priced')))
eq('…and it is kept as typed', await page.$eval('#note-against', (el) => el.value), 'OLD/PAPER/12')

// Back to the real bill, then add the item and watch the rate it credits at.
await page.$eval('#note-against', (el) => el.select())
await page.type('#note-against', SOLD_BILL)
await sleep(700)
await pickOption(page, '[aria-label="Add product"]', SOLD.name)
await sleep(900)
await page.type('[aria-label="Quantity on line 1"]', '2')
await sleep(900)

const rateShown = await page.$$eval('tbody tr td', (cells) => cells.map((c) => c.textContent.trim()))
ok(
  'the sheet credits it at the bill rate, not today’s',
  rateShown.includes(Number(soldNet).toFixed(2)),
  rateShown.filter(Boolean).slice(0, 14).join(' | '),
)
has('and the line says which bill it came off', await pageText(page), SOLD_BILL)

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

// The bill the goods went out on now prints, which it did not before —
// "ओरिजिनल बिल का नंबर और डेट दोनों आने चाहिए".
has('the printed note names the bill it is against', sheet, 'AGAINST BILL & DATE')
has('…by its number', sheet, 'E2E/CN/777')
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
