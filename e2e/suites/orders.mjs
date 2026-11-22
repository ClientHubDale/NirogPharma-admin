/**
 * Sales › Sales Orders against the real API.
 *
 * An order is a promise: the customer has said what they want and at what
 * price, and nothing has been billed or shipped. Two things matter most and
 * both are checked here.
 *
 * **The money must be the bill's money.** An order and the invoice made from
 * the same lines are priced by the same code, so this suite builds one of
 * each and compares them to the paisa. If they ever disagree, converting an
 * order would quietly change what a customer owes.
 *
 * **Everyone sees their own.** The office sees every order, a manager the
 * firms they own, an executive the firms they work plus anything they booked
 * themselves. Managers and executives sign in on the app, never the website,
 * so their logins here say so.
 *
 * The screen comes after: it is the bill's own sheet with SALES ORDER over
 * it, so the checks below are mostly about what an order deliberately does
 * *not* carry — no batch columns, no e-way bill, no Due.
 */
import { ok, eq, finish, goto, login, clickText, pageText, pickOption, setField, sleep, start, ADMIN, BASE } from '../lib.mjs'

const API = process.env.E2E_API ?? 'http://localhost:5000/api/v1'

const signIn = async (mobile, password, client = 'web') => {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, password, client }),
  }).then((x) => x.json())
  return r?.data?.accessToken
}

const as = (token) => (path, init = {}) =>
  fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  }).then(async (r) => ({ status: r.status, body: await r.json() }))

const admin = as(await signIn(ADMIN.mobile, ADMIN.password))

const MARK = 'E2E order suite'
/// The one made through the screen, so it is never confused with the rest.
const UI_MARK = 'E2E order suite — on screen'
const PASSWORD = 'nirog@123'
const MGR = { name: 'E2E SO Manager', mobile: '9000000931' }
const MGR2 = { name: 'E2E SO Manager Two', mobile: '9000000934' }
const EXE = { name: 'E2E SO Executive', mobile: '9000000932' }
const OUT = { name: 'E2E SO Outsider', mobile: '9000000933' }
const FIRM = 'E2E SO Firm'
const FIRM2 = 'E2E SO Other Firm'
/// The customer added from inside the order sheet.
const INLINE = 'E2E SO Inline Chemist'
const INLINE_MOBILE = '9000000951'
const BILL = 'E2E/SO/'
const STAFF = [MGR.mobile, MGR2.mobile, EXE.mobile, OUT.mobile]
const FIRMS = [FIRM, FIRM2, INLINE]

/**
 * Everything this suite made, gone again. The order of it matters, and each
 * step is a rule of the system rather than a quirk of the test:
 *
 *  · the **bills** go first, because deleting a bill hands its order back as
 *    confirmed — and an order still carrying a bill cannot be touched at all;
 *  · an **order** has to be cancelled before it can be deleted;
 *  · a **firm** will not be deleted while an executive is attached, so the
 *    staff go before their firms and any other executive is detached by hand.
 */
const wipe = async () => {
  for (const i of (await admin('/invoices?limit=300')).body.data?.invoices ?? [])
    if (i.invoiceNo.startsWith(BILL)) await admin(`/invoices/${i.id}`, { method: 'DELETE' })
  for (const o of (await admin('/orders?limit=300')).body.data?.orders ?? []) {
    if (o.note !== MARK && o.note !== UI_MARK) continue
    if (!['PENDING', 'ONHOLD', 'CANCELLED'].includes(o.status))
      await admin(`/orders/${o.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })
    await admin(`/orders/${o.id}`, { method: 'DELETE' })
  }
  for (const u of (await admin('/users?limit=300')).body.data?.users ?? [])
    if (STAFF.includes(u.mobile)) await admin(`/users/${u.id}`, { method: 'DELETE' })
  for (const d of (await admin('/distributors?limit=300')).body.data?.distributors ?? []) {
    if (!FIRMS.includes(d.name) && d.mobile !== INLINE_MOBILE) continue
    // The inline customer was put under a real executive, who stays.
    await admin(`/distributors/${d.id}`, { method: 'PATCH', body: JSON.stringify({ executiveIds: [] }) })
    await admin(`/distributors/${d.id}`, { method: 'DELETE' })
  }
}
await wipe()

/* ── the cast ─────────────────────────────────────────────────────────── */

const mkUser = async (who, role) =>
  (await admin('/users', { method: 'POST', body: JSON.stringify({ ...who, role, password: PASSWORD }) })).body.data?.user

const manager = await mkUser(MGR, 'MANAGER')
const manager2 = await mkUser(MGR2, 'MANAGER')
const executive = await mkUser(EXE, 'EXECUTIVE')
const outsider = await mkUser(OUT, 'EXECUTIVE')

/// Somewhere real for a firm to sit; the panel always sends these.
const WHERE = {
  regionId: 'reg-up',
  cityId: 'cty-muzaffarnagar',
  areaId: 'rt-mzncity',
  state: 'UP',
  contactPerson: 'E2E Suite',
  latitude: 29.4727,
  longitude: 77.7085,
  locationName: 'Muzaffarnagar',
}
const mkFirm = async (name, body) =>
  (await admin('/distributors', { method: 'POST', body: JSON.stringify({ name, ...WHERE, ...body }) })).body.data?.distributor

const firm = await mkFirm(FIRM, { mobile: '9000000941', managerId: manager.id, executiveIds: [executive.id] })
// A firm under somebody else entirely, so "not mine" means something.
const firm2 = await mkFirm(FIRM2, { mobile: '9000000942', managerId: manager2.id, executiveIds: [outsider.id] })
ok('a firm under a manager and an executive is set up', Boolean(firm?.id && firm2?.id))

const items = ((await admin('/items?limit=200')).body.data?.items ?? []).filter((i) => Number(i.mrp) > 0).slice(0, 2)
ok('there are priced items to order', items.length === 2)
const lines = [
  { itemId: items[0].id, quantity: 7 },
  { itemId: items[1].id, quantity: 3 },
]

/* ── numbering ────────────────────────────────────────────────────────── */

const offered = (await admin('/orders/next-number')).body.data?.number
ok('an order number is offered, so nobody in the field invents one', /^SO\/\d\d-\d\d\/\d{4}$/.test(offered), offered)

const made = await admin('/orders', {
  method: 'POST',
  body: JSON.stringify({ distributorId: firm.id, note: MARK, lines, schemeIds: [] }),
})
const order = made.body.data?.order
ok('an order saves', made.status === 201 && Boolean(order), `${made.status} ${made.body.message}`)
eq('…taking the number it was offered', order?.orderNo, offered)
eq('…and starting out pending', order?.status, 'PENDING')
eq('…on the firm’s own rate column', order?.priceTier, firm.priceTier)
ok('…with no batches, because an order reserves nothing', (order?.lines ?? []).every((l) => l.batches.length === 0))

const next = (await admin('/orders/next-number')).body.data?.number
eq('the next number counts on', Number(next.slice(-4)), Number(offered.slice(-4)) + 1)

const clash = await admin('/orders', {
  method: 'POST',
  body: JSON.stringify({ distributorId: firm.id, note: MARK, lines, orderNo: order.orderNo }),
})
eq('a number cannot be used twice', clash.status, 409)

/* ── the money is the bill's money ────────────────────────────────────── */

const billed = await admin('/invoices', {
  method: 'POST',
  body: JSON.stringify({ invoiceNo: `${BILL}${Date.now()}`, distributorId: firm.id, note: MARK, lines, schemeIds: [] }),
})
const invoice = billed.body.data?.invoice
ok('a bill for the very same lines saves', billed.status === 201, billed.body.message)
eq('the order and the bill agree on the taxable value', order?.taxableValue, invoice?.taxableValue)
eq('…on the tax', order?.taxAmount, invoice?.taxAmount)
eq('…and on the total', order?.total, invoice?.total)
eq(
  '…line by line, to the paisa',
  JSON.stringify((order?.lines ?? []).map((l) => [l.quantity, l.grossRate, l.rate, l.total])),
  JSON.stringify((invoice?.lines ?? []).map((l) => [l.quantity, l.grossRate, l.rate, l.total])),
)

/* ── rewriting it, and when that stops ────────────────────────────────── */

const edited = await admin(`/orders/${order.id}`, {
  method: 'PATCH',
  body: JSON.stringify({ distributorId: firm.id, note: MARK, station: 'Rampur', lines: [{ itemId: items[0].id, quantity: 11 }] }),
})
eq('a pending order can be rewritten', edited.status, 200)
eq('…down to one line', edited.body.data?.order?.lines?.length, 1)
ok('…and is repriced as it is', edited.body.data?.order?.total !== order.total, `${order.total} → ${edited.body.data?.order?.total}`)
eq('…keeping its own number', edited.body.data?.order?.orderNo, order.orderNo)

const confirmed = await admin(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) })
eq('it can be confirmed', confirmed.body.data?.order?.status, 'CONFIRMED')
ok('…which stamps the day the customer agreed', Boolean(confirmed.body.data?.order?.confirmedAt))

const sneak = await admin(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ distributorId: firm.id, note: MARK, lines }) })
eq('a confirmed order is not quietly edited', sneak.status, 409)

const byHand = await admin(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'INVOICED' }) })
eq('nobody marks it invoiced by hand — the bill does that', byHand.status, 400)

const tooSoon = await admin(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'DISPATCHED' }) })
eq('goods cannot go out before there is a bill', tooSoon.status, 409)

eq('a confirmed order cannot be deleted', (await admin(`/orders/${order.id}`, { method: 'DELETE' })).status, 409)

const reopened = await admin(`/orders/${order.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PENDING' }) })
eq('putting it back to pending clears the agreed date', reopened.body.data?.order?.confirmedAt, '')
eq(
  '…and then it can be rewritten again',
  (await admin(`/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ distributorId: firm.id, note: MARK, lines }) })).status,
  200,
)

/* ── finding them ─────────────────────────────────────────────────────── */

ok(
  'an order is found by its number',
  ((await admin(`/orders?q=${encodeURIComponent(order.orderNo)}`)).body.data?.orders ?? []).some((o) => o.id === order.id),
)
ok(
  '…and by its customer',
  ((await admin(`/orders?distributorId=${firm.id}`)).body.data?.orders ?? []).some((o) => o.id === order.id),
)
ok(
  'the list leaves the letterhead behind',
  !('letterhead' in (((await admin('/orders?limit=5')).body.data?.orders ?? [])[0] ?? { letterhead: 1 })),
)
eq(
  'an order with nothing on it is refused',
  (await admin('/orders', { method: 'POST', body: JSON.stringify({ distributorId: firm.id, note: MARK, lines: [] }) })).status,
  400,
)

/* ── becoming a bill ──────────────────────────────────────────────────── */

const suggested = (await admin('/invoices/next-number')).body.data?.number
ok('a bill number is offered to type over', /^NP\/\d\d-\d\d\/\d+$/.test(suggested ?? ''), suggested)

const mkOrder = async () =>
  (await admin('/orders', { method: 'POST', body: JSON.stringify({ distributorId: firm.id, note: MARK, lines, schemeIds: [] }) })).body.data
    ?.order

const draft = await mkOrder()
eq(
  'a pending order cannot be billed — the customer has not agreed to it',
  (await admin(`/orders/${draft.id}/invoice`, { method: 'POST', body: JSON.stringify({ invoiceNo: `${BILL}C1` }) })).status,
  409,
)

await admin(`/orders/${draft.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) })
const agreed = (await admin(`/orders/${draft.id}`)).body.data.order
eq(
  'a bill with no number is refused',
  (await admin(`/orders/${draft.id}/invoice`, { method: 'POST', body: JSON.stringify({}) })).status === 400 ||
    (await admin(`/orders/${draft.id}/invoice`, { method: 'POST', body: JSON.stringify({}) })).status === 422,
  true,
)

const crossed = await admin(`/orders/${draft.id}/invoice`, { method: 'POST', body: JSON.stringify({ invoiceNo: `${BILL}C1` }) })
const bill = crossed.body.data?.invoice
const nowBilled = crossed.body.data?.order
eq('a confirmed order becomes a bill', crossed.status, 201)

/**
 * The whole point of the crossing: not a figure moves. The order was priced by
 * the same code the bill is, off the same rate column, applying the very
 * schemes the customer agreed to — so if any of these ever differ, converting
 * would charge somebody something they never said yes to.
 */
eq('the taxable value does not move in the crossing', bill?.taxableValue, agreed.taxableValue)
eq('…nor the tax', bill?.taxAmount, agreed.taxAmount)
eq('…nor what the schemes took off', bill?.schemeDiscount, agreed.schemeDiscount)
eq('…nor the total', bill?.total, agreed.total)
eq(
  '…line by line, to the paisa',
  JSON.stringify((bill?.lines ?? []).map((l) => [l.itemId, l.quantity, l.grossRate, l.rate, l.total])),
  JSON.stringify((agreed.lines ?? []).map((l) => [l.itemId, l.quantity, l.grossRate, l.rate, l.total])),
)

eq('the bill arrives as a draft, so no stock has moved', bill?.status, 'PENDING')
ok('…with no batches picked on it yet', (bill?.lines ?? []).every((l) => (l.batches ?? []).length === 0))
eq('the order is marked invoiced', nowBilled?.status, 'INVOICED')
eq('…and remembers which bill it became', nowBilled?.invoiceNo, bill.invoiceNo)

eq(
  'the same order cannot be billed twice',
  (await admin(`/orders/${draft.id}/invoice`, { method: 'POST', body: JSON.stringify({ invoiceNo: `${BILL}C2` }) })).status,
  409,
)

const second = await mkOrder()
await admin(`/orders/${second.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED' }) })
eq(
  'a bill number already in use is refused',
  (await admin(`/orders/${second.id}/invoice`, { method: 'POST', body: JSON.stringify({ invoiceNo: `${BILL}C1` }) })).status,
  409,
)
const untouched = (await admin(`/orders/${second.id}`)).body.data.order
eq('…and that order is left whole, not half-billed', untouched.status, 'CONFIRMED')
eq('…with no bill against it', untouched.invoiceId, '')

/// A billed order is the bill's business now.
eq(
  'a billed order cannot be rewritten',
  (await admin(`/orders/${draft.id}`, { method: 'PATCH', body: JSON.stringify({ distributorId: firm.id, note: MARK, lines }) })).status,
  409,
)
eq(
  '…nor put back to pending behind the bill’s back',
  (await admin(`/orders/${draft.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'PENDING' }) })).status,
  409,
)
eq('…nor deleted', (await admin(`/orders/${draft.id}`, { method: 'DELETE' })).status, 409)

/**
 * Deleting the draft bill undoes the crossing. Without this the order would be
 * stranded — marked invoiced with no invoice, a state it can be neither
 * reopened from, billed from, nor deleted from.
 */
await admin(`/invoices/${bill.id}`, { method: 'DELETE' })
const handedBack = (await admin(`/orders/${draft.id}`)).body.data.order
eq('deleting the draft bill hands the order back', handedBack.status, 'CONFIRMED')
eq('…with no bill against it any more', handedBack.invoiceId, '')
eq(
  '…so it can be billed again',
  (await admin(`/orders/${draft.id}/invoice`, { method: 'POST', body: JSON.stringify({ invoiceNo: `${BILL}C3` }) })).status,
  201,
)

/* ── who may book one, and who sees it ────────────────────────────────── */

const mgr = as(await signIn(MGR.mobile, PASSWORD, 'app'))
const exe = as(await signIn(EXE.mobile, PASSWORD, 'app'))
const out = as(await signIn(OUT.mobile, PASSWORD, 'app'))
ok('the staff sign in on the app', Boolean(mgr && exe && out))

const booked = await exe('/orders', {
  method: 'POST',
  body: JSON.stringify({ distributorId: firm.id, note: MARK, lines, schemeIds: [] }),
})
eq('an executive may book an order', booked.status, 201)
eq('…and it is recorded in their name', booked.body.data?.order?.takenById, executive.id)

const onBehalf = await admin('/orders', {
  method: 'POST',
  body: JSON.stringify({ distributorId: firm.id, note: MARK, lines, takenById: executive.id, schemeIds: [] }),
})
eq('the office may type one up in the executive’s name', onBehalf.body.data?.order?.takenById, executive.id)

const elsewhere = await out('/orders', {
  method: 'POST',
  body: JSON.stringify({ distributorId: firm2.id, note: MARK, lines, takenById: executive.id, schemeIds: [] }),
})
eq('an executive cannot put an order in someone else’s name', elsewhere.body.data?.order?.takenById, outsider.id)

const seenBy = async (who) =>
  ((await who('/orders?limit=300')).body.data?.orders ?? []).filter((o) => o.note === MARK).map((o) => o.id)

const mineId = booked.body.data?.order?.id
const theirsId = elsewhere.body.data?.order?.id

const byAdmin = await seenBy(admin)
const byMgr = await seenBy(mgr)
const byExe = await seenBy(exe)
const byOut = await seenBy(out)

ok('the office sees every order', byAdmin.includes(mineId) && byAdmin.includes(theirsId))
ok('a manager sees the firms they own', byMgr.includes(mineId))
ok('…and not another manager’s', !byMgr.includes(theirsId))
ok('an executive sees the firm they work', byExe.includes(mineId))
ok('…and not a firm that is not theirs', !byExe.includes(theirsId))
ok('a new executive still sees what they booked themselves', byOut.includes(theirsId))
ok('…but nothing of a firm they do not work', !byOut.includes(mineId))

eq('an order out of reach is simply not found', (await out(`/orders/${mineId}`)).status, 404)
eq(
  '…and cannot be edited either',
  (await out(`/orders/${mineId}`, { method: 'PATCH', body: JSON.stringify({ distributorId: firm.id, lines }) })).status,
  404,
)
eq('an executive may not delete an order', (await exe(`/orders/${mineId}`, { method: 'DELETE' })).status, 403)
eq(
  '…but may cancel their own',
  (await exe(`/orders/${mineId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) })).body.data?.order?.status,
  'CANCELLED',
)

/* ── the screen ───────────────────────────────────────────────────────── */

/** Waits for something to come true rather than guessing how long it takes. */
const waitFor = async (what, { tries = 24, gap = 500 } = {}) => {
  for (let i = 0; i < tries; i += 1) {
    const got = await what()
    if (got) return got
    await sleep(gap)
  }
  return null
}

/**
 * The order sheet is opened by its own helper rather than `goto`: the editor
 * fires a dozen fetches at once — items, tiers, gifts, customers, settings,
 * schemes — and then asks the server what the schemes make of the lines, so
 * waiting for the network to fall silent is the one thing that will not
 * happen. Waiting for the sheet to be on screen is what actually matters.
 */
const openSheet = async (id) => {
  await page.goto(`${BASE}/admin/sales/orders/${id}/edit`, { waitUntil: 'domcontentloaded' })
  await waitFor(async () => (await pageText(page)).includes('Edit sales order'))
  await sleep(1200)
}

const { browser, page } = await start()
const noise = []
page.on('pageerror', (e) => noise.push(String(e).slice(0, 160)))
// A new customer's map point comes off the device, so the browser is told
// where it is standing.
await browser.defaultBrowserContext().overridePermissions(BASE, ['geolocation'])
await page.setGeolocation({ latitude: 28.9845, longitude: 77.7064 })
await login(page)

await goto(page, '/admin/sales/orders', { heading: 'Sales Orders' })
await sleep(1500)
const list = await pageText(page)
ok('the list shows what is promised but not yet billed', /Not yet billed/.test(list))
const headings = await page.evaluate(() => [...document.querySelectorAll('th')].map((t) => t.innerText.trim()))
ok('there is no Due column — nothing is owed on a promise', !headings.some((h) => /^Due$/i.test(h)), headings.join(' | ').slice(0, 120))
ok('…and there is a Booked By column, which a bill has no use for', headings.some((h) => /Booked By/i.test(h)))

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Create sales order'))?.click())
await sleep(1800)

const sheet = await pageText(page)
ok('an order is written on the bill’s own sheet', /SALES ORDER/.test(sheet))
ok('…labelled ORDER NO., not INVOICE NO.', /ORDER NO\./.test(sheet) && !/INVOICE NO\./.test(sheet))
ok('…with no e-way bill, because nothing is travelling yet', !/E-WAY BILL/.test(sheet))

// The server offers the number, so the field fills a moment after the sheet.
const onSheet = await waitFor(async () => {
  const v = await page.$eval('#order-no', (el) => el.value).catch(() => '')
  return /^SO\/\d\d-\d\d\/\d{4}$/.test(v) ? v : null
})
ok('the number is filled in without anyone typing it', Boolean(onSheet), onSheet ?? '(still empty)')

/**
 * Neither the table being typed into nor the one that prints may carry a
 * Batch, Mfd. or Exp. column, and every printed row must hold the same number
 * of cells — drop three columns from the header and leave the filler cells
 * alone and the whole grid shears the moment a blank row is drawn.
 */
const heads = await page.evaluate(() =>
  [...document.querySelectorAll('table')].map((t) => [...t.querySelectorAll('th')].map((x) => x.innerText.replace(/\s+/g, ' ').trim())),
)
ok('no Batch column on the form or on the printed sheet', !heads.flat().some((h) => /batch|mfd|exp\./i.test(h)), heads.flat().join(' | ').slice(0, 140))
const widths = await page.evaluate(() =>
  [...document.querySelectorAll('table')].map((t) => [...t.querySelectorAll('tr')].map((r) => r.children.length)).filter((rows) => rows.length > 2),
)
ok('every printed row has the same number of cells', widths.every((rows) => new Set(rows).size === 1), JSON.stringify(widths).slice(0, 140))

await pickOption(page, '#order-distributor', firm.name)
await sleep(800)
await pickOption(page, '[aria-label="Add product"]', items[0].name)
await sleep(800)
await setField(page, `[aria-label="Quantity of ${items[0].name}"]`, '6')
await sleep(500)
await page.type('#order-note', UI_MARK)

/**
 * What the printer would actually put on the page.
 *
 * The print stylesheet dresses `#bill-sheet` and hides everything around it.
 * An order that names its sheet anything else prints the whole screen —
 * sidebar, toolbar and all — across two pages, which is exactly what happened
 * the first time.
 */
await page.emulateMediaType('print')
await sleep(400)
const onPaper = await page.evaluate(() => {
  const visible = (el) => Boolean(el) && getComputedStyle(el).visibility === 'visible'
  const sheet = document.querySelector('#bill-sheet')
  return {
    sheet: visible(sheet),
    nav: visible(document.querySelector('nav[aria-label=Dashboard]')),
    // A4 at 96dpi, less the 8mm margins the stylesheet sets.
    pages: sheet ? Math.ceil(sheet.getBoundingClientRect().height / ((297 - 16) * 3.7795)) : 0,
  }
})
await page.emulateMediaType(null)
ok('the order sheet is what prints', onPaper.sheet)
ok('…with the panel around it left off the page', !onPaper.nav)
ok('…on a single page', onPaper.pages === 1, `${onPaper.pages} pages`)

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Save')?.click())
const onScreen = await waitFor(async () => ((await admin('/orders?limit=300')).body.data?.orders ?? []).find((o) => o.note === UI_MARK))
ok('the sheet saves an order', Boolean(onScreen), onScreen ? `${onScreen.orderNo} — ₹${onScreen.total}` : 'nothing saved')
eq('…with the quantity that was typed', Number(onScreen?.lines?.[0]?.quantity), 6)
eq('…for the customer that was picked', onScreen?.distributorId, firm.id)
eq('…recorded as the office’s own', onScreen?.takenByRole, 'ADMIN')

// Saving leaves the sheet for the list, which is where the rest is read.
await waitFor(async () => page.url().endsWith('/admin/sales/orders'))
await sleep(700)
const landed = await pageText(page)
ok('the list says what was saved', landed.includes(`Order ${onScreen.orderNo} saved`), landed.slice(-160))
ok('…and the row names who booked it', landed.includes(onScreen.takenByName))

await openSheet(onScreen.id)
ok('a saved order opens as the document, not the form', /Edit sales order/.test(await pageText(page)))

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Confirm')?.click())
await sleep(900)
const asked = await page.$eval('[role="dialog"]', (d) => d.innerText.replace(/\n/g, ' · ')).catch(() => '')
ok('confirming asks first', /Confirm this order/.test(asked), asked.slice(0, 120))
ok('…and says plainly that no stock moves', /No stock moves/i.test(asked))

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Yes, confirm it')?.click())
const went = await waitFor(async () => {
  const row = ((await admin('/orders?limit=300')).body.data?.orders ?? []).find((o) => o.id === onScreen.id)
  return row?.status === 'CONFIRMED' ? row : null
})
ok('it is confirmed', Boolean(went), went?.status)
await waitFor(async () => page.url().endsWith('/admin/sales/orders'))
await sleep(700)
ok('…and the list says to convert it to an invoice next', /convert it to an invoice/i.test(await pageText(page)))

await openSheet(onScreen.id)
const shut = await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Save')?.disabled ?? null)
ok('a confirmed order cannot be saved over', shut === true, String(shut))

/* ── the bill, from the list ──────────────────────────────────────────── */

await goto(page, '/admin/sales/orders', { heading: 'Sales Orders' })
await sleep(1500)
/**
 * Opens a row's ⋯ menu. It has to be a real click: a programmatic one from
 * inside the page does not carry the pointer event the menu listens for, so
 * the menu silently stays shut.
 */
const openMenu = async (orderNo) => {
  const selector = `button[aria-label="Actions for ${orderNo}"]`
  if (!(await page.$(selector))) return false
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), selector)
  await sleep(300)
  await page.click(selector)
  await sleep(800)
  return true
}
ok('a confirmed order has its row menu', await openMenu(onScreen.orderNo))
const menu = await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].map((i) => i.innerText.trim()))
ok('…offering to convert it to an invoice', menu.some((m) => /Convert to invoice/i.test(m)), menu.join(' | '))

await page.evaluate(() => [...document.querySelectorAll('[data-slot=dropdown-menu-item]')].find((i) => /Convert to invoice/i.test(i.innerText))?.click())
await sleep(1400)
const dialog = await page.$eval('[role="dialog"]', (d) => d.innerText.replace(/\n/g, ' · ')).catch(() => '')
ok('it asks for the bill number first', /Make the bill for this order/.test(dialog), dialog.slice(0, 140))
ok('…saying the bill is a draft until it is issued', /draft/i.test(dialog) && /issue/i.test(dialog))
const prefilled = await waitFor(async () => {
  const v = await page.$eval('#bill-no', (el) => el.value).catch(() => '')
  return /^NP\/\d\d-\d\d\/\d+$/.test(v) ? v : null
})
ok('…with a number already offered', Boolean(prefilled), prefilled ?? '(empty)')

// The suite's own number, so it is cleaned up with the rest.
const uiBill = `${BILL}UI${Date.now().toString().slice(-5)}`
await setField(page, '#bill-no', uiBill)
await sleep(400)
await clickText(page, 'button', 'Make the bill', { exact: false })

const uiInvoice = await waitFor(async () => ((await admin('/invoices?limit=300')).body.data?.invoices ?? []).find((i) => i.invoiceNo === uiBill))
ok('the bill is made', Boolean(uiInvoice), uiInvoice ? `${uiInvoice.invoiceNo} — ₹${uiInvoice.total}` : 'no bill')
eq('…as a draft, so nothing has left the factory', uiInvoice?.status, 'PENDING')
eq('…worth exactly what the order was', uiInvoice?.total, onScreen.total)

const billedRow = await waitFor(async () => {
  const row = ((await admin('/orders?limit=300')).body.data?.orders ?? []).find((o) => o.id === onScreen.id)
  return row?.status === 'INVOICED' ? row : null
})
eq('the order is marked invoiced', billedRow?.status, 'INVOICED')
/**
 * The admin is put on the bill, because its batches still have to be picked —
 * and told so, since the invoice screen is a bill sheet with nowhere to show a
 * notice, so it is said in a toast instead.
 */
const toldAboutBatches = await waitFor(async () => /Pick the batches, then issue it/i.test(await pageText(page)))
ok('…telling the admin that issuing is what moves the stock', Boolean(toldAboutBatches))
await waitFor(async () => page.url().includes('/admin/sales/invoices/'))
await sleep(900)
ok('…and the screen moves to the bill, where the batches are picked', page.url().includes(`/admin/sales/invoices/${uiInvoice.id}/edit`), page.url())

/* ── a customer added without leaving the order ───────────────────────── */

await goto(page, '/admin/sales/orders', { heading: 'Sales Orders' })
await sleep(1200)
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Create sales order'))?.click())
await sleep(1800)

ok('the order sheet offers to add a customer', Boolean(await page.$('#order-new-customer')))
await page.click('#order-new-customer')
await sleep(1200)
const addForm = await pageText(page)
ok('…which opens the real customer form, not a short one', /New customer/.test(addForm) && /Firm Details/i.test(addForm))
ok('…asking for the rate column, so an order can be priced for it', Boolean(await page.$('#dist-price-tier')))
ok('…and for the kind of party, so a chemist is not filed as a distributor', Boolean(await page.$('#dist-party-type')))

// Half a customer is no customer: the record has to stand on its own.
await page.type('#dist-name', INLINE)
await clickText(page, 'button', 'Add customer', { exact: false })
await sleep(1200)
const refused = await page.$$eval('[id$="-error"]', (els) => els.map((e) => e.innerText.trim()).filter(Boolean))
ok('a half-filled customer is refused', refused.length > 0, refused.slice(0, 3).join(' | '))
ok('…naming the executive it has to go under', refused.some((c) => /executive/i.test(c)), refused.join(' | ').slice(0, 140))

/** Opens one of the form's pickers and takes its first option. */
const takeFirst = async (selector) => {
  await page.evaluate((sel) => document.querySelector(sel)?.click(), selector)
  await sleep(500)
  const label = await page.evaluate(() => {
    const opt = document.querySelector('[role=option]')
    opt?.click()
    return opt?.textContent?.trim() ?? ''
  })
  await sleep(500)
  return label
}

await page.type('#dist-contact', 'E2E Shopkeeper')
await setField(page, '#dist-mobile', INLINE_MOBILE)
await pickOption(page, '#dist-manager', MGR.name)
await sleep(500)
await pickOption(page, '#dist-executive', EXE.name)
await sleep(500)
await takeFirst('#dist-region')
await takeFirst('#dist-city')
await takeFirst('#dist-area')
await clickText(page, 'button', 'Use current location', { exact: false })
await sleep(1500)
await clickText(page, 'button', 'Add customer', { exact: false })

const added = await waitFor(async () => ((await admin('/distributors?limit=300')).body.data?.distributors ?? []).find((d) => d.mobile === INLINE_MOBILE))
ok('the customer is created', Boolean(added), added ? `${added.name} · ${added.priceTier}` : 'not created')
ok('…on a rate column, so an order can be priced for it', Boolean(added?.priceTier), added?.priceTier)
eq('…with the map point the device gave', Number(added?.latitude), 28.9845)

await sleep(1200)
const nowChosen = await page.$eval('#order-distributor', (el) => el.textContent.trim()).catch(() => '')
ok('the new customer is already on the order being written', nowChosen.includes(INLINE), nowChosen)

await pickOption(page, '[aria-label="Add product"]', items[0].name)
await sleep(800)
await setField(page, `[aria-label="Quantity of ${items[0].name}"]`, '5')
await sleep(500)
await page.type('#order-note', UI_MARK)
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Save')?.click())

const forNewParty = await waitFor(async () =>
  ((await admin('/orders?limit=300')).body.data?.orders ?? []).find((o) => o.note === UI_MARK && o.distributorId === added?.id),
)
ok('the order saves for the customer just added', Boolean(forNewParty), forNewParty ? `${forNewParty.orderNo} → ${forNewParty.distributorName}` : 'no order')
eq('…priced on that customer’s own rate column', forNewParty?.priceTier, added?.priceTier)
ok('…and worth something', Number(forNewParty?.total) > 0, String(forNewParty?.total))

/* ── a phone ──────────────────────────────────────────────────────────── */

await page.setViewport({ width: 375, height: 760 })
await goto(page, '/admin/sales/orders', { heading: 'Sales Orders' })
await sleep(1200)
ok('the list fits a phone screen', !(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)))

/* ── nothing left behind ──────────────────────────────────────────────── */

await wipe()
const left = ((await admin('/orders?limit=300')).body.data?.orders ?? []).filter((o) => o.note === MARK || o.note === UI_MARK)
eq('the suite leaves no order behind', left.length, 0)
const staffLeft = ((await admin('/users?limit=300')).body.data?.users ?? []).filter((u) => STAFF.includes(u.mobile))
eq('…and no staff', staffLeft.length, 0)
const firmsLeft = ((await admin('/distributors?limit=300')).body.data?.distributors ?? []).filter(
  (d) => FIRMS.includes(d.name) || d.mobile === INLINE_MOBILE,
)
eq('…and no firms', firmsLeft.length, 0)
const billsLeft = ((await admin('/invoices?limit=300')).body.data?.invoices ?? []).filter((i) => i.invoiceNo.startsWith(BILL))
eq('…and no bills', billsLeft.length, 0)

await finish(browser, noise)
